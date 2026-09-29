import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;

  const icons = {
    success: <CheckCircle2 size={19} color="#00E676" />,
    error: <AlertCircle size={19} color="#FF5252" />,
    warning: <AlertTriangle size={19} color="#FFB800" />,
    info: <Info size={19} color="#00D2FF" />,
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon-wrap">
        {icons[type] || icons.info}
      </div>
      <span className="toast-text">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="toast-close-btn"
          aria-label="Close notification"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
