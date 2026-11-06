import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { Data_checkinRead, Data_checkinWrite } from '../models/DataCheckinModel';
import type { UserProfileRecord } from '../types';
import { mapSharePointUserProfile } from '../utils';

export class SharePointService {
  private _spHttpClient: SPHttpClient;

  constructor(spHttpClient: SPHttpClient) {
    this._spHttpClient = spHttpClient;
  }

  /**
   * Fetch all records from data_checkin list
   */
  public async getAll(siteUrl: string, listTitle = 'data_checkin'): Promise<Data_checkinRead[]> {
    const url = `${siteUrl}/_api/web/lists/getbytitle('${listTitle}')/items?$top=5000`;
    const response: SPHttpClientResponse = await this._spHttpClient.get(
      url,
      SPHttpClient.configurations.v1,
      {
        headers: {
          'Accept': 'application/json;odata=nometadata'
        }
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`SharePoint API Error (${response.status}): ${errText}`);
    }

    const json = await response.json();
    return (json.value || []) as Data_checkinRead[];
  }

  /**
   * Fetch all user profiles from UserProfiles list
   */
  public async getUserProfiles(siteUrl: string, listTitle = 'UserProfiles'): Promise<UserProfileRecord[]> {
    const url = `${siteUrl}/_api/web/lists/getbytitle('${listTitle}')/items?$top=1000`;
    const response: SPHttpClientResponse = await this._spHttpClient.get(
      url,
      SPHttpClient.configurations.v1,
      {
        headers: {
          'Accept': 'application/json;odata=nometadata'
        }
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`SharePoint API Error (${response.status}): ${errText}`);
    }

    const json = await response.json();
    const rawList = (json.value || []) as Record<string, unknown>[];
    return rawList.map(mapSharePointUserProfile);
  }

  /**
   * Update a record in data_checkin list
   */
  public async update(
    siteUrl: string,
    id: number,
    data: Partial<Data_checkinWrite>,
    listTitle = 'data_checkin'
  ): Promise<void> {
    const url = `${siteUrl}/_api/web/lists/getbytitle('${listTitle}')/items(${id})`;
    const response: SPHttpClientResponse = await this._spHttpClient.post(
      url,
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
   * Delete a record from data_checkin list
   */
  public async delete(
    siteUrl: string,
    id: number,
    listTitle = 'data_checkin'
  ): Promise<void> {
    const url = `${siteUrl}/_api/web/lists/getbytitle('${listTitle}')/items(${id})`;
    const response: SPHttpClientResponse = await this._spHttpClient.post(
      url,
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
