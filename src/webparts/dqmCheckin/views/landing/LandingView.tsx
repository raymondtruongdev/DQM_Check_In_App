import React, { useState, useEffect } from 'react';
import type { UserSession, UserProfileRecord } from '../../types';
import { SharePointService } from '../../services/SharePointService';
import { extractCleanEmail, checkIsAdmin } from '../../utils';

export interface LandingViewProps {
  currentUser?: UserSession | null;
  onEnterApp: () => void;
  onNavigateModule?: (moduleKey: string) => void;
  onSelectProfile?: (profile: UserSession) => void;
  spService: SharePointService;
  siteUrl: string;
  userDisplayName?: string;
  userEmail?: string;
  userLoginName?: string;
  totalRecordsCount?: number;
}

export const LandingView: React.FC<LandingViewProps> = ({
  currentUser,
  onEnterApp,
  onNavigateModule,
  onSelectProfile,
  spService,
  siteUrl,
  userDisplayName = 'User',
  userEmail = '',
  userLoginName = '',
  totalRecordsCount = 0,
}) => {
  const [profiles, setProfiles] = useState<UserProfileRecord[]>([]);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Auto-dismiss module notice after 4 seconds
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const cleanCurrentEmail = extractCleanEmail(userEmail || userLoginName);
  const activeDisplayName = currentUser?.displayName || userDisplayName;
  const userInitials = activeDisplayName.slice(0, 2).toUpperCase();

  // Load UserProfiles list to provide role switching / diagnostics
  useEffect(() => {
    let isMounted = true;
    const loadProfiles = async (): Promise<void> => {
      try {
        const list = await spService.getUserProfiles(siteUrl);
        if (isMounted) setProfiles(list);
      } catch (err: unknown) {
        console.warn('[LandingView] Could not load UserProfiles:', err);
      }
    };

    loadProfiles().catch((e) => console.error(e));
    return () => {
      isMounted = false;
    };
  }, [spService, siteUrl]);

  const handleSwitch = (p: UserProfileRecord): void => {
    if (!onSelectProfile) return;
    const session: UserSession = {
      email: p.email || cleanCurrentEmail,
      username: p.username || p.email,
      displayName: p.displayName || p.username || userDisplayName,
      department: p.departmentName || p.departmentCode,
      departmentCode: p.departmentCode,
      role: p.role,
      isAdmin: checkIsAdmin(p.role),
    };
    onSelectProfile(session);
  };

  const handleModuleClick = (key: string, name: string): void => {
    if (key === 'checkin') {
      onEnterApp();
      return;
    }
    if (onNavigateModule) {
      onNavigateModule(key);
      return;
    }
    setNotice(`Chức năng "${name}" đang được kết nối và sẽ sớm khả dụng.`);
  };

  const isAuthorized = Boolean(currentUser);

  return (
    <div className="landing-wrapper">
      <div className="landing-container">
        {/* Main Hero Card */}
        <section className="landing-hero-card">
          {/* Brand Badge */}
          <div className="landing-brand-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <span>THADICO • DQM Check In App</span>
          </div>

          {/* User Identity & Authorization Profile Box */}
          <div className="landing-profile-box">
            {/* Centered Avatar */}
            <div className="landing-avatar-wrapper">
              <div className="landing-user-avatar">{userInitials}</div>
              {isAuthorized && <span className="landing-avatar-status" title="Đã xác thực Microsoft 365" />}
            </div>

            {/* Display Name */}
            <h2 className="landing-user-name">{activeDisplayName}</h2>

            {/* Email */}
            <div className="landing-user-email">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>{currentUser?.email || cleanCurrentEmail || 'Microsoft 365 Account'}</span>
            </div>

            {/* Badges Row: Role Badge + Department Badge */}
            <div className="landing-badges-row">
              {isAuthorized ? (
                <span className={currentUser?.isAdmin ? 'sso-badge-admin' : 'sso-badge-user'}>
                  {currentUser?.isAdmin ? 'ADMIN' : (currentUser?.role?.toUpperCase() || 'USER')}
                </span>
              ) : (
                <span className="badge" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                  Chưa gán quyền
                </span>
              )}

              {currentUser?.department && (
                <span className="landing-dept-badge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                    <line x1="9" y1="22" x2="9" y2="22.01" />
                    <line x1="15" y1="22" x2="15" y2="22.01" />
                    <line x1="9" y1="18" x2="9" y2="18.01" />
                    <line x1="15" y1="18" x2="15" y2="18.01" />
                    <line x1="9" y1="14" x2="9" y2="14.01" />
                    <line x1="15" y1="14" x2="15" y2="14.01" />
                    <line x1="9" y1="10" x2="9" y2="10.01" />
                    <line x1="15" y1="10" x2="15" y2="10.01" />
                    <line x1="9" y1="6" x2="9" y2="6.01" />
                    <line x1="15" y1="6" x2="15" y2="6.01" />
                  </svg>
                  <span>{currentUser.department}</span>
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="landing-divider" />

          {/* Primary Management Modules Grid (SharePoint Tile Style) */}
          {isAuthorized ? (
            <div className="landing-modules-container">
              {notice && (
                <div className="landing-module-notice" role="alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{notice}</span>
                  <button
                    type="button"
                    className="landing-notice-close"
                    onClick={() => setNotice(null)}
                    title="Đóng thông báo"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="sp-tiles-grid">
                {/* Module 1: Quản lý Check In */}
                <button
                  type="button"
                  className="landing-grid-btn"
                  onClick={onEnterApp}
                  title="Nhấn để truy cập Quản lý Check In"
                >
                  <div className="landing-grid-btn-icon">
                    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                      <rect x="3" y="5" width="26" height="6" fill="#ffffff" rx="1" />
                      <rect x="3" y="5" width="26" height="22" stroke="#ffffff" strokeWidth="2" rx="1" />
                      <line x1="10" y1="11" x2="10" y2="27" stroke="#ffffff" strokeWidth="2" />
                      <line x1="17" y1="11" x2="17" y2="27" stroke="#ffffff" strokeWidth="2" />
                      <line x1="24" y1="11" x2="24" y2="27" stroke="#ffffff" strokeWidth="2" />
                    </svg>
                  </div>
                  <span className="landing-grid-btn-text">Quản lý Check In</span>
                  <svg className="landing-grid-btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                {/* Module 2: Quản lý Data */}
                <button
                  type="button"
                  className="landing-grid-btn"
                  onClick={() => handleModuleClick('data', 'Quản lý Data')}
                  title="Nhấn để truy cập Quản lý Data"
                >
                  <div className="landing-grid-btn-icon">
                    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                      <path d="M4 7h7l3 3h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" stroke="#ffffff" strokeWidth="2" />
                      <polygon points="23,15 29,18.5 29,25.5 23,29 17,25.5 17,18.5" fill="rgba(255, 255, 255, 0.22)" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" />
                      <line x1="23" y1="22" x2="23" y2="29" stroke="#ffffff" strokeWidth="1.8" />
                      <line x1="17" y1="18.5" x2="23" y2="22" stroke="#ffffff" strokeWidth="1.8" />
                      <line x1="29" y1="18.5" x2="23" y2="22" stroke="#ffffff" strokeWidth="1.8" />
                    </svg>
                  </div>
                  <span className="landing-grid-btn-text">Quản lý Data</span>
                  <svg className="landing-grid-btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                {/* Module 3: Quản lý tiến độ */}
                <button
                  type="button"
                  className="landing-grid-btn"
                  onClick={() => handleModuleClick('progress', 'Quản lý tiến độ')}
                  title="Nhấn để truy cập Quản lý tiến độ"
                >
                  <div className="landing-grid-btn-icon">
                    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                      <path d="M4 7h7l3 3h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" stroke="#ffffff" strokeWidth="2" />
                      <polygon points="18,15 24,15 28,19 28,28 18,28" fill="rgba(255, 255, 255, 0.22)" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" />
                      <polyline points="24,15 24,19 28,19" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="landing-grid-btn-text">Quản lý tiến độ</span>
                  <svg className="landing-grid-btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                {/* Module 4: Quản lý thiết bị */}
                <button
                  type="button"
                  className="landing-grid-btn"
                  onClick={() => handleModuleClick('equipment', 'Quản lý thiết bị')}
                  title="Nhấn để truy cập Quản lý thiết bị"
                >
                  <div className="landing-grid-btn-icon">
                    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                      <path d="M4 7h7l3 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" stroke="#ffffff" strokeWidth="2" />
                      <polygon points="18,15 24,15 28,19 28,28 18,28" fill="rgba(255, 255, 255, 0.22)" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" />
                      <polyline points="24,15 24,19 28,19" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="landing-grid-btn-text">Quản lý thiết bị</span>
                  <svg className="landing-grid-btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: '480px', textAlign: 'center', marginTop: '8px' }}>
              <div className="landing-alert-notice" role="status">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>
                  Tài khoản của bạn chưa có trong danh sách phân quyền <strong>UserProfiles</strong>. Vui lòng liên hệ Admin để được cấp quyền.
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Developer & QA Role Switcher */}
        {profiles.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '12px', padding: '6px 14px', color: '#64748b' }}
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            >
              {showRoleSwitcher ? '▲ Ẩn bộ chuyển đổi vai trò thử nghiệm' : '▼ Chế độ Thử nghiệm Vai trò (Developer / QA)'}
            </button>

            {showRoleSwitcher && (
              <div className="sso-profiles-list" style={{ maxWidth: '480px', margin: '12px auto 0' }}>
                <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', margin: '0 0 8px 0' }}>
                  Bấm vào hồ sơ bên dưới để thử nghiệm giao diện với vai trò tương ứng:
                </p>
                {profiles.map((p, idx) => (
                  <button
                    key={`${p.email}-${idx}`}
                    type="button"
                    className="sso-profile-item"
                    onClick={() => handleSwitch(p)}
                  >
                    <div className="sso-profile-item-info">
                      <span className="sso-profile-item-name">
                        {p.displayName || p.username} • {p.departmentName || p.departmentCode}
                      </span>
                      <span className="sso-profile-item-email">{p.email || p.username}</span>
                    </div>
                    <span className={checkIsAdmin(p.role) ? 'sso-badge-admin' : 'sso-badge-user'}>
                      {p.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingView;
