import React from 'react';

interface SkeletonLoaderProps {
  rowCount?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ rowCount = 5 }) => {
  const rows = Array.from({ length: rowCount });

  return (
    <div className="skeleton-container" aria-busy="true" aria-label="Loading data">
      <table className="data-table" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
        <colgroup>
          <col style={{ width: '85px' }} />
          <col style={{ width: '220px' }} />
          <col style={{ width: '160px' }} />
          <col style={{ width: '180px' }} />
          <col style={{ width: '180px' }} />
          <col style={{ width: '240px' }} />
          <col style={{ width: '145px' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ width: '85px' }}>Id</th>
            <th style={{ minWidth: '200px' }}>Name</th>
            <th style={{ minWidth: '150px' }}>Phone</th>
            <th style={{ minWidth: '180px' }}>Check in</th>
            <th style={{ minWidth: '180px' }}>Location</th>
            <th style={{ minWidth: '200px' }}>note</th>
            <th scope="col" className="th-actions" style={{ width: '145px', textAlign: 'center' }}>
              <div className="th-content" style={{ justifyContent: 'center' }}>
                <span>ACTION</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((_, index) => (
            <tr key={`skeleton-${index}`} className="skeleton-row">
              {/* Id */}
              <td>
                <div className="skeleton-shimmer skeleton-badge" style={{ width: '48px' }} />
              </td>

              {/* Name */}
              <td>
                <div className="skeleton-cell-group">
                  <div className="skeleton-shimmer skeleton-avatar" />
                  <div
                    className="skeleton-shimmer skeleton-line"
                    style={{ width: `${100 + (index % 3) * 35}px` }}
                  />
                </div>
              </td>

              {/* Phone */}
              <td>
                <div className="skeleton-shimmer skeleton-line" style={{ width: '110px' }} />
              </td>

              {/* Check in */}
              <td>
                <div className="skeleton-shimmer skeleton-line" style={{ width: '130px' }} />
              </td>

              {/* Location */}
              <td>
                <div
                  className="skeleton-shimmer skeleton-badge"
                  style={{ width: `${80 + (index % 2) * 20}px` }}
                />
              </td>

              {/* Note */}
              <td>
                <div
                  className="skeleton-shimmer skeleton-line"
                  style={{ width: `${140 + (index % 4) * 25}px` }}
                />
              </td>

              {/* Actions */}
              <td className="td-actions" style={{ textAlign: 'center' }}>
                <div className="row-actions" style={{ justifyContent: 'center' }}>
                  <div className="skeleton-shimmer skeleton-button" style={{ width: '32px', height: '32px' }} />
                  <div className="skeleton-shimmer skeleton-button" style={{ width: '32px', height: '32px' }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

