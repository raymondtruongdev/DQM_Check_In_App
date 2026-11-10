import { ISharePointFileInfo, SharePointClient } from '../../../core/services';
import { sanitizeSharePointPath } from '../../../core/utils';
import { REPORT_CONFIG } from '../constants/reportConfig';
import {
  getReportFileName,
  getReportFolderRelativePath,
  getReportFileRelativePath,
  getTemplateFileRelativePath,
  getUnitFolderRelativePath
} from '../utils/reportFileNaming';

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
}

