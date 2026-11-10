import { ReportDoc } from '../types/report.types';
import { getDefaultDailyReportSections, formatDataChecksString, parseReportDocFromBuffer } from '../utils/reportCodec';
import { ReportFileService } from './ReportFileService';

export class ReportTemplateService {
  private _fileService: ReportFileService;

  constructor(fileService: ReportFileService) {
    this._fileService = fileService;
  }

  /**
   * Load base template for DocID and initialize a ReportDoc
   */
  public async getTemplate(
    docId: string,
    unit: string,
    dateStr: string,
    currentUserEmail: string,
    siteManager?: string
  ): Promise<{ doc: ReportDoc; templateBuffer?: ArrayBuffer }> {
    const buffer = await this._fileService.getTemplateBuffer(docId);

    let doc: ReportDoc;
    if (buffer) {
      doc = await parseReportDocFromBuffer(buffer, docId, unit, dateStr);
    } else {
      // Fallback if template file has not been uploaded to _template yet
      const defaults = getDefaultDailyReportSections(unit);
      doc = {
        docId,
        unit,
        dateStr,
        metadata: {
          docTitle: docId === 'WeeklyReport' ? 'BÁO CÁO TUẦN' : 'BÁO CÁO NGÀY',
          docTitleEn: docId === 'WeeklyReport' ? 'WEEKLY REPORT' : 'DAILY REPORT',
          subTitle:
            'Tuyến Metro số 2 – Gói thầu M2.1 Tham Lương – Bến Thành | HCMC Metro Line 2 – Package M2.1',
          docCode: `HCM2_1-23_CS-MAUR_TCJV-CPZZ-${unit}-CWS-RP-041-S3-C01_BCN`,
          location: `${unit} – Ga ${unit} (tên theo DM_ViTri)`,
          reportNo: '041',
          shift: 'Cả ngày (2 ca)',
          email: currentUserEmail,
          updateTime: new Date().toISOString(),
          weatherAM: 'Nắng',
          weatherPM: 'Mưa to',
          maxTemp: '33 °C',
          hrsLost: 1.5,
          progressEval: 'Đạt',
          summary:
            'Thi công tường vây tấm P-12 (đào, hạ lồng thép, đổ bê tông); đào gầu ngoạm tấm P-13; tiếp tục tường dẫn đoạn trục 8–10. Mưa to 14:30–16:00 dừng đào 1,5 giờ. Giải trình K02: VM-' +
            unit +
            '-007 và 009 chưa ảnh hưởng sản lượng hôm nay; bentonite còn đủ 4 ngày.',
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
          preparedBy: currentUserEmail,
          siteManager: siteManager || 'Trương Quốc Toàn',
          approvedAt: '',
          tcjvRep: '',
          engineerAck: '',
          approvalComment: 'Đồng ý; giải trình K02 đã ghi trong tóm tắt',
          dataChecks: ''
        },
        manpower: defaults.manpower,
        equipment: defaults.equipment,
        workItems: defaults.workItems,
        materials: defaults.materials,
        issues: defaults.issues,
        tasks: []
      };
    }

    // Override unit-specific metadata for new report
    doc.metadata.location = `${unit} – Ga ${unit} (tên theo DM_ViTri)`;
    doc.metadata.docCode = doc.metadata.docCode.replace(/ST\d+/g, unit);
    doc.metadata.email = currentUserEmail;
    if (!doc.metadata.preparedBy) {
      doc.metadata.preparedBy = currentUserEmail;
    }
    if (siteManager) {
      doc.metadata.siteManager = siteManager;
    }
    doc.metadata.photosFolder = `BCN_AnhHienTruong/${unit}/${dateStr}`;
    doc.metadata.updateTime = new Date().toISOString();
    doc.dateStr = dateStr;
    doc.metadata.dataChecks = formatDataChecksString(doc);

    return {
      doc,
      templateBuffer: buffer
    };
  }
}
