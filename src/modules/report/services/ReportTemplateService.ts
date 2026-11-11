import { ReportDoc, TemplateVersionInfo } from '../types/report.types';
import { getDefaultDailyReportSections, parseReportDocFromBuffer } from '../utils/reportCodec';
import { ReportFileService } from './ReportFileService';

export class ReportTemplateService {
  private _fileService: ReportFileService;

  constructor(fileService: ReportFileService) {
    this._fileService = fileService;
  }

  /**
   * Load latest versioned template for Unit & DocID (e.g. _template/template_ST01_20261109.xlsx)
   * and initialize a ReportDoc
   */
  public async getTemplate(
    docId: string,
    unit: string,
    dateStr: string,
    currentUserEmail: string,
    siteManager?: string,
    preloadedLatest?: { info?: TemplateVersionInfo; buffer?: ArrayBuffer }
  ): Promise<{ doc: ReportDoc; templateBuffer?: ArrayBuffer; latestTemplateInfo?: TemplateVersionInfo }> {
    const latest = preloadedLatest || (await this._fileService.findLatestTemplateForUnit(unit, docId));
    const buffer = latest.buffer;
    const latestInfo = latest.info;

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
          templateVersion: `default_${unit}`,
          location: `${unit} – Ga ${unit}`,
          reportNo: '001',
          shift: 'Cả ngày (2 ca)',
          email: currentUserEmail,
          updateTime: new Date().toISOString(),
          weatherAM: 'Nắng',
          weatherPM: 'Nắng',
          maxTemp: '33 °C',
          hrsLost: 0,
          progressEval: 'Đạt',
          summary: '',
          worksToday: '',
          planTomorrow: '',
          hseIncidents: 0,
          hseInspections: 0,
          inspectionRequests: 0,
          newNCR: 0,
          photosCount: 0,
          incidentDetails: 'Không có | None',
          engineerInstructions: '',
          planSummary: '',
          preparedBy: currentUserEmail,
          siteManager: siteManager || '',
          tcjvRep: '',
          engineerAck: '',
          approvalComment: ''
        },
        manpower: defaults.manpower,
        equipment: defaults.equipment,
        workItems: defaults.workItems,
        materials: defaults.materials,
        issues: defaults.issues,
        tasks: []
      };
    }

    // Apply unit-specific metadata and template version
    if (latestInfo && latestInfo.version) {
      doc.metadata.templateVersion = latestInfo.version;
      doc.latestTemplateInfo = latestInfo;
    } else if (!doc.metadata.templateVersion) {
      doc.metadata.templateVersion = `default_${unit}`;
    }

    if (!doc.metadata.location || /ST\d+/i.test(doc.metadata.location)) {
      if (!doc.metadata.location || !doc.metadata.location.toUpperCase().includes(unit.toUpperCase())) {
        doc.metadata.location = `${unit} – Ga ${unit}`;
      }
    }
    doc.metadata.docCode = doc.metadata.docCode.replace(/ST\d+/gi, unit);
    doc.metadata.email = currentUserEmail;
    if (!doc.metadata.preparedBy) {
      doc.metadata.preparedBy = currentUserEmail;
    }
    if (siteManager && !doc.metadata.siteManager) {
      doc.metadata.siteManager = siteManager;
    }
    doc.metadata.updateTime = new Date().toISOString();
    doc.dateStr = dateStr;
    doc.templateUpdateRequired = false;

    return {
      doc,
      templateBuffer: buffer,
      latestTemplateInfo: latestInfo
    };
  }
}
