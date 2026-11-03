import { SPHttpClient } from '@microsoft/sp-http';

export interface IDqmCheckinProps {
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  userDisplayName: string;
  userEmail?: string;
  spHttpClient: SPHttpClient;
  siteUrl: string;
}
