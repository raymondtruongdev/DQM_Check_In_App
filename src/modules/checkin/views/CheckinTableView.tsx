import React, { useState, useMemo, useCallback } from 'react';
import type { CheckinRecord } from '../types';
import {
  getCheckinName,
  getCheckinDisplayId,
  getCheckinTime,
  getCheckinLocation,
  getCheckinNote,
  getCheckinPhone,
} from '../utils';
import {
  ACTIONS_COLUMN_WIDTH,
  DEFAULT_COLUMN_WIDTHS,
  MIN_COLUMN_WIDTHS,
  CHECKIN_COL_WIDTHS_STORAGE_KEY,
} from '../constants';

export type SortField = 'id' | 'name' | 'phone' | 'checkin' | 'location' | 'note';
export type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface CheckinTableViewProps {
  items: CheckinRecord[];
  isDemoData?: boolean;
  onEdit: (item: CheckinRecord) => void;
  onDelete: (item: CheckinRecord) => void;
  isAdmin?: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export type WorkItemsTableProps = CheckinTableViewProps;

// Visual Sort Indicator Icon component
const SortIndicator: React.FC<{ active: boolean; direction: SortDirection }> = ({
  active,
  direction,
}) => {
  return (
    <span className={`sort-icon-wrapper ${active ? 'is-active' : ''}`} aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {active ? (
          direction === 'asc' ? (
            <path d="M18 15l-6-6-6 6" />
          ) : (
            <path d="M6 9l6 6 6-6" />
          )
        ) : (
          <>
            <path d="M7 14l5 5 5-5" opacity="0.35" />
            <path d="M7 10l5-5 5 5" opacity="0.35" />
          </>
        )}
      </svg>
    </span>
  );
};

export const CheckinTableView: React.FC<CheckinTableViewProps> = ({
  items,
  isDemoData,
  onEdit,
  onDelete,
  isAdmin = true,
  onRefresh,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'id',
    direction: 'desc',
  });

  // Responsive View Mode: default to 'cards' on small screens (<768px) and 'table' on desktop
  const [viewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'cards';
    }
    return 'table';
  });

  // Resizable column widths with persistent storage in localStorage
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(CHECKIN_COL_WIDTHS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title && !parsed.name) {
          parsed.name = parsed.title;
        }
        return { ...DEFAULT_COLUMN_WIDTHS, ...parsed };
      }
    } catch {
      // Fallback to defaults
    }
    return DEFAULT_COLUMN_WIDTHS;
  });

  const [resizingCol, setResizingCol] = useState<string | null>(null);

  const totalTableWidth = useMemo(() => {
    const nameWidth = columnWidths.name || columnWidths.title || DEFAULT_COLUMN_WIDTHS.name;
    const actionsW = isAdmin ? ACTIONS_COLUMN_WIDTH : 0;
    return (
      (columnWidths.id || DEFAULT_COLUMN_WIDTHS.id) +
      nameWidth +
      (columnWidths.phone || DEFAULT_COLUMN_WIDTHS.phone) +
      (columnWidths.checkin || DEFAULT_COLUMN_WIDTHS.checkin) +
      (columnWidths.location || DEFAULT_COLUMN_WIDTHS.location) +
      (columnWidths.note || DEFAULT_COLUMN_WIDTHS.note) +
      actionsW
    );
  }, [columnWidths, isAdmin]);

  // Resize column border drag handler
  const startResize = useCallback(
    (columnKey: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const initialWidth = columnWidths[columnKey] ?? DEFAULT_COLUMN_WIDTHS[columnKey];
      const minWidth = MIN_COLUMN_WIDTHS[columnKey] ?? 60;

      setResizingCol(columnKey);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        const deltaX = moveEvent.clientX - startX;
        const newWidth = Math.max(minWidth, Math.round(initialWidth + deltaX));

        setColumnWidths((prev) => {
          const next = { ...prev, [columnKey]: newWidth };
          try {
            localStorage.setItem(CHECKIN_COL_WIDTHS_STORAGE_KEY, JSON.stringify(next));
          } catch {
            // Ignore storage errors
          }
          return next;
        });
      };

      const handleMouseUp = (): void => {
        setResizingCol(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [columnWidths]
  );

  // Double click resizer to reset to default width
  const resetColumnWidth = (columnKey: string, e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setColumnWidths((prev) => {
      const next = { ...prev, [columnKey]: DEFAULT_COLUMN_WIDTHS[columnKey] };
      try {
        localStorage.setItem(CHECKIN_COL_WIDTHS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // Reset all columns
  const resetAllWidths = (): void => {
    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    try {
      localStorage.removeItem(CHECKIN_COL_WIDTHS_STORAGE_KEY);
      localStorage.removeItem('powerapp1_column_widths');
    } catch {
      // Ignore
    }
  };

  // Toggle sorting on column click
  const handleSort = (field: SortField): void => {
    // If currently resizing, avoid triggering sort
    if (resizingCol) return;

    setSortConfig((prev) => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        field,
        direction: field === 'id' || field === 'checkin' ? 'desc' : 'asc',
      };
    });
  };

  // Filter and sort items
  const processedItems = useMemo(() => {
    let result = items;

    // 1. Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        const idStr = String(getCheckinDisplayId(item) ?? '').toLowerCase();
        const nameStr = getCheckinName(item).toLowerCase();
        const phoneStr = getCheckinPhone(item).toLowerCase();
        const locationStr = getCheckinLocation(item).toLowerCase();
        const noteStr = getCheckinNote(item).toLowerCase();

        return (
          idStr.includes(query) ||
          nameStr.includes(query) ||
          phoneStr.includes(query) ||
          locationStr.includes(query) ||
          noteStr.includes(query)
        );
      });
    }

    // 2. Sort
    return [...result].sort((a, b) => {
      let comparison = 0;

      switch (sortConfig.field) {
        case 'id': {
          const idA = Number(getCheckinDisplayId(a)) || 0;
          const idB = Number(getCheckinDisplayId(b)) || 0;
          comparison = idA - idB;
          break;
        }
        case 'name': {
          const nameA = getCheckinName(a);
          const nameB = getCheckinName(b);
          comparison = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
          break;
        }
        case 'phone': {
          const phoneA = getCheckinPhone(a);
          const phoneB = getCheckinPhone(b);
          comparison = phoneA.localeCompare(phoneB, undefined, { sensitivity: 'base' });
          break;
        }
        case 'checkin': {
          const checkinA = getCheckinTime(a);
          const checkinB = getCheckinTime(b);
          const timeA = checkinA ? new Date(checkinA).getTime() : 0;
          const timeB = checkinB ? new Date(checkinB).getTime() : 0;
          comparison = timeA - timeB;
          break;
        }
        case 'location': {
          const locA = getCheckinLocation(a);
          const locB = getCheckinLocation(b);
          comparison = locA.localeCompare(locB, undefined, { sensitivity: 'base' });
          break;
        }
        case 'note': {
          const noteA = getCheckinNote(a);
          const noteB = getCheckinNote(b);
          comparison = noteA.localeCompare(noteB, undefined, { sensitivity: 'base' });
          break;
        }
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [items, searchQuery, sortConfig]);

  // Helper to format ISO date string nicely
  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;

      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return dateString;
    }
  };

  // Helper for generating consistent avatar letters
  const getAvatarLetter = (name?: string): string => {
    if (!name || name.trim().length === 0) return 'W';
    return name.trim().charAt(0).toUpperCase();
  };

  const getSortTitle = (label: string, field: SortField): string => {
    if (sortConfig.field !== field) return `Sort by ${label}`;
    return `Sorted by ${label} (${sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}) - Click to reverse`;
  };

  return (
    <div className="card-container">
      {/* Table Toolbar Header */}
      <div className="table-toolbar">
        {/* Row 1: Title, Count, Sort Status (Left) & Refresh, Reset Widths (Right) */}
        <div className="toolbar-header-row">
          <div className="toolbar-title-group">
            <h2 className="toolbar-title">Danh Sách Check-In</h2>
            <span className="count-badge">
              {processedItems.length} {processedItems.length === 1 ? 'item' : 'items'}
            </span>
            {isDemoData && (
              <span className="demo-badge" title="Showing preview sample data">
                Demo Preview
              </span>
            )}
            <span className="sort-status-pill">
              Sorted by: <strong>{sortConfig.field.toUpperCase()}</strong> ({sortConfig.direction === 'asc' ? '↑ Asc' : '↓ Desc'})
            </span>
          </div>

          <div className="toolbar-view-controls">
            {viewMode === 'table' && (
              <button
                type="button"
                className="btn-text-subtle"
                onClick={resetAllWidths}
                title="Reset column widths to default layout"
              >
                Reset widths
              </button>
            )}

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

        {/* Row 2: Search Filter Row */}
        <div className="toolbar-filter-row">
          <div className="search-wrapper">
            <svg
              className="search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, ID, phone, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area: Card View vs Table View */}
      {viewMode === 'cards' ? (
        <div className="cards-view-wrapper">
          <div className="mobile-cards-list">
            {processedItems.map((item, index) => {
              const displayId = getCheckinDisplayId(item);
              const displayName = getCheckinName(item);
              const displayPhone = getCheckinPhone(item);
              const displayCheckin = getCheckinTime(item);
              const displayLocation = getCheckinLocation(item);
              const displayNote = getCheckinNote(item);
              const formattedDate = formatDateTime(displayCheckin);
              const avatarChar = getAvatarLetter(displayName);

              return (
                <div key={item.ID ?? `card-${index}`} className="mobile-item-card">
                  {/* Card Header: Avatar, Name, ID, Location */}
                  <div className="mobile-card-header">
                    <div className="mobile-card-identity">
                      <div className="avatar-chip">{avatarChar}</div>
                      <div className="mobile-card-meta">
                        <div className="mobile-card-topline">
                          <span className="id-badge">#{displayId ?? '—'}</span>
                          {displayLocation && (
                            <div className="location-pill" title={displayLocation}>
                              <svg
                                className="location-icon"
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              <span>{displayLocation}</span>
                            </div>
                          )}
                        </div>
                        <h3 className="mobile-card-title">{displayName || '(Untitled)'}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Card Details: Phone, Date, Note */}
                  <div className="mobile-card-details">
                    {displayPhone && (
                      <div className="mobile-card-row">
                        <span className="mobile-row-label">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          Phone:
                        </span>
                        <a href={`tel:${displayPhone}`} className="phone-link">
                          {displayPhone}
                        </a>
                      </div>
                    )}

                    <div className="mobile-card-row">
                      <span className="mobile-row-label">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Check in:
                      </span>
                      <span className="mobile-row-val">{formattedDate}</span>
                    </div>

                    {displayNote && (
                      <div className="mobile-card-row mobile-note-row">
                        <span className="mobile-row-label">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                          Note:
                        </span>
                        <span className="mobile-note-text">{displayNote}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons (Admin only) */}
                  {isAdmin && (
                    <div className="mobile-card-actions">
                      <button
                        type="button"
                        className="btn-card-action btn-edit"
                        onClick={() => onEdit(item)}
                        aria-label={`Edit ${displayName || 'item'}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        className="btn-card-action btn-delete"
                        onClick={() => onDelete(item)}
                        aria-label={`Delete ${displayName || 'item'}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {processedItems.length === 0 && (
            <div className="table-empty-state">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <p className="empty-title">No matching work items</p>
              <p className="empty-subtitle">
                No records match <strong>&ldquo;{searchQuery}&rdquo;</strong>. Try checking for typos or searching by another keyword.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSearchQuery('')}
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Responsive Table Container */
        <div className="table-responsive">
        <table
          className={`data-table ${resizingCol ? 'is-resizing' : ''}`}
          style={{ tableLayout: 'fixed', minWidth: `${totalTableWidth}px`, width: '100%' }}
        >
          {/* Column definitions for precise pixel width resizing */}
          <colgroup>
            <col style={{ width: `${columnWidths.id}px` }} />
            <col style={{ width: `${columnWidths.name || columnWidths.title || DEFAULT_COLUMN_WIDTHS.name}px` }} />
            <col style={{ width: `${columnWidths.phone}px` }} />
            <col style={{ width: `${columnWidths.checkin}px` }} />
            <col style={{ width: `${columnWidths.location}px` }} />
            <col style={{ width: `${columnWidths.note}px` }} />
            {isAdmin && <col style={{ width: `${ACTIONS_COLUMN_WIDTH}px` }} />}
          </colgroup>

          <thead>
            <tr>
              {/* Id Column */}
              <th scope="col" className="th-resizable">
                <div className="th-content">
                  <button
                    type="button"
                    className={`th-sort-btn ${sortConfig.field === 'id' ? 'is-active' : ''}`}
                    onClick={() => handleSort('id')}
                    title={getSortTitle('Id', 'id')}
                  >
                    <span>Id</span>
                    <SortIndicator active={sortConfig.field === 'id'} direction={sortConfig.direction} />
                  </button>
                </div>
                <div
                  className={`col-resizer ${resizingCol === 'id' ? 'is-active' : ''}`}
                  onMouseDown={(e) => startResize('id', e)}
                  onDoubleClick={(e) => resetColumnWidth('id', e)}
                  title="Drag to resize column (Double-click to reset)"
                />
              </th>

              {/* Name Column */}
              <th scope="col" className="th-resizable">
                <div className="th-content">
                  <button
                    type="button"
                    className={`th-sort-btn ${sortConfig.field === 'name' ? 'is-active' : ''}`}
                    onClick={() => handleSort('name')}
                    title={getSortTitle('Name', 'name')}
                  >
                    <span>Name</span>
                    <SortIndicator active={sortConfig.field === 'name'} direction={sortConfig.direction} />
                  </button>
                </div>
                <div
                  className={`col-resizer ${resizingCol === 'name' ? 'is-active' : ''}`}
                  onMouseDown={(e) => startResize('name', e)}
                  onDoubleClick={(e) => resetColumnWidth('name', e)}
                  title="Drag to resize column (Double-click to reset)"
                />
              </th>

              {/* Phone Column */}
              <th scope="col" className="th-resizable">
                <div className="th-content">
                  <button
                    type="button"
                    className={`th-sort-btn ${sortConfig.field === 'phone' ? 'is-active' : ''}`}
                    onClick={() => handleSort('phone')}
                    title={getSortTitle('Phone', 'phone')}
                  >
                    <span>Phone</span>
                    <SortIndicator active={sortConfig.field === 'phone'} direction={sortConfig.direction} />
                  </button>
                </div>
                <div
                  className={`col-resizer ${resizingCol === 'phone' ? 'is-active' : ''}`}
                  onMouseDown={(e) => startResize('phone', e)}
                  onDoubleClick={(e) => resetColumnWidth('phone', e)}
                  title="Drag to resize column (Double-click to reset)"
                />
              </th>

              {/* Check in Column */}
              <th scope="col" className="th-resizable">
                <div className="th-content">
                  <button
                    type="button"
                    className={`th-sort-btn ${sortConfig.field === 'checkin' ? 'is-active' : ''}`}
                    onClick={() => handleSort('checkin')}
                    title={getSortTitle('Check in', 'checkin')}
                  >
                    <span>Check in</span>
                    <SortIndicator active={sortConfig.field === 'checkin'} direction={sortConfig.direction} />
                  </button>
                </div>
                <div
                  className={`col-resizer ${resizingCol === 'checkin' ? 'is-active' : ''}`}
                  onMouseDown={(e) => startResize('checkin', e)}
                  onDoubleClick={(e) => resetColumnWidth('checkin', e)}
                  title="Drag to resize column (Double-click to reset)"
                />
              </th>

              {/* Location Column */}
              <th scope="col" className="th-resizable">
                <div className="th-content">
                  <button
                    type="button"
                    className={`th-sort-btn ${sortConfig.field === 'location' ? 'is-active' : ''}`}
                    onClick={() => handleSort('location')}
                    title={getSortTitle('Location', 'location')}
                  >
                    <span>Location</span>
                    <SortIndicator active={sortConfig.field === 'location'} direction={sortConfig.direction} />
                  </button>
                </div>
                <div
                  className={`col-resizer ${resizingCol === 'location' ? 'is-active' : ''}`}
                  onMouseDown={(e) => startResize('location', e)}
                  onDoubleClick={(e) => resetColumnWidth('location', e)}
                  title="Drag to resize column (Double-click to reset)"
                />
              </th>

              {/* Note Column */}
              <th scope="col" className="th-resizable">
                <div className="th-content">
                  <button
                    type="button"
                    className={`th-sort-btn ${sortConfig.field === 'note' ? 'is-active' : ''}`}
                    onClick={() => handleSort('note')}
                    title={getSortTitle('Note', 'note')}
                  >
                    <span>Note</span>
                    <SortIndicator active={sortConfig.field === 'note'} direction={sortConfig.direction} />
                  </button>
                </div>
                <div
                  className={`col-resizer ${resizingCol === 'note' ? 'is-active' : ''}`}
                  onMouseDown={(e) => startResize('note', e)}
                  onDoubleClick={(e) => resetColumnWidth('note', e)}
                  title="Drag to resize column (Double-click to reset)"
                />
              </th>

              {/* ACTION Column (Fixed & Center-aligned, Admin only) */}
              {isAdmin && (
                <th scope="col" className="th-actions">
                  <div className="th-content" style={{ justifyContent: 'center' }}>
                    <span>ACTION</span>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {processedItems.map((item, index) => {
              const displayId = getCheckinDisplayId(item);
              const displayName = getCheckinName(item);
              const displayPhone = getCheckinPhone(item);
              const displayCheckin = getCheckinTime(item);
              const displayLocation = getCheckinLocation(item);
              const displayNote = getCheckinNote(item);
              const formattedDate = formatDateTime(displayCheckin);
              const avatarChar = getAvatarLetter(displayName);

              return (
                <tr key={item.ID ?? `row-${index}`} className="table-row">
                  {/* Id */}
                  <td>
                    <span className="id-badge" title={`Item ID: ${displayId}`}>
                      #{displayId ?? '—'}
                    </span>
                  </td>

                  {/* Name */}
                  <td>
                    <div className="name-cell">
                      <div className="avatar-chip">{avatarChar}</div>
                      <div className="name-text-group">
                        <span className="item-title" title={displayName || '(Untitled)'}>
                          {displayName || '(Untitled)'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td>
                    {displayPhone ? (
                      <div className="phone-cell">
                        <svg
                          className="cell-icon"
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <a href={`tel:${displayPhone}`} className="phone-link">
                          {displayPhone}
                        </a>
                      </div>
                    ) : (
                      <span className="cell-muted">—</span>
                    )}
                  </td>

                  {/* Check in */}
                  <td>
                    <div className="datetime-cell">
                      <svg
                        className="cell-icon"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>{formattedDate}</span>
                    </div>
                  </td>

                  {/* Location */}
                  <td>
                    <div className="location-pill" title={displayLocation || 'No location'}>
                      <svg
                        className="location-icon"
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{displayLocation || '—'}</span>
                    </div>
                  </td>

                  {/* note */}
                  <td>
                    <span
                      className={`note-text ${!displayNote ? 'is-empty' : ''}`}
                      title={displayNote || undefined}
                    >
                      {displayNote || 'No notes provided'}
                    </span>
                  </td>

                  {/* ACTION: Edit & Delete (Fixed & Center-aligned, Admin only) */}
                  {isAdmin && (
                    <td className="td-actions">
                      <div className="row-actions" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn-row-action btn-edit"
                          onClick={() => onEdit(item)}
                          title={`Edit #${displayId}`}
                          aria-label={`Edit ${displayName || 'item'}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          className="btn-row-action btn-delete"
                          onClick={() => onDelete(item)}
                          title={`Delete #${displayId}`}
                          aria-label={`Delete ${displayName || 'item'}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty State when Search has no matches */}
        {processedItems.length === 0 && (
          <div className="table-empty-state">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <p className="empty-title">No matching work items</p>
            <p className="empty-subtitle">
              No records match <strong>&ldquo;{searchQuery}&rdquo;</strong>. Try checking for typos or searching by another keyword.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSearchQuery('')}
            >
              Clear filter
            </button>
          </div>
        )}
      </div>
      )}

      {/* Table Footer info */}
      <div className="table-footer">
        <span className="footer-meta">
          Showing {processedItems.length} of {items.length} total entries
          {viewMode === 'table' && ' • Drag header borders to customize column width'}
        </span>
        <span className="footer-brand">SharePoint List Integration</span>
      </div>
    </div>
  );
};

export const WorkItemsTable = CheckinTableView;
export default CheckinTableView;
