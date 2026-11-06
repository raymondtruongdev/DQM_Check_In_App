import React from 'react';
import type { ToastState } from '../../types';

interface ToastAlertProps {
  toast: ToastState | undefined;
  onClose: () => void;
}

export const ToastAlert: React.FC<ToastAlertProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  return (
    <div
      className={`app-toast toast-${toast.type}`}
      role="status"
      aria-live="polite"
    >
      <div className="toast-icon" aria-hidden="true">
        {toast.type === 'success' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
      </div>
      <span className="toast-message">{toast.text}</span>
      <button
        type="button"
        className="toast-close-btn"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        &times;
      </button>
    </div>
  );
};

