import * as React from 'react';
import { RoleEntry, ToastState } from '../../../core/types';
import { ToastAlert } from '../../../core/components/layout/ToastAlert';
import { formatDateToYYYYMMDD } from '../../../core/utils';
import {
  EquipmentRow,
  IssueRow,
  ManpowerRow,
  MaterialRow,
  ReportDoc,
  ReportMetadata,
  WorkQtyRow
} from '../types/report.types';
import { ReportDataService } from '../services/ReportDataService';
import { formatTemplateVersionDisplay } from '../utils/reportFileNaming';
import { recalculateAllRates } from '../utils/reportTaskTree';
import { ReportMetaForm } from '../components/ReportMetaForm';
import { ReportTaskTable } from '../components/ReportTaskTable';
import { ReportSectionsEditor } from '../components/ReportSectionsEditor';
import { ReportPrintPreviewModal } from '../components/ReportPrintPreviewModal';

export interface IReportEntryViewProps {
  role: RoleEntry;
  currentUserEmail: string;
  dataService: ReportDataService;
  onBack: () => void;
}

const SECTION_NAV_ITEMS = [
  { id: 'report-sec-1', label: 'I. Thời tiết' },
  { id: 'report-sec-2', label: 'II. Nhân lực' },
  { id: 'report-sec-3', label: 'III. Thiết bị' },
  { id: 'report-sec-4', label: 'IV. Khối lượng' },
  { id: 'report-sec-5', label: 'V. Vật tư' },
  { id: 'report-sec-6', label: 'VI. Công việc' },
  { id: 'report-sec-7', label: 'VII. Vướng mắc' },
  { id: 'report-sec-8', label: 'VIII. HSE & Ảnh' },
  { id: 'report-sec-9', label: 'IX. Ký duyệt' }
];

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
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState<boolean>(false);
  const [showPrintPreview, setShowPrintPreview] = React.useState<boolean>(false);
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
          currentUserEmail,
          role.siteManager
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
    [dataService, role.docId, role.unit, role.siteManager, currentUserEmail]
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

  // Generic metadata change handler
  const handleMetadataChange = <K extends keyof ReportMetadata>(
    field: K,
    value: ReportMetadata[K]
  ): void => {
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

  // Dynamic table handlers
  const handleManpowerChange = (manpower: ManpowerRow[]): void => {
    if (!doc) return;
    setDoc({ ...doc, manpower });
    setHasUnsavedChanges(true);
  };

  const handleEquipmentChange = (equipment: EquipmentRow[]): void => {
    if (!doc) return;
    setDoc({ ...doc, equipment });
    setHasUnsavedChanges(true);
  };

  const handleWorkItemsChange = (workItems: WorkQtyRow[]): void => {
    if (!doc) return;
    setDoc({ ...doc, workItems });
    setHasUnsavedChanges(true);
  };

  const handleMaterialsChange = (materials: MaterialRow[]): void => {
    if (!doc) return;
    setDoc({ ...doc, materials });
    setHasUnsavedChanges(true);
  };

  const handleIssuesChange = (issues: IssueRow[]): void => {
    if (!doc) return;
    setDoc({ ...doc, issues });
    setHasUnsavedChanges(true);
  };

  // Task change handler (for WeeklyReport or legacy task hierarchy)
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

    const recalculated = recalculateAllRates(updatedTasks);
    setDoc({
      ...doc,
      tasks: recalculated
    });
    setHasUnsavedChanges(true);
  };

  // Upload photos directly to data/<Unit>/<DocID>_<yyyyMMdd>/photos/
  const handleUploadPhotos = async (files: FileList): Promise<void> => {
    if (!doc || files.length === 0) return;
    setIsUploadingPhoto(true);
    try {
      const uploadedList = [...(doc.photos || [])];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const buf = await file.arrayBuffer();
        const uploaded = await dataService.uploadPhoto(
          role.unit,
          role.docId,
          dateStr,
          file.name,
          buf
        );
        const existingIdx = uploadedList.findIndex(
          (p) => p.name.toLowerCase() === uploaded.name.toLowerCase()
        );
        if (existingIdx >= 0) {
          uploadedList[existingIdx] = uploaded;
        } else {
          uploadedList.push(uploaded);
        }
      }

      setDoc((prev) =>
        prev
          ? {
              ...prev,
              photos: uploadedList,
              metadata: {
                ...prev.metadata,
                photosCount: uploadedList.length
              }
            }
          : null
      );
      setHasUnsavedChanges(true);
      setToast({
        type: 'success',
        text: `Đã tải lên ${files.length} ảnh vào thư mục data/${role.unit}/${role.docId}_${dateStr.replace(/-/g, '')}/photos/!`
      });
    } catch (err: unknown) {
      console.error('Error uploading photo:', err);
      const msg = err instanceof Error ? err.message : 'Lỗi khi tải ảnh lên SharePoint';
      setToast({ type: 'error', text: msg });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Delete an uploaded photo
  const handleDeletePhoto = async (serverRelativeUrl: string, name: string): Promise<void> => {
    if (!doc) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xoá ảnh "${name}" khỏi SharePoint?`)) return;
    setIsUploadingPhoto(true);
    try {
      await dataService.deletePhoto(serverRelativeUrl);
      const remaining = (doc.photos || []).filter((p) => p.serverRelativeUrl !== serverRelativeUrl);
      setDoc((prev) =>
        prev
          ? {
              ...prev,
              photos: remaining,
              metadata: {
                ...prev.metadata,
                photosCount: remaining.length
              }
            }
          : null
      );
      setHasUnsavedChanges(true);
      setToast({
        type: 'success',
        text: `Đã xoá ảnh "${name}" khỏi thư mục photos.`
      });
    } catch (err: unknown) {
      console.error('Error deleting photo:', err);
      const msg = err instanceof Error ? err.message : 'Lỗi khi xoá ảnh trên SharePoint';
      setToast({ type: 'error', text: msg });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Site manager approve timestamp
  const handleApproveReport = (): void => {
    if (!doc) return;
    const nowIso = new Date().toISOString();
    setDoc({
      ...doc,
      metadata: {
        ...doc.metadata,
        approvedAt: nowIso,
        siteManager: doc.metadata.siteManager || role.siteManager || currentUserEmail
      }
    });
    setHasUnsavedChanges(true);
    setToast({
      type: 'success',
      text: 'Đã ghi nhận thời gian Trưởng ga / CHT duyệt. Hãy bấm "Lưu báo cáo" để lưu lên SharePoint.'
    });
  };

  // Load new template when existing / previous-day report uses an outdated template
  const handleLoadLatestTemplate = async (): Promise<void> => {
    if (!doc) return;
    setIsLoading(true);
    try {
      const result = await dataService.loadLatestTemplateForReport(
        role.docId,
        role.unit,
        dateStr,
        currentUserEmail,
        role.siteManager,
        doc
      );
      setDoc(result.doc);
      setTemplateBuffer(result.templateBuffer);
      setHasUnsavedChanges(true);
      setToast({
        type: 'success',
        text: `Đã nạp biểu mẫu mới nhất (${formatTemplateVersionDisplay(
          result.doc.metadata.templateVersion
        )}). Bạn có thể tiếp tục nhập thông tin báo cáo!`
      });
    } catch (err: unknown) {
      console.error('Error loading latest template:', err);
      const msg = err instanceof Error ? err.message : 'Lỗi khi tải template mới từ SharePoint';
      setToast({ type: 'error', text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeepCurrentTemplate = (): void => {
    if (!doc) return;
    setDoc({
      ...doc,
      templateUpdateRequired: false
    });
  };

  // Save report (6-sheet workbook)
  const handleSave = async (): Promise<void> => {
    if (!doc) return;
    setIsSaving(true);
    try {
      const res = await dataService.saveReport(doc, templateBuffer);
      setDoc((prev) => (prev ? { ...prev, isExisting: true, eTag: res.eTag } : null));
      setHasUnsavedChanges(false);
      setToast({
        type: 'success',
        text: `Đã lưu báo cáo 6 sheets thành công vào thư viện SharePoint (${role.unit} - ${dateStr})!`
      });
    } catch (err: unknown) {
      console.error('Error saving report:', err);
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu báo cáo lên SharePoint';
      setToast({ type: 'error', text: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const scrollToSection = (sectionId: string): void => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const isWeekly = role.docId.toLowerCase().includes('week');
  const reportMainTitle = doc?.metadata.docTitle || (isWeekly ? 'Báo cáo tuần' : 'Báo cáo ngày');

  return (
    <div className="report-entry-container">
      {/* 1. Top Header Bar */}
      <div className="report-entry-header-card">
        <div className="report-header-left">
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

          <div className="report-header-title-block">
            <div className="report-header-title-row">
              <h2 className="report-header-main-title">{reportMainTitle}</h2>
              <span className="report-unit-badge-pill">{role.unit}</span>
            </div>

            <div className="report-header-status-row">
              {doc?.isExisting ? (
                <span className="report-status-text-saved">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                  Đã lưu trên SharePoint
                </span>
              ) : (
                <span className="report-status-text-new">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {doc?.copiedFromDate
                    ? `Kế thừa từ ngày ${doc.copiedFromDate.split('-').reverse().join('/')}`
                    : 'Tạo mới từ template (6 sheets)'}
                </span>
              )}
            </div>

            {doc && (
              <div className="report-header-template-row">
                <span
                  className={`report-template-ver-pill ${
                    doc.templateUpdateRequired ? 'is-outdated' : 'is-current'
                  }`}
                  title="Phiên bản biểu mẫu (Template Version)"
                >
                  Biểu mẫu (Template): {formatTemplateVersionDisplay(doc.metadata.templateVersion)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="report-header-right">
          {hasUnsavedChanges && (
            <span className="unsaved-badge" title="Có dữ liệu chưa lưu">
              Chưa lưu
            </span>
          )}

          {/* Xem bản in / Xuất PDF Button */}
          <button
            type="button"
            className="report-btn-print-preview"
            onClick={() => setShowPrintPreview(true)}
            disabled={isLoading || !doc || Boolean(doc.templateUpdateRequired)}
            title="Xem bản in 2 trang A4 và xuất PDF"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Xem bản in / Xuất PDF</span>
          </button>

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
            disabled={isLoading || isSaving || !doc || Boolean(doc.templateUpdateRequired)}
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

      {/* 2. Quick Section Navigation Pills */}
      {!isLoading && doc && !doc.templateUpdateRequired && (
        <div className="report-sec-jump-bar" role="navigation" aria-label="Mục báo cáo">
          {SECTION_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="report-sec-jump-pill"
              onClick={() => scrollToSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* 3. Toast Alert */}
      {toast && (
        <div style={{ marginBottom: '16px' }}>
          <ToastAlert toast={toast} onClose={() => setToast(null)} />
        </div>
      )}

      {/* 4. Main Content */}
      {isLoading ? (
        <div className="report-loading-state">
          <div className="loading-spinner" />
          <p>Đang kiểm tra phiên bản biểu mẫu (template) và nạp dữ liệu...</p>
        </div>
      ) : doc && doc.templateUpdateRequired ? (
        <div className="report-template-upgrade-card">
          <div className="report-template-upgrade-header">
            <div className="report-template-upgrade-icon">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            </div>
            <div className="report-template-upgrade-title-wrap">
              <h3 className="report-template-upgrade-title">
                Yêu cầu cập nhật Biểu mẫu (Template) mới cho trạm {role.unit}
              </h3>
              <p className="report-template-upgrade-subtitle">
                {doc.outdatedSourceType === 'previous_day'
                  ? `Báo cáo ngày liền trước (${
                      doc.copiedFromDate ? doc.copiedFromDate.split('-').reverse().join('/') : ''
                    }) đang sử dụng phiên bản template cũ. Vui lòng tải template mới nhất từ thư mục _template trên SharePoint để tiếp tục nhập báo cáo ngày ${dateStr
                      .split('-')
                      .reverse()
                      .join('/')}.`
                  : `File báo cáo ngày ${dateStr
                      .split('-')
                      .reverse()
                      .join('/')} hiện tại đang sử dụng phiên bản template cũ. Vui lòng tải template mới nhất từ thư mục _template trên SharePoint trước khi tiếp tục cập nhật.`}
              </p>
            </div>
            <div className="report-info-date-group">
              <label htmlFor="upgrade-date-picker" className="report-info-field-label">
                Ngày báo cáo
              </label>
              <div className="report-info-date-input-wrap">
                <input
                  id="upgrade-date-picker"
                  type="date"
                  className="report-info-date-input"
                  value={dateStr}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="report-template-version-compare">
            <div className="report-template-ver-box is-old">
              <span className="report-template-ver-box-label">
                {doc.outdatedSourceType === 'previous_day'
                  ? 'Phiên bản của báo cáo ngày liền trước'
                  : 'Phiên bản của file báo cáo hiện tại'}
              </span>
              <strong className="report-template-ver-box-value">
                {formatTemplateVersionDisplay(doc.outdatedTemplateVersion || doc.metadata.templateVersion)}
              </strong>
            </div>

            <div className="report-template-ver-arrow" aria-hidden="true">
              ➔
            </div>

            <div className="report-template-ver-box is-new">
              <span className="report-template-ver-box-label">
                Phiên bản mới nhất trên SharePoint (_template)
              </span>
              <strong className="report-template-ver-box-value">
                {formatTemplateVersionDisplay(doc.latestTemplateInfo?.version)}
              </strong>
              {doc.latestTemplateInfo?.fileName && (
                <span className="report-template-ver-box-file">
                  File: _template/{doc.latestTemplateInfo.fileName}
                </span>
              )}
            </div>
          </div>

          <div className="report-template-upgrade-actions">
            <button
              type="button"
              className="report-btn-save-primary report-btn-load-new-template"
              onClick={handleLoadLatestTemplate}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>
                Tải Template Mới ({doc.latestTemplateInfo?.fileName || doc.latestTemplateInfo?.version}) &amp; Tiếp Tục Nhập
              </span>
            </button>

            {doc.isExisting && (
              <button
                type="button"
                className="report-btn-refresh"
                onClick={handleKeepCurrentTemplate}
              >
                Xem dữ liệu cũ (không đổi template)
              </button>
            )}
          </div>
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

          <ReportSectionsEditor
            doc={doc}
            disabled={isSaving}
            isUploadingPhoto={isUploadingPhoto}
            onMetadataChange={handleMetadataChange}
            onManpowerChange={handleManpowerChange}
            onEquipmentChange={handleEquipmentChange}
            onWorkItemsChange={handleWorkItemsChange}
            onMaterialsChange={handleMaterialsChange}
            onIssuesChange={handleIssuesChange}
            onUploadPhotos={handleUploadPhotos}
            onDeletePhoto={handleDeletePhoto}
            onApproveReport={handleApproveReport}
          />

          {isWeekly && doc.tasks && doc.tasks.length > 0 && (
            <ReportTaskTable
              tasks={doc.tasks}
              onTaskChange={handleTaskChange}
              disabled={isSaving}
            />
          )}
        </div>
      ) : (
        <div className="report-empty-state">
          <p>Không thể nạp dữ liệu mẫu báo cáo</p>
        </div>
      )}

      {/* 5. Print / Export PDF A4 Preview Modal */}
      {showPrintPreview && doc && (
        <ReportPrintPreviewModal doc={doc} onClose={() => setShowPrintPreview(false)} />
      )}
    </div>
  );
};
