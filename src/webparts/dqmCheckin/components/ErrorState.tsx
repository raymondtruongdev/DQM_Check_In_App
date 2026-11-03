import React, { useState } from 'react';

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
  onUseDemoData?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry, onUseDemoData }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="error-card-state" role="alert">
      <div className="error-icon-wrapper">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <div className="error-content">
        <h3 className="error-title">Couldn't load check-in items</h3>
        <p className="error-description">
          We encountered an issue connecting to the SharePoint list. This may happen if the local environment is missing session credentials or during network interruptions.
        </p>

        {message && (
          <div className="error-tech-wrapper">
            <button
              type="button"
              className="error-toggle-btn"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide technical details' : 'Show technical details'}
            </button>
            {showDetails && (
              <pre className="error-tech-box">{message}</pre>
            )}
          </div>
        )}

        <div className="error-actions">
          <button type="button" className="btn-primary" onClick={onRetry}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Try Again
          </button>

          {onUseDemoData && (
            <button type="button" className="btn-secondary" onClick={onUseDemoData}>
              Preview with Sample Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

