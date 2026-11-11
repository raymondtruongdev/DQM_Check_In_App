import { ISharePointFileInfo, SharePointClient } from '../../../core/services';
import { sanitizeSharePointPath } from '../../../core/utils';
import { REPORT_CONFIG } from '../constants/reportConfig';
import {
  getReportFileName,
  getReportFolderRelativePath,
  getReportFileRelativePath,
  getReportPhotosFolderRelativePath,
  getTemplateFileRelativePath,
  getUnitFolderRelativePath
} from '../utils/reportFileNaming';

function getPreviousCalendarDateStr(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dt = new Date(y, m, d);
    if (!isNaN(dt.getTime())) {
      dt.setDate(dt.getDate() - 1);
      const yy = dt.getFullYear();
      const mm = ('0' + (dt.getMonth() + 1)).slice(-2);
      const dd = ('0' + dt.getDate()).slice(-2);
      return `${yy}-${mm}-${dd}`;
    }
  }
  return '';
}

export class ReportFileService {
  private _client: SharePointClient;
  private _siteUrl: string;
  private _libraryName: string;

  constructor(client: SharePointClient, siteUrl: string, libraryName = REPORT_CONFIG.LIBRARY_NAME) {
    this._client = client;
    this._siteUrl = siteUrl.replace(/\/+$/, '');
    this._libraryName = libraryName;
  }

  public getSiteRelativeUrl(): string {
    if (!this._siteUrl) return '';
    try {
      if (this._siteUrl.startsWith('http://') || this._siteUrl.startsWith('https://')) {
        const url = new URL(this._siteUrl);
        return url.pathname.replace(/\/+$/, '');
      }
    } catch {
      // ignore
    }
    return '/' + this._siteUrl.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  public getLibraryPath(): string {
    const sitePath = this.getSiteRelativeUrl();
    return `${sitePath}/${this._libraryName}`;
  }

  /**
   * Path to Report_Role.xlsx
   */
  public getRoleFilePath(): string {
    return `${this.getLibraryPath()}/${REPORT_CONFIG.ROLE_FILE_NAME}`;
  }

  /**
   * Fetch Report_Role.xlsx buffer
   */
  public async getRoleFileBuffer(): Promise<ArrayBuffer | undefined> {
    const path = this.getRoleFilePath();
    return await this._client.getFileBuffer(this._siteUrl, path);
  }

  /**
   * Path to template file for DocID (e.g. DailyReport_template.xlsx)
   */
  public getTemplateFilePath(docId: string): string {
    return getTemplateFileRelativePath(this.getLibraryPath(), docId);
  }

  /**
   * Fetch template buffer for DocID
   */
  public async getTemplateBuffer(docId: string): Promise<ArrayBuffer | undefined> {
    const path = this.getTemplateFilePath(docId);
    let buf = await this._client.getFileBuffer(this._siteUrl, path);
    if (!buf) {
      // Fallback: without underscore e.g. template/DailyReport_template.xlsx
      const fallbackPath = `${this.getLibraryPath()}/template/${sanitizeSharePointPath(docId)}_template.xlsx`;
      buf = await this._client.getFileBuffer(this._siteUrl, fallbackPath);
    }
    return buf;
  }

  /**
   * Fetch existing report file with meta & ETag
   */
  public async getReportFileWithMeta(
    unit: string,
    docId: string,
    dateStr: string
  ): Promise<{ buffer: ArrayBuffer; eTag: string } | undefined> {
    const path = getReportFileRelativePath(this.getLibraryPath(), unit, docId, dateStr);
    return await this._client.getFileWithMeta(this._siteUrl, path);
  }

  /**
   * Find and load the closest previous report file before dateStr
   * (Checks immediate previous day first, then scans unit subfolders for the closest prior date)
   */
  public async getPreviousReportFile(
    unit: string,
    docId: string,
    dateStr: string
  ): Promise<{ buffer: ArrayBuffer; sourceDateStr: string } | undefined> {
    // 1. Try the immediate adjacent previous calendar day (dateStr - 1 day)
    const prevDateStr = getPreviousCalendarDateStr(dateStr);
    if (prevDateStr) {
      try {
        const adjFile = await this.getReportFileWithMeta(unit, docId, prevDateStr);
        if (adjFile && adjFile.buffer) {
          return { buffer: adjFile.buffer, sourceDateStr: prevDateStr };
        }
      } catch {
        // Ignore and fallback to folder scan
      }
    }

    // 2. Scan subfolders in data/<Unit> for the most recent <DocID>_<yyyyMMdd> prior to dateStr
    try {
      const unitFolder = this.getUnitFolderPath(unit);
      const subfolders = await this._client.getFolderSubfolderNames(this._siteUrl, unitFolder);
      if (!subfolders || subfolders.length === 0) return undefined;

      const cleanDocId = sanitizeSharePointPath(docId).toLowerCase();
      const targetCompact = dateStr.replace(/-/g, '');
      const prefix = `${cleanDocId}_`;

      const priorDates: string[] = [];
      for (let i = 0; i < subfolders.length; i++) {
        const name = subfolders[i];
        const lower = name.toLowerCase();
        if (lower.indexOf(prefix) === 0) {
          const compactDate = name.slice(prefix.length).trim();
          if (/^\d{8}$/.test(compactDate) && compactDate < targetCompact) {
            const isoDate = `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}`;
            if (isoDate !== prevDateStr) {
              priorDates.push(isoDate);
            }
          }
        }
      }

      // Sort descending so closest date comes first
      priorDates.sort((a, b) => b.localeCompare(a));

      for (let i = 0; i < Math.min(priorDates.length, 3); i++) {
        const candidateDate = priorDates[i];
        const found = await this.getReportFileWithMeta(unit, docId, candidateDate);
        if (found && found.buffer) {
          return { buffer: found.buffer, sourceDateStr: candidateDate };
        }
      }
    } catch {
      // Ignore folder scan errors
    }

    return undefined;
  }

  /**
   * Check if a report file already exists
   */
  public async reportFileExists(unit: string, docId: string, dateStr: string): Promise<boolean> {
    const path = getReportFileRelativePath(this.getLibraryPath(), unit, docId, dateStr);
    return await this._client.fileExists(this._siteUrl, path);
  }

  /**
   * Path to the Unit folder:
   * <libraryPath>/data/<Unit>
   */
  public getUnitFolderPath(unit: string): string {
    return getUnitFolderRelativePath(this.getLibraryPath(), unit);
  }

  /**
   * Explicitly check and ensure the Unit folder (e.g. data/ST01) exists on SharePoint
   */
  public async ensureUnitFolder(unit: string): Promise<string> {
    const unitFolderPath = this.getUnitFolderPath(unit);
    await this._client.ensureFolder(this._siteUrl, unitFolderPath);
    return unitFolderPath;
  }

  /**
   * Save report file to SharePoint: ensures folder data/<Unit> and data/<Unit>/<DocID>_<yyyyMMdd> exist, then uploads file
   */
  public async saveReportFile(
    unit: string,
    docId: string,
    dateStr: string,
    buffer: ArrayBuffer,
    eTag?: string
  ): Promise<{ serverRelativeUrl: string; eTag?: string }> {
    // 1. Explicitly check and ensure the Unit folder (e.g. data/ST01) exists
    await this.ensureUnitFolder(unit);

    // 2. Ensure the specific report folder exists (e.g. data/ST01/DailyReport_20261110)
    const folderPath = getReportFolderRelativePath(this.getLibraryPath(), unit, docId, dateStr);
    await this._client.ensureFolder(this._siteUrl, folderPath);

    // 3. Upload file
    const fileName = getReportFileName(docId, dateStr);
    return await this._client.uploadFile(this._siteUrl, folderPath, fileName, buffer, true, eTag);
  }

  /**
   * List files in a folder
   */
  public async listFolderFiles(folderRelativePath: string): Promise<ISharePointFileInfo[]> {
    return await this._client.getFolderFiles(this._siteUrl, folderRelativePath);
  }

  /**
   * Path to photos subfolder:
   * <libraryPath>/data/<Unit>/<DocID>_<yyyyMMdd>/photos
   */
  public getReportPhotosFolderPath(unit: string, docId: string, dateStr: string): string {
    return getReportPhotosFolderRelativePath(this.getLibraryPath(), unit, docId, dateStr);
  }

  /**
   * List uploaded photos in data/<Unit>/<DocID>_<yyyyMMdd>/photos
   */
  public async listReportPhotos(unit: string, docId: string, dateStr: string): Promise<ISharePointFileInfo[]> {
    const photosFolder = this.getReportPhotosFolderPath(unit, docId, dateStr);
    const exists = await this._client.folderExists(this._siteUrl, photosFolder);
    if (!exists) return [];
    const files = await this._client.getFolderFiles(this._siteUrl, photosFolder);
    return files.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Upload a photo file into data/<Unit>/<DocID>_<yyyyMMdd>/photos/
   */
  public async uploadReportPhoto(
    unit: string,
    docId: string,
    dateStr: string,
    fileName: string,
    buffer: ArrayBuffer
  ): Promise<ISharePointFileInfo> {
    await this.ensureUnitFolder(unit);
    const reportFolder = getReportFolderRelativePath(this.getLibraryPath(), unit, docId, dateStr);
    await this._client.ensureFolder(this._siteUrl, reportFolder);

    const photosFolder = this.getReportPhotosFolderPath(unit, docId, dateStr);
    await this._client.ensureFolder(this._siteUrl, photosFolder);

    const safeName = sanitizeSharePointPath(fileName) || `photo_${Date.now()}.jpg`;
    const res = await this._client.uploadFile(this._siteUrl, photosFolder, safeName, buffer, true);
    return {
      name: safeName,
      serverRelativeUrl: res.serverRelativeUrl,
      timeLastModified: new Date().toISOString(),
      length: buffer.byteLength,
      eTag: res.eTag
    };
  }

  /**
   * Delete an uploaded photo
   */
  public async deleteReportPhoto(serverRelativeUrl: string): Promise<void> {
    await this._client.deleteFile(this._siteUrl, serverRelativeUrl);
  }
}

