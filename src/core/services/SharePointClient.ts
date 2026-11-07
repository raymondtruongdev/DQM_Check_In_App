import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';

export interface ISharePointFileInfo {
  name: string;
  serverRelativeUrl: string;
  timeLastModified: string;
  length: number;
  eTag?: string;
}

/**
 * Generic SharePoint client (REST via SPHttpClient v1).
 * Module-specific services (CheckinService, ProgressService, UserProfileService...) are built on top of it.
 */
export class SharePointClient {
  private _spHttpClient: SPHttpClient;

  constructor(spHttpClient: SPHttpClient) {
    this._spHttpClient = spHttpClient;
  }

  private _escapeUrl(url: string): string {
    return url.replace(/'/g, "''");
  }

  private _itemsUrl(siteUrl: string, listTitle: string, id?: number): string {
    const base = `${siteUrl}/_api/web/lists/getbytitle('${listTitle}')/items`;
    return id === undefined ? base : `${base}(${id})`;
  }

  /**
   * Fetch items from a list
   */
  public async getItems<T>(siteUrl: string, listTitle: string, top = 5000): Promise<T[]> {
    const response: SPHttpClientResponse = await this._spHttpClient.get(
      `${this._itemsUrl(siteUrl, listTitle)}?$top=${top}`,
      SPHttpClient.configurations.v1,
      { headers: { 'Accept': 'application/json;odata=nometadata' } }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`SharePoint API Error (${response.status}): ${errText}`);
    }

    const json = await response.json();
    return (json.value || []) as T[];
  }

  /**
   * Update (MERGE) an item in a list
   */
  public async updateItem<T>(siteUrl: string, listTitle: string, id: number, data: Partial<T>): Promise<void> {
    const response: SPHttpClientResponse = await this._spHttpClient.post(
      this._itemsUrl(siteUrl, listTitle, id),
      SPHttpClient.configurations.v1,
      {
        headers: {
          'Accept': 'application/json;odata=nometadata',
          'Content-Type': 'application/json;odata=nometadata',
          'X-HTTP-Method': 'MERGE',
          'If-Match': '*'
        },
        body: JSON.stringify(data)
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to update item: ${errText}`);
    }
  }

  /**
   * Delete an item from a list
   */
  public async deleteItem(siteUrl: string, listTitle: string, id: number): Promise<void> {
    const response: SPHttpClientResponse = await this._spHttpClient.post(
      this._itemsUrl(siteUrl, listTitle, id),
      SPHttpClient.configurations.v1,
      {
        headers: {
          'Accept': 'application/json;odata=nometadata',
          'X-HTTP-Method': 'DELETE',
          'If-Match': '*'
        }
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to delete item: ${errText}`);
    }
  }

  /**
   * Check if a file exists at the given server-relative URL.
   */
  public async fileExists(siteUrl: string, serverRelativeUrl: string): Promise<boolean> {
    const safeUrl = this._escapeUrl(serverRelativeUrl);
    const endpoint = `${siteUrl}/_api/web/GetFileByServerRelativeUrl('${safeUrl}')?$select=Exists,Length`;
    const response: SPHttpClientResponse = await this._spHttpClient.get(
      endpoint,
      SPHttpClient.configurations.v1,
      { headers: { 'Accept': 'application/json;odata=nometadata' } }
    );
    return response.ok;
  }

  /**
   * Fetch binary contents and ETag of a file. Returns undefined if not found (404).
   */
  public async getFileWithMeta(
    siteUrl: string,
    serverRelativeUrl: string
  ): Promise<{ buffer: ArrayBuffer; eTag: string } | undefined> {
    const safeUrl = this._escapeUrl(serverRelativeUrl);
    const endpoint = `${siteUrl}/_api/web/GetFileByServerRelativeUrl('${safeUrl}')/$value`;
    const response: SPHttpClientResponse = await this._spHttpClient.get(
      endpoint,
      SPHttpClient.configurations.v1
    );

    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to get file (${response.status}): ${errText}`);
    }

    const buffer = await response.arrayBuffer();
    const eTag = response.headers.get('ETag') || response.headers.get('etag') || '';
    return { buffer, eTag };
  }

  /**
   * Fetch binary contents of a file as ArrayBuffer.
   */
  public async getFileBuffer(siteUrl: string, serverRelativeUrl: string): Promise<ArrayBuffer | undefined> {
    const res = await this.getFileWithMeta(siteUrl, serverRelativeUrl);
    return res ? res.buffer : undefined;
  }

  /**
   * Upload binary data to a SharePoint folder.
   */
  public async uploadFile(
    siteUrl: string,
    folderServerRelativeUrl: string,
    fileName: string,
    buffer: ArrayBuffer,
    overwrite = true,
    eTag?: string
  ): Promise<{ serverRelativeUrl: string; eTag?: string }> {
    const safeFolder = this._escapeUrl(folderServerRelativeUrl);
    const safeFileName = this._escapeUrl(fileName);
    const endpoint = `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${safeFolder}')/Files/add(url='${safeFileName}',overwrite=${overwrite})`;

    const headers: Record<string, string> = {
      'Accept': 'application/json;odata=nometadata',
      'Content-Type': 'application/octet-stream'
    };
    if (eTag) {
      headers['If-Match'] = eTag;
    }

    const response: SPHttpClientResponse = await this._spHttpClient.post(
      endpoint,
      SPHttpClient.configurations.v1,
      {
        headers,
        body: buffer
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to upload file (${response.status}): ${errText}`);
    }

    const json = await response.json();
    return {
      serverRelativeUrl: json.ServerRelativeUrl || `${folderServerRelativeUrl}/${fileName}`,
      eTag: json.ETag || response.headers.get('ETag') || undefined
    };
  }

  /**
   * Ensure a folder hierarchy exists by creating missing folders step by step.
   */
  public async ensureFolder(siteUrl: string, folderServerRelativeUrl: string): Promise<void> {
    // Normalise slashes
    const cleanPath = folderServerRelativeUrl.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
    const parts = cleanPath.split('/').filter(Boolean);
    if (parts.length === 0) return;

    // Check if whole folder already exists
    const safeUrl = this._escapeUrl(cleanPath);
    const checkRes = await this._spHttpClient.get(
      `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${safeUrl}')?$select=Exists`,
      SPHttpClient.configurations.v1,
      { headers: { 'Accept': 'application/json;odata=nometadata' } }
    );
    if (checkRes.ok) return;

    // Recursively create from top down
    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
      currentPath += '/' + parts[i];
      // Skip top-level sites root
      if (i < 2 && currentPath.toLowerCase().startsWith('/sites/')) {
        continue;
      }
      const safeCurr = this._escapeUrl(currentPath);
      const res = await this._spHttpClient.get(
        `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${safeCurr}')?$select=Exists`,
        SPHttpClient.configurations.v1,
        { headers: { 'Accept': 'application/json;odata=nometadata' } }
      );
      if (!res.ok) {
        // Try creating
        await this._spHttpClient.post(
          `${siteUrl}/_api/web/folders`,
          SPHttpClient.configurations.v1,
          {
            headers: {
              'Accept': 'application/json;odata=nometadata',
              'Content-Type': 'application/json;odata=verbose'
            },
            body: JSON.stringify({
              '__metadata': { 'type': 'SP.Folder' },
              'ServerRelativeUrl': currentPath
            })
          }
        );
      }
    }
  }

  /**
   * List files in a folder.
   */
  public async getFolderFiles(siteUrl: string, folderServerRelativeUrl: string): Promise<ISharePointFileInfo[]> {
    const safeFolder = this._escapeUrl(folderServerRelativeUrl);
    const endpoint = `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${safeFolder}')/Files?$select=Name,ServerRelativeUrl,TimeLastModified,Length,ETag`;
    const response: SPHttpClientResponse = await this._spHttpClient.get(
      endpoint,
      SPHttpClient.configurations.v1,
      { headers: { 'Accept': 'application/json;odata=nometadata' } }
    );

    if (response.status === 404) {
      return [];
    }
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to list files in folder (${response.status}): ${errText}`);
    }

    const json = await response.json();
    const items = (json.value || []) as Array<{
      Name: string;
      ServerRelativeUrl: string;
      TimeLastModified: string;
      Length: string | number;
      ETag?: string;
    }>;

    return items.map((f) => ({
      name: f.Name,
      serverRelativeUrl: f.ServerRelativeUrl,
      timeLastModified: f.TimeLastModified,
      length: typeof f.Length === 'string' ? parseInt(f.Length, 10) : f.Length,
      eTag: f.ETag
    }));
  }
}
