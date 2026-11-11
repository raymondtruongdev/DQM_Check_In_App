import * as React from 'react';
import { ReportMetadata } from '../types/report.types';

export interface IReportMetaFormProps {
  metadata: ReportMetadata;
  dateStr: string;
  onDateChange: (newDate: string) => void;
  onMetadataChange: <K extends keyof ReportMetadata>(field: K, value: ReportMetadata[K]) => void;
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
    <>
      <div className="report-info-card">
        {/* 1. Top Section: Doc Code + Template Version + Subtitle on Left, Date Picker on Right */}
        <div className="report-info-top-row">
          <div className="report-info-left-group">
            <div className="report-info-badges-inline">
              {metadata.docCode && (
                <div className="report-info-code-badge" title={metadata.docCode}>
                  {metadata.docCode}
                </div>
              )}
            </div>
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
            <label className="report-info-field-label">Vị trí / Trạm (Location)</label>
            <input
              type="text"
              className="report-info-input"
              value={metadata.location || ''}
              onChange={(e) => onMetadataChange('location', e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Row 1, Col 2: Số báo cáo (Report No) */}
          <div className="report-info-field-item">
            <label htmlFor="report-no-input" className="report-info-field-label">
              Số BCN (Report no.)
            </label>
            <input
              id="report-no-input"
              type="text"
              className="report-info-input"
              placeholder="VD: 041"
              // value={metadata.reportNo || ''}
              value={''}
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
              placeholder="VD: Cả ngày (2 ca), Ca ngày..."
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

      {/* Section I: THÔNG TIN CHUNG & THỜI TIẾT | GENERAL & WEATHER */}
      <div id="report-sec-1" className="report-section-card">
        <div className="report-section-banner">
          <span className="report-section-banner-title">
            I. THÔNG TIN CHUNG &amp; THỜI TIẾT <span className="report-section-banner-en">| GENERAL &amp; WEATHER</span>
          </span>
        </div>

        <div className="report-section-body">
          <div className="report-weather-grid">
            <div className="report-info-field-item">
              <label className="report-info-field-label report-bilingual-label">
                <span className="label-vi">Sáng</span>
                <span className="label-en">AM</span>
              </label>
              <select
                className="report-info-input"
                value={metadata.weatherAM || 'Nắng'}
                onChange={(e) => onMetadataChange('weatherAM', e.target.value)}
                disabled={disabled}
              >
                <option value="Nắng">Nắng</option>
                <option value="Râm mát">Râm mát</option>
                <option value="Mưa nhỏ">Mưa nhỏ</option>
                <option value="Mưa vừa">Mưa vừa</option>
                <option value="Mưa to">Mưa to</option>
              </select>
            </div>

            <div className="report-info-field-item">
              <label className="report-info-field-label report-bilingual-label">
                <span className="label-vi">Chiều</span>
                <span className="label-en">PM</span>
              </label>
              <select
                className="report-info-input"
                value={metadata.weatherPM || 'Nắng'}
                onChange={(e) => onMetadataChange('weatherPM', e.target.value)}
                disabled={disabled}
              >
                <option value="Nắng">Nắng</option>
                <option value="Râm mát">Râm mát</option>
                <option value="Mưa nhỏ">Mưa nhỏ</option>
                <option value="Mưa vừa">Mưa vừa</option>
                <option value="Mưa to">Mưa to</option>
              </select>
            </div>

            <div className="report-info-field-item">
              <label className="report-info-field-label report-bilingual-label">
                <span className="label-vi">Nhiệt độ max</span>
                <span className="label-en">Max temp</span>
              </label>
              <input
                type="text"
                className="report-info-input"
                placeholder="VD: 33 °C"
                value={metadata.maxTemp || ''}
                onChange={(e) => onMetadataChange('maxTemp', e.target.value)}
                disabled={disabled}
              />
            </div>

            <div className="report-info-field-item">
              <label className="report-info-field-label report-bilingual-label">
                <span className="label-vi">Giờ mất do thời tiết</span>
                <span className="label-en">Hrs lost</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="report-info-input"
                placeholder="0"
                value={metadata.hrsLost !== undefined ? metadata.hrsLost : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onMetadataChange('hrsLost', val === '' ? undefined : parseFloat(val));
                }}
                disabled={disabled}
              />
            </div>

            <div className="report-info-field-item">
              <label className="report-info-field-label report-bilingual-label">
                <span className="label-vi">Đánh giá tiến độ</span>
                <span className="label-en">Progress</span>
              </label>
              <select
                className="report-info-input"
                value={metadata.progressEval || 'Đạt'}
                onChange={(e) => onMetadataChange('progressEval', e.target.value)}
                disabled={disabled}
              >
                <option value="Đạt">Đạt</option>
                <option value="Vượt">Vượt</option>
                <option value="Chậm">Chậm</option>
              </select>
            </div>
          </div>

          <div className="report-info-field-item" style={{ marginTop: '14px' }}>
            <label className="report-info-field-label">Tóm tắt | Summary</label>
            <textarea
              className="report-textarea"
              rows={3}
              placeholder="Nhập tóm tắt công việc trong ngày và giải trình (nếu có)..."
              value={metadata.summary || ''}
              onChange={(e) => onMetadataChange('summary', e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </>
  );
};
