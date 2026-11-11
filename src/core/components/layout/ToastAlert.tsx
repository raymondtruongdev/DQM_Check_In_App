import React from 'react';
import type { ToastState } from '../../types';
import { Icon } from '../Icon';

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
          <Icon name="check-circle" size={20} />
        ) : (
          <Icon name="error-circle" size={20} />
        )}
      </div>
      <span className="toast-message">{toast.text}</span>
      <button
        type="button"
        className="toast-close-btn"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <Icon name="dismiss" size={16} />
      </button>
    </div>
  );
};

