import type * as React from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import type { UserSession } from '../auth/auth.types';

/** Props every module component receives from the portal shell */
export interface ModuleProps {
  currentUser: UserSession | undefined;
  spHttpClient: SPHttpClient;
  siteUrl: string;
  /** Return to the portal Home page */
  onGoHome: () => void;
}

/** Definition a feature module registers with the portal */
export interface PortalModule {
  id: string;
  title: string;
  /** Inner SVG markup node (rendered inside a 32x32 viewBox) */
  icon: React.ReactNode;
  /** 'active' modules open on click; 'comingSoon' show a notice */
  status: 'active' | 'comingSoon';
  /** Present only for active modules */
  component?: React.ComponentType<ModuleProps>;
}
