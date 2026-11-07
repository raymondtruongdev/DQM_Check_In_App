import * as React from 'react';
import { ModuleProps } from '../../core/types';
import { SharePointClient } from '../../core/services';
import { PROGRESS_STORAGE_KEYS } from './constants/progressStorageKeys';
import { RoleEntry } from './types/progress.types';
import {
  ProgressDataService,
  ProgressFileService,
  ProgressRoleService,
  ProgressSummaryService,
  ProgressTemplateService,
  UserRoleResolution
} from './services';
import { NoAccessState } from './components/NoAccessState';
import { UnitPicker } from './components/UnitPicker';
import { ProgressEntryView } from './views/ProgressEntryView';
import { ProgressSummaryView } from './views/ProgressSummaryView';
import { ProgressSiteLandingView } from './views/ProgressSiteLandingView';
import './progress.css';

export const ProgressModule: React.FC<ModuleProps> = (props) => {
  const {
    currentUser,
    spHttpClient,
    siteUrl,
    onGoHome
  } = props;

  const isAdmin = !!currentUser?.isAdmin;
  const effectiveEmail = currentUser?.email || currentUser?.username || '';
  const userDisplayName = currentUser?.displayName || currentUser?.username || 'User';

  // Initialize services once
  const sharePointClient = React.useMemo(() => new SharePointClient(spHttpClient), [spHttpClient]);
  const fileService = React.useMemo(() => new ProgressFileService(sharePointClient, siteUrl), [sharePointClient, siteUrl]);
  const roleService = React.useMemo(() => new ProgressRoleService(fileService), [fileService]);
  const templateService = React.useMemo(() => new ProgressTemplateService(fileService), [fileService]);
  const dataService = React.useMemo(() => new ProgressDataService(fileService, templateService), [fileService, templateService]);
  const summaryService = React.useMemo(() => new ProgressSummaryService(fileService, templateService), [fileService, templateService]);

  // View navigation state
  const [viewMode, setViewMode] = React.useState<'landing' | 'detail'>('landing');

  // Active tab inside detail view
  const [activeTab, setActiveTab] = React.useState<'entry' | 'summary'>(() => {
    try {
      const saved = localStorage.getItem(PROGRESS_STORAGE_KEYS.ACTIVE_TAB);
      return saved === 'summary' ? 'summary' : 'entry';
    } catch {
      return 'entry';
    }
  });

  const [loadingRoles, setLoadingRoles] = React.useState<boolean>(true);
  const [roleResolution, setRoleResolution] = React.useState<UserRoleResolution | null>(null);
  const [selectedDocId, setSelectedDocId] = React.useState<string>('');
  const [selectedUnit, setSelectedUnit] = React.useState<string>('');

  // Save active tab
  const handleTabChange = (tab: 'entry' | 'summary'): void => {
    setActiveTab(tab);
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEYS.ACTIVE_TAB, tab);
    } catch {
      // Ignore storage errors
    }
  };

  // Load and resolve roles
  const loadRoles = React.useCallback(async (): Promise<void> => {
    setLoadingRoles(true);
    try {
      const resolution = await roleService.resolveUserRoles(effectiveEmail, isAdmin);
      setRoleResolution(resolution);

      if (resolution.assignedRoles.length > 0) {
        // Try restoring last selected DocID & Unit from localStorage
        let initialDocId = resolution.assignedRoles[0].docId;
        let initialUnit = resolution.assignedRoles[0].unit;

        try {
          const lastDoc = localStorage.getItem(PROGRESS_STORAGE_KEYS.LAST_DOC_ID);
          const lastUnit = localStorage.getItem(PROGRESS_STORAGE_KEYS.LAST_UNIT);
          if (lastDoc && lastUnit) {
            const match = resolution.assignedRoles.find(
              (r) => r.docId === lastDoc && r.unit.toLowerCase() === lastUnit.toLowerCase()
            );
            if (match) {
              initialDocId = match.docId;
              initialUnit = match.unit;
            }
          }
        } catch {
          // Ignore storage errors
        }

        setSelectedDocId(initialDocId);
        setSelectedUnit(initialUnit);
      }
    } catch (err: unknown) {
      console.error('Error resolving roles:', err);
    } finally {
      setLoadingRoles(false);
    }
  }, [roleService, effectiveEmail, isAdmin]);

  React.useEffect(() => {
    loadRoles().catch(() => {});
  }, [loadRoles]);

  // Handle changing Unit selection in Detail View
  const handleSelectUnit = (docId: string, unit: string): void => {
    setSelectedDocId(docId);
    setSelectedUnit(unit);
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEYS.LAST_DOC_ID, docId);
      localStorage.setItem(PROGRESS_STORAGE_KEYS.LAST_UNIT, unit);
    } catch {
      // Ignore storage errors
    }
  };

  // Handle unit tab switch on Landing Page
  const handleSelectLandingUnit = (unit: string): void => {
    setSelectedUnit(unit);
    if (roleResolution) {
      const match = roleResolution.assignedRoles.find((r) => r.unit.toLowerCase() === unit.toLowerCase());
      if (match) {
        setSelectedDocId(match.docId);
      }
    }
  };

  // Open a specific work package from Landing Page
  const handleOpenWorkPackage = (docId: string, unit: string, defaultTab: 'entry' | 'summary'): void => {
    setSelectedDocId(docId);
    setSelectedUnit(unit);
    setActiveTab(defaultTab);
    setViewMode('detail');
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEYS.LAST_DOC_ID, docId);
      localStorage.setItem(PROGRESS_STORAGE_KEYS.LAST_UNIT, unit);
      localStorage.setItem(PROGRESS_STORAGE_KEYS.ACTIVE_TAB, defaultTab);
    } catch {
      // Ignore storage errors
    }
  };

  // Currently selected role assignment
  const currentRole = React.useMemo<RoleEntry | undefined>(() => {
    if (!roleResolution) return undefined;
    return roleResolution.assignedRoles.find(
      (r) => r.docId === selectedDocId && r.unit.toLowerCase() === selectedUnit.toLowerCase()
    ) || roleResolution.assignedRoles[0];
  }, [roleResolution, selectedDocId, selectedUnit]);

  return (
    <div className="progress-module-container">
      {/* Top Header */}
      <header className="progress-header">
        <div className="progress-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {viewMode === 'detail' ? (
              <button
                type="button"
                onClick={() => setViewMode('landing')}
                title={`Quay lại danh sách mảng việc tại ${selectedUnit}`}
                style={{
                  padding: '6px 10px',
                  background: 'var(--color-bg-secondary, #f1f5f9)',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: 'var(--radius-sm, 4px)',
                  color: 'var(--color-primary, #1d4ed8)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Danh sách gói việc ({selectedUnit})
              </button>
            ) : (
              onGoHome && (
                <button
                  type="button"
                  onClick={onGoHome}
                  title="Quay lại Trang Chủ"
                  style={{
                    padding: '4px 8px',
                    background: 'var(--color-bg-secondary, #f1f5f9)',
                    border: '1px solid var(--color-border, #e2e8f0)',
                    borderRadius: 'var(--radius-sm, 4px)',
                    color: 'var(--color-text-secondary, #475569)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Trang chủ
                </button>
              )
            )}

            <h1 className="progress-header-title">
              {viewMode === 'detail' && currentRole
                ? (currentRole.docTitle || currentRole.docId)
                : 'Quản lý tiến độ thi công'}
            </h1>
          </div>
          <div
            className="progress-header-user-info"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'var(--color-text-secondary, #475569)',
              flexWrap: 'wrap',
              marginTop: '4px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>
              Người cập nhật: <strong>{userDisplayName}</strong> {effectiveEmail ? `(${effectiveEmail})` : ''}
            </span>
            {isAdmin && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '1px 7px',
                  borderRadius: '999px',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c'
                }}
              >
                Admin
              </span>
            )}
          </div>
        </div>

        {/* Header Right: Navigation tabs & Unit picker (Only in detail view) */}
        {viewMode === 'detail' && roleResolution && roleResolution.assignedRoles.length > 0 && (
          <div className="progress-header-right">
            <UnitPicker
              assignments={roleResolution.assignedRoles}
              selectedDocId={selectedDocId}
              selectedUnit={selectedUnit}
              onSelect={handleSelectUnit}
            />

            <nav className="progress-nav-tabs" aria-label="Chế độ xem tiến độ">
              <button
                type="button"
                className={`progress-tab-btn ${activeTab === 'entry' ? 'is-active' : ''}`}
                onClick={() => handleTabChange('entry')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Cập nhật ngày
              </button>
              <button
                type="button"
                className={`progress-tab-btn ${activeTab === 'summary' ? 'is-active' : ''}`}
                onClick={() => handleTabChange('summary')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                Tổng hợp tiến độ
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      {loadingRoles ? (
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
          Đang xác thực quyền cập nhật...
        </div>
      ) : !roleResolution || roleResolution.assignedRoles.length === 0 ? (
        <NoAccessState userEmail={effectiveEmail} onRefresh={loadRoles} />
      ) : viewMode === 'landing' ? (
        <ProgressSiteLandingView
          assignments={roleResolution.assignedRoles}
          selectedUnit={selectedUnit || (roleResolution.assignedRoles[0] && roleResolution.assignedRoles[0].unit) || 'ST01'}
          onSelectUnit={handleSelectLandingUnit}
          onOpenWorkPackage={handleOpenWorkPackage}
        />
      ) : currentRole ? (
        activeTab === 'entry' ? (
          <ProgressEntryView
            dataService={dataService}
            selectedDocId={selectedDocId}
            selectedUnit={selectedUnit}
            currentRole={currentRole}
            userDisplayName={userDisplayName}
            userEmail={effectiveEmail}
            isAdmin={isAdmin}
          />
        ) : (
          <ProgressSummaryView
            summaryService={summaryService}
            selectedDocId={selectedDocId}
            selectedUnit={selectedUnit}
          />
        )
      ) : null}
    </div>
  );
};
