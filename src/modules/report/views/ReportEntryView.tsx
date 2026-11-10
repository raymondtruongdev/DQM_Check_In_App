import * as React from 'react';
import { RoleEntry, ToastState } from '../../../core/types';
import { ToastAlert } from '../../../core/components/layout/ToastAlert';
import { formatDateToYYYYMMDD } from '../../../core/utils';
import { ReportDoc, ReportMetadata } from '../types/report.types';
import { ReportDataService } from '../services/ReportDataService';
import { recalculateAllRates } from '../utils/reportTaskTree';
import { ReportMetaForm } from '../components/ReportMetaForm';
import { ReportTaskTable } from '../components/ReportTaskTable';

export interface IReportEntryViewProps {
  role: RoleEntry;
  currentUserEmail: string;
  dataService: ReportDataService;
  onBack: () => void;
}

export const ReportEntryView: React.FC<IReportEntryViewProps> = ({
  role,
  currentUserEmail,
  dataService,
  onBack
}) => {
  const [dateStr, setDateStr] = React.useState<string>(() => formatDateToYYYYMMDD(new Date()));
  const [doc, setDoc] = React.useState<ReportDoc | null>(null);
  const [templateBuffer, setTemplateBuffer] = React.useState<ArrayBuffer | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState<boolean>(false);
  const [toast, setToast] = React.useState<ToastState | null>(null);

  // Load report data for selected date
  const loadData = React.useCallback(
    async (targetDate: string): Promise<void> => {
      setIsLoading(true);
      try {
        const result = await dataService.loadReport(
          role.docId,
          role.unit,
          targetDate,
          currentUserEmail
        );
        setDoc(result.doc);
        setTemplateBuffer(result.templateBuffer);
        setHasUnsavedChanges(false);
      } catch (err: unknown) {
        console.error('Error loading report:', err);
        const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi tải mẫu báo cáo';
        setToast({ type: 'error', text: msg });
      } finally {
        setIsLoading(false);
      }
    },
    [dataService, role.docId, role.unit, currentUserEmail]
  );

  React.useEffect(() => {
    loadData(dateStr).catch(() => {});
  }, [loadData, dateStr]);

  // Date change handler with unsaved changes prompt
  const handleDateChange = (newDate: string): void => {
    if (!newDate || newDate === dateStr) return;
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'Bạn có dữ liệu chưa lưu. Đổi ngày sẽ tải dữ liệu của ngày mới và bỏ qua các thay đổi này. Bạn có chắc chắn muốn tiếp tục?'
      );
      if (!confirmLeave) return;
    }
    setDateStr(newDate);
  };

  // Back button handler with unsaved changes prompt
  const handleBack = (): void => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'Bạn có thay đổi chưa lưu trong báo cáo. Bạn có chắc chắn muốn quay lại danh sách?'
      );
      if (!confirmLeave) return;
    }
    onBack();
  };

  // Metadata change handler
  const handleMetadataChange = (field: keyof ReportMetadata, value: string): void => {
    if (!doc) return;
    setDoc({
      ...doc,
      metadata: {
        ...doc.metadata,
        [field]: value
      }
    });
    setHasUnsavedChanges(true);
  };

  // Task change handler (completionRate or quantity)
  const handleTaskChange = (
    taskId: string,
    field: 'completionRate' | 'quantity',
    value: number | undefined
  ): void => {
    if (!doc) return;

    const updatedTasks = doc.tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          [field]: value
        };
      }
      return t;
    });

    // Re-evaluate parent completion rates across hierarchy
    const recalculated = recalculateAllRates(updatedTasks);

    setDoc({
      ...doc,
      tasks: recalculated
    });
    setHasUnsavedChanges(true);
  };

  // Save report
  const handleSave = async (): Promise<void> => {
    if (!doc) return;
    setIsSaving(true);
    try {
      const res = await dataService.saveReport(doc, templateBuffer);
      setDoc((prev) => (prev ? { ...prev, isExisting: true, eTag: res.eTag } : null));
      setHasUnsavedChanges(false);
      setToast({
        type: 'success',
        text: `Đã lưu báo cáo thành công vào thư viện SharePoint (${role.unit} - ${dateStr})!`
      });
    } catch (err: unknown) {
      console.error('Error saving report:', err);
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu báo cáo lên SharePoint';
      setToast({ type: 'error', text: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const isWeekly = role.docId.toLowerCase().includes('week');
  const reportMainTitle = doc?.metadata.docTitle || (isWeekly ? 'Báo cáo tuần' : 'Báo cáo ngày');

  return (
    <div className="report-entry-container">
      {/* 1. Top Header Bar (Matching Exact User Reference) */}
      <div className="report-entry-header-card">
        <div className="report-header-left">
          {/* Square Back Button */}
          <button
            type="button"
            className="report-back-square-btn"
            onClick={handleBack}
            disabled={isSaving}
            title="Quay lại danh sách báo cáo"
            aria-label="Quay lại"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>

          <div className="report-header-divider" />

          {/* Title & Status Group */}
          <div className="report-header-title-block">
            <div className="report-header-title-row">
              <h2 className="report-header-main-title">{reportMainTitle}</h2>
              <span className="report-unit-badge-pill">{role.unit}</span>
            </div>

            <div className="report-header-status-row">
              {doc?.isExisting ? (
                <span className="report-status-text-saved">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                  Đã lưu trên SharePoint
                </span>
              ) : (
                <span className="report-status-text-new">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Tạo mới từ template
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="report-header-right">
          {hasUnsavedChanges && (
            <span className="unsaved-badge" title="Có dữ liệu chưa lưu">
              Chưa lưu
            </span>
          )}

          {/* Làm mới Button */}
          <button
            type="button"
            className={`report-btn-refresh ${isLoading ? 'is-loading' : ''}`}
            onClick={() => loadData(dateStr)}
            disabled={isLoading || isSaving}
            title="Tải lại dữ liệu"
            aria-label="Làm mới"
          >
            <svg
              className={`action-icon ${isLoading ? 'spin' : ''}`}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span>{isLoading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          {/* Lưu báo cáo Button */}
          <button
            type="button"
            className="report-btn-save-primary"
            onClick={handleSave}
            disabled={isLoading || isSaving || !doc}
          >
            {isSaving ? (
              <>
                <div className="loading-spinner-sm" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>Lưu báo cáo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Toast Alert */}
      {toast && (
        <div style={{ marginBottom: '16px' }}>
          <ToastAlert
            toast={toast}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* 3. Main Content: Metadata & Task Table */}
      {isLoading ? (
        <div className="report-loading-state">
          <div className="loading-spinner" />
          <p>Đang chuẩn bị mẫu báo cáo và nạp dữ liệu...</p>
        </div>
      ) : doc ? (
        <div className="report-entry-content">
          <ReportMetaForm
            metadata={doc.metadata}
            dateStr={dateStr}
            onDateChange={handleDateChange}
            onMetadataChange={handleMetadataChange}
            isExisting={!!doc.isExisting}
            disabled={isSaving}
          />

          <ReportTaskTable
            tasks={doc.tasks}
            onTaskChange={handleTaskChange}
            disabled={isSaving}
          />
        </div>
      ) : (
        <div className="report-empty-state">
          <p>Không thể nạp dữ liệu mẫu báo cáo</p>
        </div>
      )}
    </div>
  );
};
