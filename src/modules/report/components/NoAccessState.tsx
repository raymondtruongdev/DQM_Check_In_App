import * as React from 'react';
import { RoleEntry } from '../../../core/types';

export interface INoAccessStateProps {
  userEmail: string;
  allRoles?: RoleEntry[];
  onRefresh?: () => void;
}

export const NoAccessState: React.FC<INoAccessStateProps> = ({
  userEmail,
  onRefresh
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8, 48px) var(--space-4, 16px)',
        textAlign: 'center',
        background: 'var(--color-bg-card, #ffffff)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--color-border, #e2e8f0)',
        maxWidth: '560px',
        margin: 'var(--space-8, 32px) auto'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#fef2f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-4, 16px)'
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--color-text-primary, #0f172a)',
          margin: '0 0 8px 0'
        }}
      >
        Chưa được phân quyền quản lý báo cáo
      </h3>
      <p
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary, #475569)',
          lineHeight: 1.5,
          margin: '0 0 16px 0'
        }}
      >
        Tài khoản <strong>{userEmail || 'của bạn'}</strong> chưa được phân công báo cáo (DailyReport / WeeklyReport) trong <code>Report_Role</code> hoặc (Status = FALSE).
      </p>
      <p
        style={{
          fontSize: '13px',
          color: 'var(--color-text-tertiary, #f20c0cff)',
          margin: '0 0 24px 0'
        }}
      >
        Vui lòng liên hệ Quản trị viên để phân quyền trong SharePoint
      </p>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="btn-action portal-btn-primary"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <span>Kiểm tra lại quyền</span>
        </button>
      )}
    </div>
  );
};

