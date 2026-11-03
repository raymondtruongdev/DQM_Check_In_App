import React, { useState, useMemo, useCallback } from 'react';
import type { Data_checkinRead } from '../models/DataCheckinModel';

export type SortField = 'id' | 'title' | 'phone' | 'checkin' | 'location' | 'note';
export type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface WorkItemsTableProps {
  items: Data_checkinRead[];
  isDemoData?: boolean;
  onEdit: (item: Data_checkinRead) => void;
  onDelete: (item: Data_checkinRead) => void;
}

// Fixed width for the Action column so buttons always remain visible and stable
const ACTIONS_COLUMN_WIDTH = 130;

// Sensible compact default column widths in pixels so all 7 columns fit on screen
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  id: 70,
  title: 170,
  phone: 125,
  checkin: 150,
  location: 120,
  note: 150,
};

// Minimum column widths to ensure usability
const MIN_COLUMN_WIDTHS: Record<string, number> = {
  id: 55,
  title: 120,
  phone: 95,
  checkin: 120,
  location: 95,
  note: 110,
};

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

export const WorkItemsTable: React.FC<WorkItemsTableProps> = ({
  items,
  isDemoData,
  onEdit,
  onDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'id',
    direction: 'desc',
  });

  // Resizable column widths with persistent storage in localStorage
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('dqm_spfx_col_widths_v2');
      if (saved) {
        return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback to defaults
    }
    return DEFAULT_COLUMN_WIDTHS;
  });

  const [resizingCol, setResizingCol] = useState<string | null>(null);

  const totalTableWidth = useMemo(() => {
    return (
      (columnWidths.id || DEFAULT_COLUMN_WIDTHS.id) +
      (columnWidths.title || DEFAULT_COLUMN_WIDTHS.title) +
      (columnWidths.phone || DEFAULT_COLUMN_WIDTHS.phone) +
      (columnWidths.checkin || DEFAULT_COLUMN_WIDTHS.checkin) +
      (columnWidths.location || DEFAULT_COLUMN_WIDTHS.location) +
      (columnWidths.note || DEFAULT_COLUMN_WIDTHS.note) +
      ACTIONS_COLUMN_WIDTH
    );
  }, [columnWidths]);

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

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const newWidth = Math.max(minWidth, Math.round(initialWidth + deltaX));

        setColumnWidths((prev) => {
          const next = { ...prev, [columnKey]: newWidth };
          try {
            localStorage.setItem('dqm_spfx_col_widths_v2', JSON.stringify(next));
          } catch {
            // Ignore storage errors
          }
          return next;
        });
      };

      const handleMouseUp = () => {
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
  const resetColumnWidth = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setColumnWidths((prev) => {
      const next = { ...prev, [columnKey]: DEFAULT_COLUMN_WIDTHS[columnKey] };
      try {
        localStorage.setItem('dqm_spfx_col_widths_v2', JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // Reset all columns
  const resetAllWidths = () => {
    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    try {
      localStorage.removeItem('dqm_spfx_col_widths_v2');
      localStorage.removeItem('powerapp1_column_widths');
    } catch {
      // Ignore
    }
  };

  // Toggle sorting on column click
  const handleSort = (field: SortField) => {
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
        const idStr = String(item.field_0 ?? item.ID ?? '').toLowerCase();
        const titleStr = (item.Title || '').toLowerCase();
        const phoneStr = (item.Phone || '').toLowerCase();
        const locationStr = (item.field_3 || '').toLowerCase();
        const noteStr = (item.field_4 || '').toLowerCase();

        return (
          idStr.includes(query) ||
          titleStr.includes(query) ||
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
          const idA = a.field_0 !== undefined ? a.field_0 : (a.ID ?? 0);
          const idB = b.field_0 !== undefined ? b.field_0 : (b.ID ?? 0);
          comparison = idA - idB;
          break;
        }
        case 'title': {
          const titleA = a.Title || '';
          const titleB = b.Title || '';
          comparison = titleA.localeCompare(titleB, undefined, { sensitivity: 'base' });
          break;
        }
        case 'phone': {
          const phoneA = a.Phone || '';
          const phoneB = b.Phone || '';
          comparison = phoneA.localeCompare(phoneB, undefined, { sensitivity: 'base' });
          break;
        }
        case 'checkin': {
          const timeA = a.field_2 ? new Date(a.field_2).getTime() : 0;
          const timeB = b.field_2 ? new Date(b.field_2).getTime() : 0;
          comparison = timeA - timeB;
          break;
        }
        case 'location': {
          const locA = a.field_3 || '';
          const locB = b.field_3 || '';
          comparison = locA.localeCompare(locB, undefined, { sensitivity: 'base' });
          break;
        }
        case 'note': {
          const noteA = a.field_4 || '';
          const noteB = b.field_4 || '';
          comparison = noteA.localeCompare(noteB, undefined, { sensitivity: 'base' });
          break;
        }
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [items, searchQuery, sortConfig]);

  // Helper to format ISO date string nicely
  const formatDateTime = (dateString?: string) => {
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
  const getAvatarLetter = (title?: string) => {
    if (!title || title.trim().length === 0) return 'W';
    return title.trim().charAt(0).toUpperCase();
  };

  const getSortTitle = (label: string, field: SortField) => {
    if (sortConfig.field !== field) return `Sort by ${label}`;
    return `Sorted by ${label} (${sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}) - Click to reverse`;
  };

  return (
    <div className="card-container">
      {/* Table Toolbar Header */}
      <div className="table-toolbar">
        <div className="toolbar-info">
          <div className="toolbar-title-row">
            <h2 className="toolbar-title">Work Items</h2>
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
          <p className="toolbar-subtitle">
            Records logged in SharePoint list: <code>data_checkin</code> • Drag column borders to resize • Click headers to sort
          </p>
        </div>

        {/* Toolbar Controls: Search & Reset Widths */}
        <div className="toolbar-actions-group">
          <button
            type="button"
            className="btn-text-subtle"
            onClick={resetAllWidths}
            title="Reset column widths to default layout"
          >
            Reset widths
          </button>

          {/* Search Input */}
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

      {/* Responsive Table Container */}
      <div className="table-responsive">
        <table
          className={`data-table ${resizingCol ? 'is-resizing' : ''}`}
          style={{ tableLayout: 'fixed', minWidth: `${totalTableWidth}px`, width: '100%' }}
        >
          {/* Column definitions for precise pixel width resizing */}
          <colgroup>
            <col style={{ width: `${columnWidths.id}px` }} />
            <col style={{ width: `${columnWidths.title}px` }} />
            <col style={{ width: `${columnWidths.phone}px` }} />
            <col style={{ width: `${columnWidths.checkin}px` }} />
            <col style={{ width: `${columnWidths.location}px` }} />
            <col style={{ width: `${columnWidths.note}px` }} />
            <col style={{ width: `${ACTIONS_COLUMN_WIDTH}px` }} />
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
                    className={`th-sort-btn ${sortConfig.field === 'title' ? 'is-active' : ''}`}
                    onClick={() => handleSort('title')}
                    title={getSortTitle('Name', 'title')}
                  >
                    <span>Name</span>
                    <SortIndicator active={sortConfig.field === 'title'} direction={sortConfig.direction} />
                  </button>
                </div>
                <div
                  className={`col-resizer ${resizingCol === 'title' ? 'is-active' : ''}`}
                  onMouseDown={(e) => startResize('title', e)}
                  onDoubleClick={(e) => resetColumnWidth('title', e)}
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

              {/* ACTION Column (Fixed & Center-aligned) */}
              <th scope="col" className="th-actions">
                <div className="th-content" style={{ justifyContent: 'center' }}>
                  <span>ACTION</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {processedItems.map((item, index) => {
              const displayId = item.field_0 !== undefined ? item.field_0 : item.ID;
              const formattedDate = formatDateTime(item.field_2);
              const avatarChar = getAvatarLetter(item.Title);

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
                        <span className="item-title" title={item.Title || '(Untitled)'}>
                          {item.Title || '(Untitled)'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td>
                    {item.Phone ? (
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
                        <a href={`tel:${item.Phone}`} className="phone-link">
                          {item.Phone}
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
                    <div className="location-pill" title={item.field_3 || 'No location'}>
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
                      <span>{item.field_3 || '—'}</span>
                    </div>
                  </td>

                  {/* note */}
                  <td>
                    <span
                      className={`note-text ${!item.field_4 ? 'is-empty' : ''}`}
                      title={item.field_4 || undefined}
                    >
                      {item.field_4 || 'No notes provided'}
                    </span>
                  </td>

                  {/* ACTION: Edit & Delete (Fixed & Center-aligned) */}
                  <td className="td-actions">
                    <div className="row-actions" style={{ justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="btn-row-action btn-edit"
                        onClick={() => onEdit(item)}
                        title={`Edit #${displayId}`}
                        aria-label={`Edit ${item.Title || 'item'}`}
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
                        aria-label={`Delete ${item.Title || 'item'}`}
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
              No records match <strong>"{searchQuery}"</strong>. Try checking for typos or searching by another keyword.
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

      {/* Table Footer info */}
      <div className="table-footer">
        <span className="footer-meta">
          Showing {processedItems.length} of {items.length} total entries • Drag header borders to customize column width
        </span>
        <span className="footer-brand">SharePoint List Integration</span>
      </div>
    </div>
  );
};
