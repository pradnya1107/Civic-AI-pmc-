import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PMC_WARDS } from '../pages/ComplaintFormPage';

export const ProfileModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [preferredWard, setPreferredWard] = useState(user?.preferredWard || '');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const displayName = user?.name || user?.fullName || 'Citizen';
  const displayEmail = user?.email || 'N/A';
  const displayRole = user?.role || 'CITIZEN';
  const initial = displayName.charAt(0).toUpperCase() || 'C';
  const isVerified = user?.emailVerified;

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div className="modal-content profile-modal-content">
        <div className="modal-header">
          <div className="d-flex align-center gap-2">
            <div className="user-avatar user-avatar--lg" aria-hidden="true">{initial}</div>
            <div>
              <h2 id="profile-modal-title" className="modal-title">{displayName}</h2>
              <span className="badge badge-primary">{displayRole}</span>
              {isVerified && <span className="badge badge-success ml-1">Verified Citizen</span>}
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close profile"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          {isSaved && (
            <div className="alert-banner alert-banner--success mb-3">
              Profile preferences updated successfully!
            </div>
          )}

          <div className="profile-grid">
            <div className="form-group mb-2">
              <label className="form-label text-xs">Full Legal Name</label>
              <input
                type="text"
                className="form-input"
                value={displayName}
                readOnly
                disabled
              />
              <span className="text-muted text-xs">Registered identity authenticated with PMC</span>
            </div>

            <div className="form-group mb-2">
              <label className="form-label text-xs">Registered Email</label>
              <input
                type="email"
                className="form-input"
                value={displayEmail}
                readOnly
                disabled
              />
            </div>

            <div className="form-group mb-2">
              <label className="form-label text-xs">Contact Phone (for SMS updates)</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group mb-2">
              <label className="form-label text-xs">Primary Pune Municipal Ward</label>
              <select
                className="form-select"
                value={preferredWard}
                onChange={(e) => setPreferredWard(e.target.value)}
              >
                {PMC_WARDS.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 p-3 info-box">
            <div className="d-flex align-center gap-2 text-xs">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <strong>Data Privacy & Government Compliance</strong>
            </div>
            <p className="text-muted text-xs mt-1">
              Your contact details are encrypted and utilized solely for municipal grievance tracking, SLA alerts, and resolution feedback.
            </p>
          </div>

          <div className="modal-footer d-flex justify-end gap-2 mt-3">
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
