import React from 'react';
import type { Data_checkinRead } from '../../types';
import { getItemDisplayId, getItemName } from '../../utils';

interface DeleteConfirmModalProps {
  item: Data_checkinRead | null;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  item,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !item) return null;

  const displayId = getItemDisplayId(item);
  const displayName = getItemName(item);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-backdrop" onClick={!isDeleting ? onCancel : undefined} />
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-danger-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>
          <div className="modal-header-content">
            <h3 id="modal-title" className="modal-title">
              Xóa bản ghi check-in
            </h3>
          </div>
        </div>

        <div className="modal-body">
          <div className="modal-item-preview">
            <span className="modal-item-id">#{displayId}</span>
            <span className="modal-item-name">{displayName || 'Chưa đặt tên'}</span>
          </div>
          <p className="modal-warning-text">
            Hành động này sẽ xóa dữ liệu vĩnh viễn và không thể khôi phục.
          </p>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                </svg>
                <span>Đang xóa...</span>
              </>
            ) : (
              'Xác nhận xóa'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

