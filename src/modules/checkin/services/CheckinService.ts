import { SharePointClient } from '../../../core/services/SharePointClient';
import type { CheckinRecord, CheckinRecordInput } from '../types';

export const CHECKIN_LIST = 'data_checkin';

export class CheckinService {
  private _client: SharePointClient;

  constructor(client: SharePointClient) {
    this._client = client;
  }

  public getAll(siteUrl: string, listTitle = CHECKIN_LIST): Promise<CheckinRecord[]> {
    return this._client.getItems<CheckinRecord>(siteUrl, listTitle, 5000);
  }

  public update(siteUrl: string, id: number, data: Partial<CheckinRecordInput>, listTitle = CHECKIN_LIST): Promise<void> {
    return this._client.updateItem<CheckinRecordInput>(siteUrl, listTitle, id, data);
  }

  public delete(siteUrl: string, id: number, listTitle = CHECKIN_LIST): Promise<void> {
    return this._client.deleteItem(siteUrl, listTitle, id);
  }
}
