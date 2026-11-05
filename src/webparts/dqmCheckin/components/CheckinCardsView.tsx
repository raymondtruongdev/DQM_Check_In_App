import React, { useState, useMemo } from 'react';
import type { Data_checkinRead } from '../models/DataCheckinModel';
import {
  getItemName,
  getItemDisplayId,
  getItemCheckIn,
  getItemLocation,
  getItemNote,
  getItemPhone,
} from '../models/DataCheckinModel';

export interface CheckinCardsViewProps {
  items: Data_checkinRead[];
  currentUser?: {
    username: string;
    displayName: string;
    role?: string;
    isAdmin?: boolean;
  } | null;
  onEdit: (item: Data_checkinRead) => void;
  onDelete: (item: Data_checkinRead) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  isDemoData?: boolean;
}

type SortOption = 'newest' | 'oldest' | 'id-desc' | 'id-asc' | 'name-asc';

// Avatar background colors based on name hash
const AVATAR_COLORS = [
  '#2563eb', // Blue
  '#7c3aed', // Violet
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Red
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
  '#c026d3', // Fuchsia
];

function getAvatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getAvatarLetter(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }
  return trimmed.charAt(0).toUpperCase();
}

function formatCheckinTime(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const pad = (n: number) => (n < 10 ? '0' : '') + n;
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();

    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}

export const CheckinCardsView: React.FC<CheckinCardsViewProps> = ({
  items,
  currentUser,
  onEdit,
  onDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  const isAdmin = Boolean(currentUser?.isAdmin);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // 1. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((it) => {
        const idStr = String(getItemDisplayId(it) ?? '').toLowerCase();
        const nameStr = getItemName(it).toLowerCase();
        const phoneStr = getItemPhone(it).toLowerCase();
        const locStr = getItemLocation(it).toLowerCase();
        const noteStr = getItemNote(it).toLowerCase();
        return (
          idStr.includes(q) ||
          nameStr.includes(q) ||
          phoneStr.includes(q) ||
          locStr.includes(q) ||
          noteStr.includes(q)
        );
      });
    }

    // 2. Sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'newest': {
          const timeA = new Date(getItemCheckIn(a) || 0).getTime();
          const timeB = new Date(getItemCheckIn(b) || 0).getTime();
          return timeB - timeA;
        }
        case 'oldest': {
          const timeA = new Date(getItemCheckIn(a) || 0).getTime();
          const timeB = new Date(getItemCheckIn(b) || 0).getTime();
          return timeA - timeB;
        }
        case 'id-desc': {
          const idA = Number(getItemDisplayId(a)) || 0;
          const idB = Number(getItemDisplayId(b)) || 0;
          return idB - idA;
        }
        case 'id-asc': {
          const idA = Number(getItemDisplayId(a)) || 0;
          const idB = Number(getItemDisplayId(b)) || 0;
          return idA - idB;
        }
        case 'name-asc': {
          const nameA = getItemName(a);
          const nameB = getItemName(b);
          return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
        }
        default:
          return 0;
      }
    });

    return result;
  }, [items, searchQuery, sortOption]);

  return (
    <div className="cards-view-page">
      {/* Search & Filter Control Bar */}
      <div className="cards-control-panel">
        <div className="cards-control-top">
          <div className="cards-header-info">
            <h2 className="cards-section-title">Danh Sách Check-In</h2>
            <span className="count-badge">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="cards-sort-group">
            <label htmlFor="cards-sort-select" className="cards-sort-label">Sắp xếp:</label>
            <select
              id="cards-sort-select"
              className="cards-sort-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
            >
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
              <option value="id-desc">ID giảm dần (Lớn → Nhỏ)</option>
              <option value="id-asc">ID tăng dần (Nhỏ → Lớn)</option>
              <option value="name-asc">Tên (A → Z)</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="cards-search-box">
          <svg className="cards-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="cards-search-input"
            placeholder="Tìm theo Tên, ID, Số điện thoại, Địa điểm, Ghi chú..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="cards-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Xóa tìm kiếm"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Cards Grid Content */}
      {filteredItems.length === 0 ? (
        <div className="cards-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <p className="empty-state-title">Không tìm thấy bản ghi nào phù hợp</p>
          <p className="empty-state-text">
            Thử thay đổi từ khóa tìm kiếm.
          </p>
          {searchQuery && (
            <button
              type="button"
              className="btn-clear-all-filters"
              onClick={() => setSearchQuery('')}
            >
              Xóa tìm kiếm
            </button>
          )}
        </div>
      ) : (
        <div className="checkin-cards-grid">
          {filteredItems.map((item, index) => {
            const displayId = getItemDisplayId(item);
            const rawName = getItemName(item);
            const displayName = rawName || '';
            const displayPhone = getItemPhone(item);
            const displayCheckin = getItemCheckIn(item);
            const displayLocation = getItemLocation(item);
            const displayNote = getItemNote(item);
            const formattedTime = displayCheckin ? formatCheckinTime(displayCheckin) : '—';
            const avatarColor = getAvatarColor(displayName || String(displayId));
            const avatarLetters = getAvatarLetter(displayName || String(displayId));

            return (
              <div
                key={item.ID ?? `card-${index}`}
                className={`checkin-card-item ${isAdmin ? 'is-admin-card' : ''}`}
              >
                {/* Card Top: ID Badge & Location */}
                <div className="checkin-card-topbar">
                  <span className="card-id-pill">
                    #{displayId}
                  </span>
                  {displayLocation ? (
                    <span className="card-location-pill" title={`Địa điểm: ${displayLocation}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {displayLocation}
                    </span>
                  ) : (
                    <span className="card-location-pill is-none" title="Chưa có địa điểm">
                      —
                    </span>
                  )}
                </div>

                {/* Card Person / Header */}
                <div className="checkin-card-profile">
                  <div
                    className="card-avatar"
                    style={{ backgroundColor: avatarColor }}
                    aria-hidden="true"
                  >
                    {avatarLetters}
                  </div>
                  <div className="card-title-group">
                    <h3 className="card-person-name" title={displayName || 'Chưa có tên'}>
                      {displayName || <span className="card-text-muted">—</span>}
                    </h3>
                    <span className="card-checkin-time">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {formattedTime}
                    </span>
                  </div>
                </div>

                {/* Card Info Rows: Phone & Note */}
                <div className="checkin-card-body">
                  {/* Phone Row */}
                  <div className="card-info-row">
                    <span className="card-info-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      Điện thoại:
                    </span>
                    {displayPhone ? (
                      <a
                        href={`tel:${displayPhone}`}
                        className="card-phone-badge"
                        title={`Gọi số ${displayPhone}`}
                      >
                        {displayPhone}
                      </a>
                    ) : (
                      <span className="card-text-muted">—</span>
                    )}
                  </div>

                  {/* Note Row: Always rendered for uniform layout */}
                  <div className={`card-note-box ${!displayNote ? 'is-empty' : ''}`}>
                    <svg className="card-note-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <p className="card-note-content">
                      {displayNote || <span className="card-text-muted">—</span>}
                    </p>
                  </div>
                </div>

                {/* Card Action Footer: ONLY RENDERED FOR ADMIN */}
                {isAdmin && (
                  <div className="checkin-card-actions">
                    <button
                      type="button"
                      className="btn-card-action btn-card-edit"
                      onClick={() => onEdit(item)}
                      title={`Chỉnh sửa bản ghi #${displayId}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      className="btn-card-action btn-card-delete"
                      onClick={() => onDelete(item)}
                      title={`Xóa bản ghi #${displayId}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span>Xóa</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
