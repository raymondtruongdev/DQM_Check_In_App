import type * as XLSXTypes from 'xlsx';
import { ReportDoc, ReportMetadata, ReportTaskRow } from '../types/report.types';
import { recalculateAllRates } from './reportTaskTree';

async function getXlsx(): Promise<typeof XLSXTypes> {
  return await import(/* webpackChunkName: 'xlsx' */ 'xlsx');
}

/**
 * Parse an Excel buffer (either template or saved report) into ReportDoc
 */
export async function parseReportDocFromBuffer(
  buffer: ArrayBuffer,
  docId: string,
  unit: string,
  dateStr: string
): Promise<ReportDoc> {
  const XLSX = await getXlsx();
  const wb = XLSX.read(buffer, { type: 'array' });

  // 1. Locate sheet: prefer sheet named after the unit (case-insensitive), or first sheet
  const cleanUnit = unit.trim().toLowerCase();
  const sheetName =
    wb.SheetNames.find((s) => s.trim().toLowerCase() === cleanUnit) ||
    wb.SheetNames[0];

  if (!sheetName) {
    throw new Error('File Excel không có sheet dữ liệu hợp lệ');
  }

  const ws = wb.Sheets[sheetName];
  if (!ws) {
    throw new Error(`Sheet "${sheetName}" không có dữ liệu`);
  }

  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // 2. Parse metadata (rows 0 to 9)
  const metadata: ReportMetadata = {
    docTitle: docId === 'WeeklyReport' ? 'BÁO CÁO TUẦN' : 'BÁO CÁO NGÀY',
    subTitle: '',
    docCode: '',
    location: unit,
    reportNo: '',
    shift: '',
    email: '',
    updateTime: ''
  };

  let headerRowIdx = -1;
  const maxHeaderSearch = Math.min(rawRows.length, 15);

  for (let r = 0; r < maxHeaderSearch; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const col0 = String(row[0] || '').trim();
    const col0Lower = col0.toLowerCase();
    const col1 = String(row[1] || '').trim();

    // Check if this row is the table header (contains ID or Tên công việc)
    if (col0Lower === 'id' || col0Lower === 'stt' || String(row[1] || '').toLowerCase().includes('công việc')) {
      headerRowIdx = r;
      break;
    }

    if (col0Lower === 'doctile' || col0Lower === 'doctitle' || col0Lower === 'tiêu đề' || col0Lower === 'tên báo cáo') {
      if (col1) metadata.docTitle = col1;
    } else if (col0Lower === 'subtile' || col0Lower === 'subtitle' || col0Lower === 'phụ đề') {
      if (col1) metadata.subTitle = col1;
    } else if (col0Lower === 'doccode' || col0Lower === 'mã tài liệu') {
      if (col1) metadata.docCode = col1;
    } else if (col0Lower === 'location' || col0Lower === 'vị trí') {
      if (col1) metadata.location = col1;
    } else if (col0Lower === 'reportno' || col0Lower === 'số báo cáo') {
      if (col1) metadata.reportNo = col1;
    } else if (col0Lower === 'shift' || col0Lower === 'ca làm việc') {
      if (col1) metadata.shift = col1;
    } else if (col0Lower === 'email') {
      if (col1) metadata.email = col1;
    } else if (col0Lower === 'updatetime' || col0Lower === 'thời gian cập nhật') {
      if (col1) metadata.updateTime = col1;
    }
  }

  // 3. Parse tasks table
  const tasks: ReportTaskRow[] = [];

  if (headerRowIdx !== -1) {
    const headerRow = rawRows[headerRowIdx];
    let idIdx = 0;
    let nameIdx = 1;
    let rateIdx = 2;
    let qtyIdx = 3;
    let unitIdx = 4;

    headerRow.forEach((colName: unknown, idx: number) => {
      const c = String(colName || '').trim().toLowerCase();
      if (c === 'id' || c === 'stt') idIdx = idx;
      else if (c.includes('công việc') || c.includes('tên việc') || c === 'name') nameIdx = idx;
      else if (c.includes('tỉ lệ') || c.includes('ti le') || c.includes('rate')) rateIdx = idx;
      else if (c.includes('khối lượng') || c.includes('khoi luong') || c.includes('qty')) qtyIdx = idx;
      else if (c.includes('đơn vị') || c.includes('don vi') || c === 'unit') unitIdx = idx;
    });

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const rawId = row[idIdx];
      if (rawId === undefined || rawId === null || String(rawId).trim() === '') continue;

      const id = String(rawId).trim();
      const taskName = String(row[nameIdx] || '').trim();
      if (!taskName) continue;

      const rawRate = row[rateIdx];
      let completionRate: number | undefined = undefined;
      if (rawRate !== undefined && rawRate !== null && rawRate !== '') {
        const num = parseFloat(String(rawRate));
        if (!isNaN(num)) completionRate = num;
      }

      const rawQty = row[qtyIdx];
      let quantity: number | undefined = undefined;
      if (rawQty !== undefined && rawQty !== null && rawQty !== '') {
        const num = parseFloat(String(rawQty));
        if (!isNaN(num)) quantity = num;
      }

      const taskUnit = String(row[unitIdx] || '').trim();
      const level = id.split('.').length;

      tasks.push({
        id,
        taskName,
        completionRate,
        quantity,
        unit: taskUnit,
        level,
        isLeaf: true
      });
    }
  }

  // Recalculate parent rates & leaf status
  const recalculatedTasks = recalculateAllRates(tasks);

  return {
    docId,
    unit,
    dateStr,
    metadata,
    tasks: recalculatedTasks
  };
}

/**
 * Encode ReportDoc into an Excel ArrayBuffer.
 * If templateBuffer is supplied, cell structure and formatting are preserved.
 */
export async function encodeReportDocToBuffer(
  doc: ReportDoc,
  templateBuffer?: ArrayBuffer
): Promise<ArrayBuffer> {
  const XLSX = await getXlsx();

  let wb: XLSXTypes.WorkBook;
  let ws: XLSXTypes.WorkSheet;
  let targetSheetName: string;

  if (templateBuffer) {
    wb = XLSX.read(templateBuffer, { type: 'array' });
    const cleanUnit = doc.unit.trim().toLowerCase();
    targetSheetName =
      wb.SheetNames.find((s) => s.trim().toLowerCase() === cleanUnit) ||
      wb.SheetNames[0] ||
      doc.unit;

    if (!wb.Sheets[targetSheetName]) {
      ws = XLSX.utils.aoa_to_sheet([]);
      XLSX.utils.book_append_sheet(wb, ws, targetSheetName);
    } else {
      ws = wb.Sheets[targetSheetName];
    }
  } else {
    wb = XLSX.utils.book_new();
    targetSheetName = doc.unit || 'ST01';
    ws = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(wb, ws, targetSheetName);
  }

  // Helper to set cell safely
  const setCell = (cellRef: string, val: string | number | null | undefined): void => {
    if (val === null || val === undefined || val === '') {
      delete ws[cellRef];
    } else if (typeof val === 'number') {
      ws[cellRef] = { t: 'n', v: val };
    } else {
      ws[cellRef] = { t: 's', v: String(val) };
    }
  };

  // Find header row or default to row index 10 (row 11)
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  let headerRowIdx = -1;
  const maxHeaderSearch = Math.min(rawRows.length, 15);

  for (let r = 0; r < maxHeaderSearch; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;
    const col0 = String(row[0] || '').trim().toLowerCase();
    if (col0 === 'id' || col0 === 'stt' || String(row[1] || '').toLowerCase().includes('công việc')) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx === -1) {
    headerRowIdx = 10; // Row 11
  }

  // Update metadata in rows 1 to headerRowIdx
  // Find metadata rows by Col A
  for (let r = 0; r < headerRowIdx; r++) {
    const cellA = ws[`A${r + 1}`];
    const key = cellA ? String(cellA.v || '').trim().toLowerCase() : '';
    if (key === 'doctile' || key === 'doctitle') {
      setCell(`B${r + 1}`, doc.metadata.docTitle);
    } else if (key === 'subtile' || key === 'subtitle') {
      setCell(`B${r + 1}`, doc.metadata.subTitle);
    } else if (key === 'doccode') {
      setCell(`B${r + 1}`, doc.metadata.docCode);
    } else if (key === 'location') {
      setCell(`B${r + 1}`, doc.metadata.location || doc.unit);
    } else if (key === 'reportno') {
      setCell(`B${r + 1}`, doc.metadata.reportNo);
    } else if (key === 'shift') {
      setCell(`B${r + 1}`, doc.metadata.shift);
    } else if (key === 'email') {
      setCell(`B${r + 1}`, doc.metadata.email);
    } else if (key === 'updatetime') {
      setCell(`B${r + 1}`, doc.metadata.updateTime);
    }
  }

  // Table header at row headerRowIdx + 1
  const headerRowNumber = headerRowIdx + 1;
  setCell(`A${headerRowNumber}`, 'ID');
  setCell(`B${headerRowNumber}`, 'Tên công việc');
  setCell(`C${headerRowNumber}`, 'Tỉ lệ hoàn thành');
  setCell(`D${headerRowNumber}`, 'Khối lượng');
  setCell(`E${headerRowNumber}`, 'Đơn vị');

  // Task rows starting at headerRowNumber + 1
  const startTaskRow = headerRowNumber + 1;
  doc.tasks.forEach((t, i) => {
    const rowNum = startTaskRow + i;
    ws[`A${rowNum}`] = { t: 's', v: String(t.id), z: '@' };
    setCell(`B${rowNum}`, t.taskName || '');
    setCell(`C${rowNum}`, t.completionRate !== undefined ? t.completionRate : null);
    setCell(`D${rowNum}`, t.quantity !== undefined ? t.quantity : null);
    setCell(`E${rowNum}`, t.unit || '');
  });

  const totalRows = Math.max(startTaskRow + doc.tasks.length, 30);
  ws['!ref'] = `A1:E${totalRows}`;

  ws['!cols'] = [
    { wch: 10 }, // ID
    { wch: 35 }, // Tên công việc
    { wch: 18 }, // Tỉ lệ hoàn thành
    { wch: 14 }, // Khối lượng
    { wch: 12 }  // Đơn vị
  ];

  const array = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return array as ArrayBuffer;
}
