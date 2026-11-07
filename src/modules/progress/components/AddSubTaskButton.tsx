import * as React from 'react';

export interface IAddSubTaskButtonProps {
  parentId: string;
  parentName: string;
  onAdd: (parentId: string) => void;
  disabled?: boolean;
}

export const AddSubTaskButton: React.FC<IAddSubTaskButtonProps> = ({
  parentId,
  parentName,
  onAdd,
  disabled = false
}) => {
  return (
    <button
      type="button"
      onClick={() => onAdd(parentId)}
      disabled={disabled}
      title={`Thêm công việc con cấp 3 cho mục "${parentName}"`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        fontSize: '11px',
        fontWeight: 500,
        borderRadius: 'var(--radius-sm, 4px)',
        border: '1px dashed var(--color-border, #cbd5e1)',
        background: 'transparent',
        color: 'var(--color-primary, #1d4ed8)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s ease'
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Thêm việc
    </button>
  );
};

