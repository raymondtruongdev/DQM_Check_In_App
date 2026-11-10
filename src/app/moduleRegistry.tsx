import * as React from 'react';
import type { PortalModule } from '../core/types';
import { checkinModule } from '../modules/checkin';
import { progressModule } from '../modules/progress';
import { reportModule } from '../modules/report';

const FOLDER_PATH = 'M4 7h7l3 3h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z';
const FILE_POLYGON = '18,15 24,15 28,19 28,28 18,28';

const folderWithFileIcon = (
  <>
    <path d={FOLDER_PATH} stroke="#ffffff" strokeWidth="2" />
    <polygon points={FILE_POLYGON} fill="rgba(255, 255, 255, 0.22)" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" />
    <polyline points="24,15 24,19 28,19" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" />
  </>
);

const dataIcon = (
  <>
    <path d={FOLDER_PATH} stroke="#ffffff" strokeWidth="2" />
    <polygon points="23,15 29,18.5 29,25.5 23,29 17,25.5 17,18.5" fill="rgba(255, 255, 255, 0.22)" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" />
    <line x1="23" y1="22" x2="23" y2="29" stroke="#ffffff" strokeWidth="1.8" />
    <line x1="17" y1="18.5" x2="23" y2="22" stroke="#ffffff" strokeWidth="1.8" />
    <line x1="29" y1="18.5" x2="23" y2="22" stroke="#ffffff" strokeWidth="1.8" />
  </>
);

/**
 * Registry of all portal modules, in display order.
 * To add a module: create `src/modules/<name>/`, export a PortalModule, and add it here.
 */
export const PORTAL_MODULES: PortalModule[] = [
  checkinModule,
  progressModule,
  reportModule,
  { id: 'data', title: 'Quản lý Data', status: 'comingSoon', icon: dataIcon },
  { id: 'equipment', title: 'Quản lý thiết bị', status: 'comingSoon', icon: folderWithFileIcon },
];
