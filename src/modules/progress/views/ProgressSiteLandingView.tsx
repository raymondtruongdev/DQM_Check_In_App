import * as React from 'react';
import { RoleEntry } from '../types/progress.types';

export interface IProgressSiteLandingViewProps {
  assignments: RoleEntry[];
  selectedUnit: string;
  onSelectUnit: (unit: string) => void;
  onOpenWorkPackage: (docId: string, unit: string, defaultTab: 'entry' | 'summary') => void;
}

export const ProgressSiteLandingView: React.FC<IProgressSiteLandingViewProps> = ({
  assignments,
  selectedUnit,
  onSelectUnit,
  onOpenWorkPackage
}) => {
  // Extract unique units
  const units = React.useMemo(() => {
    const map = new Map<string, number>();
    assignments.forEach((a) => {
      const u = a.unit.trim();
      map.set(u, (map.get(u) || 0) + 1);
    });
    return Array.from(map.entries()).map(([unitName, count]) => ({
      name: unitName,
      count
    }));
  }, [assignments]);

  // Packages belonging to currently selected unit
  const activePackages = React.useMemo(() => {
    const clean = selectedUnit.trim().toLowerCase();
    return assignments.filter((a) => a.unit.trim().toLowerCase() === clean);
  }, [assignments, selectedUnit]);

  // Search filter
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const filteredPackages = React.useMemo(() => {
    if (!searchTerm.trim()) return activePackages;
    const term = searchTerm.toLowerCase();
    return activePackages.filter((p) => {
      const title = (p.docTitle || '').toLowerCase();
      const docId = p.docId.toLowerCase();
      const manager = (p.siteManager || '').toLowerCase();
      return title.indexOf(term) !== -1 || docId.indexOf(term) !== -1 || manager.indexOf(term) !== -1;
    });
  }, [activePackages, searchTerm]);

  return (
    <div className="progress-site-landing" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Unit (Site) Selector Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          background: 'var(--color-bg-card, #ffffff)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--color-border, #e2e8f0)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary, #475569)', marginRight: '4px' }}>
            Vị trí thi công:
          </span>
          {units.map((u) => {
            const isActive = u.name.trim().toLowerCase() === selectedUnit.trim().toLowerCase();
            return (
              <button
                key={u.name}
                type="button"
                onClick={() => onSelectUnit(u.name)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  borderRadius: 'var(--radius-md, 8px)',
                  border: isActive ? '1px solid var(--color-primary, #1d4ed8)' : '1px solid var(--color-border, #cbd5e1)',
                  background: isActive ? '#eff6ff' : 'var(--color-bg-card, #ffffff)',
                  color: isActive ? 'var(--color-primary, #1d4ed8)' : 'var(--color-text-primary, #0f172a)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{u.name}</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '999px',
                    background: isActive ? 'var(--color-primary, #1d4ed8)' : '#e2e8f0',
                    color: isActive ? '#ffffff' : '#475569',
                    fontWeight: 600
                  }}
                >
                  {u.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Search */}
        {activePackages.length > 2 && (
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <input
              type="text"
              value={searchTerm}
              placeholder="Tìm mảng công việc..."
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px',
                paddingLeft: '32px',
                fontSize: '13px',
                borderRadius: 'var(--radius-md, 6px)',
                border: '1px solid var(--color-border, #cbd5e1)',
                background: 'var(--color-bg-card, #ffffff)',
                color: 'var(--color-text-primary, #0f172a)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-tertiary, #94a3b8)',
                display: 'inline-flex'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
          </div>
        )}
      </div>

      {/* 2. Section Title */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary, #0f172a)', margin: 0 }}>
            Danh sách các mảng công việc tại {selectedUnit}
          </h2>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary, #64748b)', fontWeight: 500 }}>
          {filteredPackages.length} mảng việc
        </span>
      </div>

      {/* 3. Grid of Work Package Cards */}
      {filteredPackages.length === 0 ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            color: 'var(--color-text-secondary, #64748b)',
            background: 'var(--color-bg-card, #ffffff)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--color-border, #e2e8f0)'
          }}
        >
          {searchTerm ? 'Không tìm thấy mảng công việc phù hợp với từ khóa' : `Chưa có mảng công việc nào được gán cho ${selectedUnit}`}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px'
          }}
        >
          {filteredPackages.map((pkg) => {
            const displayName = pkg.docTitle || pkg.docId;

            return (
              <div
                key={`${pkg.unit}-${pkg.docId}`}
                style={{
                  background: 'var(--color-bg-card, #ffffff)',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: 'var(--radius-lg, 12px)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Card Top */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        background: '#f1f5f9',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#475569'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                      {pkg.unit}
                    </span>

                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--color-text-tertiary, #94a3b8)',
                        fontFamily: 'monospace'
                      }}
                    >
                      {pkg.docId}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--color-text-primary, #0f172a)',
                      margin: 0,
                      lineHeight: 1.4
                    }}
                  >
                    {displayName}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary, #475569)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>Phụ trách: <strong>{pkg.siteManager || 'Hiện trường'}</strong></span>
                  </div>
                </div>

                {/* Card Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--color-border, #f1f5f9)'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onOpenWorkPackage(pkg.docId, pkg.unit, 'entry')}
                    className="portal-btn portal-btn-primary"
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Cập nhật
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenWorkPackage(pkg.docId, pkg.unit, 'summary')}
                    className="portal-btn portal-btn-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                    title="Xem biểu đồ và bảng tổng hợp tiến độ"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    Tổng hợp
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

