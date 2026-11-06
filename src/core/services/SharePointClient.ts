import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';

/**
 * Generic SharePoint list client (REST via SPHttpClient v1).
 * Module-specific services (CheckinService, UserProfileService...) are built on top of it.
 */
export class SharePointClient {
  private _spHttpClient: SPHttpClient;

  constructor(spHttpClient: SPHttpClient) {
    this._spHttpClient = spHttpClient;
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
}
