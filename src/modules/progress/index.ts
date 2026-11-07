import * as React from 'react';
import type { PortalModule } from '../../core/types';
import { ProgressModule } from './ProgressModule';

const FOLDER_PATH = 'M4 7h7l3 3h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z';
const FILE_POLYGON = '18,15 24,15 28,19 28,28 18,28';

export const progressModule: PortalModule = {
  id: 'progress',
  title: 'Quản lý tiến độ',
  status: 'active',
  icon: React.createElement(
    React.Fragment,
    null,
    React.createElement('path', { d: FOLDER_PATH, stroke: '#ffffff', strokeWidth: '2' }),
    React.createElement('polygon', {
      points: FILE_POLYGON,
      fill: 'rgba(255, 255, 255, 0.22)',
      stroke: '#ffffff',
      strokeWidth: '1.8',
      strokeLinejoin: 'round'
    }),
    React.createElement('polyline', {
      points: '24,15 24,19 28,19',
      fill: 'none',
      stroke: '#ffffff',
      strokeWidth: '1.8',
      strokeLinejoin: 'round'
    })
  ),
  component: ProgressModule
};

export * from './ProgressModule';

