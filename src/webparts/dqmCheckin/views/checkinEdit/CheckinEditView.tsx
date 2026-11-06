import React, { useState } from 'react';
import type { Data_checkinRead, Data_checkinWrite } from '../../types';
import {
  getItemName,
  getItemDisplayId,
  getItemCheckIn,
  getItemLocation,
  getItemNote,
  getItemPhone,
  isoToDatetimeLocal,
  datetimeLocalToIso,
} from '../../utils';

export interface CheckinEditViewProps {
  item: Data_checkinRead;
  onSave: (changedFields: Partial<Omit<Data_checkinWrite, 'ID'>>) => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
  saveError: string | null;
}

export const CheckinEditView: React.FC<CheckinEditViewProps> = ({
  item,
  onSave,
  onBack,
  isSaving,
  saveError,
}) => {
  // Form state
  const initialName = getItemName(item);
  const initialCustomId = item.Id !== undefined && item.Id !== null ? String(item.Id) : '';
  const initialPhone = getItemPhone(item);
  const initialCheckin = isoToDatetimeLocal(getItemCheckIn(item));
  const initialLocation = getItemLocation(item);
  const initialNote = getItemNote(item);

  const [name, setName] = useState(initialName);
  const [customId, setCustomId] = useState<string>(initialCustomId);
  const [phone, setPhone] = useState(initialPhone);
  const [checkin, setCheckin] = useState<string>(initialCheckin);
  const [location, setLocation] = useState(initialLocation);
  const [note, setNote] = useState(initialNote);

  // Track if changes have been made
  const isDirty =
    name !== initialName ||
    customId !== initialCustomId ||
    phone !== initialPhone ||
    checkin !== initialCheckin ||
    location !== initialLocation ||
    note !== initialNote;

  // Discard action: resets state to item's original values
  const handleDiscard = () => {
    setName(initialName);
    setCustomId(initialCustomId);
    setPhone(initialPhone);
    setCheckin(initialCheckin);
    setLocation(initialLocation);
    setNote(initialNote);
  };

  // Back action: user navigates back (discards changes)
  const handleBack = () => {
    handleDiscard();
    onBack();
  };

  // Submit action: calls onSave with updated fields following SharePoint guidelines
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const changedFields: Record<string, unknown> = {};

    const trimmedName = name.trim();
    if ('field_1' in item) changedFields.field_1 = trimmedName;
    if ('Name' in item || !('field_1' in item)) changedFields.Name = trimmedName;
    if ('Title' in item) changedFields.Title = trimmedName;

    // Id
    if (customId.trim() !== '') {
      const idNum = Number(customId);
      if ('field_0' in item) changedFields.field_0 = idNum;
      if ('Id' in item || !('field_0' in item)) changedFields.Id = idNum;
    }

    // Phone
    if (phone.trim() !== '') {
      if ('field_5' in item) changedFields.field_5 = phone.trim();
      if ('Phone' in item || !('field_5' in item)) changedFields.Phone = phone.trim();
    }

    // Check in
    const isoDate = datetimeLocalToIso(checkin);
    if (isoDate) {
      if ('field_2' in item) changedFields.field_2 = isoDate;
      if ('Check_x0020_in' in item) changedFields.Check_x0020_in = isoDate;
      if (!('field_2' in item) && !('Check_x0020_in' in item)) changedFields.Check_x0020_in = isoDate;
    }

    // Location
    const trimmedLoc = location.trim();
    if ('field_3' in item) changedFields.field_3 = trimmedLoc;
    if ('Location' in item || !('field_3' in item)) changedFields.Location = trimmedLoc;

    // Note
    const trimmedNote = note.trim();
    if ('field_4' in item) changedFields.field_4 = trimmedNote;
    if ('Note' in item || !('field_4' in item)) changedFields.Note = trimmedNote;

    await onSave(changedFields as Partial<Omit<Data_checkinWrite, 'ID'>>);
  };

  const displayId = getItemDisplayId(item);

  return (
    <div className="edit-view-container">
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb-nav" aria-label="Breadcrumb">
        <button type="button" className="breadcrumb-link" onClick={handleBack}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Quay lại danh sách
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Chỉnh sửa #{displayId}</span>
      </nav>

      {/* Main Form Card */}
      <div className="card-container edit-card">
        {/* Card Header with Title and Back button */}
        <div className="edit-card-header">
          <div className="edit-header-info">
            <div className="edit-title-row">
              <h2 className="edit-title">Chỉnh sửa thông tin Check-In</h2>
              <span className="id-badge">#{displayId}</span>
              {isDirty && (
                <span className="dirty-indicator" title="Có thay đổi chưa lưu">
                  Chưa lưu thay đổi
                </span>
              )}
            </div>
            <p className="edit-subtitle">
              Cập nhật thông tin chi tiết vào danh sách <code>data_checkin</code> trên SharePoint.
            </p>
          </div>

          <div className="edit-header-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleBack}
              disabled={isSaving}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Quay lại
            </button>
          </div>
        </div>

        {/* Error notification banner if save failed */}
        {saveError && (
          <div className="form-alert-error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{saveError}</span>
          </div>
        )}

        {/* Form Fields */}
        <form className="edit-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Field: Name */}
            <div className="form-group form-col-full">
              <label htmlFor="field-name" className="form-label">
                Họ và Tên <span className="required-mark">*</span>
              </label>
              <input
                id="field-name"
                type="text"
                className="form-input"
                placeholder="Nhập họ tên người check-in..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSaving}
              />
              <span className="form-help-text">Ánh xạ tới cột <code>Name</code> trong SharePoint</span>
            </div>

            {/* Field: Id */}
            <div className="form-group form-col-half">
              <label htmlFor="field-id" className="form-label">
                Mã số / ID
              </label>
              <input
                id="field-id"
                type="number"
                className="form-input"
                placeholder="VD: 101"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                disabled={isSaving}
              />
              <span className="form-help-text">Mã định danh số (<code>Id</code>)</span>
            </div>

            {/* Field: Phone */}
            <div className="form-group form-col-half">
              <label htmlFor="field-phone" className="form-label">
                Số điện thoại
              </label>
              <input
                id="field-phone"
                type="tel"
                className="form-input"
                placeholder="VD: 0901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSaving}
              />
              <span className="form-help-text">Số liên hệ (<code>Phone</code>)</span>
            </div>

            {/* Field: Check in */}
            <div className="form-group form-col-half">
              <label htmlFor="field-checkin" className="form-label">
                Thời gian Check-in
              </label>
              <input
                id="field-checkin"
                type="datetime-local"
                className="form-input"
                value={checkin}
                onChange={(e) => setCheckin(e.target.value)}
                disabled={isSaving}
              />
              <span className="form-help-text">Thời điểm ghi nhận (<code>Check in</code>)</span>
            </div>

            {/* Field: Location */}
            <div className="form-group form-col-half">
              <label htmlFor="field-location" className="form-label">
                Địa điểm / Trạm
              </label>
              <input
                id="field-location"
                type="text"
                className="form-input"
                placeholder="VD: ST5, Sala, Sadora..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isSaving}
              />
              <span className="form-help-text">Vị trí trạm hoặc công trình (<code>Location</code>)</span>
            </div>

            {/* Field: Note */}
            <div className="form-group form-col-full">
              <label htmlFor="field-note" className="form-label">
                Ghi chú
              </label>
              <textarea
                id="field-note"
                className="form-textarea"
                rows={4}
                placeholder="Thêm ghi chú công việc, tình trạng kiểm tra..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSaving}
              />
              <span className="form-help-text">Nội dung ghi chú chi tiết (<code>Note</code>)</span>
            </div>
          </div>

          {/* Form Action Buttons: Discard, Back, Save */}
          <div className="form-footer">
            <div className="footer-left">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleBack}
                disabled={isSaving}
              >
                Quay lại
              </button>
            </div>

            <div className="footer-right">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleDiscard}
                disabled={!isDirty || isSaving}
                title="Hủy các thay đổi vừa nhập"
              >
                Hủy thay đổi
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSaving || !name.trim()}
              >
                {isSaving ? (
                  <>
                    <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    </svg>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const EditItemView = CheckinEditView;
export default CheckinEditView;
