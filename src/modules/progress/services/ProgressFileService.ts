import { ISharePointFileInfo, SharePointClient } from '../../../core/services';
import { PROGRESS_CONFIG } from '../constants/progressConfig';
import { sanitizeSharePointPath } from '../utils/fileNaming';

export class ProgressFileService {
  private _client: SharePointClient;
  private _siteUrl: string;
  private _libraryName: string;

  constructor(client: SharePointClient, siteUrl: string, libraryName = PROGRESS_CONFIG.LIBRARY_NAME) {
    this._client = client;
    this._siteUrl = siteUrl.replace(/\/+$/, '');
    this._libraryName = libraryName;
  }

  /**
   * Get server-relative path for site web, e.g. /sites/metro-checkin-dev
   */
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

  /**
   * Root path of the document library, e.g. /sites/metro-checkin-dev/CapNhatCongViec
   */
  public getLibraryPath(): string {
    const sitePath = this.getSiteRelativeUrl();
    return `${sitePath}/${this._libraryName}`;
  }

  /**
   * Path to Projects_Role.xlsx
   */
  public getRoleFilePath(): string {
    return `${this.getLibraryPath()}/${PROGRESS_CONFIG.ROLE_FILE_NAME}`;
  }

  /**
   * Path to template folder for a DocID
   */
  public getTemplateFolderPath(docId: string, fallback = false): string {
    const folder = fallback ? PROGRESS_CONFIG.TEMPLATE_FALLBACK_FOLDER : PROGRESS_CONFIG.TEMPLATE_FOLDER;
    const cleanDoc = sanitizeSharePointPath(docId);
    return `${this.getLibraryPath()}/${folder}/${cleanDoc}`;
  }

  /**
   * Path to template file for DocID + Unit
   */
  public getTemplateFilePath(docId: string, unit: string, fallback = false): string {
    const cleanUnit = sanitizeSharePointPath(unit);
    return `${this.getTemplateFolderPath(docId, fallback)}/${cleanUnit}.xlsx`;
  }

  /**
   * Path to data folder for DocID
   */
  public getDataFolderPath(docId: string): string {
    const cleanDoc = sanitizeSharePointPath(docId);
    return `${this.getLibraryPath()}/${PROGRESS_CONFIG.DATA_FOLDER}/${cleanDoc}`;
  }

  /**
   * Path to data file
   */
  public getDataFilePath(docId: string, fileName: string): string {
    return `${this.getDataFolderPath(docId)}/${fileName}`;
  }

  /**
   * Fetch Projects_Role.xlsx buffer
   */
  public async getRoleFileBuffer(): Promise<ArrayBuffer | undefined> {
    const path = this.getRoleFilePath();
    return await this._client.getFileBuffer(this._siteUrl, path);
  }

  /**
   * Fetch template buffer for DocID + Unit
   */
  public async getTemplateBuffer(docId: string, unit: string): Promise<ArrayBuffer | undefined> {
    const primaryPath = this.getTemplateFilePath(docId, unit, false);
    let buf = await this._client.getFileBuffer(this._siteUrl, primaryPath);
    if (!buf) {
      // Try fallback folder without underscore
      const fallbackPath = this.getTemplateFilePath(docId, unit, true);
      buf = await this._client.getFileBuffer(this._siteUrl, fallbackPath);
    }
    return buf;
  }

  /**
   * Fetch data file with ETag
   */
  public async getDataFileWithMeta(
    docId: string,
    fileName: string
  ): Promise<{ buffer: ArrayBuffer; eTag: string } | undefined> {
    const path = this.getDataFilePath(docId, fileName);
    return await this._client.getFileWithMeta(this._siteUrl, path);
  }

  /**
   * Save data file to SharePoint
   */
  public async saveDailyDataFile(
    docId: string,
    fileName: string,
    buffer: ArrayBuffer,
    eTag?: string
  ): Promise<{ serverRelativeUrl: string; eTag?: string }> {
    const folderPath = this.getDataFolderPath(docId);
    // Ensure folder hierarchy exists
    await this._client.ensureFolder(this._siteUrl, folderPath);
    return await this._client.uploadFile(this._siteUrl, folderPath, fileName, buffer, true, eTag);
  }

  /**
   * List all data files for DocID
   */
  public async listDataFiles(docId: string): Promise<ISharePointFileInfo[]> {
    const folderPath = this.getDataFolderPath(docId);
    return await this._client.getFolderFiles(this._siteUrl, folderPath);
  }
}
