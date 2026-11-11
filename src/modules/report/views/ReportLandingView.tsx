import * as React from 'react';
import { RoleEntry } from '../../../core/types';
import { ReportTile } from '../components/ReportTile';
import { NoAccessState } from '../components/NoAccessState';
import { Icon } from '../../../core/components/Icon';

export interface IReportLandingViewProps {
  assignments: RoleEntry[];
  allRoles?: RoleEntry[];
  userEmail: string;
  selectedUnit: string;
  onSelectUnit: (unit: string) => void;
  onSelectReport: (role: RoleEntry) => void;
  onRefresh: () => void;
  onGoHome: () => void;
  isLoading: boolean;
}

export const ReportLandingView: React.FC<IReportLandingViewProps> = ({
  assignments,
  allRoles = [],
  userEmail,
  selectedUnit,
  onSelectUnit,
  onSelectReport,
  onRefresh,
  onGoHome,
  isLoading
}) => {
  const [searchTerm, setSearchTerm] = React.useState<string>('');

  // Extract list of unique units
  const units = React.useMemo(() => {
    const set = new Set<string>();
    assignments.forEach((a) => {
      if (a.unit) set.add(a.unit.trim());
    });
    return Array.from(set).sort();
  }, [assignments]);

  // Filter assignments by unit and search term
  const filteredAssignments = React.useMemo(() => {
    return assignments.filter((role) => {
      // Unit filter
      if (selectedUnit && selectedUnit !== 'ALL') {
        if (role.unit.trim().toLowerCase() !== selectedUnit.trim().toLowerCase()) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesUnit = role.unit.toLowerCase().includes(term);
        const matchesDocId = role.docId.toLowerCase().includes(term);
        const matchesTitle = (role.docTitle || '').toLowerCase().includes(term);
        const matchesManager = (role.siteManager || '').toLowerCase().includes(term);
        if (!matchesUnit && !matchesDocId && !matchesTitle && !matchesManager) {
          return false;
        }
      }

      return true;
    });
  }, [assignments, selectedUnit, searchTerm]);

  if (!isLoading && assignments.length === 0) {
    return (
      <div className="report-landing-container">
        <div className="report-landing-header">
          <div className="report-landing-header-left">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onGoHome}
              title="Quay về trang chủ Portal"
              aria-label="Về Trang Chủ"
            >
              <Icon name="home" size={20} />
              <span>Trang Chủ</span>
            </button>
            <div className="header-text-group">
              <h2 className="report-landing-title">Quản lý Báo cáo thi công</h2>
            </div>
          </div>

          <div className="report-landing-header-right">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onRefresh}
              disabled={isLoading}
              title="Tải lại danh sách phân quyền"
              aria-label="Làm mới"
            >
              <Icon name="refresh" size={20} spin={isLoading} />
              <span className="btn-label">{isLoading ? 'Đang tải...' : 'Làm mới'}</span>
            </button>
          </div>
        </div>
        <NoAccessState
          userEmail={userEmail}
          allRoles={allRoles}
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  return (
    <div className="report-landing-container">
      {/* 1. Header Banner */}
      <div className="report-landing-header">
        <div className="report-landing-header-left">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onGoHome}
            title="Quay về trang chủ Portal"
            aria-label="Về Trang Chủ"
          >
            <Icon name="home" size={20} />
            <span>Trang Chủ</span>
          </button>
          <div className="header-text-group">
            <h2 className="report-landing-title">Quản lý Báo cáo thi công</h2>
          </div>
        </div>

        <div className="report-landing-header-right">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onRefresh}
            disabled={isLoading}
            title="Tải lại danh sách phân quyền"
            aria-label="Làm mới"
          >
            <Icon name="refresh" size={20} spin={isLoading} />
            <span className="btn-label">{isLoading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* 2. Controls bar: Unit filter tabs & search input */}
      <div className="report-landing-controls">
        <div className="report-unit-tabs">
          <button
            type="button"
            className={`report-unit-tab ${!selectedUnit || selectedUnit === 'ALL' ? 'active' : ''}`}
            onClick={() => onSelectUnit('ALL')}
          >
            Tất cả ({assignments.length})
          </button>
          {units.map((u) => {
            const count = assignments.filter((a) => a.unit.trim().toLowerCase() === u.toLowerCase()).length;
            const isActive = selectedUnit.toLowerCase() === u.toLowerCase();
            return (
              <button
                key={u}
                type="button"
                className={`report-unit-tab ${isActive ? 'active' : ''}`}
                onClick={() => onSelectUnit(u)}
              >
                {u} ({count})
              </button>
            );
          })}
        </div>

        <div className="report-search-wrap">
          <Icon name="search" size={16} className="search-icon" />
          <input
            type="text"
            className="portal-input report-search-input"
            placeholder="Tìm theo mã ga, loại báo cáo, người quản lý..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
              title="Xoá tìm kiếm"
            >
              <Icon name="dismiss" size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 3. Grid of Report Tiles */}
      {isLoading ? (
        <div className="report-loading-state">
          <div className="loading-spinner" />
          <p>Đang tải dữ liệu phân quyền báo cáo...</p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="report-empty-state">
          <p>Không tìm thấy báo cáo phù hợp với điều kiện lọc</p>
        </div>
      ) : (
        <div className="report-tiles-grid">
          {filteredAssignments.map((role) => (
            <ReportTile
              key={`${role.unit}_${role.docId}_${role.id}`}
              role={role}
              onClick={onSelectReport}
            />
          ))}
        </div>
      )}
    </div>
  );
};

