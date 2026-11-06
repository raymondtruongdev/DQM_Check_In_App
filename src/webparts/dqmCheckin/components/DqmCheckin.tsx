import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import type { IDqmCheckinProps } from './IDqmCheckinProps';
import type { Data_checkinRead, Data_checkinWrite, UserSession, ViewMode, ToastState } from '../types';
import { SAMPLE_RECORDS, SESSION_STORAGE_KEY } from '../constants';
import { SharePointService } from '../services/SharePointService';
import { LoginView, CheckinCardsView, CheckinTableView, CheckinEditView } from '../views';
import { TopAppBar, ToastAlert, DeleteConfirmModal, SkeletonLoader, ErrorState } from './index';

export const DqmCheckin: React.FC<IDqmCheckinProps> = (props) => {
  const { spHttpClient, siteUrl } = props;

  // Initialize SharePoint Service
  const spService = useMemo(() => new SharePointService(spHttpClient), [spHttpClient]);

  // View Mode: 'cards' by default as requested (for desktop and mobile)
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Session state: null by default so user is presented with the Login Page first
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return null;
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

  // Trigger initial load when authenticated
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

  // Auth Handlers
  const handleLoginSuccess = (user: UserSession): void => {
    setCurrentUser(user);
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Ignore
    }
  };

  const handleLogout = (): void => {
    setCurrentUser(null);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
    showToast('success', 'Bạn đã đăng xuất.');
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

  // If user is not signed in, show the Login Page first
  if (!currentUser) {
    return (
      <div className="app-layout">
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          spService={spService}
          siteUrl={siteUrl}
        />
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Top App Bar with View Switcher & Logout */}
      <TopAppBar
        currentUser={currentUser}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        itemCount={items.length}
        onLogout={handleLogout}
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
