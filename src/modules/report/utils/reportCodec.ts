import type * as XLSXTypes from 'xlsx';
import {
  EquipmentRow,
  IssueRow,
  ManpowerRow,
  MaterialRow,
  ReportDoc,
  ReportMetadata,
  ReportTaskRow,
  WorkQtyRow
} from '../types/report.types';
import { recalculateAllRates } from './reportTaskTree';

async function getXlsx(): Promise<typeof XLSXTypes> {
  return await import(/* webpackChunkName: 'xlsx' */ 'xlsx');
}

export interface DataCheckItem {
  code: string;
  label: string;
  status: 'OK' | 'Cảnh báo';
}

/**
 * Evaluate K01..K12 data checks automatically from ReportDoc
 */
export function evaluateDataChecks(doc: ReportDoc): DataCheckItem[] {
  const m = doc.metadata;
  const hasCriticalIssue = doc.issues.some(
    (iss) =>
      iss.status !== 'Đóng' &&
      (iss.severity.toLowerCase().includes('cao') || iss.criticalPath.toLowerCase() === 'có')
  );
  const totalManpower = doc.manpower.reduce((acc, r) => acc + (r.nos || 0), 0);
  const allManpowerHasHrs = doc.manpower.every((r) => !r.nos || (r.hrs !== undefined && r.hrs > 0));
  const hasWorkItems = doc.workItems.length > 0;
  const validWorkQty = doc.workItems.every(
    (w) => (w.plan === undefined || w.plan >= 0) && (w.actual === undefined || w.actual >= 0)
  );
  const allMaterialsHaveMir = doc.materials.every(
    (mat) => (!mat.recv && !mat.used) || Boolean(mat.mirMar && mat.mirMar.trim())
  );
  const hasTodayAndTomorrow = Boolean(m.worksToday.trim() && m.planTomorrow.trim());
  const hseOk =
    !m.hseIncidents ||
    m.hseIncidents === 0 ||
    (Boolean(m.incidentDetails.trim()) && !m.incidentDetails.toLowerCase().includes('không có'));

  return [
    {
      code: 'K01',
      label: 'Thời tiết & Giờ mất do thời tiết có giải trình',
      status: m.hrsLost && m.hrsLost > 0 && !m.summary.trim() ? 'Cảnh báo' : 'OK'
    },
    {
      code: 'K02',
      label: 'Vướng mắc đường găng / Mức độ Cao đang mở',
      status: hasCriticalIssue ? 'Cảnh báo' : 'OK'
    },
    {
      code: 'K03',
      label: 'Tổng nhân lực hiện trường > 0',
      status: totalManpower > 0 ? 'OK' : 'Cảnh báo'
    },
    {
      code: 'K04',
      label: 'Giờ công nhân lực hợp lệ',
      status: allManpowerHasHrs ? 'OK' : 'Cảnh báo'
    },
    {
      code: 'K05',
      label: 'Danh mục thiết bị & trạng thái vận hành',
      status: doc.equipment.length > 0 ? 'OK' : 'Cảnh báo'
    },
    {
      code: 'K06',
      label: 'Khối lượng thực hiện trong ngày',
      status: hasWorkItems ? 'OK' : 'Cảnh báo'
    },
    {
      code: 'K07',
      label: 'Tỉ lệ hoàn thành & số liệu khối lượng hợp lệ',
      status: validWorkQty ? 'OK' : 'Cảnh báo'
    },
    {
      code: 'K08',
      label: 'Vật tư nhập/xuất có phiếu MIR/MAR',
      status: allMaterialsHaveMir ? 'OK' : 'Cảnh báo'
    },
    {
      code: 'K09',
      label: 'Công việc hôm nay & Kế hoạch ngày mai',
      status: hasTodayAndTomorrow ? 'OK' : 'Cảnh báo'
    },
    {
      code: 'K10',
      label: 'An toàn HSE & Mô tả sự cố',
      status: hseOk ? 'OK' : 'Cảnh báo'
    },
    {
      code: 'K11',
      label: 'Chỉ thị TVGS & Kế hoạch tóm tắt',
      status: m.planSummary.trim() ? 'OK' : 'Cảnh báo'
    },
    {
      code: 'K12',
      label: 'Đồng bộ hồ sơ & Ảnh hiện trường',
      status: 'OK'
    }
  ];
}

export function formatDataChecksString(doc: ReportDoc): string {
  return evaluateDataChecks(doc)
    .map((item) => `${item.code}:${item.status}`)
    .join('; ');
}

/**
 * Default seed data for a new Daily Report (based on Mau_BCN_ST06_20261025.pdf)
 */
export function getDefaultDailyReportSections(unit: string): {
  manpower: ManpowerRow[];
  equipment: EquipmentRow[];
  workItems: WorkQtyRow[];
  materials: MaterialRow[];
  issues: IssueRow[];
} {
  const cleanUnit = unit || 'ST06';
  return {
    manpower: [
      { id: 'mp-1', org: 'TCJV', category: 'Quản lý', nos: 8, hrs: 10, manHrs: 80, isLocked: true },
      { id: 'mp-2', org: 'TCJV', category: 'Kỹ sư/Kỹ thuật', nos: 14, hrs: 10, manHrs: 140, isLocked: true },
      { id: 'mp-3', org: 'NTP-TV01', category: 'Công nhân kỹ thuật', nos: 52, hrs: 10, manHrs: 520, isLocked: true },
      { id: 'mp-4', org: 'NTP-TV01', category: 'Lao động phổ thông', nos: 30, hrs: 10, manHrs: 300, isLocked: true },
      { id: 'mp-5', org: 'TCJV', category: 'An toàn viên', nos: 6, hrs: 10, manHrs: 60, isLocked: true },
      { id: 'mp-6', org: 'NTP-TB02', category: 'Vận hành máy', nos: 4, hrs: 8, manHrs: 32, isLocked: false }
    ],
    equipment: [
      { id: 'eq-1', equipment: 'Cẩu bánh xích 80T', qty: 1, hrs: 10, status: 'Hoạt động', remark: '', isLocked: false },
      { id: 'eq-2', equipment: 'Gầu ngoạm tường vây (grab)', qty: 1, hrs: 8.5, status: 'Hoạt động', remark: 'Dừng 1,5h do mưa', isLocked: false },
      { id: 'eq-3', equipment: 'Trạm trộn/tái sinh bentonite', qty: 1, hrs: 12, status: 'Hoạt động', remark: '', isLocked: false },
      { id: 'eq-4', equipment: 'Máy đào 0,7 m³', qty: 2, hrs: 9, status: 'Hoạt động', remark: '', isLocked: false },
      { id: 'eq-5', equipment: 'Xe bồn bê tông 7 m³', qty: 6, hrs: 4, status: 'Hoạt động', remark: 'Đổ BT tấm P-12', isLocked: false },
      { id: 'eq-6', equipment: 'Máy phát điện 250 kVA', qty: 1, hrs: 0, status: 'Chờ việc', remark: 'Dự phòng', isLocked: false }
    ],
    workItems: [
      { id: 'wq-1', activityId: `${cleanUnit}-DW-1120`, item: 'Tường vây – đào tấm P-13', unit: 'm3', plan: 160, actual: 142, percent: 89, remark: 'Mưa to 14:30–16:00', isLocked: true },
      { id: 'wq-2', activityId: `${cleanUnit}-DW-1130`, item: 'Tường vây – lồng thép tấm P-12', unit: 'tấn', plan: 28, actual: 28, percent: 100, remark: '', isLocked: true },
      { id: 'wq-3', activityId: `${cleanUnit}-DW-1140`, item: 'Tường vây – bê tông tấm P-12', unit: 'm3', plan: 210, actual: 214, percent: 102, remark: '', isLocked: false },
      { id: 'wq-4', activityId: `${cleanUnit}-GW-1010`, item: 'Tường dẫn trục 8–10', unit: 'm', plan: 12, actual: 9, percent: 75, remark: 'Chờ ván khuôn', isLocked: false }
    ],
    materials: [
      { id: 'mat-1', material: 'Bê tông C35/45 tường vây', unit: 'm3', recv: 214, used: 214, mirMar: `MIR-${cleanUnit}-0187` },
      { id: 'mat-2', material: 'Thép D32 (lồng P-14)', unit: 'tấn', recv: 32, used: 0, mirMar: `MIR-${cleanUnit}-0188` },
      { id: 'mat-3', material: 'Bentonite', unit: 'tấn', recv: 4, used: 3.5, mirMar: 'MAR chờ PICC – NCC mới' }
    ],
    issues: [
      {
        id: 'iss-1',
        issueId: `VM-${cleanUnit}-007`,
        description: 'Cọc secant lấn ranh 300–450 mm tại cạnh Đông – chờ phương án xử lý của thiết kế',
        severity: 'Cao',
        criticalPath: 'Có',
        owner: 'Thiết kế TCJV / TVTK',
        dueDate: '28/10',
        status: 'Đang xử lý'
      },
      {
        id: 'iss-2',
        issueId: `VM-${cleanUnit}-009`,
        description: 'Phê duyệt NCC bentonite mới chưa có – còn tồn 4 ngày sử dụng',
        severity: 'Cao',
        criticalPath: 'Có',
        owner: 'Mua sắm / PICC',
        dueDate: '27/10',
        status: 'Mở'
      },
      {
        id: 'iss-3',
        issueId: `VM-${cleanUnit}-010`,
        description: 'Cáp ngầm chưa xác định tại trục 9 – cần dò tìm trước khi đào tường dẫn',
        severity: 'Trung bình',
        criticalPath: '–',
        owner: 'Site + EVNHCMC',
        dueDate: '30/10',
        status: 'Mở'
      },
      {
        id: 'iss-4',
        issueId: `VM-${cleanUnit}-011`,
        description: 'Thiếu mặt bằng tập kết lồng thép do phân luồng giao thông giai đoạn 2',
        severity: 'Trung bình',
        criticalPath: '–',
        owner: 'Ban QLĐSĐT / CSGT',
        dueDate: '05/11',
        status: 'Mở'
      }
    ]
  };
}

function parseOptionalNum(val: unknown): number | undefined {
  if (val === undefined || val === null || String(val).trim() === '') return undefined;
  const cleaned = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? undefined : n;
}

function parseIsLocked(val: unknown, fallback: boolean): boolean {
  if (val !== undefined && val !== null && String(val).trim() !== '') {
    const s = String(val).trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes' || s === 'x' || s === 'khoá' || s === 'khóa' || s === 'locked') {
      return true;
    }
    if (s === 'false' || s === '0' || s === 'no') {
      return false;
    }
  }
  return fallback;
}

/**
 * Parse an Excel buffer (either 6-sheet template/report or legacy 1-sheet template) into ReportDoc
 */
export async function parseReportDocFromBuffer(
  buffer: ArrayBuffer,
  docId: string,
  unit: string,
  dateStr: string
): Promise<ReportDoc> {
  const XLSX = await getXlsx();
  const wb = XLSX.read(buffer, { type: 'array' });

  const defaults = getDefaultDailyReportSections(unit);

  const metadata: ReportMetadata = {
    docTitle: docId === 'WeeklyReport' ? 'BÁO CÁO TUẦN' : 'BÁO CÁO NGÀY',
    docTitleEn: docId === 'WeeklyReport' ? 'WEEKLY REPORT' : 'DAILY REPORT',
    subTitle: 'Tuyến Metro số 2 – Gói thầu M2.1 Tham Lương – Bến Thành | HCMC Metro Line 2 – Package M2.1',
    docCode: `HCM2_1-23_CS-MAUR_TCJV-CPZZ-${unit}-CWS-RP-041-S3-C01_BCN`,
    location: `${unit} – Ga ${unit} (tên theo DM_ViTri)`,
    reportNo: '041',
    shift: 'Cả ngày (2 ca)',
    email: '',
    updateTime: '',
    weatherAM: 'Nắng',
    weatherPM: 'Mưa to',
    maxTemp: '33 °C',
    hrsLost: 1.5,
    progressEval: 'Đạt',
    summary:
      'Thi công tường vây tấm P-12 (đào, hạ lồng thép, đổ bê tông); đào gầu ngoạm tấm P-13; tiếp tục tường dẫn đoạn trục 8–10. Mưa to 14:30–16:00 dừng đào 1,5 giờ. Giải trình K02: VM-' +
      unit +
      '-007 và 009 chưa ảnh hưởng sản lượng hôm nay; bentonite còn đủ 4 ngày.',
    manpowerSummary: '',
    equipmentSummary: '',
    workQtySummary: '',
    materialsSummary: '',
    worksPlanSummary: '',
    issuesSummary: '',
    worksToday:
      '• Đổ bê tông tấm P-12 từ 06:30 đến 13:10, 214 m³, thí nghiệm 6 tổ mẫu (Trục 6–7, P-12)\n• Đào gầu ngoạm tấm P-13 đến cốt -18,4 m (P-13)\n• Gia công lồng thép tấm P-14 tại bãi (Bãi gia công)',
    planTomorrow:
      '• Đào hoàn thành P-13 đến cốt -32,5 m; kiểm tra độ thẳng đứng (Koden) (P-13)\n• Nghiệm thu cốt thép lồng P-14 với TVGS 09:00 (Bãi gia công)',
    hseIncidents: 0,
    hseInspections: 3,
    inspectionRequests: 2,
    newNCR: 0,
    photosCount: 0,
    photosFolder: `BCN_AnhHienTruong/${unit}/${dateStr}`,
    incidentDetails: 'Không có | None',
    engineerInstructions:
      'TVGS yêu cầu bổ sung biên bản kiểm tra dung dịch bentonite tấm P-12 trước 08:00 ngày tiếp theo.',
    planSummary:
      'Hoàn thành đào tấm P-13, hạ lồng thép P-13; đổ bê tông tường dẫn trục 8–9; nghiệm thu cốt thép lồng P-14 với TVGS.',
    preparedBy: '',
    siteManager: 'Trương Quốc Toàn',
    approvedAt: '',
    tcjvRep: '',
    engineerAck: '',
    approvalComment: 'Đồng ý; giải trình K02 đã ghi trong tóm tắt',
    dataChecks: ''
  };

  const hasMultiSheet = wb.SheetNames.some((s) => s === '01_General' || s === '02_Manpower');

  if (hasMultiSheet) {
    // 1. Parse 01_General
    const wsGen = wb.Sheets['01_General'] || wb.Sheets[wb.SheetNames[0]];
    if (wsGen) {
      const rows: unknown[][] = XLSX.utils.sheet_to_json(wsGen, { header: 1, defval: '' });
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;
        const key = String(row[0] || '').trim().toLowerCase();
        const val = String(row[1] ?? '').trim();
        if (!key || key === 'key') continue;

        if (key === 'doctile' || key === 'doctitle') metadata.docTitle = val || metadata.docTitle;
        else if (key === 'doctileen' || key === 'doctitleen') metadata.docTitleEn = val || metadata.docTitleEn;
        else if (key === 'subtile' || key === 'subtitle') metadata.subTitle = val || metadata.subTitle;
        else if (key === 'doccode') metadata.docCode = val || metadata.docCode;
        else if (key === 'location') metadata.location = val || metadata.location;
        else if (key === 'reportno') metadata.reportNo = val;
        else if (key === 'shift') metadata.shift = val || metadata.shift;
        else if (key === 'email') metadata.email = val;
        else if (key === 'updatetime') metadata.updateTime = val;
        else if (key === 'weatheram') metadata.weatherAM = val;
        else if (key === 'weatherpm') metadata.weatherPM = val;
        else if (key === 'maxtemp') metadata.maxTemp = val;
        else if (key === 'hrslost') metadata.hrsLost = parseOptionalNum(row[1]);
        else if (key === 'progresseval') metadata.progressEval = val;
        else if (key === 'summary') metadata.summary = val;
        else if (key === 'manpowersummary') metadata.manpowerSummary = val;
        else if (key === 'equipmentsummary') metadata.equipmentSummary = val;
        else if (key === 'workqtysummary') metadata.workQtySummary = val;
        else if (key === 'materialssummary') metadata.materialsSummary = val;
        else if (key === 'worksplansummary') metadata.worksPlanSummary = val;
        else if (key === 'issuessummary') metadata.issuesSummary = val;
        else if (key === 'workstoday') metadata.worksToday = val;
        else if (key === 'plantomorrow') metadata.planTomorrow = val;
        else if (key === 'hseincidents') metadata.hseIncidents = parseOptionalNum(row[1]) ?? 0;
        else if (key === 'hseinspections') metadata.hseInspections = parseOptionalNum(row[1]) ?? 0;
        else if (key === 'inspectionrequests') metadata.inspectionRequests = parseOptionalNum(row[1]) ?? 0;
        else if (key === 'newncr') metadata.newNCR = parseOptionalNum(row[1]) ?? 0;
        else if (key === 'photoscount') metadata.photosCount = parseOptionalNum(row[1]) ?? 0;
        else if (key === 'photosfolder') metadata.photosFolder = val || metadata.photosFolder;
        else if (key === 'incidentdetails') metadata.incidentDetails = val;
        else if (key === 'engineerinstructions') metadata.engineerInstructions = val;
        else if (key === 'plansummary') metadata.planSummary = val;
        else if (key === 'preparedby') metadata.preparedBy = val;
        else if (key === 'sitemanager') metadata.siteManager = val;
        else if (key === 'approvedat') metadata.approvedAt = val;
        else if (key === 'tcjvrep') metadata.tcjvRep = val;
        else if (key === 'engineerack') metadata.engineerAck = val;
        else if (key === 'approvalcomment') metadata.approvalComment = val;
        else if (key === 'datachecks') metadata.dataChecks = val;
      }
    }

    // 2. Parse 02_Manpower
    const manpower: ManpowerRow[] = [];
    const wsMp = wb.Sheets['02_Manpower'];
    if (wsMp) {
      const rows: unknown[][] = XLSX.utils.sheet_to_json(wsMp, { header: 1, defval: '' });
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || (!row[0] && !row[1])) continue;
        const org = String(row[0] || '').trim();
        const category = String(row[1] || '').trim();
        if (org.toLowerCase().includes('tổng') || category.toLowerCase().includes('tổng')) continue;
        const nos = parseOptionalNum(row[2]);
        const hrs = parseOptionalNum(row[3]);
        const manHrs = nos !== undefined && hrs !== undefined ? Math.round(nos * hrs * 100) / 100 : parseOptionalNum(row[4]);
        const isDefaultMpLocked = ['tcjv', 'ntp-tv01'].indexOf(org.toLowerCase()) !== -1;
        manpower.push({
          id: `mp-${r}`,
          org,
          category,
          nos,
          hrs,
          manHrs,
          isLocked: parseIsLocked(row[5], isDefaultMpLocked)
        });
      }
    }

    // 3. Parse 03_Equipment
    const equipment: EquipmentRow[] = [];
    const wsEq = wb.Sheets['03_Equipment'];
    if (wsEq) {
      const rows: unknown[][] = XLSX.utils.sheet_to_json(wsEq, { header: 1, defval: '' });
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !String(row[0] || '').trim()) continue;
        equipment.push({
          id: `eq-${r}`,
          equipment: String(row[0] || '').trim(),
          qty: parseOptionalNum(row[1]),
          hrs: parseOptionalNum(row[2]),
          status: String(row[3] || 'Hoạt động').trim(),
          remark: String(row[4] || '').trim(),
          isLocked: parseIsLocked(row[5], false)
        });
      }
    }

    // 4. Parse 04_WorkQty
    const workItems: WorkQtyRow[] = [];
    const wsWq = wb.Sheets['04_WorkQty'];
    if (wsWq) {
      const rows: unknown[][] = XLSX.utils.sheet_to_json(wsWq, { header: 1, defval: '' });
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || (!String(row[0] || '').trim() && !String(row[1] || '').trim())) continue;
        const actId = String(row[0] || '').trim();
        const plan = parseOptionalNum(row[3]);
        const actual = parseOptionalNum(row[4]);
        const percent =
          plan !== undefined && plan > 0 && actual !== undefined
            ? Math.round((actual / plan) * 100)
            : parseOptionalNum(row[5]);
        const isDefaultWqLocked = /-dw-1120$|-dw-1130$/i.test(actId);
        workItems.push({
          id: `wq-${r}`,
          activityId: actId,
          item: String(row[1] || '').trim(),
          unit: String(row[2] || '').trim(),
          plan,
          actual,
          percent,
          remark: String(row[6] || '').trim(),
          isLocked: parseIsLocked(row[7], isDefaultWqLocked)
        });
      }
    }

    // 5. Parse 05_Materials
    const materials: MaterialRow[] = [];
    const wsMat = wb.Sheets['05_Materials'];
    if (wsMat) {
      const rows: unknown[][] = XLSX.utils.sheet_to_json(wsMat, { header: 1, defval: '' });
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !String(row[0] || '').trim()) continue;
        materials.push({
          id: `mat-${r}`,
          material: String(row[0] || '').trim(),
          unit: String(row[1] || '').trim(),
          recv: parseOptionalNum(row[2]),
          used: parseOptionalNum(row[3]),
          mirMar: String(row[4] || '').trim(),
          isLocked: parseIsLocked(row[5], false)
        });
      }
    }

    // 6. Parse 06_Issues
    const issues: IssueRow[] = [];
    const wsIss = wb.Sheets['06_Issues'];
    if (wsIss) {
      const rows: unknown[][] = XLSX.utils.sheet_to_json(wsIss, { header: 1, defval: '' });
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || (!String(row[0] || '').trim() && !String(row[1] || '').trim())) continue;
        issues.push({
          id: `iss-${r}`,
          issueId: String(row[0] || '').trim(),
          description: String(row[1] || '').trim(),
          severity: String(row[2] || 'Trung bình').trim(),
          criticalPath: String(row[3] || '–').trim(),
          owner: String(row[4] || '').trim(),
          dueDate: String(row[5] || '').trim(),
          status: String(row[6] || 'Mở').trim(),
          isLocked: parseIsLocked(row[7], false)
        });
      }
    }

    const doc: ReportDoc = {
      docId,
      unit,
      dateStr,
      metadata,
      manpower: manpower.length > 0 ? manpower : defaults.manpower,
      equipment: equipment.length > 0 ? equipment : defaults.equipment,
      workItems: workItems.length > 0 ? workItems : defaults.workItems,
      materials: materials.length > 0 ? materials : defaults.materials,
      issues: issues.length > 0 ? issues : defaults.issues,
      tasks: []
    };
    doc.metadata.dataChecks = formatDataChecksString(doc);
    return doc;
  }

  // Fallback: Legacy 1-sheet template (e.g. WeeklyReport or old DailyReport_template.xlsx on SharePoint)
  const cleanUnit = unit.trim().toLowerCase();
  const sheetName =
    wb.SheetNames.find((s) => s.trim().toLowerCase() === cleanUnit) ||
    wb.SheetNames[0];

  if (!sheetName) {
    throw new Error('File Excel không có sheet dữ liệu hợp lệ');
  }

  const ws = wb.Sheets[sheetName];
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let headerRowIdx = -1;
  const maxHeaderSearch = Math.min(rawRows.length, 15);

  for (let r = 0; r < maxHeaderSearch; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const col0 = String(row[0] || '').trim();
    const col0Lower = col0.toLowerCase();
    const col1 = String(row[1] || '').trim();

    if (col0Lower === 'id' || col0Lower === 'stt' || String(row[1] || '').toLowerCase().includes('công việc')) {
      headerRowIdx = r;
      break;
    }

    if (col0Lower === 'doctile' || col0Lower === 'doctitle') {
      if (col1) metadata.docTitle = col1;
    } else if (col0Lower === 'subtile' || col0Lower === 'subtitle') {
      if (col1) metadata.subTitle = col1;
    } else if (col0Lower === 'doccode') {
      if (col1) metadata.docCode = col1;
    } else if (col0Lower === 'location') {
      if (col1) metadata.location = col1;
    } else if (col0Lower === 'reportno') {
      if (col1) metadata.reportNo = col1;
    } else if (col0Lower === 'shift') {
      if (col1) metadata.shift = col1;
    } else if (col0Lower === 'email') {
      if (col1) metadata.email = col1;
    } else if (col0Lower === 'updatetime') {
      if (col1) metadata.updateTime = col1;
    }
  }

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

      const completionRate = parseOptionalNum(row[rateIdx]);
      const quantity = parseOptionalNum(row[qtyIdx]);
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

  const isWeekly = docId.toLowerCase().includes('week');
  const recalculatedTasks = isWeekly ? recalculateAllRates(tasks) : [];

  const doc: ReportDoc = {
    docId,
    unit,
    dateStr,
    metadata,
    manpower: defaults.manpower,
    equipment: defaults.equipment,
    workItems: defaults.workItems,
    materials: defaults.materials,
    issues: defaults.issues,
    tasks: recalculatedTasks
  };
  doc.metadata.dataChecks = formatDataChecksString(doc);
  return doc;
}

/**
 * Encode ReportDoc into a 6-sheet Excel ArrayBuffer:
 * 01_General, 02_Manpower, 03_Equipment, 04_WorkQty, 05_Materials, 06_Issues
 */
export async function encodeReportDocToBuffer(
  doc: ReportDoc,
  _templateBuffer?: ArrayBuffer
): Promise<ArrayBuffer> {
  const XLSX = await getXlsx();
  const wb = XLSX.utils.book_new();

  const m = doc.metadata;
  const dataChecksStr = formatDataChecksString(doc);

  // 1. Sheet 01_General
  const generalRows: (string | number)[][] = [
    ['Key', 'Value', 'Mô tả'],
    ['DocTile', m.docTitle || 'BÁO CÁO NGÀY', 'Tiêu đề chính (VI)'],
    ['DocTileEn', m.docTitleEn || 'DAILY REPORT', 'Tiêu đề chính (EN)'],
    ['SubTile', m.subTitle || '', 'Tên dự án / gói thầu'],
    ['DocCode', m.docCode || '', 'Mã tài liệu'],
    ['Location', m.location || doc.unit, 'Vị trí / Trạm'],
    ['ReportNo', m.reportNo || '', 'Số BCN'],
    ['ReportDate', doc.dateStr || '', 'Ngày báo cáo'],
    ['Shift', m.shift || '', 'Ca làm việc'],
    ['WeatherAM', m.weatherAM || '', 'Thời tiết Sáng (AM)'],
    ['WeatherPM', m.weatherPM || '', 'Thời tiết Chiều (PM)'],
    ['MaxTemp', m.maxTemp || '', 'Nhiệt độ max'],
    ['HrsLost', m.hrsLost ?? 0, 'Giờ mất do thời tiết'],
    ['ProgressEval', m.progressEval || 'Đạt', 'Đánh giá tiến độ'],
    ['Summary', m.summary || '', 'I. Tóm tắt công việc & giải trình'],
    ['ManpowerSummary', m.manpowerSummary || '', 'II. Tóm tắt nhân lực'],
    ['EquipmentSummary', m.equipmentSummary || '', 'III. Tóm tắt thiết bị'],
    ['WorkQtySummary', m.workQtySummary || '', 'IV. Tóm tắt khối lượng'],
    ['MaterialsSummary', m.materialsSummary || '', 'V. Tóm tắt vật tư'],
    ['WorksPlanSummary', m.worksPlanSummary || '', 'VI. Tóm tắt công việc & kế hoạch'],
    ['IssuesSummary', m.issuesSummary || '', 'VII. Tóm tắt vướng mắc'],
    ['WorksToday', m.worksToday || '', 'VI. Công việc thực hiện hôm nay'],
    ['PlanTomorrow', m.planTomorrow || '', 'VI. Kế hoạch ngày mai'],
    ['HseIncidents', m.hseIncidents ?? 0, 'VIII. Sự cố HSE'],
    ['HseInspections', m.hseInspections ?? 0, 'VIII. Kiểm tra ATLĐ'],
    ['InspectionRequests', m.inspectionRequests ?? 0, 'VIII. Nghiệm thu (IR)'],
    ['NewNCR', m.newNCR ?? 0, 'VIII. NCR mới'],
    ['PhotosCount', m.photosCount ?? 0, 'VIII. Số ảnh hiện trường'],
    ['PhotosFolder', m.photosFolder || `BCN_AnhHienTruong/${doc.unit}/${doc.dateStr}`, 'Đường dẫn thư mục ảnh'],
    ['IncidentDetails', m.incidentDetails || 'Không có | None', 'VIII. Mô tả sự cố'],
    ['EngineerInstructions', m.engineerInstructions || '', 'VIII. Chỉ thị/ý kiến TVGS'],
    ['PlanSummary', m.planSummary || '', 'VIII. Kế hoạch ngày mai (tóm tắt)'],
    ['PreparedBy', m.preparedBy || m.email || '', 'Người lập'],
    ['Email', m.email || '', 'Email người lập'],
    ['UpdateTime', m.updateTime || new Date().toISOString(), 'Thời gian nộp'],
    ['SiteManager', m.siteManager || '', 'Trưởng ga / CHT'],
    ['ApprovedAt', m.approvedAt || '', 'Thời gian duyệt'],
    ['TcjvRep', m.tcjvRep || '', 'Đại diện TCJV'],
    ['EngineerAck', m.engineerAck || '', 'TVGS xác nhận'],
    ['ApprovalComment', m.approvalComment || '', 'Ý kiến duyệt'],
    ['DataChecks', dataChecksStr, 'Chuỗi kiểm tra K01..K12']
  ];
  const wsGeneral = XLSX.utils.aoa_to_sheet(generalRows);
  wsGeneral['!cols'] = [{ wch: 22 }, { wch: 70 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsGeneral, '01_General');

  // 2. Sheet 02_Manpower
  const mpRows: (string | number)[][] = [['Org', 'Category', 'Nos', 'Hrs', 'ManHrs', 'IsLocked']];
  doc.manpower.forEach((r) => {
    const nos = r.nos ?? 0;
    const hrs = r.hrs ?? 0;
    const manHrs = Math.round(nos * hrs * 100) / 100;
    mpRows.push([r.org || '', r.category || '', nos, hrs, manHrs, r.isLocked ? 'TRUE' : 'FALSE']);
  });
  const wsMp = XLSX.utils.aoa_to_sheet(mpRows);
  wsMp['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsMp, '02_Manpower');

  // 3. Sheet 03_Equipment
  const eqRows: (string | number)[][] = [['Equipment', 'Qty', 'Hrs', 'Status', 'Remark', 'IsLocked']];
  doc.equipment.forEach((r) => {
    eqRows.push([
      r.equipment || '',
      r.qty ?? 0,
      r.hrs ?? 0,
      r.status || 'Hoạt động',
      r.remark || '',
      r.isLocked ? 'TRUE' : 'FALSE'
    ]);
  });
  const wsEq = XLSX.utils.aoa_to_sheet(eqRows);
  wsEq['!cols'] = [{ wch: 32 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 28 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsEq, '03_Equipment');

  // 4. Sheet 04_WorkQty
  const wqRows: (string | number)[][] = [['ActivityID', 'Item', 'Unit', 'Plan', 'Actual', 'Percent', 'Remark', 'IsLocked']];
  doc.workItems.forEach((r) => {
    const plan = r.plan ?? 0;
    const actual = r.actual ?? 0;
    const pct = plan > 0 ? Math.round((actual / plan) * 100) : r.percent ?? 0;
    wqRows.push([
      r.activityId || '',
      r.item || '',
      r.unit || '',
      plan,
      actual,
      pct,
      r.remark || '',
      r.isLocked ? 'TRUE' : 'FALSE'
    ]);
  });
  const wsWq = XLSX.utils.aoa_to_sheet(wqRows);
  wsWq['!cols'] = [{ wch: 18 }, { wch: 34 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 24 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsWq, '04_WorkQty');

  // 5. Sheet 05_Materials
  const matRows: (string | number)[][] = [['Material', 'Unit', 'Recv', 'Used', 'MirMar', 'IsLocked']];
  doc.materials.forEach((r) => {
    matRows.push([
      r.material || '',
      r.unit || '',
      r.recv ?? 0,
      r.used ?? 0,
      r.mirMar || '',
      r.isLocked ? 'TRUE' : 'FALSE'
    ]);
  });
  const wsMat = XLSX.utils.aoa_to_sheet(matRows);
  wsMat['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 28 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsMat, '05_Materials');

  // 6. Sheet 06_Issues
  const issRows: (string | number)[][] = [
    ['IssueID', 'Description', 'Severity', 'CriticalPath', 'Owner', 'DueDate', 'Status', 'IsLocked']
  ];
  doc.issues.forEach((r) => {
    issRows.push([
      r.issueId || '',
      r.description || '',
      r.severity || 'Trung bình',
      r.criticalPath || '–',
      r.owner || '',
      r.dueDate || '',
      r.status || 'Mở',
      r.isLocked ? 'TRUE' : 'FALSE'
    ]);
  });
  const wsIss = XLSX.utils.aoa_to_sheet(issRows);
  wsIss['!cols'] = [{ wch: 16 }, { wch: 50 }, { wch: 14 }, { wch: 12 }, { wch: 24 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsIss, '06_Issues');

  // Optional: If tasks exist (WeeklyReport), also include a 07_Tasks sheet
  if (doc.tasks && doc.tasks.length > 0) {
    const taskRows: (string | number)[][] = [['ID', 'Tên công việc', 'Tỉ lệ hoàn thành', 'Khối lượng', 'Đơn vị']];
    doc.tasks.forEach((t) => {
      taskRows.push([t.id, t.taskName, t.completionRate ?? '', t.quantity ?? '', t.unit || '']);
    });
    const wsTasks = XLSX.utils.aoa_to_sheet(taskRows);
    wsTasks['!cols'] = [{ wch: 10 }, { wch: 35 }, { wch: 18 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsTasks, '07_Tasks');
  }

  const array = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return array as ArrayBuffer;
}
