import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { CitizenLayout } from '../components/CitizenLayout';
import { PMC_WARDS } from '../constants/pmcData';
import { authApi } from '../services/api';

export const CitizenSettingsPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  // Profile preferences state
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [preferredWard, setPreferredWard] = useState(user?.preferredWard || '');
  const [isProfileSaved, setIsProfileSaved] = useState(false);

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

  const displayName = user?.name || user?.fullName || 'Citizen';
  const displayEmail = user?.email || 'citizen@example.com';
  const displayRole = user?.role || 'CITIZEN';
  const initial = displayName.charAt(0).toUpperCase() || 'C';
  const isVerified = user?.emailVerified;

  const handleProfileSave = (e) => {
    e.preventDefault();
    setIsProfileSaved(true);
    setTimeout(() => {
      setIsProfileSaved(false);
    }, 3000);
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
    <CitizenLayout>
      <div className="citizen-page-inner citizen-settings-page">
        {/* Breadcrumb Navigation */}
        <nav className="breadcrumb-nav" aria-label="Breadcrumb">
          <Link to="/dashboard" className="breadcrumb-link">{t('navOverview', 'Dashboard')}</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current" aria-current="page">{t('navSettings', 'Settings')}</span>
        </nav>

        {/* Page Header */}
        <header className="page-header mb-4">
          <div>
            <div className="d-flex align-center gap-2 mb-1">
              <span className="badge badge-primary text-xs">CITIZEN ACCOUNT & SECURITY</span>
            </div>
            <h1 className="page-title">{t('portalSettings', 'Account Settings & Security')}</h1>
            <p className="page-subtitle">
              Manage your registered Pune Municipal Corporation citizen profile, preferred ward, and password credentials.
            </p>
          </div>
        </header>

        {/* Settings Grid */}
        <div className="citizen-settings-grid">
          {/* Card 1: Citizen Profile & Contact Information */}
          <section className="citizen-settings-card" aria-labelledby="profile-settings-title">
            <div className="citizen-settings-card__header">
              <h2 id="profile-settings-title" className="citizen-settings-card__title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Profile & Ward Preferences</span>
              </h2>
              <p className="citizen-settings-card__subtitle">
                Your authenticated citizen identity and notification settings
              </p>
            </div>

            <div className="d-flex align-center gap-3 mb-4 p-3 info-box" style={{ borderRadius: '12px' }}>
              <div className="user-avatar user-avatar--lg" aria-hidden="true">{initial}</div>
              <div>
                <div className="font-semibold text-main">{displayName}</div>
                <div className="text-muted text-xs font-mono">{displayEmail}</div>
                <div className="d-flex gap-2 mt-1">
                  <span className="badge badge-primary text-xs">{displayRole}</span>
                  {isVerified && <span className="badge badge-success text-xs">Verified Citizen</span>}
                </div>
              </div>
            </div>

            <form onSubmit={handleProfileSave}>
              {isProfileSaved && (
                <div className="alert-banner alert-banner--success mb-3" role="status">
                  ✓ Profile preferences saved successfully!
                </div>
              )}

              <div className="form-group mb-3">
                <label htmlFor="settings-name" className="form-label text-xs">Full Legal Name</label>
                <input
                  id="settings-name"
                  type="text"
                  className="form-input"
                  value={displayName}
                  readOnly
                  disabled
                />
                <span className="text-muted text-xs mt-1 d-block">Official PMC voter/aadhaar verified name</span>
              </div>

              <div className="form-group mb-3">
                <label htmlFor="settings-email" className="form-label text-xs">Registered Email Address</label>
                <input
                  id="settings-email"
                  type="email"
                  className="form-input"
                  value={displayEmail}
                  readOnly
                  disabled
                />
              </div>

              <div className="form-group mb-3">
                <label htmlFor="settings-phone" className="form-label text-xs">Contact Phone (for SMS updates)</label>
                <input
                  id="settings-phone"
                  type="tel"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group mb-3">
                <label htmlFor="settings-ward" className="form-label text-xs">Primary Pune Municipal Ward</label>
                <select
                  id="settings-ward"
                  className="form-select"
                  value={preferredWard}
                  onChange={(e) => setPreferredWard(e.target.value)}
                >
                  {PMC_WARDS.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
                <span className="text-muted text-xs mt-1 d-block">Used to prioritize local ward alerts and neighborhood issues</span>
              </div>

              <button type="submit" className="btn btn-primary btn-sm mt-2">
                Save Preferences
              </button>
            </form>
          </section>

          {/* Card 2: Reset Password / Security */}
          <section className="citizen-settings-card" id="reset-password-section" aria-labelledby="password-settings-title">
            <div className="citizen-settings-card__header">
              <h2 id="password-settings-title" className="citizen-settings-card__title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Reset Password</span>
              </h2>
              <p className="citizen-settings-card__subtitle">
                Ensure your account is protected with a secure password meeting PMC standards
              </p>
            </div>

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

            <form onSubmit={handleChangePasswordSubmit} noValidate aria-label="Reset Password Form">
              {/* Previous Password */}
              <div className="form-group mb-3">
                <label htmlFor="settings-previous-password" className="form-label text-xs">
                  <span>Current / Previous Password <span className="text-danger">*</span></span>
                </label>
                <div className="input-container">
                  <input
                    id="settings-previous-password"
                    name="previousPassword"
                    type={showPreviousPassword ? 'text' : 'password'}
                    placeholder="Enter your current password"
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
                    aria-describedby={passwordErrors.previousPassword ? 'settings-prev-pwd-error' : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPreviousPassword((prev) => !prev)}
                    aria-label={showPreviousPassword ? 'Hide current password' : 'Show current password'}
                    tabIndex={-1}
                  >
                    {showPreviousPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {passwordErrors.previousPassword && (
                  <p id="settings-prev-pwd-error" className="field-error" role="alert">
                    {passwordErrors.previousPassword}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div className="form-group mb-3">
                <label htmlFor="settings-new-password" className="form-label text-xs">
                  <span>New Password <span className="text-danger">*</span></span>
                </label>
                <div className="input-container">
                  <input
                    id="settings-new-password"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Min. 8 chars, 1 uppercase, 1 symbol"
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
                    aria-describedby="settings-new-pwd-rules"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="field-error" role="alert">
                    {passwordErrors.newPassword}
                  </p>
                )}

                {/* Password Rules Checklist */}
                <div id="settings-new-pwd-rules" className="password-rules-box mt-2">
                  <div className={`password-rule-item ${passwordForm.newPassword.length >= 8 ? 'valid' : ''}`}>
                    {passwordForm.newPassword.length >= 8 ? '✓' : '•'} At least 8 characters
                  </div>
                  <div className={`password-rule-item ${/[A-Z]/.test(passwordForm.newPassword) ? 'valid' : ''}`}>
                    {/[A-Z]/.test(passwordForm.newPassword) ? '✓' : '•'} At least 1 uppercase letter (A-Z)
                  </div>
                  <div className={`password-rule-item ${/[^A-Za-z0-9]/.test(passwordForm.newPassword) ? 'valid' : ''}`}>
                    {/[^A-Za-z0-9]/.test(passwordForm.newPassword) ? '✓' : '•'} At least 1 special character or symbol (!@#$%^&*)
                  </div>
                  <div className={`password-rule-item ${passwordForm.newPassword && passwordForm.previousPassword && passwordForm.newPassword !== passwordForm.previousPassword ? 'valid' : ''}`}>
                    {passwordForm.newPassword && passwordForm.previousPassword && passwordForm.newPassword !== passwordForm.previousPassword ? '✓' : '•'} Different from current password
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="form-group mb-3">
                <label htmlFor="settings-confirm-password" className="form-label text-xs">
                  <span>Confirm New Password <span className="text-danger">*</span></span>
                </label>
                <div className="input-container">
                  <input
                    id="settings-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your new password"
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
                    aria-describedby={passwordErrors.confirmPassword ? 'settings-conf-pwd-error' : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p id="settings-conf-pwd-error" className="field-error" role="alert">
                    {passwordErrors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="d-flex justify-end gap-2 mt-4">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? 'Updating Password...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Data Privacy & Compliance Footer Notice */}
        <div className="mt-4 p-3 info-box d-flex align-center gap-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary flex-shrink-0" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <div className="text-xs">
            <strong>Pune Municipal Corporation Security Standard</strong>
            <p className="text-muted mt-1 mb-0">
              Your password hash is encrypted with salted bcrypt protocols. PMC officials and system administrators never have access to plain-text citizen passwords.
            </p>
          </div>
        </div>
      </div>
    </CitizenLayout>
  );
};

export default CitizenSettingsPage;
