import * as React from 'react';
import { Icon } from './Icon';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

/**
 * Ô tìm kiếm chuẩn: icon kính lúp + nút xoá khi có nội dung.
 * @example <SearchInput value={q} onChange={setQ} placeholder="Tìm…" />
 */
export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder, ariaLabel }) => (
  <div className="search">
    <Icon name="search" size={16} className="search__icon" />
    <input
      type="text"
      className="input search__input"
      placeholder={placeholder}
      aria-label={ariaLabel || placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {value && (
      <button
        type="button"
        className="btn btn--ghost btn--icon btn--sm search__clear"
        onClick={() => onChange('')}
        title="Xoá tìm kiếm"
        aria-label="Xoá tìm kiếm"
      >
        <Icon name="dismiss" size={16} />
      </button>
    )}
  </div>
);
