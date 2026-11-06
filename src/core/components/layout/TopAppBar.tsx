import React from 'react';
import type { UserSession } from '../../auth';
import type { ViewMode } from '../../types';

interface TopAppBarProps {
  currentUser?: UserSession;
  onGoHome?: () => void;
  activeView?: ViewMode;
  onViewChange?: (view: ViewMode) => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  currentUser,
  onGoHome,
  activeView = 'cards',
  onViewChange,
}) => {
  const userInitials = (currentUser?.displayName || currentUser?.username || 'U')
    .slice(0, 2)
    .toUpperCase();
  const displayEmail = currentUser?.email || currentUser?.username || 'Microsoft 365';
  const roleText = currentUser?.isAdmin ? 'ADMIN' : (currentUser?.role?.toUpperCase() || 'USER');

  return (
    <header className="app-bar">
      <div className="app-bar-container">
        {/* Left: Circular Home Button + Clean Borderless User Identity */}
        <div className="app-bar-left">
          {onGoHome && (
            <button
              type="button"
              className="btn-home-circle"
              onClick={onGoHome}
              title="Về Trang Chủ Landing Page"
              aria-label="Trang Chủ"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </button>
          )}

          {onGoHome && <div className="app-bar-divider" />}

          <div className="identity-user-group">
            <div className="identity-avatar">{userInitials}</div>
            <span className="identity-email-text" title={displayEmail}>
              {displayEmail}
            </span>
            <span className={currentUser?.isAdmin ? 'sso-badge-admin' : 'sso-badge-user'}>
              {roleText}
            </span>
            {currentUser?.department && (
              <span className="identity-dept-text" title={currentUser.department}>
                • {currentUser.department}
              </span>
            )}
          </div>
        </div>

        {/* Right: View Mode Tabs (Dạng Thẻ / Dạng Bảng) */}
        {onViewChange && (
          <div className="view-mode-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'cards'}
              className={`view-tab-btn ${activeView === 'cards' ? 'is-active' : ''}`}
              onClick={() => onViewChange('cards')}
              title="Xem dạng thẻ"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              <span>Dạng Thẻ</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'table'}
              className={`view-tab-btn ${activeView === 'table' ? 'is-active' : ''}`}
              onClick={() => onViewChange('table')}
              title="Xem dạng bảng"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              <span>Dạng Bảng</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
