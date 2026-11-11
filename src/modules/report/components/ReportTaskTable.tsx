import * as React from 'react';
import { ReportTaskRow } from '../types/report.types';
import { Icon } from '../../../core/components/Icon';

export interface IReportTaskTableProps {
  tasks: ReportTaskRow[];
  onTaskChange: (taskId: string, field: 'completionRate' | 'quantity', value: number | undefined) => void;
  disabled?: boolean;
}

export const ReportTaskTable: React.FC<IReportTaskTableProps> = ({
  tasks,
  onTaskChange,
  disabled = false
}) => {
  // Compute overall completion rate across all level-1 roots
  const overallStats = React.useMemo(() => {
    const roots = tasks.filter((t) => t.level === 1);
    let totalRootRate = 0;
    let rootCount = 0;
    roots.forEach((r) => {
      if (typeof r.completionRate === 'number') {
        totalRootRate += r.completionRate;
        rootCount++;
      }
    });
    const avgOverall = rootCount > 0 ? Math.round((totalRootRate / roots.length) * 10) / 10 : 0;

    const leafTasks = tasks.filter((t) => t.isLeaf);
    const completedLeaves = leafTasks.filter((t) => (t.completionRate ?? 0) >= 100).length;

    return {
      overallProgress: avgOverall,
      totalTasks: tasks.length,
      totalLeaves: leafTasks.length,
      completedLeaves
    };
  }, [tasks]);

  return (
    <div className="report-task-section">
      {/* 1. Header & Summary Stats */}
      <div className="report-task-header-bar">
        <div className="report-task-title-group">
          <h3 className="report-task-title">Chi tiết tiến độ công việc</h3>
          <p className="report-task-hint">
            Nhập tỉ lệ hoàn thành (0 - 100%) và khối lượng cho các công việc con. Công việc cha tự động tính trung bình.
          </p>
        </div>

        <div className="report-task-kpis">
          <div className="kpi-box">
            <span className="kpi-label">Tiến độ chung</span>
            <span className="kpi-value highlight">{overallStats.overallProgress}%</span>
          </div>
          <div className="kpi-box">
            <span className="kpi-label">Đã hoàn thành</span>
            <span className="kpi-value">{overallStats.completedLeaves}/{overallStats.totalLeaves} việc</span>
          </div>
        </div>
      </div>

      {/* 2. Responsive Table */}
      <div className="table-responsive report-table-wrap">
        <table className="report-task-table">
          <thead>
            <tr>
              <th style={{ width: '80px', textAlign: 'center' }}>Mã CV</th>
              <th style={{ minWidth: '280px' }}>Tên công việc</th>
              <th style={{ width: '180px', textAlign: 'center' }}>Tỉ lệ hoàn thành (%)</th>
              <th style={{ width: '140px', textAlign: 'center' }}>Khối lượng</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Đơn vị</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-tasks-row">
                  Không có công việc nào trong mẫu báo cáo
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const isParent = !task.isLeaf;
                const indentPx = (task.level - 1) * 20;

                return (
                  <tr
                    key={task.id}
                    className={`report-row ${isParent ? 'report-parent-row' : 'report-leaf-row'} level-${task.level}`}
                  >
                    {/* Mã ID */}
                    <td className="report-cell-id" style={{ textAlign: 'center' }}>
                      <span className={`id-tag ${isParent ? 'id-parent' : 'id-leaf'}`}>
                        {task.id}
                      </span>
                    </td>

                    {/* Tên công việc */}
                    <td className="report-cell-name">
                      <div
                        className="task-name-wrap"
                        style={{ paddingLeft: `${indentPx}px` }}
                      >
                        {isParent && (
                          <Icon name="chevron-down" size={16} className="parent-icon" />
                        )}
                        <span className={`task-name-text ${isParent ? 'font-parent' : ''}`}>
                          {task.taskName}
                        </span>
                      </div>
                    </td>

                    {/* Tỉ lệ hoàn thành */}
                    <td className="report-cell-rate" style={{ textAlign: 'center' }}>
                      {isParent ? (
                        <div className="parent-rate-pill">
                          <span className="parent-rate-val">
                            {task.completionRate !== undefined ? `${task.completionRate}%` : '0%'}
                          </span>
                          <span className="auto-calc-label">(Tự tính)</span>
                        </div>
                      ) : (
                        <div className="leaf-rate-input-wrap">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            className="input rate-input"
                            value={task.completionRate !== undefined ? task.completionRate : ''}
                            onChange={(e) => {
                              const v = e.target.value.trim();
                              if (v === '') {
                                onTaskChange(task.id, 'completionRate', undefined);
                              } else {
                                const num = parseFloat(v);
                                if (!isNaN(num)) {
                                  const clamped = Math.max(0, Math.min(100, num));
                                  onTaskChange(task.id, 'completionRate', clamped);
                                }
                              }
                            }}
                            placeholder="0"
                            disabled={disabled}
                          />
                          <span className="rate-unit">%</span>
                        </div>
                      )}
                    </td>

                    {/* Khối lượng */}
                    <td className="report-cell-qty" style={{ textAlign: 'center' }}>
                      {isParent ? (
                        <span className="parent-qty-dash">—</span>
                      ) : (
                        <input
                          type="number"
                          step="any"
                          className="input qty-input"
                          value={task.quantity !== undefined ? task.quantity : ''}
                          onChange={(e) => {
                            const v = e.target.value.trim();
                            if (v === '') {
                              onTaskChange(task.id, 'quantity', undefined);
                            } else {
                              const num = parseFloat(v);
                              if (!isNaN(num)) {
                                onTaskChange(task.id, 'quantity', num);
                              }
                            }
                          }}
                          placeholder="—"
                          disabled={disabled}
                        />
                      )}
                    </td>

                    {/* Đơn vị */}
                    <td className="report-cell-unit" style={{ textAlign: 'center' }}>
                      <span className="unit-text">{task.unit || '—'}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

