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
                <input
                  type="text"
                  readOnly
                  className="report-info-code-badge"
                  value={metadata.docCode}
                  title={metadata.docCode}
                  aria-label="Mã tài liệu (chỉ đọc, có thể sao chép)"
                  onFocus={(e) => e.currentTarget.select()}
                />
              )}
            </div>
            {metadata.subTitle && (
              <div className="report-info-subtitle">
                {metadata.subTitle}
              </div>
            )}
          </div>

          <div className="report-info-date-group">
            <label htmlFor="report-date-picker-input" className="field__label">
              Ngày báo cáo
            </label>
            <div className="report-info-date-input-wrap">
              <input
                id="report-date-picker-input"
                type="date"
                className="input report-info-date-input"
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
          <div className="field">
            <label className="field__label">Vị trí / Trạm (Location)</label>
            <input
              type="text"
              className="input"
              value={metadata.location || ''}
              onChange={(e) => onMetadataChange('location', e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Row 1, Col 2: Số báo cáo (Report No) */}
          <div className="field">
            <label htmlFor="report-no-input" className="field__label">
              Số BCN (Report no.)
            </label>
            <input
              id="report-no-input"
              type="text"
              className="input"
              placeholder="VD: 041"
              // value={metadata.reportNo || ''}
              value={''}
              onChange={(e) => onMetadataChange('reportNo', e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Row 2, Col 1: Ca làm việc (Shift) */}
          <div className="field">
            <label htmlFor="report-shift-input" className="field__label">
              Ca làm việc (Shift)
            </label>
            <input
              id="report-shift-input"
              type="text"
              className="input"
              placeholder="VD: Cả ngày (2 ca), Ca ngày..."
              value={metadata.shift || ''}
              onChange={(e) => onMetadataChange('shift', e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Row 2, Col 2: Người báo cáo (Email) */}
          <div className="field">
            <label className="field__label">Người báo cáo (Email)</label>
            <input
              type="text"
              className="input input--readonly"
              value={metadata.email || ''}
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Section I: THÔNG TIN CHUNG & THỜI TIẾT | GENERAL & WEATHER */}
      <div id="report-sec-1" className="section-card">
        <div className="section-card__banner">
          <span className="section-card__title">
            I. THÔNG TIN CHUNG &amp; THỜI TIẾT <span className="section-card__title-sub">| GENERAL &amp; WEATHER</span>
          </span>
        </div>

        <div className="section-card__body">
          <div className="report-weather-grid">
            <div className="field">
              <label className="field__label field__label--bilingual">
                <span className="field__label-main">Sáng</span>
                <span className="field__label-sub">AM</span>
              </label>
              <select
                className="input"
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

            <div className="field">
              <label className="field__label field__label--bilingual">
                <span className="field__label-main">Chiều</span>
                <span className="field__label-sub">PM</span>
              </label>
              <select
                className="input"
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

            <div className="field">
              <label className="field__label field__label--bilingual">
                <span className="field__label-main">Nhiệt độ max</span>
                <span className="field__label-sub">Max temp</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="VD: 33 °C"
                value={metadata.maxTemp || ''}
                onChange={(e) => onMetadataChange('maxTemp', e.target.value)}
                disabled={disabled}
              />
            </div>

            <div className="field">
              <label className="field__label field__label--bilingual">
                <span className="field__label-main">Giờ mất do thời tiết</span>
                <span className="field__label-sub">Hrs lost</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="input"
                placeholder="0"
                value={metadata.hrsLost !== undefined ? metadata.hrsLost : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onMetadataChange('hrsLost', val === '' ? undefined : parseFloat(val));
                }}
                disabled={disabled}
              />
            </div>

            <div className="field">
              <label className="field__label field__label--bilingual">
                <span className="field__label-main">Đánh giá tiến độ</span>
                <span className="field__label-sub">Progress</span>
              </label>
              <select
                className="input"
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

          <div className="field" style={{ marginTop: '14px' }}>
            <label className="field__label">Tóm tắt | Summary</label>
            <textarea
              className="textarea"
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
