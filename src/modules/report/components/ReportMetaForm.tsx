import * as React from 'react';
import { ReportMetadata } from '../types/report.types';

export interface IReportMetaFormProps {
  metadata: ReportMetadata;
  dateStr: string;
  onDateChange: (newDate: string) => void;
  onMetadataChange: (field: keyof ReportMetadata, value: string) => void;
  isExisting: boolean;
  disabled?: boolean;
}

export const ReportMetaForm: React.FC<IReportMetaFormProps> = ({
  metadata,
  dateStr,
  onDateChange,
  onMetadataChange,
  disabled = false
}) => {
  return (
    <div className="report-info-card">
      {/* 1. Top Section: Doc Code + Subtitle on Left, Date Picker on Right */}
      <div className="report-info-top-row">
        <div className="report-info-left-group">
          {metadata.docCode && (
            <div className="report-info-code-badge" title={metadata.docCode}>
              {metadata.docCode}
            </div>
          )}
          {metadata.subTitle && (
            <div className="report-info-subtitle">
              {metadata.subTitle}
            </div>
          )}
        </div>

        <div className="report-info-date-group">
          <label htmlFor="report-date-picker-input" className="report-info-field-label">
            Ngày báo cáo
          </label>
          <div className="report-info-date-input-wrap">
            <input
              id="report-date-picker-input"
              type="date"
              className="report-info-date-input"
              value={dateStr}
              onChange={(e) => onDateChange(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* 2. Form Grid (2 Columns x 2 Rows) */}
      <div className="report-info-grid-2x2">
        {/* Row 1, Col 1: Vị trí / Trạm */}
        <div className="report-info-field-item">
          <label className="report-info-field-label">Vị trí / Trạm</label>
          <input
            type="text"
            className="report-info-input report-info-input-readonly"
            value={metadata.location}
            readOnly
          />
        </div>

        {/* Row 1, Col 2: Số báo cáo (Report No) */}
        <div className="report-info-field-item">
          <label htmlFor="report-no-input" className="report-info-field-label">
            Số báo cáo (Report No)
          </label>
          <input
            id="report-no-input"
            type="text"
            className="report-info-input"
            placeholder="VD: 01, BCN-01..."
            value={metadata.reportNo || ''}
            onChange={(e) => onMetadataChange('reportNo', e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* Row 2, Col 1: Ca làm việc (Shift) */}
        <div className="report-info-field-item">
          <label htmlFor="report-shift-input" className="report-info-field-label">
            Ca làm việc (Shift)
          </label>
          <input
            id="report-shift-input"
            type="text"
            className="report-info-input"
            placeholder="VD: Ca ngày, Ca đêm..."
            value={metadata.shift || ''}
            onChange={(e) => onMetadataChange('shift', e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* Row 2, Col 2: Người báo cáo (Email) */}
        <div className="report-info-field-item">
          <label className="report-info-field-label">Người báo cáo (Email)</label>
          <input
            type="text"
            className="report-info-input report-info-input-readonly"
            value={metadata.email || ''}
            readOnly
          />
        </div>
      </div>
    </div>
  );
};
