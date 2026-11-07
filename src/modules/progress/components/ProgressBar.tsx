import * as React from 'react';

export interface IProgressBarProps {
  rate: number | undefined;
  showText?: boolean;
  size?: 'sm' | 'md';
}

export const ProgressBar: React.FC<IProgressBarProps> = ({
  rate,
  showText = true,
  size = 'md'
}) => {
  const value = rate !== undefined && !isNaN(rate) ? Math.min(100, Math.max(0, rate)) : 0;

  // Determine color class
  let colorVar = 'var(--color-primary, #1d4ed8)';
  if (value >= 100) {
    colorVar = 'var(--color-success, #16a34a)';
  } else if (value >= 50) {
    colorVar = 'var(--color-primary, #1d4ed8)';
  } else if (value > 0) {
    colorVar = '#d97706'; // Amber
  } else {
    colorVar = 'var(--color-text-tertiary, #94a3b8)';
  }

  const height = size === 'sm' ? 6 : 8;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '110px' }}>
      <div
        style={{
          flex: 1,
          height: `${height}px`,
          backgroundColor: 'var(--color-bg-secondary, #f1f5f9)',
          borderRadius: '999px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${value}%`,
            backgroundColor: colorVar,
            borderRadius: '999px',
            transition: 'width 0.3s ease'
          }}
        />
      </div>
      {showText && (
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-text-secondary, #475569)',
            minWidth: '38px',
            textAlign: 'right'
          }}
        >
          {rate !== undefined ? `${value}%` : '-'}
        </span>
      )}
    </div>
  );
};
