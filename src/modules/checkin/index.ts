import * as React from 'react';
import type { PortalModule } from '../../core/types';
import { CheckinModule } from './CheckinModule';

export const checkinModule: PortalModule = {
  id: 'checkin',
  title: 'Quản lý Check In',
  status: 'active',
  icon: React.createElement(
    React.Fragment,
    null,
    React.createElement('rect', { x: 3, y: 5, width: 26, height: 6, fill: '#ffffff', rx: 1 }),
    React.createElement('rect', { x: 3, y: 5, width: 26, height: 22, stroke: '#ffffff', strokeWidth: 2, rx: 1 }),
    React.createElement('line', { x1: 10, y1: 11, x2: 10, y2: 27, stroke: '#ffffff', strokeWidth: 2 }),
    React.createElement('line', { x1: 17, y1: 11, x2: 17, y2: 27, stroke: '#ffffff', strokeWidth: 2 }),
    React.createElement('line', { x1: 24, y1: 11, x2: 24, y2: 27, stroke: '#ffffff', strokeWidth: 2 })
  ),
  component: CheckinModule,
};

export * from './CheckinModule';
