import React, { useState, useEffect } from 'react';
import type { UserSession, UserProfileRecord } from '../../types';
import { SharePointService } from '../../services/SharePointService';
import { extractCleanEmail, checkIsAdmin } from '../../utils';

export interface LandingViewProps {
  currentUser?: UserSession | null;
  onEnterApp: () => void;
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

          {/* Primary CTA Button */}
          {isAuthorized ? (
            <div className="landing-cta-container">
              <button
                type="button"
                className="landing-cta-btn"
                onClick={onEnterApp}
              >
                <span>Vào Danh Sách Check-in</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              {totalRecordsCount > 0 && (
                <span className="landing-records-hint">
                  Đang đồng bộ <strong>{totalRecordsCount}</strong> bản ghi check-in
                </span>
              )}
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
