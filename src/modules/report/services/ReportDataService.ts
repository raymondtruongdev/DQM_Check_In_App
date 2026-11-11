import { ReportDoc, ReportPhotoFile, TemplateVersionInfo } from '../types/report.types';
import { parseReportDocFromBuffer, encodeReportDocToBuffer, formatDataChecksString } from '../utils/reportCodec';
import { isTemplateVersionOutdated } from '../utils/reportFileNaming';
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
   * 1. Checks latest template in _template/ (e.g. template_ST01_20261109.xlsx).
   * 2. If existing file is found in data/<Unit>/<DocID>_<yyyyMMdd>/, loads it and checks if its templateVersion is outdated.
   * 3. Otherwise checks adjacent / closest previous day's report:
   *    - If previous report's templateVersion matches the latest template -> loads previous day's data directly without prompting.
   *    - If previous report's templateVersion is older than the latest template -> sets templateUpdateRequired = true so the UI prompts the user to load the new template first.
   * 4. If no previous report exists, loads fresh from the latest unit template.
   */
  public async loadReport(
    docId: string,
    unit: string,
    dateStr: string,
    currentUserEmail: string,
    siteManager?: string
  ): Promise<LoadedReportResult> {
    const [existingFile, photosList, latestTemplate] = await Promise.all([
      this._fileService.getReportFileWithMeta(unit, docId, dateStr),
      this._fileService.listReportPhotos(unit, docId, dateStr).catch(() => []),
      this._fileService
        .findLatestTemplateForUnit(unit, docId)
        .catch((): { info?: TemplateVersionInfo; buffer?: ArrayBuffer } => ({}))
    ]);

    const templateBuffer = latestTemplate.buffer;
    const latestTemplateInfo = latestTemplate.info;

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
      doc.latestTemplateInfo = latestTemplateInfo;
      if (photos.length > 0) {
        doc.metadata.photosCount = photos.length;
      }
      if (siteManager && !doc.metadata.siteManager) {
        doc.metadata.siteManager = siteManager;
      }

      const isOutdated = isTemplateVersionOutdated(doc.metadata.templateVersion, latestTemplateInfo);
      if (isOutdated) {
        doc.templateUpdateRequired = true;
        doc.outdatedSourceType = 'existing';
        doc.outdatedTemplateVersion = doc.metadata.templateVersion || '';
      } else {
        doc.templateUpdateRequired = false;
        if (latestTemplateInfo?.version && !doc.metadata.templateVersion) {
          doc.metadata.templateVersion = latestTemplateInfo.version;
        }
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
      doc.latestTemplateInfo = latestTemplateInfo;
      doc.metadata.photosCount = photos.length;
      doc.metadata.email = currentUserEmail;
      if (!doc.metadata.preparedBy) {
        doc.metadata.preparedBy = currentUserEmail;
      }
      if (siteManager && !doc.metadata.siteManager) {
        doc.metadata.siteManager = siteManager;
      }
      doc.metadata.updateTime = new Date().toISOString();
      doc.metadata.approvedAt = '';

      const isOutdated = isTemplateVersionOutdated(doc.metadata.templateVersion, latestTemplateInfo);
      if (isOutdated) {
        doc.templateUpdateRequired = true;
        doc.outdatedSourceType = 'previous_day';
        doc.outdatedTemplateVersion = doc.metadata.templateVersion || '';
      } else {
        doc.templateUpdateRequired = false;
        if (latestTemplateInfo?.version) {
          doc.metadata.templateVersion = latestTemplateInfo.version;
        }
      }

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
      siteManager,
      latestTemplate
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
   * Explicitly load the latest unit template from _template/ when the user confirms upgrading from an outdated template
   */
  public async loadLatestTemplateForReport(
    docId: string,
    unit: string,
    dateStr: string,
    currentUserEmail: string,
    siteManager?: string,
    currentDoc?: ReportDoc
  ): Promise<LoadedReportResult> {
    const templateResult = await this._templateService.getTemplate(
      docId,
      unit,
      dateStr,
      currentUserEmail,
      siteManager
    );

    const newDoc = templateResult.doc;
    if (currentDoc) {
      newDoc.eTag = currentDoc.eTag;
      newDoc.isExisting = currentDoc.isExisting;
      if (currentDoc.photos && currentDoc.photos.length > 0) {
        newDoc.photos = currentDoc.photos;
        newDoc.metadata.photosCount = currentDoc.photos.length;
      }
    }
    newDoc.templateUpdateRequired = false;
    newDoc.copiedFromDate = undefined;

    return {
      doc: newDoc,
      templateBuffer: templateResult.templateBuffer,
      isExisting: Boolean(currentDoc?.isExisting)
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
