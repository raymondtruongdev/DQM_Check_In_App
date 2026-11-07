import type * as XLSXTypes from 'xlsx';
import { ProgressDoc, ProgressDocMetadata, RoleEntry, TaskRow } from '../types/progress.types';
import { PROGRESS_CONFIG } from '../constants/progressConfig';

// Helper to get SheetJS dynamically so it's code-split with named chunk
async function getXlsx(): Promise<typeof XLSXTypes> {
  return await import(/* webpackChunkName: 'xlsx' */ 'xlsx');
}

/**
 * Parse Projects_Role.xlsx buffer into RoleEntry[]
 */
export async function parseRoleBuffer(buffer: ArrayBuffer): Promise<RoleEntry[]> {
  const XLSX = await getXlsx();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames.find((s) => s.toLowerCase() === 'role') || wb.SheetNames[0];
  if (!sheetName) return [];

  const ws = wb.Sheets[sheetName];
  if (!ws) return [];

  // Convert to array of objects
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const results: RoleEntry[] = [];

  rawRows.forEach((r, idx) => {
    // Normalise column keys (case-insensitive & trim)
    const normalized: Record<string, unknown> = {};
    Object.keys(r).forEach((k) => {
      normalized[k.trim().toLowerCase()] = r[k];
    });

    const docId = String(normalized.docid || normalized.doc_id || '').trim();
    const docTitle = String(
      normalized.doctitle || normalized.doc_title || normalized['tên dự án'] || normalized['tên mảng việc'] || ''
    ).trim() || undefined;
    const unit = String(normalized.unit || '').trim();
    const email = String(normalized.email || '').trim();
    const siteManager = String(
      normalized['site manager'] || normalized.sitemanager || normalized.name || ''
    ).trim();
    const rawStatus = normalized.status;

    if (!docId || !unit || !email) {
      return; // Skip empty rows
    }

    let status = false;
    if (typeof rawStatus === 'boolean') {
      status = rawStatus;
    } else if (typeof rawStatus === 'number') {
      status = rawStatus === 1;
    } else if (typeof rawStatus === 'string') {
      const s = rawStatus.trim().toLowerCase();
      status = s === 'true' || s === '1' || s === 'yes' || s === 'y';
    }

    results.push({
      id: String(normalized.id || idx + 1).trim(),
      docId,
      docTitle,
      unit,
      siteManager,
      email,
      status
    });
  });

  return results;
}

/**
 * Parse a progress Excel file (or template) into ProgressDoc
 */
export async function parseProgressDocBuffer(
  buffer: ArrayBuffer,
  dateStr: string,
  targetUnit?: string
): Promise<ProgressDoc> {
  const XLSX = await getXlsx();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  // Choose sheet: match targetUnit if provided, else first sheet
  let sheetName = wb.SheetNames[0];
  if (targetUnit) {
    const found = wb.SheetNames.find((s) => s.trim().toLowerCase() === targetUnit.trim().toLowerCase());
    if (found) sheetName = found;
  }
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    throw new Error(`Sheet "${sheetName}" not found in workbook`);
  }

  // 1. Read metadata from rows 1-6
  const metadata: ProgressDocMetadata = {
    docTitle: '',
    docId: '',
    name: '',
    email: '',
    unit: targetUnit || sheetName,
    updateTime: ''
  };

  for (let r = 1; r <= 7; r++) {
    const keyCell = ws[`A${r}`];
    const valCell = ws[`B${r}`];
    if (!keyCell) continue;

    const key = String(keyCell.v || '').trim().toLowerCase();
    const val = valCell ? (valCell.w || String(valCell.v || '')) : '';

    if (key === 'doctile' || key === 'doctitle' || key === 'tiêu đề' || key === 'tieu de') {
      metadata.docTitle = val;
    } else if (key === 'doc_id' || key === 'docid') {
      metadata.docId = val;
    } else if (key === 'name' || key === 'họ và tên' || key === 'người cập nhật') {
      metadata.name = val;
    } else if (key === 'email') {
      metadata.email = val;
    } else if (key === 'unit' || key === 'đơn vị' || key === 'vị trí') {
      if (val) metadata.unit = val;
    } else if (key === 'updatetime' || key === 'thời gian cập nhật') {
      metadata.updateTime = val;
    }
  }

  // 2. Read table items starting row 8
  const rawSheetData: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const tasks: TaskRow[] = [];

  // Find header row (usually index 7 for row 8)
  let headerRowIdx = -1;
  const colMap: Record<string, number> = {};

  for (let r = 5; r < Math.min(rawSheetData.length, 12); r++) {
    const row = rawSheetData[r];
    if (!row) continue;
    const firstCell = String(row[0] || '').trim().toLowerCase();
    if (firstCell === 'id' || firstCell === 'mã cv' || firstCell === 'stt') {
      headerRowIdx = r;
      row.forEach((colName: unknown, idx: number) => {
        const c = String(colName || '').trim().toLowerCase();
        colMap[c] = idx;
      });
      break;
    }
  }

  if (headerRowIdx !== -1) {
    const idIdx = colMap.id ?? 0;
    const nameIdx = colMap['tên công việc'] ?? colMap['ten cong viec'] ?? colMap.name ?? 1;
    const rateIdx = colMap['tỉ lệ hoàn thành'] ?? colMap['ti le hoan thanh'] ?? colMap.rate ?? 2;
    const qtyIdx = colMap['khối lượng'] ?? colMap['khoi luong'] ?? colMap.quantity ?? 3;
    const unitIdx = colMap['đơn vị'] ?? colMap['don vi'] ?? colMap.unit ?? 4;
    const parentIdIdx = colMap.parentid ?? colMap.parent_id;
    const isCustomIdx = colMap.iscustom ?? colMap.is_custom;

    for (let r = headerRowIdx + 1; r < rawSheetData.length; r++) {
      const row = rawSheetData[r];
      if (!row || row.length === 0) continue;
      const rawId = row[idIdx];
      if (rawId === undefined || rawId === null || String(rawId).trim() === '') continue;

      const id = String(rawId).trim();
      const taskName = String(row[nameIdx] || '').trim();

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

      const unit = String(row[unitIdx] || '').trim();
      const parentId = parentIdIdx !== undefined && row[parentIdIdx] ? String(row[parentIdIdx]).trim() : undefined;
      const isCustomVal = isCustomIdx !== undefined ? row[isCustomIdx] : undefined;
      const isCustom = isCustomVal === true || isCustomVal === 'TRUE' || isCustomVal === 'true' || isCustomVal === 1;

      const level = id.split('.').length;

      tasks.push({
        id,
        taskName,
        completionRate,
        quantity,
        unit,
        parentId,
        isCustom: isCustom || level >= 3,
        level
      });
    }
  }

  return {
    metadata,
    tasks,
    dateStr
  };
}

/**
 * Encode ProgressDoc into an Excel binary ArrayBuffer
 */
export async function encodeProgressDocBuffer(doc: ProgressDoc): Promise<ArrayBuffer> {
  const XLSX = await getXlsx();
  const wb = XLSX.utils.book_new();

  const wsData: (string | number)[][] = [];

  // Rows 1-6: Metadata
  wsData.push([PROGRESS_CONFIG.DEFAULT_HEADERS.DOC_TITLE, doc.metadata.docTitle || 'Bảng cập nhật tiến độ']);
  wsData.push([PROGRESS_CONFIG.DEFAULT_HEADERS.DOC_ID, doc.metadata.docId]);
  wsData.push([PROGRESS_CONFIG.DEFAULT_HEADERS.NAME, doc.metadata.name]);
  wsData.push([PROGRESS_CONFIG.DEFAULT_HEADERS.EMAIL, doc.metadata.email]);
  wsData.push([PROGRESS_CONFIG.DEFAULT_HEADERS.UNIT, doc.metadata.unit]);
  wsData.push([PROGRESS_CONFIG.DEFAULT_HEADERS.UPDATE_TIME, doc.metadata.updateTime]);
  wsData.push([]); // Empty row 7

  // Row 8: Table Header
  wsData.push(['ID', 'Tên công việc', 'Tỉ lệ hoàn thành', 'Khối lượng', 'Đơn vị', 'ParentID', 'IsCustom']);

  // Rows 9+: Task items
  doc.tasks.forEach((t) => {
    wsData.push([
      String(t.id),
      t.taskName || '',
      t.completionRate !== undefined ? t.completionRate : '',
      t.quantity !== undefined ? t.quantity : '',
      t.unit || '',
      t.parentId || '',
      t.isCustom ? 'TRUE' : 'FALSE'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // ID
    { wch: 40 }, // Task Name
    { wch: 18 }, // Completion Rate
    { wch: 15 }, // Quantity
    { wch: 12 }, // Unit
    { wch: 12 }, // ParentID
    { wch: 10 }  // IsCustom
  ];

  // Force column A from row 8 downwards to be text type 's'
  const startRow = 8;
  for (let r = startRow; r < wsData.length; r++) {
    const cellRef = `A${r + 1}`;
    if (ws[cellRef]) {
      ws[cellRef].t = 's';
      ws[cellRef].z = '@';
    }
  }

  const sheetName = doc.metadata.unit ? doc.metadata.unit.replace(/[:\\/?*\[\]]/g, '').substring(0, 31) : 'Data';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const array = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return array as ArrayBuffer;
}

/**
 * Generate Excel buffer for Summary export
 */
export async function encodeSummaryExportBuffer(
  docId: string,
  unit: string,
  tasks: TaskRow[],
  columns: { dateStr: string; formattedDate: string }[],
  dailyRates: Record<string, Record<string, number | undefined>>
): Promise<ArrayBuffer> {
  const XLSX = await getXlsx();
  const wb = XLSX.utils.book_new();

  const wsData: (string | number)[][] = [];
  wsData.push(['BÁO CÁO TỔNG HỢP TIẾN ĐỘ THI CÔNG']);
  wsData.push(['Dự án (DocID):', docId, 'Vị trí (Unit):', unit]);
  wsData.push(['Ngày xuất báo cáo:', new Date().toLocaleString('vi-VN')]);
  wsData.push([]); // blank row

  // Header row
  const headerRow: string[] = ['ID', 'Tên công việc', 'Đơn vị'];
  columns.forEach((c) => {
    headerRow.push(c.formattedDate);
  });
  wsData.push(headerRow);

  // Task rows
  tasks.forEach((t) => {
    const row: (string | number)[] = [t.id, t.taskName, t.unit || ''];
    columns.forEach((c) => {
      const rate = dailyRates[c.dateStr]?.[t.id];
      row.push(rate !== undefined ? `${rate}%` : '-');
    });
    wsData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 10 }, { wch: 38 }, { wch: 12 }, ...columns.map(() => ({ wch: 12 }))];

  XLSX.utils.book_append_sheet(wb, ws, 'TongHopTienDo');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
