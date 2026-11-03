import React, { useState } from 'react';
import type { Data_checkinRead, Data_checkinWrite } from '../models/DataCheckinModel';

interface EditItemViewProps {
  item: Data_checkinRead;
  onSave: (changedFields: Partial<Omit<Data_checkinWrite, 'ID'>>) => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
  saveError: string | null;
}

// Helper to convert ISO date string to datetime-local format (YYYY-MM-DDTHH:mm)
function isoToDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => (n < 10 ? '0' + n : String(n));
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

// Helper to convert datetime-local format back to ISO string
function datetimeLocalToIso(val?: string): string | undefined {
  if (!val) return undefined;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
  } catch {
    return undefined;
  }
}

export const EditItemView: React.FC<EditItemViewProps> = ({
  item,
  onSave,
  onBack,
  isSaving,
  saveError,
}) => {
  // Form state
  const [title, setTitle] = useState(item.Title ?? '');
  const [field0, setField0] = useState<string>(item.field_0 !== undefined ? String(item.field_0) : '');
  const [phone, setPhone] = useState(item.Phone ?? '');
  const [field2, setField2] = useState<string>(isoToDatetimeLocal(item.field_2));
  const [field3, setField3] = useState(item.field_3 ?? '');
  const [field4, setField4] = useState(item.field_4 ?? '');

  // Track if changes have been made
  const isDirty =
    title !== (item.Title ?? '') ||
    field0 !== (item.field_0 !== undefined ? String(item.field_0) : '') ||
    phone !== (item.Phone ?? '') ||
    field2 !== isoToDatetimeLocal(item.field_2) ||
    field3 !== (item.field_3 ?? '') ||
    field4 !== (item.field_4 ?? '');

  // Discard action: resets state to item's original values
  const handleDiscard = () => {
    setTitle(item.Title ?? '');
    setField0(item.field_0 !== undefined ? String(item.field_0) : '');
    setPhone(item.Phone ?? '');
    setField2(isoToDatetimeLocal(item.field_2));
    setField3(item.field_3 ?? '');
    setField4(item.field_4 ?? '');
  };

  // Back action: user navigates back (discards changes)
  const handleBack = () => {
    handleDiscard();
    onBack();
  };

  // Submit action: calls onSave with updated fields following SharePoint guidelines
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const changedFields: Partial<Omit<Data_checkinWrite, 'ID'>> = {
      Title: title.trim(),
      field_0: field0.trim() !== '' ? Number(field0) : undefined,
      Phone: phone.trim() !== '' ? phone.trim() : undefined,
      field_2: datetimeLocalToIso(field2),
      field_3: field3.trim(),
      field_4: field4.trim(),
    };

    await onSave(changedFields);
  };

  const displayId = item.field_0 !== undefined ? item.field_0 : item.ID;

  return (
    <div className="edit-view-container">
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb-nav" aria-label="Breadcrumb">
        <button type="button" className="breadcrumb-link" onClick={handleBack}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Work Items
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Edit Item #{displayId}</span>
      </nav>

      {/* Main Form Card */}
      <div className="card-container edit-card">
        {/* Card Header with Title and Back button */}
        <div className="edit-card-header">
          <div className="edit-header-info">
            <div className="edit-title-row">
              <h2 className="edit-title">Edit Work Item</h2>
              <span className="id-badge">#{displayId}</span>
              {isDirty && (
                <span className="dirty-indicator" title="Unsaved changes detected">
                  Unsaved changes
                </span>
              )}
            </div>
            <p className="edit-subtitle">
              Update details for this item in SharePoint list <code>data_checkin</code>.
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
              Back
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
            {/* Field: Name (Title) */}
            <div className="form-group form-col-full">
              <label htmlFor="field-title" className="form-label">
                Name <span className="required-mark">*</span>
              </label>
              <input
                id="field-title"
                type="text"
                className="form-input"
                placeholder="Enter work item or check-in name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isSaving}
              />
              <span className="form-help-text">Mapped to list column <code>Title</code></span>
            </div>

            {/* Field: Id (field_0) */}
            <div className="form-group form-col-half">
              <label htmlFor="field-id" className="form-label">
                Id (Code)
              </label>
              <input
                id="field-id"
                type="number"
                className="form-input"
                placeholder="e.g. 101"
                value={field0}
                onChange={(e) => setField0(e.target.value)}
                disabled={isSaving}
              />
              <span className="form-help-text">Custom numeric identifier (<code>field_0</code>)</span>
            </div>

            {/* Field: Phone */}
            <div className="form-group form-col-half">
              <label htmlFor="field-phone" className="form-label">
                Phone
              </label>
              <input
                id="field-phone"
                type="tel"
                className="form-input"
                placeholder="e.g. +84 901 234 567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSaving}
              />
              <span className="form-help-text">Contact phone number (<code>Phone</code>)</span>
            </div>

            {/* Field: Check in (field_2) */}
            <div className="form-group form-col-half">
              <label htmlFor="field-checkin" className="form-label">
                Check in Date & Time
              </label>
              <input
                id="field-checkin"
                type="datetime-local"
                className="form-input"
                value={field2}
                onChange={(e) => setField2(e.target.value)}
                disabled={isSaving}
              />
              <span className="form-help-text">Timestamp recorded (<code>field_2</code>)</span>
            </div>

            {/* Field: Location (field_3) */}
            <div className="form-group form-col-half">
              <label htmlFor="field-location" className="form-label">
                Location
              </label>
              <input
                id="field-location"
                type="text"
                className="form-input"
                placeholder="e.g. Hanoi Logistics Hub or Chu Lai Factory"
                value={field3}
                onChange={(e) => setField3(e.target.value)}
                disabled={isSaving}
              />
              <span className="form-help-text">Site or plant location (<code>field_3</code>)</span>
            </div>

            {/* Field: Note (field_4) */}
            <div className="form-group form-col-full">
              <label htmlFor="field-note" className="form-label">
                Note
              </label>
              <textarea
                id="field-note"
                className="form-textarea"
                rows={4}
                placeholder="Add operational notes, remarks, or observations..."
                value={field4}
                onChange={(e) => setField4(e.target.value)}
                disabled={isSaving}
              />
              <span className="form-help-text">Inspection remarks or audit notes (<code>field_4</code>)</span>
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
                Back
              </button>
            </div>

            <div className="footer-right">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleDiscard}
                disabled={!isDirty || isSaving}
                title="Discard uncommitted changes"
              >
                Discard
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSaving || !title.trim()}
              >
                {isSaving ? (
                  <>
                    <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    Save Changes
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
