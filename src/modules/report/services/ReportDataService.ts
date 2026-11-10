import { ReportDoc } from '../types/report.types';
import { parseReportDocFromBuffer, encodeReportDocToBuffer } from '../utils/reportCodec';
import { ReportFileService } from './ReportFileService';
import { ReportTemplateService } from './ReportTemplateService';

export interface LoadedReportResult {
  doc: ReportDoc;
  templateBuffer?: ArrayBuffer;
  isExisting: boolean;
}

export class ReportDataService {
  private _fileService: ReportFileService;
  private _templateService: ReportTemplateService;

  constructor(fileService: ReportFileService, templateService: ReportTemplateService) {
    this._fileService = fileService;
    this._templateService = templateService;
  }

  /**
   * Load report for unit, docId and dateStr.
   * If existing file is found in data/<Unit>/<DocID>_<yyyyMMdd>/, loads it.
   * Otherwise loads fresh from template.
   */
  public async loadReport(
    docId: string,
    unit: string,
    dateStr: string,
    currentUserEmail: string
  ): Promise<LoadedReportResult> {
    // 1. Check if existing report file exists
    const existingFile = await this._fileService.getReportFileWithMeta(unit, docId, dateStr);

    // Fetch template buffer in parallel (for preserving layout/styles on save)
    let templateBuffer: ArrayBuffer | undefined;
    try {
      templateBuffer = await this._fileService.getTemplateBuffer(docId);
    } catch {
      // Template load fallback handled on save if undefined
    }

    if (existingFile && existingFile.buffer) {
      const doc = await parseReportDocFromBuffer(existingFile.buffer, docId, unit, dateStr);
      doc.eTag = existingFile.eTag;
      doc.isExisting = true;
      return {
        doc,
        templateBuffer,
        isExisting: true
      };
    }

    // 2. Load fresh from template
    const templateResult = await this._templateService.getTemplate(
      docId,
      unit,
      dateStr,
      currentUserEmail
    );

    return {
      doc: templateResult.doc,
      templateBuffer: templateResult.templateBuffer,
      isExisting: false
    };
  }

  /**
   * Save report: encodes buffer and uploads to SharePoint library
   */
  public async saveReport(
    doc: ReportDoc,
    templateBuffer?: ArrayBuffer
  ): Promise<{ serverRelativeUrl: string; eTag?: string }> {
    // Update metadata updateTime
    doc.metadata.updateTime = new Date().toISOString();

    const buffer = await encodeReportDocToBuffer(doc, templateBuffer);
    return await this._fileService.saveReportFile(
      doc.unit,
      doc.docId,
      doc.dateStr,
      buffer,
      doc.eTag
    );
  }
}

