import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import type { IDqmCheckinProps } from './IDqmCheckinProps';
import { LoginPage } from './LoginPage';
import { TopAppBar } from './TopAppBar';
import { WorkItemsTable } from './WorkItemsTable';
import { SkeletonLoader } from './SkeletonLoader';
import { ErrorState } from './ErrorState';
import { EditItemView } from './EditItemView';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { SharePointService } from '../services/SharePointService';
import type { Data_checkinRead, Data_checkinWrite } from '../models/DataCheckinModel';

// Realistic sample records for instant preview / local development fallback
const SAMPLE_RECORDS: Data_checkinRead[] = [
  {
    ID: 1,
    field_0: 101,
    Title: 'Quarterly Audit Inspection',
    Phone: '+84 901 234 567',
    field_2: '2026-11-03T08:30:00Z',
    field_3: 'Hanoi Logistics Hub',
    field_4: 'Passed preliminary safety and compliance standards',
  },
  {
    ID: 2,
    field_0: 102,
    Title: 'Assembly Line #3 Calibration',
    Phone: '+84 912 345 678',
    field_2: '2026-11-03T09:15:00Z',
    field_3: 'Chu Lai Manufacturing Plant',
    field_4: 'Torque sensors recalibrated to 0.05Nm tolerance',
  },
  {
    ID: 3,
    field_0: 103,
    Title: 'Inbound Material Quality Review',
    Phone: '+84 983 456 789',
    field_2: '2026-11-03T10:00:00Z',
    field_3: 'Da Nang Warehouse C',
    field_4: 'Steel sheet batch #ST-449 verified against metallurgy specs',
  },
  {
    ID: 4,
    field_0: 104,
    Title: 'Paint Shop Airflow Verification',
    Phone: '+84 908 765 432',
    field_2: '2026-11-03T11:45:00Z',
    field_3: 'Chu Lai Main Complex',
    field_4: 'HEPA filters inspected; next scheduled replacement in 45 days',
  },
  {
    ID: 5,
    field_0: 105,
    Title: 'Final Vehicle Road Test',
    Phone: '+84 918 876 543',
    field_2: '2026-11-03T13:20:00Z',
    field_3: 'Test Track Alpha',
    field_4: 'Braking distance and NVH performance within target thresholds',
  },
  {
    ID: 6,
    field_0: 106,
    Title: 'Chassis Welding Ultrasonic Check',
    Phone: '+84 934 567 890',
    field_2: '2026-11-03T14:10:00Z',
    field_3: 'Chu Lai Body Shop',
    field_4: 'Robotic seam welds ultrasonic testing completed with zero defects',
  },
];

interface ToastState {
  type: 'success' | 'error';
  text: string;
}

interface UserSession {
  username: string;
  displayName: string;
}

export const DqmCheckin: React.FC<IDqmCheckinProps> = (props) => {
  const { spHttpClient, siteUrl } = props;

  // Initialize SharePoint Service
  const spService = useMemo(() => new SharePointService(spHttpClient), [spHttpClient]);

  // Session state: null by default so user is presented with the Login Page first
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = sessionStorage.getItem('dqm_spfx_session');
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

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
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

  // Asynchronous data fetcher using SharePoint REST API
  const fetchRecords = useCallback(async () => {
    try {
      const data = await spService.getAll(siteUrl);
      setItems(data);
      setErrorMessage(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [spService, siteUrl]);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsDemoMode(false);
    setEditingItem(null);
    void fetchRecords();
  }, [fetchRecords]);

  // Initial load only after user is authenticated
  useEffect(() => {
    if (!currentUser) return;
    let ignore = false;

    async function initialize() {
      try {
        const data = await spService.getAll(siteUrl);
        if (ignore) return;
        setItems(data);
        setErrorMessage(null);
      } catch (err: unknown) {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      ignore = true;
    };
  }, [spService, siteUrl, currentUser]);

  const handleLoginSuccess = (user: UserSession) => {
    setCurrentUser(user);
    try {
      sessionStorage.setItem('dqm_spfx_session', JSON.stringify(user));
    } catch {
      // Ignore
    }
    showToast('success', `Chào mừng ${user.displayName} đăng nhập thành công!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setEditingItem(null);
    setDeletingItem(null);
    try {
      sessionStorage.removeItem('dqm_spfx_session');
    } catch {
      // Ignore
    }
    showToast('success', 'Bạn đã đăng xuất.');
  };

  const handleUseDemoData = () => {
    setItems(SAMPLE_RECORDS);
    setIsDemoMode(true);
    setErrorMessage(null);
  };

  // =========================================================================
  // Edit Handlers
  // =========================================================================
  const handleOpenEdit = (item: Data_checkinRead) => {
    setEditingItem(item);
    setSaveError(null);
  };

  const handleCloseEdit = () => {
    setEditingItem(null);
    setSaveError(null);
  };

  const handleSaveEdit = async (changedFields: Partial<Omit<Data_checkinWrite, 'ID'>>) => {
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
  const handleOpenDelete = (item: Data_checkinRead) => {
    setDeletingItem(item);
  };

  const handleCloseDelete = () => {
    if (isDeleting) return;
    setDeletingItem(null);
  };

  const handleConfirmDelete = async () => {
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
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          spService={spService}
          siteUrl={siteUrl}
        />
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Top App Bar with Logout */}
      <TopAppBar
        currentUser={currentUser}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        itemCount={items.length}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="main-content">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`app-toast toast-${toast.type}`}
            role="status"
            aria-live="polite"
          >
            <div className="toast-icon" aria-hidden="true">
              {toast.type === 'success' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>
            <span className="toast-message">{toast.text}</span>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              &times;
            </button>
          </div>
        )}

        {/* Dynamic State Rendering */}
        {isLoading ? (
          <SkeletonLoader rowCount={6} />
        ) : errorMessage ? (
          <ErrorState
            message={errorMessage}
            onRetry={handleRefresh}
            onUseDemoData={handleUseDemoData}
          />
        ) : (
          <WorkItemsTable
            items={items}
            isDemoData={isDemoMode}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
          />
        )}
      </main>

      {/* Edit Item Modal */}
      {editingItem && (
        <EditItemView
          item={editingItem}
          isSaving={isSaving}
          saveError={saveError}
          onSave={handleSaveEdit}
          onBack={handleCloseEdit}
        />
      )}

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

export default DqmCheckin;
