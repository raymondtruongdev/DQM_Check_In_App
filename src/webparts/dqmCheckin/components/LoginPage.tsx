import React, { useState } from 'react';
import { SharePointService } from '../services/SharePointService';

interface LoginPageProps {
  onLoginSuccess: (user: { username: string; displayName: string }) => void;
  spService: SharePointService;
  siteUrl: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, spService, siteUrl }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Authenticate against SharePoint Account list
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMessage('Vui lòng nhập đầy đủ Username và Password.');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('[LoginPage] Querying SharePoint Account list via SPHttpClient...');
      const accounts = await spService.getAccounts(siteUrl);
      console.log(`[LoginPage] Found ${accounts.length} accounts:`, accounts);

      if (accounts.length === 0) {
        setErrorMessage(
          'Đã kết nối SharePoint thành công, nhưng bảng "Account" hiện đang TRỐNG (0 dòng). Hãy vào SharePoint thêm ít nhất một dòng tài khoản!'
        );
        return;
      }

      // Check matching credentials against SharePoint list
      const matched = accounts.find((acc) => {
        const accUser = String(acc.Username || acc.Title || acc.Usernam || acc.User || acc.username || '').trim().toLowerCase();
        const accPass = String(acc.Password || acc.password || '').trim();
        return accUser === trimmedUser.toLowerCase() && accPass === trimmedPass;
      });

      if (matched) {
        const displayName = String(matched.Username || matched.Title || matched.Usernam || trimmedUser);
        onLoginSuccess({
          username: trimmedUser,
          displayName,
        });
        return;
      } else {
        setErrorMessage('Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[LoginPage] Authentication error:', err);
      setErrorMessage(`Không thể kết nối đến SharePoint Account: ${msg}`);
      setStatusMessage('Gợi ý: Nếu đang chạy thử nghiệm, bạn có thể dùng nút Đăng nhập Nhanh bên dưới.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fallback demo login
  const handleQuickDemo = () => {
    setUsername('admin');
    setPassword('admin123');
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    setTimeout(() => {
      onLoginSuccess({
        username: 'admin',
        displayName: 'Administrator (Demo)',
      });
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card-container">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-brand-logo" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.9" />
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="login-app-title">Check In App</h1>
          <p className="login-app-subtitle">THADICO SharePoint Data Portal</p>
        </div>

        {/* Login Form Card */}
        <div className="login-card">
          <div className="login-intro">
            <h2 className="login-card-title">Sign in</h2>
            <p className="login-card-desc">Đăng nhập bằng tài khoản hệ thống của bạn</p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="login-alert-error" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success / Notice Banner */}
          {statusMessage && (
            <div className="login-alert-notice" role="status">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{statusMessage}</span>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            {/* Username */}
            <div className="form-group">
              <label htmlFor="login-username" className="form-label">
                Username
              </label>
              <div className="input-with-icon">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="login-username"
                  type="text"
                  className="form-input has-icon"
                  placeholder="Nhập username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <div className="input-with-icon">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input has-icon has-action"
                  placeholder="Nhập password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="input-action-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary login-btn"
              disabled={isSubmitting || !username.trim() || !password.trim()}
            >
              {isSubmitting ? (
                <>
                  <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  </svg>
                  Đang xác thực với SharePoint...
                </>
              ) : (
                <>
                  <span>Đăng Nhập</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Helper */}
          <div className="login-demo-helper">
            <div className="demo-helper-divider">
              <span>Môi trường thử nghiệm</span>
            </div>
            <button
              type="button"
              className="btn-secondary demo-quick-btn"
              onClick={handleQuickDemo}
              disabled={isSubmitting}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Đăng nhập Nhanh (Demo Bypass)
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="login-footer-text">
          Hệ thống Quản lý Check-in THADICO
        </p>
      </div>
    </div>
  );
};
export default LoginPage;
