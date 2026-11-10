import * as React from 'react';
import { RoleEntry } from '../../../core/types';

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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeWidth="2.5" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <circle cx="12" cy="15" r="2" />
            </svg>
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="report-tile-manager-text">
            {role.siteManager || 'Chỉ huy trưởng'}
          </span>
        </div>
        <span className="report-tile-cta">
          Nhập báo cáo
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </div>
    </div>
  );
};

