import React from 'react';
import type { UserSession } from '../../auth';
import type { ViewMode } from '../../types';
import { Icon } from '../Icon';

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
              className="btn btn--secondary btn--icon"
              onClick={onGoHome}
              title="Về Trang Chủ Landing Page"
              aria-label="Trang Chủ"
            >
              <Icon name="home" size={20} />
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
              <Icon name="grid" size={16} />
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
              <Icon name="table" size={16} />
              <span>Dạng Bảng</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
