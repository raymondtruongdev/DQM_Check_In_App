import React, { useState } from 'react';
import type { UserSession } from '../../types';
import { SharePointService } from '../../services/SharePointService';

interface LoginViewProps {
  onLoginSuccess: (user: UserSession) => void;
  spService: SharePointService;
  siteUrl: string;
}

// Helper to extract role from account item
function getAccountRole(acc: Record<string, unknown>): string {
  const possibleKeys = [
    'Role', 'role', 'RoleName', 'Quyen', 'VaiTro',
    'field_5',
    'field_6'
  ];
  for (const key of possibleKeys) {
    const val = acc[key];
    if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== 'null') {
      return String(val).trim();
    }
  }
  // Check any property containing 'role' or 'quyen'
  for (const key of Object.keys(acc)) {
    const lower = key.toLowerCase();
    if (lower.includes('role') || lower.includes('quyen') || lower.includes('vaitro')) {
      const val = acc[key];
      if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== 'null') {
        return String(val).trim();
      }
    }
  }
  return 'user';
}

export function checkIsAdmin(role: string): boolean {
  const r = role.toLowerCase().trim();
  return r === 'admin' || r === 'administrator' || r === 'quantri' || r === 'quản trị';
}

// Helper to extract username from account item
function getAccountUsername(acc: Record<string, unknown>): string {
  const possibleKeys = [
    'Username', 'username', 'UserName', 'User_x0020_Name',
    'field_1', // Internal name for Username column in Account list
    'User', 'user', 'Email', 'email', 'Account', 'account',
    'Title', 'title'
  ];
  for (const key of possibleKeys) {
    const val = acc[key];
    if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== 'null') {
      return String(val).trim();
    }
  }
  return '';
}

// Helper to extract password from account item
function getAccountPassword(acc: Record<string, unknown>): string {
  const possibleKeys = [
    'Password', 'password', 'PassWord', 'Pass_x0020_Word',
    'field_2', // Internal name for Password column in Account list
    'Pass', 'pass', 'Pwd', 'pwd',
    'MatKhau', 'matkhau', 'Mat_x0020_khau', 'Mat_x0020_Khau'
  ];
  for (const key of possibleKeys) {
    const val = acc[key];
    if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== 'null') {
      return String(val).trim();
    }
  }
  for (const key of Object.keys(acc)) {
    const lower = key.toLowerCase();
    if (lower.includes('pass') || lower.includes('pwd') || lower.includes('khau')) {
      const val = acc[key];
      if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== 'null') {
        return String(val).trim();
      }
    }
  }
  return '';
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, spService, siteUrl }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Authenticate against SharePoint Account list
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
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
      console.log('[LoginView] Querying SharePoint Account list via SPHttpClient from site:', siteUrl);
      const accounts = await spService.getAccounts(siteUrl);
      console.log(`[LoginView] Found ${accounts.length} accounts in SharePoint:`, accounts);

      if (accounts.length === 0) {
        setErrorMessage(
          'Đã kết nối SharePoint thành công, nhưng bảng "Account" hiện đang TRỐNG (0 dòng). Hãy vào SharePoint thêm tài khoản vào danh sách Account!'
        );
        return;
      }

      // 1. Find account by username
      const matchedUser = accounts.find((acc) => {
        const u = getAccountUsername(acc).toLowerCase();
        return u === trimmedUser.toLowerCase();
      });

      if (!matchedUser) {
        console.warn(`[LoginView] Username "${trimmedUser}" not found. Available usernames:`, accounts.map(a => getAccountUsername(a)));
        setErrorMessage(`Không tìm thấy tài khoản "${trimmedUser}" trong danh sách Account trên SharePoint.`);
        return;
      }

      console.log(`[LoginView] Found account for "${trimmedUser}":`, matchedUser);

      // 2. Extract password from account
      const storedPass = getAccountPassword(matchedUser);

      if (!storedPass) {
        console.warn(`[LoginView] Password column not found or empty on user account:`, matchedUser);
        const columnNames = Object.keys(matchedUser).filter(k => !k.startsWith('OData_') && !k.startsWith('{')).join(', ');
        setErrorMessage(`Tài khoản "${trimmedUser}" tồn tại nhưng chưa có mật khẩu trong cột Password. Các cột tìm thấy trong list: [${columnNames}]`);
        return;
      }

      // 3. Compare password
      if (storedPass === trimmedPass || storedPass.trim() === trimmedPass) {
        const displayName = String(
          matchedUser.DisplayName ||
          matchedUser.field_1 ||
          matchedUser.Username ||
          matchedUser.Title ||
          trimmedUser
        );
        const role = getAccountRole(matchedUser);
        const isAdmin = checkIsAdmin(role);
        console.log(`[LoginView] User authenticated: "${trimmedUser}", role: "${role}", isAdmin: ${isAdmin}`);

        onLoginSuccess({
          username: trimmedUser,
          displayName,
          role,
          isAdmin,
        });
        return;
      } else {
        console.warn(`[LoginView] Password mismatch for ${trimmedUser}.`);
        setErrorMessage('Mật khẩu không chính xác. Vui lòng kiểm tra lại (chú ý chữ hoa/thường, khoảng trắng).');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[LoginView] Authentication error:', err);
      setErrorMessage(`Không thể kết nối đến SharePoint Account: ${msg}`);
      setStatusMessage('Gợi ý: Nếu đang chạy thử nghiệm, bạn có thể dùng nút Đăng nhập Nhanh bên dưới.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fallback demo login
  const handleQuickDemo = (): void => {
    setUsername('admin');
    setPassword('admin123');
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    setTimeout(() => {
      onLoginSuccess({
        username: 'admin',
        displayName: 'Administrator (Demo)',
        role: 'admin',
        isAdmin: true,
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
        </div>

        {/* Login Form Card */}
        <div className="login-card">
          <div className="login-intro">
            <h2 className="login-card-title">Sign in</h2>
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
                  placeholder="username"
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
                  placeholder="password"
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

export const LoginPage = LoginView;
export default LoginView;

