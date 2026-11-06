import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import type { IDqmCheckinProps } from './IDqmCheckinProps';
import type { Data_checkinRead, Data_checkinWrite, UserSession, ViewMode, ToastState } from '../types';
import { SAMPLE_RECORDS, SESSION_STORAGE_KEY } from '../constants';
import { SharePointService } from '../services/SharePointService';
import { LandingView, CheckinCardsView, CheckinTableView, CheckinEditView } from '../views';
import { TopAppBar, ToastAlert, DeleteConfirmModal, SkeletonLoader, ErrorState } from './index';
import { extractCleanEmail, checkIsAdmin } from '../utils';

export const DqmCheckin: React.FC<IDqmCheckinProps> = (props) => {
  const { spHttpClient, siteUrl, userDisplayName, userEmail, userLoginName } = props;

  // Initialize SharePoint Service
  const spService = useMemo(() => new SharePointService(spHttpClient), [spHttpClient]);

  // Screen state: 'landing' (Portal Home) by default, switching to 'list' on CTA click
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'list'>('landing');

  // View Mode: 'cards' by default as requested (for desktop and mobile)
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Session state
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return null;
  });

  // State to track auto-SSO resolution on startup
  const [isResolvingAuth, setIsResolvingAuth] = useState<boolean>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) return false;
    } catch {
      // Ignore
    }
    return true;
  });

  const [items, setItems] = useState<Data_checkinRead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Edit & Delete View States
  const [editingItem, setEditingItem] = useState<Data_checkinRead | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deletingItem, setDeletingItem] = useState<Data_checkinRead | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toast Notification
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((type: 'success' | 'error', text: string): void => {
    setToast({ type, text });
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Attempt automatic SSO resolution on component mount
  useEffect(() => {
    if (currentUser) {
      setIsResolvingAuth(false);
      return;
    }

    let isMounted = true;
    const autoResolveSSO = async (): Promise<void> => {
      const cleanEmail = extractCleanEmail(userEmail || userLoginName);
      if (!cleanEmail) {
        if (isMounted) setIsResolvingAuth(false);
        return;
      }

      try {
        console.log(`[DqmCheckin] Attempting auto-SSO resolution for: ${cleanEmail}`);
        const profiles = await spService.getUserProfiles(siteUrl);
        const match = profiles.find((p) => {
          return (
            p.email.toLowerCase() === cleanEmail ||
            p.username.toLowerCase() === cleanEmail ||
            extractCleanEmail(p.email) === cleanEmail
          );
        });

        if (match && isMounted) {
          const session: UserSession = {
            email: match.email || cleanEmail,
            username: match.username || match.email,
            displayName: match.displayName || match.username || userDisplayName,
            department: match.departmentName || match.departmentCode,
            departmentCode: match.departmentCode,
            role: match.role,
            isAdmin: checkIsAdmin(match.role),
          };
          console.log('[DqmCheckin] Auto-SSO success:', session);
          setCurrentUser(session);
          try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
          } catch {
            // Ignore
          }
        }
      } catch (err: unknown) {
        console.warn('[DqmCheckin] Auto-SSO resolution check:', err);
      } finally {
        if (isMounted) {
          setIsResolvingAuth(false);
        }
      }
    };

    autoResolveSSO().catch((err) => {
      console.error('[DqmCheckin] autoResolveSSO unhandled error:', err);
      if (isMounted) setIsResolvingAuth(false);
    });

    return () => {
      isMounted = false;
    };
  }, [userEmail, userLoginName, userDisplayName, siteUrl, spService, currentUser]);

  // Fetch items from SharePoint list
  const loadItems = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsDemoMode(false);

    try {
      console.log(`[DqmCheckin] Loading items from site: ${siteUrl}`);
      const data = await spService.getAll(siteUrl);
      console.log(`[DqmCheckin] Successfully retrieved ${data.length} records.`);
      setItems(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[DqmCheckin] Error retrieving items:', err);

      setErrorMessage(
        `Không thể kết nối đến SharePoint list "data_checkin": ${msg}. ` +
        'Hãy kiểm tra lại quyền truy cập hoặc cấu hình site URL.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [spService, siteUrl]);

  // Trigger initial load when authenticated (preload records)
  useEffect(() => {
    if (currentUser) {
      loadItems().catch((err: unknown) => {
        console.error('[DqmCheckin] Error in initial loadItems:', err);
      });
    }
  }, [currentUser, loadItems]);

  // Handle manual refresh
  const handleRefresh = (): void => {
    if (isDemoMode) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        showToast('success', 'Đã làm mới dữ liệu mẫu.');
      }, 500);
      return;
    }

    loadItems()
      .then(() => {
        showToast('success', 'Dữ liệu danh sách đã được đồng bộ mới nhất.');
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        showToast('error', `Làm mới thất bại: ${msg}`);
      });
  };

  // Profile selection (SSO dev/qa switcher)
  const handleSelectProfile = (user: UserSession): void => {
    setCurrentUser(user);
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Ignore
    }
  };

  const handleUseDemoData = (): void => {
    setItems(SAMPLE_RECORDS);
    setIsDemoMode(true);
    setErrorMessage(null);
  };

  // =========================================================================
  // Edit Handlers
  // =========================================================================
  const handleOpenEdit = (item: Data_checkinRead): void => {
    setEditingItem(item);
    setSaveError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseEdit = (): void => {
    setEditingItem(null);
    setSaveError(null);
  };

  const handleSaveEdit = async (changedFields: Partial<Omit<Data_checkinWrite, 'ID'>>): Promise<void> => {
    if (!editingItem || editingItem.ID === undefined) return;

    setIsSaving(true);
    setSaveError(null);

    // If running in demo mode
    if (isDemoMode) {
      setTimeout(() => {
        setItems((prev) =>
          prev.map((it) => (it.ID === editingItem.ID ? { ...it, ...changedFields } : it))
        );
        setIsSaving(false);
        setEditingItem(null);
        showToast('success', 'Changes updated locally (Demo Mode).');
      }, 350);
      return;
    }

    try {
      await spService.update(siteUrl, editingItem.ID, changedFields);

      // Optimistically update local state
      setItems((prev) =>
        prev.map((it) => (it.ID === editingItem.ID ? { ...it, ...changedFields } : it))
      );

      setEditingItem(null);
      showToast('success', `Record #${editingItem.ID} updated successfully.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError(msg);
      showToast('error', `Failed to update record: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // Delete Handlers
  // =========================================================================
  const handleOpenDelete = (item: Data_checkinRead): void => {
    setDeletingItem(item);
  };

  const handleCloseDelete = (): void => {
    if (isDeleting) return;
    setDeletingItem(null);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deletingItem || deletingItem.ID === undefined) return;

    setIsDeleting(true);

    // If running in demo mode
    if (isDemoMode) {
      setTimeout(() => {
        setItems((prev) => prev.filter((it) => it.ID !== deletingItem.ID));
        setIsDeleting(false);
        setDeletingItem(null);
        showToast('success', `Record #${deletingItem.ID} deleted locally (Demo Mode).`);
      }, 350);
      return;
    }

    try {
      await spService.delete(siteUrl, deletingItem.ID);

      // Remove from local state
      setItems((prev) => prev.filter((it) => it.ID !== deletingItem.ID));
      setDeletingItem(null);
      showToast('success', `Record #${deletingItem.ID} deleted successfully.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', `Failed to delete record: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Loading state while checking M365 SSO
  if (isResolvingAuth) {
    return (
      <div className="app-layout">
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <svg className="spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            </svg>
            <p style={{ color: '#475569', fontSize: '15px', fontWeight: 500 }}>
              Đang xác thực danh tính Microsoft 365...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Show Landing Page first with CTA button to jump into the check-in list
  if (currentScreen === 'landing') {
    return (
      <div className="app-layout">
        <LandingView
          currentUser={currentUser}
          onEnterApp={() => setCurrentScreen('list')}
          onSelectProfile={handleSelectProfile}
          spService={spService}
          siteUrl={siteUrl}
          userDisplayName={userDisplayName}
          userEmail={userEmail}
          userLoginName={userLoginName}
          totalRecordsCount={items.length}
        />
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Top App Bar: Home + Email & Role (Left) & View Switcher (Right) */}
      <TopAppBar
        currentUser={currentUser}
        onGoHome={() => setCurrentScreen('landing')}
        activeView={viewMode}
        onViewChange={setViewMode}
      />

      {/* Main Container */}
      <main className="main-content">
        {/* Toast Alert */}
        <ToastAlert toast={toast} onClose={() => setToast(null)} />

        {/* Dynamic State Rendering */}
        {isLoading ? (
          <SkeletonLoader rowCount={6} />
        ) : errorMessage ? (
          <ErrorState
            message={errorMessage}
            onRetry={handleRefresh}
            onUseDemoData={handleUseDemoData}
          />
        ) : editingItem ? (
          <CheckinEditView
            item={editingItem}
            isSaving={isSaving}
            saveError={saveError}
            onSave={handleSaveEdit}
            onBack={handleCloseEdit}
          />
        ) : viewMode === 'cards' ? (
          <CheckinCardsView
            items={items}
            currentUser={currentUser}
            isDemoData={isDemoMode}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />
        ) : (
          <CheckinTableView
            items={items}
            isDemoData={isDemoMode}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            isAdmin={currentUser?.isAdmin}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        item={deletingItem}
        isOpen={Boolean(deletingItem)}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCloseDelete}
      />
    </div>
  );
};

export const DqmCheckinApp = DqmCheckin;
export default DqmCheckin;
