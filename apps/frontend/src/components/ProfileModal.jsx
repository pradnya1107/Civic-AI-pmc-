import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PMC_WARDS } from '../constants/pmcData';
import { authApi } from '../services/api';

export const ProfileModal = ({ isOpen, onClose, initialTab = 'profile' }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState(initialTab || 'profile');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [preferredWard, setPreferredWard] = useState(user?.preferredWard || '');
  const [isSaved, setIsSaved] = useState(false);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    previousPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPreviousPassword, setShowPreviousPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordFormError, setPasswordFormError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'profile');
      setPhone(user?.phoneNumber || '');
      setPreferredWard(user?.preferredWard || '');
      setIsSaved(false);
      setPasswordSuccess(null);
      setPasswordFormError(null);
      setPasswordErrors({});
      setPasswordForm({
        previousPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPreviousPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen, initialTab, user?.phoneNumber, user?.preferredWard]);

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

  const validatePasswordForm = () => {
    const errs = {};
    if (!passwordForm.previousPassword) {
      errs.previousPassword = 'Current / previous password is required.';
    }

    if (!passwordForm.newPassword) {
      errs.newPassword = 'New password is required.';
    } else if (passwordForm.newPassword.length < 8) {
      errs.newPassword = 'New password must be at least 8 characters long.';
    } else if (!/[A-Z]/.test(passwordForm.newPassword)) {
      errs.newPassword = 'New password must contain at least 1 uppercase letter.';
    } else if (!/[^A-Za-z0-9]/.test(passwordForm.newPassword)) {
      errs.newPassword = 'New password must contain at least 1 special character (e.g. !@#$%^&*).';
    } else if (passwordForm.previousPassword && passwordForm.newPassword === passwordForm.previousPassword) {
      errs.newPassword = 'New password cannot be the same as your previous password.';
    }

    if (!passwordForm.confirmPassword) {
      errs.confirmPassword = 'Confirm password is required.';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errs.confirmPassword = 'New password and confirm password do not match.';
    }

    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordFormError(null);

    if (!validatePasswordForm()) {
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authApi.changePassword({
        previousPassword: passwordForm.previousPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      setPasswordSuccess(res?.message || 'Password changed successfully! Please use your new password for future sign-ins.');
      setPasswordForm({
        previousPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({});
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to change password. Please verify your current password.';
      setPasswordFormError(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div className="modal-content profile-modal-content">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="d-flex align-center gap-2">
            <div className="user-avatar user-avatar--lg" aria-hidden="true">{initial}</div>
            <div>
              <h2 id="profile-modal-title" className="modal-title">{displayName}</h2>
              <div className="d-flex align-center gap-1 mt-1">
                <span className="badge badge-primary">{displayRole}</span>
                {isVerified && <span className="badge badge-success">{t('verifiedCitizen', 'Verified Citizen')}</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label={t('modalClose', 'Close')}
          >
            &times;
          </button>
        </div>

        {/* Modal Tabs Navigation */}
        <div className="profile-modal-tabs" role="tablist" aria-label="Profile and Settings Tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            className={`profile-tab-btn ${activeTab === 'profile' ? 'profile-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('profile')}
            id="tab-profile"
            aria-controls="panel-profile"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{t('tabProfile', 'Profile & Preferences')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'password'}
            className={`profile-tab-btn ${activeTab === 'password' ? 'profile-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('password')}
            id="tab-password"
            aria-controls="panel-password"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>{t('resetPassword', 'Reset Password')}</span>
          </button>
        </div>

        {/* Tab 1: Profile & Preferences */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSave} className="modal-body" id="panel-profile" role="tabpanel" aria-labelledby="tab-profile">
            {isSaved && (
              <div className="alert-banner alert-banner--success mb-3" role="status">
                ✓ {t('settingsProfileSaved', 'Profile preferences updated successfully!')}
              </div>
            )}

            <div className="profile-grid">
              <div className="form-group mb-2">
                <label className="form-label text-xs">{t('fullNameLabel', 'Full Legal Name')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={displayName}
                  readOnly
                  disabled
                />
                <span className="text-muted text-xs">{t('officialPmcNameHint', 'Registered identity authenticated with PMC')}</span>
              </div>

              <div className="form-group mb-2">
                <label className="form-label text-xs">{t('registeredEmailLabel', 'Registered Email')}</label>
                <input
                  type="email"
                  className="form-input"
                  value={displayEmail}
                  readOnly
                  disabled
                />
              </div>

              <div className="form-group mb-2">
                <label className="form-label text-xs">{t('contactPhoneLabel', 'Contact Phone (for SMS updates)')}</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group mb-2">
                <label className="form-label text-xs">{t('primaryWardLabel', 'Primary Pune Municipal Ward')}</label>
                <select
                  className="form-select"
                  value={preferredWard}
                  onChange={(e) => setPreferredWard(e.target.value)}
                >
                  {PMC_WARDS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.value === '' ? t('selectWardOptional', 'Select PMC Ward (Optional)') : w.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Switch to Reset Password Option */}
            <div className="profile-security-callout mt-3 mb-2">
              <div className="d-flex align-center justify-between gap-2">
                <div>
                  <strong className="text-xs">{t('portalSettings', 'Account Password & Security')}</strong>
                  <p className="text-muted text-xs mt-1 mb-0">{t('resetPasswordSubtitle', 'Need to change your login credentials? Update your password anytime.')}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => setActiveTab('password')}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {t('resetPassword', 'Reset Password')} &rarr;
                </button>
              </div>
            </div>

            <div className="mt-2 p-3 info-box">
              <div className="d-flex align-center gap-2 text-xs">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <strong>{t('settingsAccountSecurityBadge', 'Data Privacy & Government Compliance')}</strong>
              </div>
              <p className="text-muted text-xs mt-1 mb-0">
                {t('wardAlertsHint', 'Your contact details are encrypted and utilized solely for municipal grievance tracking, SLA alerts, and resolution feedback.')}
              </p>
            </div>

            <div className="modal-footer d-flex justify-end gap-2 mt-3">
              <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
                {t('cancelBtn', 'Cancel')}
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                {t('savePreferencesBtn', 'Save Preferences')}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Reset Password Form */}
        {activeTab === 'password' && (
          <form
            onSubmit={handleChangePasswordSubmit}
            className="modal-body profile-password-pane"
            id="panel-password"
            role="tabpanel"
            aria-labelledby="tab-password"
            noValidate
          >
            {passwordSuccess && (
              <div className="alert-banner alert-banner--success mb-3" role="alert">
                <div className="d-flex align-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>{passwordSuccess}</span>
                </div>
              </div>
            )}

            {passwordFormError && (
              <div className="alert-banner alert-banner--danger mb-3" role="alert">
                <div className="d-flex align-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{passwordFormError}</span>
                </div>
              </div>
            )}

            {/* Current Password */}
            <div className="form-group mb-3">
              <label htmlFor="modal-previous-password" className="form-label text-xs">
                <span>{t('currentPasswordLabel', 'Current / Previous Password')} <span className="text-danger">*</span></span>
              </label>
              <div className="input-container">
                <input
                  id="modal-previous-password"
                  name="previousPassword"
                  type={showPreviousPassword ? 'text' : 'password'}
                  placeholder={t('currentPasswordPlaceholder', 'Enter your current password')}
                  value={passwordForm.previousPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, previousPassword: e.target.value });
                    if (passwordErrors.previousPassword) setPasswordErrors({ ...passwordErrors, previousPassword: '' });
                  }}
                  disabled={isChangingPassword}
                  className={`form-input input-with-toggle ${passwordErrors.previousPassword ? 'has-error' : ''}`}
                  autoComplete="current-password"
                  aria-required="true"
                  aria-invalid={Boolean(passwordErrors.previousPassword)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPreviousPassword((prev) => !prev)}
                  aria-label={showPreviousPassword ? 'Hide current password' : 'Show current password'}
                  tabIndex={-1}
                >
                  {showPreviousPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordErrors.previousPassword && (
                <p className="field-error" role="alert">{passwordErrors.previousPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div className="form-group mb-3">
              <label htmlFor="modal-new-password" className="form-label text-xs">
                <span>{t('newPasswordLabel', 'New Password')} <span className="text-danger">*</span></span>
              </label>
              <div className="input-container">
                <input
                  id="modal-new-password"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder={t('newPasswordPlaceholder', 'Min. 8 characters with upper & symbol')}
                  value={passwordForm.newPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                    if (passwordErrors.newPassword) setPasswordErrors({ ...passwordErrors, newPassword: '' });
                  }}
                  disabled={isChangingPassword}
                  className={`form-input input-with-toggle ${passwordErrors.newPassword ? 'has-error' : ''}`}
                  autoComplete="new-password"
                  aria-required="true"
                  aria-invalid={Boolean(passwordErrors.newPassword)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="field-error" role="alert">{passwordErrors.newPassword}</p>
              )}

              {/* Password Rules Checklist */}
              <div className="password-rules-box mt-2" aria-live="polite">
                <div className={`password-rule-item ${passwordForm.newPassword.length >= 8 ? 'valid' : ''}`}>
                  <span className="password-rule-bullet" aria-hidden="true">{passwordForm.newPassword.length >= 8 ? '✓' : '•'}</span>
                  <span>{t('ruleMinLength', 'At least 8 characters')}</span>
                </div>
                <div className={`password-rule-item ${/[A-Z]/.test(passwordForm.newPassword) ? 'valid' : ''}`}>
                  <span className="password-rule-bullet" aria-hidden="true">{/[A-Z]/.test(passwordForm.newPassword) ? '✓' : '•'}</span>
                  <span>{t('ruleUppercase', 'At least 1 uppercase letter (A-Z)')}</span>
                </div>
                <div className={`password-rule-item ${/[^A-Za-z0-9]/.test(passwordForm.newPassword) ? 'valid' : ''}`}>
                  <span className="password-rule-bullet" aria-hidden="true">{/[^A-Za-z0-9]/.test(passwordForm.newPassword) ? '✓' : '•'}</span>
                  <span>{t('ruleSpecialChar', 'At least 1 special character or symbol (!@#$%^&*)')}</span>
                </div>
                <div className={`password-rule-item ${passwordForm.newPassword && passwordForm.previousPassword && passwordForm.newPassword !== passwordForm.previousPassword ? 'valid' : ''}`}>
                  <span className="password-rule-bullet" aria-hidden="true">{passwordForm.newPassword && passwordForm.previousPassword && passwordForm.newPassword !== passwordForm.previousPassword ? '✓' : '•'}</span>
                  <span>{t('ruleDifferent', 'Different from current password')}</span>
                </div>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="form-group mb-3">
              <label htmlFor="modal-confirm-password" className="form-label text-xs">
                <span>{t('confirmNewPasswordLabel', 'Confirm New Password')} <span className="text-danger">*</span></span>
              </label>
              <div className="input-container">
                <input
                  id="modal-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t('confirmNewPasswordPlaceholder', 'Re-enter your new password')}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value });
                    if (passwordErrors.confirmPassword) setPasswordErrors({ ...passwordErrors, confirmPassword: '' });
                  }}
                  disabled={isChangingPassword}
                  className={`form-input input-with-toggle ${passwordErrors.confirmPassword ? 'has-error' : ''}`}
                  autoComplete="new-password"
                  aria-required="true"
                  aria-invalid={Boolean(passwordErrors.confirmPassword)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="field-error" role="alert">{passwordErrors.confirmPassword}</p>
              )}
            </div>

            <div className="modal-footer d-flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setPasswordForm({ previousPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordErrors({});
                  setPasswordFormError(null);
                  onClose();
                }}
                disabled={isChangingPassword}
              >
                {t('cancelBtn', 'Cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? t('resetPasswordSubmitting', 'Updating Password...') : t('resetPasswordBtn', 'Reset Password')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
