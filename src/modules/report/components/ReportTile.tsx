import * as React from 'react';
import { RoleEntry } from '../../../core/types';
import { Icon } from '../../../core/components/Icon';

export interface IReportTileProps {
  role: RoleEntry;
  onClick: (role: RoleEntry) => void;
}

export const ReportTile: React.FC<IReportTileProps> = ({ role, onClick }) => {
  const isWeekly = role.docId.toLowerCase().includes('week');

  const handleClick = (): void => {
    onClick(role);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className="report-tile"
    >
      <div className="report-tile-header">
        <span className="report-tile-unit-badge">{role.unit}</span>
        <span className={`report-tile-type-badge ${isWeekly ? 'weekly' : 'daily'}`}>
          {isWeekly ? 'Tuần' : 'Ngày'}
        </span>
      </div>

      <div className="report-tile-body">
        <div className="report-tile-icon-wrap">
          {isWeekly ? (
            <Icon name="calendar-day" size={24} />
          ) : (
            <Icon name="calendar" size={24} />
          )}
        </div>
        <div className="report-tile-title-group">
          <h4 className="report-tile-name">{role.unit} {role.docId}</h4>
          <p className="report-tile-desc">
            {role.docTitle || (isWeekly ? 'Báo cáo tuần' : 'Báo cáo ngày')}
          </p>
        </div>
      </div>

      <div className="report-tile-footer">
        <div className="report-tile-meta">
          <Icon name="person" size={16} />
          <span className="report-tile-manager-text">
            {role.siteManager || 'Chỉ huy trưởng'}
          </span>
        </div>
        <span className="report-tile-cta">
          Nhập báo cáo
          <Icon name="chevron-right" size={16} />
        </span>
      </div>
    </div>
  );
};

