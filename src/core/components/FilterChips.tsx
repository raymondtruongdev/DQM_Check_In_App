import * as React from 'react';

export interface FilterChipOption {
  value: string;
  label: React.ReactNode;
}

export interface FilterChipsProps {
  options: FilterChipOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

/**
 * Nhóm nút lọc dạng viên thuốc (chọn một).
 * @example <FilterChips options={[{ value: 'ALL', label: 'Tất cả (3)' }]} value={unit} onChange={setUnit} />
 */
export const FilterChips: React.FC<FilterChipsProps> = ({ options, value, onChange, ariaLabel }) => (
  <div className="chips" role="group" aria-label={ariaLabel}>
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        className={`chip ${o.value === value ? 'is-active' : ''}`}
        aria-pressed={o.value === value}
        onClick={() => onChange(o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
);
