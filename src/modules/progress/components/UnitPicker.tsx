import * as React from 'react';
import { RoleEntry } from '../types/progress.types';

export interface IUnitPickerProps {
  assignments: RoleEntry[];
  selectedDocId: string;
  selectedUnit: string;
  onSelect: (docId: string, unit: string) => void;
}

export const UnitPicker: React.FC<IUnitPickerProps> = ({
  assignments,
  selectedDocId,
  selectedUnit,
  onSelect
}) => {
  if (assignments.length <= 1) {
    const item = assignments[0];
    if (!item) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'var(--color-bg-secondary, #f1f5f9)',
            border: '1px solid var(--color-border, #e2e8f0)',
            borderRadius: 'var(--radius-md, 6px)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-primary, #0f172a)'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          {item.unit}
        </span>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary, #64748b)' }}>
          ({item.docId})
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <label
        htmlFor="progress-unit-picker"
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text-secondary, #475569)',
          whiteSpace: 'nowrap'
        }}
      >
        Vị trí thi công:
      </label>
      <select
        id="progress-unit-picker"
        value={`${selectedDocId}:::${selectedUnit}`}
        onChange={(e) => {
          const parts = e.target.value.split(':::');
          if (parts.length === 2) {
            onSelect(parts[0], parts[1]);
          }
        }}
        style={{
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: 500,
          borderRadius: 'var(--radius-md, 6px)',
          border: '1px solid var(--color-border, #cbd5e1)',
          background: 'var(--color-bg-card, #ffffff)',
          color: 'var(--color-text-primary, #0f172a)',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        {assignments.map((a, idx) => (
          <option key={`${a.docId}-${a.unit}-${idx}`} value={`${a.docId}:::${a.unit}`}>
            {a.unit} – {a.docId}
          </option>
        ))}
      </select>
    </div>
  );
};

