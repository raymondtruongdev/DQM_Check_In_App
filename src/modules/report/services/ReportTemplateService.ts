import { ReportDoc } from '../types/report.types';
import { parseReportDocFromBuffer } from '../utils/reportCodec';
import { ReportFileService } from './ReportFileService';

export class ReportTemplateService {
  private _fileService: ReportFileService;

  constructor(fileService: ReportFileService) {
    this._fileService = fileService;
  }

  /**
   * Load base template for DocID and initialize a blank ReportDoc
   */
  public async getTemplate(
    docId: string,
    unit: string,
    dateStr: string,
    currentUserEmail: string
  ): Promise<{ doc: ReportDoc; templateBuffer: ArrayBuffer }> {
    const buffer = await this._fileService.getTemplateBuffer(docId);
    if (!buffer) {
      throw new Error(`Không tìm thấy template "${docId}_template.xlsx" trong thư mục _template của thư viện`);
    }

    const doc = await parseReportDocFromBuffer(buffer, docId, unit, dateStr);

    // Initialize/override metadata for new report
    doc.metadata.location = unit;
    doc.metadata.email = currentUserEmail;
    doc.metadata.updateTime = new Date().toISOString();
    doc.dateStr = dateStr;

    // Reset values in template so input fields start blank
    doc.tasks = doc.tasks.map((t) => ({
      ...t,
      completionRate: undefined,
      quantity: undefined
    }));

    return {
      doc,
      templateBuffer: buffer
    };
  }
}

