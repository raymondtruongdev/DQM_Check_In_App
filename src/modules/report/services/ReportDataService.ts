import { ReportDoc, ReportPhotoFile } from '../types/report.types';
import { parseReportDocFromBuffer, encodeReportDocToBuffer, formatDataChecksString } from '../utils/reportCodec';
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
   * Also lists uploaded photos in data/<Unit>/<DocID>_<yyyyMMdd>/photos/.
   */
  public async loadReport(
    docId: string,
    unit: string,
    dateStr: string,
    currentUserEmail: string,
    siteManager?: string
  ): Promise<LoadedReportResult> {
    const [existingFile, photosList] = await Promise.all([
      this._fileService.getReportFileWithMeta(unit, docId, dateStr),
      this._fileService.listReportPhotos(unit, docId, dateStr).catch(() => [])
    ]);

    let templateBuffer: ArrayBuffer | undefined;
    try {
      templateBuffer = await this._fileService.getTemplateBuffer(docId);
    } catch {
      // Handled gracefully
    }

    const photos: ReportPhotoFile[] = photosList.map((f) => ({
      name: f.name,
      serverRelativeUrl: f.serverRelativeUrl,
      timeLastModified: f.timeLastModified,
      length: f.length
    }));

    if (existingFile && existingFile.buffer) {
      const doc = await parseReportDocFromBuffer(existingFile.buffer, docId, unit, dateStr);
      doc.eTag = existingFile.eTag;
      doc.isExisting = true;
      doc.photos = photos;
      if (photos.length > 0) {
        doc.metadata.photosCount = photos.length;
      }
      if (siteManager && !doc.metadata.siteManager) {
        doc.metadata.siteManager = siteManager;
      }
      return {
        doc,
        templateBuffer,
        isExisting: true
      };
    }

    // Try loading from the adjacent / closest previous day's report first
    const prevReport = await this._fileService.getPreviousReportFile(unit, docId, dateStr);
    if (prevReport && prevReport.buffer) {
      const doc = await parseReportDocFromBuffer(prevReport.buffer, docId, unit, dateStr);
      doc.dateStr = dateStr;
      doc.isExisting = false;
      doc.eTag = undefined;
      doc.copiedFromDate = prevReport.sourceDateStr;
      doc.photos = photos;
      doc.metadata.photosCount = photos.length;
      doc.metadata.photosFolder = `BCN_AnhHienTruong/${unit}/${dateStr}`;
      doc.metadata.email = currentUserEmail;
      if (!doc.metadata.preparedBy) {
        doc.metadata.preparedBy = currentUserEmail;
      }
      if (siteManager && !doc.metadata.siteManager) {
        doc.metadata.siteManager = siteManager;
      }
      doc.metadata.updateTime = new Date().toISOString();
      doc.metadata.approvedAt = '';
      doc.metadata.dataChecks = formatDataChecksString(doc);

      return {
        doc,
        templateBuffer,
        isExisting: false
      };
    }

    const templateResult = await this._templateService.getTemplate(
      docId,
      unit,
      dateStr,
      currentUserEmail,
      siteManager
    );

    templateResult.doc.photos = photos;
    if (photos.length > 0) {
      templateResult.doc.metadata.photosCount = photos.length;
    }

    return {
      doc: templateResult.doc,
      templateBuffer: templateResult.templateBuffer,
      isExisting: false
    };
  }

  /**
   * Save report: encodes 6-sheet buffer and uploads to SharePoint library
   */
  public async saveReport(
    doc: ReportDoc,
    templateBuffer?: ArrayBuffer
  ): Promise<{ serverRelativeUrl: string; eTag?: string }> {
    doc.metadata.updateTime = new Date().toISOString();
    doc.metadata.dataChecks = formatDataChecksString(doc);

    const buffer = await encodeReportDocToBuffer(doc, templateBuffer);
    return await this._fileService.saveReportFile(
      doc.unit,
      doc.docId,
      doc.dateStr,
      buffer,
      doc.eTag
    );
  }

  /**
   * Upload a photo into data/<Unit>/<DocID>_<yyyyMMdd>/photos/
   */
  public async uploadPhoto(
    unit: string,
    docId: string,
    dateStr: string,
    fileName: string,
    buffer: ArrayBuffer
  ): Promise<ReportPhotoFile> {
    const res = await this._fileService.uploadReportPhoto(unit, docId, dateStr, fileName, buffer);
    return {
      name: res.name,
      serverRelativeUrl: res.serverRelativeUrl,
      timeLastModified: res.timeLastModified,
      length: res.length
    };
  }

  /**
   * Delete an uploaded photo
   */
  public async deletePhoto(serverRelativeUrl: string): Promise<void> {
    await this._fileService.deleteReportPhoto(serverRelativeUrl);
  }
}
