import { SharePointClient } from '../services/SharePointClient';
import type { UserProfileRecord } from './auth.types';
import { mapSharePointUserProfile } from './authUtils';

export const USER_PROFILES_LIST = 'UserProfiles';

export class UserProfileService {
  private _client: SharePointClient;

  constructor(client: SharePointClient) {
    this._client = client;
  }

  /**
   * Fetch all user profiles from UserProfiles list
   */
  public async getUserProfiles(siteUrl: string, listTitle = USER_PROFILES_LIST): Promise<UserProfileRecord[]> {
    const rawList = await this._client.getItems<Record<string, unknown>>(siteUrl, listTitle, 1000);
    return rawList.map(mapSharePointUserProfile);
  }
}
