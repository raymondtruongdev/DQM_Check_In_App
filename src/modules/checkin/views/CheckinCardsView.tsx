import React, { useState, useMemo } from 'react';
import type { CheckinRecord, SortOption } from '../types';
import type { UserSession } from '../../../core/auth';
import {
  getCheckinName,
  getCheckinDisplayId,
  getCheckinTime,
  getCheckinLocation,
  getCheckinNote,
  getCheckinPhone,
} from '../utils';
import {
  formatDateTime,
  getAvatarColor,
  getAvatarLetter,
} from '../../../core/utils';

export interface CheckinCardsViewProps {
  items: CheckinRecord[];
  currentUser?: UserSession;
  onEdit: (item: CheckinRecord) => void;
  onDelete: (item: CheckinRecord) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  isDemoData?: boolean;
}

export const CheckinCardsView: React.FC<CheckinCardsViewProps> = ({
  items,
  currentUser,
  onEdit,
  onDelete,
  onRefresh,
  isLoading,
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
        const idStr = String(getCheckinDisplayId(it) ?? '').toLowerCase();
        const nameStr = getCheckinName(it).toLowerCase();
        const phoneStr = getCheckinPhone(it).toLowerCase();
        const locStr = getCheckinLocation(it).toLowerCase();
        const noteStr = getCheckinNote(it).toLowerCase();
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
          const timeA = new Date(getCheckinTime(a) || 0).getTime();
          const timeB = new Date(getCheckinTime(b) || 0).getTime();
          return timeB - timeA;
        }
        case 'oldest': {
          const timeA = new Date(getCheckinTime(a) || 0).getTime();
          const timeB = new Date(getCheckinTime(b) || 0).getTime();
          return timeA - timeB;
        }
        case 'name-asc': {
          const nameA = getCheckinName(a);
          const nameB = getCheckinName(b);
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

          <div className="cards-header-actions">
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
                <option value="name-asc">Tên (A → Z)</option>
              </select>
            </div>

            {onRefresh && (
              <button
                type="button"
                className={`btn-action btn-refresh ${isLoading ? 'is-loading' : ''}`}
                onClick={onRefresh}
                disabled={isLoading}
                title="Làm mới dữ liệu danh sách"
                aria-label="Làm mới"
              >
                <svg
                  className={`action-icon ${isLoading ? 'spin' : ''}`}
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
                <span className="btn-label">{isLoading ? 'Đang tải...' : 'Làm Mới'}</span>
              </button>
            )}
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
            const displayId = getCheckinDisplayId(item);
            const rawName = getCheckinName(item);
            const displayName = rawName || '';
            const displayPhone = getCheckinPhone(item);
            const displayCheckin = getCheckinTime(item);
            const displayLocation = getCheckinLocation(item);
            const displayNote = getCheckinNote(item);
            const formattedTime = displayCheckin ? formatDateTime(displayCheckin) : '—';
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
                        <path d="M11 4H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
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
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
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
export default CheckinCardsView;

