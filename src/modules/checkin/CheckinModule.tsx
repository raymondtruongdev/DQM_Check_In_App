import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import './checkin.css';
import type { ModuleProps } from '../../core/types';
import type { ViewMode, ToastState } from '../../core/types';
import { TopAppBar, ToastAlert } from '../../core/components';
import { SharePointClient } from '../../core/services';
import type { CheckinRecord, CheckinRecordInput } from './types';
import { SAMPLE_CHECKINS } from './constants';
import { CheckinService } from './services';
import { CheckinCardsView, CheckinTableView, CheckinEditView } from './views';
import { CheckinDeleteModal, CheckinSkeletonLoader, CheckinErrorState } from './components';

export const CheckinModule: React.FC<ModuleProps> = ({ currentUser, spHttpClient, siteUrl, onGoHome }) => {
  const checkinService = useMemo(() => new CheckinService(new SharePointClient(spHttpClient)), [spHttpClient]);

  // View Mode: 'cards' by default (desktop and mobile)
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const [items, setItems] = useState<CheckinRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Edit & Delete View States
  const [editingItem, setEditingItem] = useState<CheckinRecord | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deletingItem, setDeletingItem] = useState<CheckinRecord | null>(null);
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
      console.log(`[CheckinModule] Loading items from site: ${siteUrl}`);
      const data = await checkinService.getAll(siteUrl);
      console.log(`[CheckinModule] Successfully retrieved ${data.length} records.`);
      setItems(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[CheckinModule] Error retrieving items:', err);

      setErrorMessage(
        `Không thể kết nối đến SharePoint list "data_checkin": ${msg}. ` +
        'Hãy kiểm tra lại quyền truy cập hoặc cấu hình site URL.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [checkinService, siteUrl]);

  // Trigger initial load when authenticated (preload records)
  useEffect(() => {
    if (currentUser) {
      loadItems().catch((err: unknown) => {
        console.error('[CheckinModule] Error in initial loadItems:', err);
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

  const handleUseDemoData = (): void => {
    setItems(SAMPLE_CHECKINS);
    setIsDemoMode(true);
    setErrorMessage(null);
  };

  // =========================================================================
  // Edit Handlers
  // =========================================================================
  const handleOpenEdit = (item: CheckinRecord): void => {
    setEditingItem(item);
    setSaveError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseEdit = (): void => {
    setEditingItem(null);
    setSaveError(null);
  };

  const handleSaveEdit = async (changedFields: Partial<Omit<CheckinRecordInput, 'ID'>>): Promise<void> => {
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
      await checkinService.update(siteUrl, editingItem.ID, changedFields);

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
  const handleOpenDelete = (item: CheckinRecord): void => {
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
      await checkinService.delete(siteUrl, deletingItem.ID);

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

  return (
    <div className="app-layout">
      {/* Top App Bar: Home + Email & Role (Left) & View Switcher (Right) */}
      <TopAppBar
        currentUser={currentUser}
        onGoHome={onGoHome}
        activeView={viewMode}
        onViewChange={setViewMode}
      />

      {/* Main Container */}
      <main className="main-content">
        {/* Toast Alert */}
        <ToastAlert toast={toast ?? undefined} onClose={() => setToast(null)} />

        {/* Dynamic State Rendering */}
        {isLoading ? (
          <CheckinSkeletonLoader rowCount={6} />
        ) : errorMessage ? (
          <CheckinErrorState
            message={errorMessage}
            onRetry={handleRefresh}
            onUseDemoData={handleUseDemoData}
          />
        ) : editingItem ? (
          <CheckinEditView
            item={editingItem}
            isSaving={isSaving}
            saveError={saveError ?? undefined}
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
      <CheckinDeleteModal
        item={deletingItem ?? undefined}
        isOpen={Boolean(deletingItem)}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCloseDelete}
      />
    </div>
  );
};

export default CheckinModule;
