import * as React from 'react';
import { Icon, IconName } from './Icon';

export interface LoadingStateProps {
  message: React.ReactNode;
}

/** Trạng thái đang tải (spinner + thông điệp). */
export const LoadingState: React.FC<LoadingStateProps> = ({ message }) => (
  <div className="state" role="status" aria-live="polite">
    <div className="loading-spinner" />
    <p className="state__text">{message}</p>
  </div>
);

export interface EmptyStateProps {
  icon?: IconName;
  title?: React.ReactNode;
  /** Nội dung mô tả chính. */
  message?: React.ReactNode;
  hint?: React.ReactNode;
  /** Nút hành động (vd Kiểm tra lại quyền). */
  action?: React.ReactNode;
  tone?: 'default' | 'danger';
  /** Khung hẹp, căn giữa (dùng cho thông báo toàn trang). */
  narrow?: boolean;
}

/** Trạng thái rỗng / không có quyền / không có dữ liệu. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  hint,
  action,
  tone = 'default',
  narrow
}) => (
  <div className={['state', tone === 'danger' ? 'state--danger' : '', narrow ? 'state--narrow' : ''].filter(Boolean).join(' ')}>
    {icon && (
      <div className="state__icon">
        <Icon name={icon} size={28} />
      </div>
    )}
    {title && <h3 className="state__title">{title}</h3>}
    {message && <p className="state__text">{message}</p>}
    {hint && <p className="state__hint">{hint}</p>}
    {action}
  </div>
);
