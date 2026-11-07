import * as React from 'react';
import { ToastAlert } from '../../../core/components';
import type { ToastState } from '../../../core/types';
import { ProgressSummaryData } from '../types/progress.types';
import { ProgressBar } from '../components/ProgressBar';
import { ProgressSummaryService } from '../services/ProgressSummaryService';

export interface IProgressSummaryViewProps {
  summaryService: ProgressSummaryService;
  selectedDocId: string;
  selectedUnit: string;
}

export const ProgressSummaryView: React.FC<IProgressSummaryViewProps> = ({
  summaryService,
  selectedDocId,
  selectedUnit
}) => {
  const [data, setData] = React.useState<ProgressSummaryData | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [exporting, setExporting] = React.useState<boolean>(false);
  const [toast, setToast] = React.useState<ToastState | null>(null);

  // Load summary data
  const loadSummary = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setToast(null);
    try {
      const result = await summaryService.loadSummary(selectedDocId, selectedUnit);
      setData(result);
    } catch (err: unknown) {
      console.error('Error loading summary:', err);
      const errMsg = err instanceof Error ? err.message : 'Không thể tải báo cáo tổng hợp tiến độ';
      setToast({
        type: 'error',
        text: errMsg
      });
    } finally {
      setLoading(false);
    }
  }, [summaryService, selectedDocId, selectedUnit]);

  React.useEffect(() => {
    loadSummary().catch(() => {});
  }, [loadSummary]);

  // Export to Excel
  const handleExportExcel = async (): Promise<void> => {
    if (!data) return;
    setExporting(true);
    try {
      const buffer = await summaryService.exportSummaryToExcel(data);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BaoCao_TienDo_${selectedDocId}_${selectedUnit}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToast({
        type: 'success',
        text: 'Đã xuất file báo cáo Excel thành công'
      });
    } catch (err: unknown) {
      console.error('Export failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Lỗi khi xuất file Excel';
      setToast({
        type: 'error',
        text: errMsg
      });
    } finally {
      setExporting(false);
    }
  };

  // Compute latest overall rate and difference
  const { latestRate, rateDiff } = React.useMemo(() => {
    if (!data || data.columns.length === 0 || data.tasks.length === 0) {
      return { latestRate: 0, rateDiff: 0 };
    }

    // Top-level root tasks (level 1)
    const level1Tasks = data.tasks.filter((t) => t.level === 1);
    const getAvgRateForDate = (dateStr: string): number => {
      const dayItem = data.dailyData.find((d) => d.dateStr === dateStr);
      if (!dayItem) return 0;
      let sum = 0;
      let count = 0;
      level1Tasks.forEach((t) => {
        const val = dayItem.rates[t.id];
        if (val !== undefined) {
          sum += val;
          count++;
        }
      });
      return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
    };

    const latestCol = data.columns[data.columns.length - 1];
    const prevCol = data.columns.length > 1 ? data.columns[data.columns.length - 2] : null;

    const latest = latestCol ? getAvgRateForDate(latestCol.dateStr) : 0;
    const prev = prevCol ? getAvgRateForDate(prevCol.dateStr) : 0;
    const diff = Math.round((latest - prev) * 10) / 10;

    return { latestRate: latest, rateDiff: diff };
  }, [data]);

  return (
    <div className="progress-summary-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {toast && (
        <ToastAlert
          toast={toast}
          onClose={() => setToast(null)}
        />
      )}

      {/* Control bar */}
      <div
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary, #0f172a)' }}>
            Theo dõi tiến độ theo ngày:
          </span>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary, #64748b)' }}>
            {data?.columns.length || 0} ngày đã ghi nhận
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={loadSummary}
            disabled={loading}
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

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || !data || data.columns.length === 0}
            className="portal-btn portal-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: exporting || !data ? 'not-allowed' : 'pointer',
              backgroundColor: 'var(--color-success, #16a34a)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <div
          className="progress-kpi-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px'
          }}
        >
          {/* Card 1: Overall completion */}
          <div
            style={{
              padding: '16px',
              background: 'var(--color-bg-card, #ffffff)',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--color-border, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary, #64748b)', textTransform: 'uppercase' }}>
              Tiến độ chung mới nhất
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary, #1d4ed8)' }}>
                {latestRate}%
              </span>
              {rateDiff !== 0 && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: rateDiff > 0 ? 'var(--color-success, #16a34a)' : '#dc2626'
                  }}
                >
                  {rateDiff > 0 ? `+${rateDiff}%` : `${rateDiff}%`}
                </span>
              )}
            </div>
            <ProgressBar rate={latestRate} showText={false} size="sm" />
          </div>

          {/* Card 2: Task count */}
          <div
            style={{
              padding: '16px',
              background: 'var(--color-bg-card, #ffffff)',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--color-border, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary, #64748b)', textTransform: 'uppercase' }}>
              Tổng số hạng mục
            </span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary, #0f172a)' }}>
              {data.tasks.length}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary, #94a3b8)' }}>
              Bao gồm cả các công việc do hiện trường tự thêm
            </span>
          </div>

          {/* Card 3: Days recorded */}
          <div
            style={{
              padding: '16px',
              background: 'var(--color-bg-card, #ffffff)',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--color-border, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary, #64748b)', textTransform: 'uppercase' }}>
              Lần cập nhật gần nhất
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary, #0f172a)' }}>
              {data.columns.length > 0 ? data.columns[data.columns.length - 1].formattedDate : 'Chưa có'}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary, #94a3b8)' }}>
              {data.columns.length > 0 ? data.columns[data.columns.length - 1].fileName : ''}
            </span>
          </div>
        </div>
      )}

      {/* Main Pivot Table */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary, #64748b)' }}>
          Đang tải dữ liệu tổng hợp...
        </div>
      ) : data && data.columns.length > 0 ? (
        <div
          style={{
            background: 'var(--color-bg-card, #ffffff)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--color-border, #e2e8f0)',
            overflow: 'hidden'
          }}
        >
          <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
            <table
              className="portal-table"
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
                    textTransform: 'uppercase'
                  }}
                >
                  <th style={{ padding: '12px', width: '80px' }}>ID</th>
                  <th style={{ padding: '12px', minWidth: '240px' }}>Tên công việc</th>
                  <th style={{ padding: '12px', width: '70px' }}>ĐVT</th>
                  {data.columns.map((c) => (
                    <th
                      key={c.dateStr}
                      style={{
                        padding: '12px',
                        minWidth: '100px',
                        textAlign: 'center',
                        borderLeft: '1px solid var(--color-border, #e2e8f0)'
                      }}
                    >
                      {c.formattedDate}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.tasks.map((t) => {
                  const isLevel1 = t.level === 1;
                  const indentPx = (t.level - 1) * 18;

                  return (
                    <tr
                      key={t.id}
                      style={{
                        backgroundColor: isLevel1 ? 'var(--color-bg-secondary, #f8fafc)' : 'transparent',
                        borderBottom: '1px solid var(--color-border, #e2e8f0)'
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: isLevel1 ? 700 : 500, color: '#64748b' }}>
                        {t.id}
                      </td>
                      <td style={{ padding: '10px 12px', paddingLeft: `${12 + indentPx}px` }}>
                        <span style={{ fontWeight: isLevel1 ? 700 : t.level === 2 ? 600 : 400 }}>
                          {t.taskName}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>
                        {t.unit || '-'}
                      </td>
                      {data.columns.map((c) => {
                        const dayItem = data.dailyData.find((d) => d.dateStr === c.dateStr);
                        const rate = dayItem?.rates[t.id];
                        return (
                          <td
                            key={c.dateStr}
                            style={{
                              padding: '10px 12px',
                              textAlign: 'center',
                              borderLeft: '1px solid var(--color-border, #e2e8f0)'
                            }}
                          >
                            {rate !== undefined && rate !== null ? (
                              <span style={{ fontWeight: 600, color: rate >= 100 ? '#16a34a' : 'inherit' }}>
                                {rate}%
                              </span>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
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
          Chưa có file nhật ký cập nhật nào cho vị trí thi công này. Hãy chuyển sang tab <strong>Cập nhật ngày</strong> để lưu dữ liệu đầu tiên.
        </div>
      )}
    </div>
  );
};
