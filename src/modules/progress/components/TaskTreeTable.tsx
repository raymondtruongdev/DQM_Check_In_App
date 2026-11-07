import * as React from 'react';
import { TaskNode } from '../types/progress.types';
import { ProgressBar } from './ProgressBar';
import { AddSubTaskButton } from './AddSubTaskButton';

export interface ITaskTreeTableProps {
  treeNodes: TaskNode[];
  readOnly?: boolean;
  onUpdateTask: (
    id: string,
    field: 'taskName' | 'completionRate' | 'quantity' | 'unit',
    value: string | number | undefined
  ) => void;
  onAddSubTask: (parentId: string) => void;
  onDeleteCustomTask: (id: string) => void;
}

export const TaskTreeTable: React.FC<ITaskTreeTableProps> = ({
  treeNodes,
  readOnly = false,
  onUpdateTask,
  onAddSubTask,
  onDeleteCustomTask
}) => {
  // Render node rows recursively
  const renderRows = (nodes: TaskNode[]): React.ReactNode => {
    return nodes.map((node) => {
      const isParent = !node.isLeaf;
      const isLevel1 = node.level === 1;
      const isLevel2 = node.level === 2;
      const isCustomLevel3 = node.isCustom || node.level >= 3;

      const indentPx = (node.level - 1) * 22;

      return (
        <React.Fragment key={node.id}>
          <tr
            className={`progress-tree-row level-${node.level} ${isParent ? 'is-parent' : 'is-leaf'}`}
            style={{
              backgroundColor: isLevel1 ? 'var(--color-bg-secondary, #f8fafc)' : 'transparent',
              borderBottom: '1px solid var(--color-border, #e2e8f0)'
            }}
          >
            {/* 1. ID Column */}
            <td
              style={{
                padding: '10px 12px',
                fontSize: '13px',
                fontWeight: isLevel1 ? 700 : isLevel2 ? 600 : 500,
                color: 'var(--color-text-secondary, #475569)',
                whiteSpace: 'nowrap',
                width: '95px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {node.isTemplateLocked && (
                  <span title="Mục cố định từ template" style={{ color: 'var(--color-text-tertiary, #94a3b8)', display: 'inline-flex' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                )}
                <span>{node.id}</span>
              </div>
            </td>

            {/* 2. Task Name Column */}
            <td
              style={{
                padding: '10px 12px',
                paddingLeft: `${12 + indentPx}px`,
                fontSize: '13px',
                minWidth: '260px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isLevel1 ? (
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary, #0f172a)' }}>
                    {node.taskName}
                  </span>
                ) : isLevel2 ? (
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary, #1e293b)' }}>
                    {node.taskName}
                  </span>
                ) : isCustomLevel3 && !readOnly ? (
                  <input
                    type="text"
                    value={node.taskName}
                    placeholder="Nhập tên công việc..."
                    onChange={(e) => onUpdateTask(node.id, 'taskName', e.target.value)}
                    className="progress-input-text"
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      fontSize: '13px',
                      borderRadius: 'var(--radius-sm, 4px)',
                      border: '1px solid var(--color-border, #cbd5e1)',
                      background: 'var(--color-bg-card, #ffffff)'
                    }}
                  />
                ) : (
                  <span style={{ color: 'var(--color-text-primary, #334155)' }}>
                    {node.taskName}
                  </span>
                )}
              </div>
            </td>

            {/* 3. Completion Rate Column */}
            <td style={{ padding: '10px 12px', minWidth: '170px' }}>
              {isParent ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <ProgressBar rate={node.completionRate} />
                  <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary, #94a3b8)' }}>
                    (Tự tính từ các việc con)
                  </span>
                </div>
              ) : readOnly ? (
                <ProgressBar rate={node.completionRate} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={node.completionRate !== undefined ? node.completionRate : ''}
                    placeholder="0"
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Math.max(0, Math.min(100, parseFloat(e.target.value)));
                      onUpdateTask(node.id, 'completionRate', val);
                    }}
                    style={{
                      width: '60px',
                      padding: '4px 6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      textAlign: 'right',
                      borderRadius: 'var(--radius-sm, 4px)',
                      border: '1px solid var(--color-border, #cbd5e1)',
                      background: 'var(--color-bg-card, #ffffff)'
                    }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--color-text-secondary, #64748b)' }}>%</span>
                  <div style={{ flex: 1, minWidth: '60px' }}>
                    <ProgressBar rate={node.completionRate} showText={false} size="sm" />
                  </div>
                </div>
              )}
            </td>

            {/* 4. Quantity Column */}
            <td style={{ padding: '10px 12px', minWidth: '100px' }}>
              {readOnly ? (
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary, #475569)' }}>
                  {node.quantity !== undefined ? node.quantity : '-'}
                </span>
              ) : (
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={node.quantity !== undefined ? node.quantity : ''}
                  placeholder="KL..."
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : Math.max(0, parseFloat(e.target.value));
                    onUpdateTask(node.id, 'quantity', val);
                  }}
                  style={{
                    width: '90px',
                    padding: '4px 8px',
                    fontSize: '13px',
                    borderRadius: 'var(--radius-sm, 4px)',
                    border: '1px solid var(--color-border, #cbd5e1)',
                    background: 'var(--color-bg-card, #ffffff)'
                  }}
                />
              )}
            </td>

            {/* 5. Unit Column */}
            <td style={{ padding: '10px 12px', minWidth: '85px' }}>
              {readOnly ? (
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary, #475569)' }}>
                  {node.unit || '-'}
                </span>
              ) : (
                <input
                  type="text"
                  value={node.unit || ''}
                  placeholder="ĐVT"
                  onChange={(e) => onUpdateTask(node.id, 'unit', e.target.value)}
                  style={{
                    width: '75px',
                    padding: '4px 6px',
                    fontSize: '13px',
                    borderRadius: 'var(--radius-sm, 4px)',
                    border: '1px solid var(--color-border, #cbd5e1)',
                    background: 'var(--color-bg-card, #ffffff)'
                  }}
                />
              )}
            </td>

            {/* 6. Action Column (Non-sticky as per AGENTS.md) */}
            <td
              style={{
                padding: '10px 12px',
                width: '125px',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              {!readOnly && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  {/* Level 2 can add level 3 subtasks */}
                  {isLevel2 && (
                    <AddSubTaskButton
                      parentId={node.id}
                      parentName={node.taskName}
                      onAdd={onAddSubTask}
                    />
                  )}

                  {/* Level 3+ custom tasks can be deleted */}
                  {isCustomLevel3 && (
                    <button
                      type="button"
                      onClick={() => onDeleteCustomTask(node.id)}
                      title="Xóa công việc này"
                      style={{
                        padding: '4px 6px',
                        background: 'transparent',
                        border: '1px solid #fecaca',
                        borderRadius: 'var(--radius-sm, 4px)',
                        color: '#dc2626',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </td>
          </tr>
          {node.children && node.children.length > 0 && renderRows(node.children)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="table-responsive" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
      <table
        className="portal-table progress-table"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '13px'
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: 'var(--color-bg-secondary, #f8fafc)',
              borderBottom: '2px solid var(--color-border, #e2e8f0)',
              color: 'var(--color-text-secondary, #475569)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            <th style={{ padding: '12px', width: '95px' }}>ID</th>
            <th style={{ padding: '12px', minWidth: '260px' }}>Tên công việc</th>
            <th style={{ padding: '12px', minWidth: '170px' }}>Tỉ lệ hoàn thành</th>
            <th style={{ padding: '12px', minWidth: '100px' }}>Khối lượng</th>
            <th style={{ padding: '12px', minWidth: '85px' }}>Đơn vị</th>
            <th style={{ padding: '12px', width: '125px', textAlign: 'center' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>{renderRows(treeNodes)}</tbody>
      </table>
    </div>
  );
};
