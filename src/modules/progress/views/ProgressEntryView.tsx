import * as React from 'react';
import { ToastAlert } from '../../../core/components';
import type { ToastState } from '../../../core/types';
import { ProgressDoc, RoleEntry, TaskRow } from '../types/progress.types';
import { formatDateToYYYYMMDD, parseYYYYMMDD } from '../utils/fileNaming';
import { buildTaskTree, flattenTaskTree, generateNextChildId } from '../utils/taskTree';
import { ProgressDataService } from '../services/ProgressDataService';
import { TaskTreeTable } from '../components/TaskTreeTable';

export interface IProgressEntryViewProps {
  dataService: ProgressDataService;
  selectedDocId: string;
  selectedUnit: string;
  currentRole: RoleEntry;
  userDisplayName: string;
  userEmail: string;
  isAdmin: boolean;
}

export const ProgressEntryView: React.FC<IProgressEntryViewProps> = ({
  dataService,
  selectedDocId,
  selectedUnit,
  currentRole,
  userDisplayName,
  userEmail,
  isAdmin
}) => {
  const todayStr = React.useMemo(() => formatDateToYYYYMMDD(new Date()), []);
  const [selectedDateStr, setSelectedDateStr] = React.useState<string>(todayStr);
  const [doc, setDoc] = React.useState<ProgressDoc | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [isDirty, setIsDirty] = React.useState<boolean>(false);
  const [toast, setToast] = React.useState<ToastState | null>(null);

  const canEdit = isAdmin || selectedDateStr === todayStr;

  // Load document when date or unit changes
  const loadDocument = React.useCallback(async (dateStr: string): Promise<void> => {
    setLoading(true);
    setToast(null);
    try {
      const targetDate = parseYYYYMMDD(dateStr);
      const loadedDoc = await dataService.openDoc(selectedDocId, selectedUnit, targetDate);
      setDoc(loadedDoc);
      setIsDirty(false);
    } catch (err: unknown) {
      console.error('Failed to load progress doc:', err);
      const errMsg = err instanceof Error ? err.message : 'Không thể tải dữ liệu tiến độ cho vị trí này';
      setToast({
        type: 'error',
        text: errMsg
      });
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [dataService, selectedDocId, selectedUnit]);

  React.useEffect(() => {
    loadDocument(selectedDateStr).catch(() => {});
  }, [loadDocument, selectedDateStr]);

  // Compute tree from doc tasks
  const treeNodes = React.useMemo(() => {
    if (!doc || !doc.tasks) return [];
    return buildTaskTree(doc.tasks);
  }, [doc]);

  // Update a field in a task row
  const handleUpdateTask = (
    id: string,
    field: 'taskName' | 'completionRate' | 'quantity' | 'unit',
    value: string | number | undefined
  ): void => {
    if (!doc || !canEdit) return;

    const updatedTasks = doc.tasks.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          [field]: value
        };
      }
      return t;
    });

    // Recompute parent rates across the tree
    const newTree = buildTaskTree(updatedTasks);
    const newFlattened = flattenTaskTree(newTree);

    setDoc({
      ...doc,
      tasks: newFlattened
    });
    setIsDirty(true);
  };

  // Add a level 3 subtask under parentId
  const handleAddSubTask = (parentId: string): void => {
    if (!doc || !canEdit) return;

    const parentNode = doc.tasks.find((t) => t.id === parentId);
    if (!parentNode) return;

    const nextId = generateNextChildId(parentId, doc.tasks);
    const newTask: TaskRow = {
      id: nextId,
      taskName: 'Công việc mới',
      completionRate: 0,
      quantity: undefined,
      unit: '',
      parentId,
      isCustom: true,
      level: 3
    };

    const newTasks = [...doc.tasks, newTask];
    const newTree = buildTaskTree(newTasks);
    const newFlattened = flattenTaskTree(newTree);

    setDoc({
      ...doc,
      tasks: newFlattened
    });
    setIsDirty(true);

    setToast({
      type: 'success',
      text: `Đã thêm công việc con ${nextId}. Tỉ lệ hoàn thành của mục cha "${parentNode.taskName}" sẽ tự động tính theo trung bình các việc con.`
    });
  };

  // Delete a custom task (and its children)
  const handleDeleteCustomTask = (id: string): void => {
    if (!doc || !canEdit) return;

    const target = doc.tasks.find((t) => t.id === id);
    if (!target) return;

    if (!window.confirm(`Bạn có chắc chắn muốn xóa công việc "${target.taskName}" (ID: ${id})?`)) {
      return;
    }

    const prefix = `${id}.`;
    const remainingTasks = doc.tasks.filter((t) => t.id !== id && !t.id.startsWith(prefix));

    const newTree = buildTaskTree(remainingTasks);
    const newFlattened = flattenTaskTree(newTree);

    setDoc({
      ...doc,
      tasks: newFlattened
    });
    setIsDirty(true);

    setToast({
      type: 'success',
      text: `Đã xóa công việc ${id}`
    });
  };

  // Save changes
  const handleSave = async (): Promise<void> => {
    if (!doc || !canEdit) return;

    setSaving(true);
    setToast(null);
    try {
      const result = await dataService.saveDoc(doc, userDisplayName, userEmail, isAdmin);
      setIsDirty(false);
      setDoc((prev) => (prev ? { ...prev, eTag: result.eTag, isLoadedFromPreviousDay: false } : null));

      setToast({
        type: 'success',
        text: `Đã lưu thành công dữ liệu ngày ${selectedDateStr} vào file ${result.fileName}`
      });
    } catch (err: unknown) {
      console.error('Save failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Lỗi khi lưu file cập nhật tiến độ';
      setToast({
        type: 'error',
        text: errMsg
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="progress-entry-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Alert toast */}
      {toast && (
        <ToastAlert
          toast={toast}
          onClose={() => setToast(null)}
        />
      )}

      {/* Date Picker Bar & Controls */}
      <div
        className="progress-controls-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 16px',
          background: 'var(--color-bg-card, #ffffff)',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--color-border, #e2e8f0)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label
              htmlFor="progress-date-picker"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-secondary, #475569)',
                whiteSpace: 'nowrap'
              }}
            >
              Ngày cập nhật:
            </label>
            <input
              id="progress-date-picker"
              type="date"
              value={selectedDateStr}
              onChange={(e) => {
                if (isDirty && !window.confirm('Có thay đổi chưa lưu. Bạn có muốn đổi ngày và bỏ qua thay đổi này?')) {
                  return;
                }
                setSelectedDateStr(e.target.value);
              }}
              style={{
                padding: '6px 10px',
                fontSize: '13px',
                borderRadius: 'var(--radius-sm, 4px)',
                border: '1px solid var(--color-border, #cbd5e1)',
                background: 'var(--color-bg-card, #ffffff)',
                color: 'var(--color-text-primary, #0f172a)'
              }}
            />
          </div>

          {selectedDateStr !== todayStr && (
            <button
              type="button"
              onClick={() => {
                if (isDirty && !window.confirm('Có thay đổi chưa lưu. Bạn có muốn về ngày hôm nay và bỏ qua thay đổi này?')) {
                  return;
                }
                setSelectedDateStr(todayStr);
              }}
              className="portal-btn portal-btn-secondary"
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                borderRadius: 'var(--radius-sm, 4px)',
                cursor: 'pointer'
              }}
            >
              Hôm nay
            </button>
          )}

          {/* Unsaved indicator */}
          {isDirty && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#d97706',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d97706' }} />
              Chưa lưu
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => loadDocument(selectedDateStr)}
            disabled={loading || saving}
            className="portal-btn portal-btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Làm mới
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving || !doc}
              className="portal-btn portal-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: saving || loading ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {saving ? 'Đang lưu...' : 'Lưu cập nhật'}
            </button>
          )}
        </div>
      </div>

      {/* Banner: Pre-filled from previous day */}
      {doc?.isLoadedFromPreviousDay && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '13px',
            color: '#1e40af',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <strong>Nạp dữ liệu liên tục:</strong> Dữ liệu ngày <strong>{selectedDateStr}</strong> đang được nạp sẵn từ bản ghi gần nhất ngày <strong>{doc.previousDayDateStr}</strong>. Bạn hãy kiểm tra, điều chỉnh rồi bấm <strong>Lưu cập nhật</strong> để ghi nhận cho ngày hôm nay.
          </div>
        </div>
      )}

      {/* Banner: Read-only old date */}
      {!canEdit && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '13px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <div>
            Bạn đang xem dữ liệu ngày cũ (<strong>{selectedDateStr}</strong>) ở chế độ <strong>Chỉ đọc</strong>. Chỉ Người quản trị (Admin) mới có quyền chỉnh sửa ngày cũ.
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            color: 'var(--color-text-secondary, #64748b)',
            fontSize: '14px'
          }}
        >
          Đang tải dữ liệu tiến độ từ SharePoint...
        </div>
      ) : doc ? (
        <div
          style={{
            background: 'var(--color-bg-card, #ffffff)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--color-border, #e2e8f0)',
            overflow: 'hidden'
          }}
        >
          {/* Metadata Sub-header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border, #e2e8f0)',
              backgroundColor: 'var(--color-bg-secondary, #f8fafc)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '13px'
            }}
          >
            <div>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary, #0f172a)' }}>
                {doc.metadata.docTitle || 'Cập nhật tiến độ'}
              </span>
              <span style={{ color: 'var(--color-text-tertiary, #94a3b8)', margin: '0 8px' }}>•</span>
              <span style={{ color: 'var(--color-text-secondary, #475569)' }}>
                Phụ trách: <strong>{currentRole.siteManager || doc.metadata.name || 'Chưa cập nhật'}</strong>
              </span>
            </div>
            {doc.metadata.updateTime && (
              <div style={{ color: 'var(--color-text-tertiary, #94a3b8)', fontSize: '12px' }}>
                Lần lưu cuối: {doc.metadata.updateTime} {doc.metadata.name ? `bởi ${doc.metadata.name}` : ''}
              </div>
            )}
          </div>

          {/* Table */}
          <TaskTreeTable
            treeNodes={treeNodes}
            readOnly={!canEdit}
            onUpdateTask={handleUpdateTask}
            onAddSubTask={handleAddSubTask}
            onDeleteCustomTask={handleDeleteCustomTask}
          />
        </div>
      ) : (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            color: 'var(--color-text-secondary, #64748b)',
            fontSize: '14px'
          }}
        >
          Không có dữ liệu tiến độ cho ngày đã chọn.
        </div>
      )}
    </div>
  );
};
