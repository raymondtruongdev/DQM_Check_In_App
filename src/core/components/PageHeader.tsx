import * as React from 'react';

export interface PageHeaderProps {
  /** Phần đầu bên trái (thường là nút Trang chủ / Quay lại). */
  leading?: React.ReactNode;
  /** Vẽ vạch ngăn giữa leading và tiêu đề. */
  divider?: boolean;
  title: React.ReactNode;
  /** Badge cạnh tiêu đề (vd mã trạm). */
  badge?: React.ReactNode;
  /** Dòng phụ dưới tiêu đề (trạng thái, phiên bản…). */
  meta?: React.ReactNode;
  /** Nhóm nút hành động bên phải. */
  actions?: React.ReactNode;
}

/** Đầu trang chuẩn của mọi view module: trái = leading + tiêu đề, phải = actions. */
export const PageHeader: React.FC<PageHeaderProps> = ({ leading, divider, title, badge, meta, actions }) => (
  <header className="page-header">
    <div className="page-header__lead">
      {leading}
      {leading && divider && <span className="page-header__divider" aria-hidden="true" />}
      <div className="page-header__body">
        <div className="page-header__title-row">
          <h2 className="page-header__title">{title}</h2>
          {badge}
        </div>
        {meta && <div className="page-header__meta">{meta}</div>}
      </div>
    </div>
    {actions && <div className="page-header__actions">{actions}</div>}
  </header>
);
