import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentAdminApi } from '../../services/api';

export const DepartmentSettingsPage = ({ lastRefreshed, onRefreshNeeded }) => {
  const { user } = useAuth();
  const [toastMessage, setToastMessage] = useState(null);

  // Change Password Form State
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

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const validatePasswordForm = () => {
    const errors = {};
    if (!passwordForm.previousPassword) {
      errors.previousPassword = 'Previous password is required.';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters long.';
    } else if (!/[A-Z]/.test(passwordForm.newPassword)) {
      errors.newPassword = 'Password must contain at least 1 uppercase letter.';
    } else if (!/[^A-Za-z0-9]/.test(passwordForm.newPassword)) {
      errors.newPassword = 'Password must contain at least 1 specific symbol (e.g. !@#$%^&*).';
    } else if (passwordForm.previousPassword && passwordForm.newPassword === passwordForm.previousPassword) {
      errors.newPassword = 'New password cannot be the same as your previous password.';
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Confirm password is required.';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'New password and confirm password do not match.';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccess(null);
    if (!validatePasswordForm()) return;

    setIsChangingPassword(true);
    try {
      await departmentAdminApi.changePassword({
        previousPassword: passwordForm.previousPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      setPasswordSuccess('Password changed successfully! Please use your new password for future sign-ins.');
      setPasswordForm({
        previousPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({});
      showToast('Password changed successfully!');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to change password.';
      setPasswordErrors({ form: msg });
      showToast(msg, true);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const displayName = user?.fullName || user?.name || 'Department Administrator';
  const email = user?.email || 'admin@civicai.local';
  const role = user?.role || 'DEPARTMENT_ADMIN';
  const deptName = user?.departmentName || 'Civic Operations';

  return (
    <div className="dept-settings-page" style={{ maxWidth: '900px', margin: '0 auto' }}>
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: toastMessage.isError ? '#9B1C1C' : '#0B1D33',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 9999,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>{toastMessage.isError ? '⚠️' : '✓'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0B1D33)' }}>
            Profile & Department Settings
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
            Configure operations preferences, security settings, and departmental service level agreements.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Administrator Profile Card */}
        <div
          style={{
            background: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
            Administrator Identity
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Full Name</span>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary, #0B1D33)' }}>{displayName}</strong>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Email Address</span>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary, #0B1D33)' }}>{email}</strong>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Assigned Department</span>
              <strong style={{ fontSize: '14px', color: '#0D9488' }}>{deptName}</strong>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>System Role</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(13, 148, 136, 0.12)',
                  color: '#0D9488',
                }}
              >
                {role}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div
          style={{
            background: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>🔒</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
                Security & Change Password
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                Update your account password. Enter your previous password to verify identity, followed by your new password twice.
              </p>
            </div>
          </div>

          {passwordSuccess && (
            <div
              style={{
                background: '#DEF7EC',
                border: '1px solid #31C48D',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#03543F',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>✓</span>
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordErrors.form && (
            <div
              style={{
                background: '#FDE8E8',
                border: '1px solid #F98080',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#9B1C1C',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <span>{passwordErrors.form}</span>
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '540px' }}>
              {/* Previous Password */}
              <div>
                <label
                  htmlFor="previous-password"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary, #0B1D33)' }}
                >
                  Previous Password <span style={{ color: '#E02424' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="previous-password"
                    type={showPreviousPassword ? 'text' : 'password'}
                    placeholder="Enter your current / previous password"
                    value={passwordForm.previousPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, previousPassword: e.target.value })}
                    disabled={isChangingPassword}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${passwordErrors.previousPassword ? '#E02424' : 'var(--border-color, #CBD5E1)'}`,
                      fontSize: '14px',
                      background: 'var(--bg-card, #FFFFFF)',
                      color: 'var(--text-primary, #0B1D33)',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPreviousPassword(!showPreviousPassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#64748B',
                    }}
                    aria-label={showPreviousPassword ? 'Hide previous password' : 'Show previous password'}
                  >
                    {showPreviousPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {passwordErrors.previousPassword && (
                  <span style={{ display: 'block', fontSize: '12px', color: '#E02424', marginTop: '4px' }}>
                    {passwordErrors.previousPassword}
                  </span>
                )}
              </div>

              {/* New Password */}
              <div>
                <label
                  htmlFor="new-password"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary, #0B1D33)' }}
                >
                  New Password <span style={{ color: '#E02424' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password (8+ chars, 1 uppercase, 1 symbol)"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    disabled={isChangingPassword}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${passwordErrors.newPassword ? '#E02424' : 'var(--border-color, #CBD5E1)'}`,
                      fontSize: '14px',
                      background: 'var(--bg-card, #FFFFFF)',
                      color: 'var(--text-primary, #0B1D33)',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#64748B',
                    }}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <span style={{ display: 'block', fontSize: '12px', color: '#E02424', marginTop: '4px' }}>
                    {passwordErrors.newPassword}
                  </span>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label
                  htmlFor="confirm-password"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary, #0B1D33)' }}
                >
                  Confirm New Password <span style={{ color: '#E02424' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    disabled={isChangingPassword}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${passwordErrors.confirmPassword ? '#E02424' : 'var(--border-color, #CBD5E1)'}`,
                      fontSize: '14px',
                      background: 'var(--bg-card, #FFFFFF)',
                      color: 'var(--text-primary, #0B1D33)',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#64748B',
                    }}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <span style={{ display: 'block', fontSize: '12px', color: '#E02424', marginTop: '4px' }}>
                    {passwordErrors.confirmPassword}
                  </span>
                )}
              </div>

              {/* Live Password Requirement Indicators */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: passwordForm.newPassword.length >= 8 ? '#DEF7EC' : '#F1F5F9',
                    color: passwordForm.newPassword.length >= 8 ? '#03543F' : '#64748B',
                    fontWeight: 600,
                  }}
                >
                  {passwordForm.newPassword.length >= 8 ? '✓' : '•'} 8+ Characters
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: /[A-Z]/.test(passwordForm.newPassword) ? '#DEF7EC' : '#F1F5F9',
                    color: /[A-Z]/.test(passwordForm.newPassword) ? '#03543F' : '#64748B',
                    fontWeight: 600,
                  }}
                >
                  {/[A-Z]/.test(passwordForm.newPassword) ? '✓' : '•'} 1 Uppercase Letter
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: /[^A-Za-z0-9]/.test(passwordForm.newPassword) ? '#DEF7EC' : '#F1F5F9',
                    color: /[^A-Za-z0-9]/.test(passwordForm.newPassword) ? '#03543F' : '#64748B',
                    fontWeight: 600,
                  }}
                >
                  {/[^A-Za-z0-9]/.test(passwordForm.newPassword) ? '✓' : '•'} 1 Specific Symbol
                </span>
                {passwordForm.confirmPassword && (
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: passwordForm.newPassword === passwordForm.confirmPassword ? '#DEF7EC' : '#FDE8E8',
                      color: passwordForm.newPassword === passwordForm.confirmPassword ? '#03543F' : '#9B1C1C',
                      fontWeight: 600,
                    }}
                  >
                    {passwordForm.newPassword === passwordForm.confirmPassword ? '✓ Passwords Match' : '✕ Passwords Mismatch'}
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <div style={{ paddingTop: '8px' }}>
                <button
                  type="submit"
                  id="submit-change-password-btn"
                  disabled={isChangingPassword}
                  style={{
                    background: isChangingPassword ? '#94A3B8' : '#0D9488',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isChangingPassword ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(13, 148, 136, 0.2)',
                  }}
                >
                  {isChangingPassword ? (
                    <>
                      <span className="spinner" style={{ width: '14px', height: '14px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* SLA Policy Configurations */}
        <div
          style={{
            background: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
            Service Level Agreement (SLA) Targets
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #FCA5A5', background: '#FEE2E2' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#B91C1C', display: 'block' }}>CRITICAL PRIORITY</span>
              <strong style={{ fontSize: '18px', color: '#B91C1C' }}>12 Hours</strong>
              <span style={{ fontSize: '11px', color: '#991B1B', display: 'block', marginTop: '2px' }}>Severe Hazard Target</span>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #FCD34D', background: '#FEF3C7' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', display: 'block' }}>HIGH PRIORITY</span>
              <strong style={{ fontSize: '18px', color: '#B45309' }}>24 Hours</strong>
              <span style={{ fontSize: '11px', color: '#92400E', display: 'block', marginTop: '2px' }}>Major Issue Target</span>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #BAE6FD', background: '#E0F2FE' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0369A1', display: 'block' }}>MEDIUM PRIORITY</span>
              <strong style={{ fontSize: '18px', color: '#0369A1' }}>48 Hours</strong>
              <span style={{ fontSize: '11px', color: '#075985', display: 'block', marginTop: '2px' }}>Standard Civic Issue</span>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#F1F5F9' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block' }}>LOW PRIORITY</span>
              <strong style={{ fontSize: '18px', color: '#475569' }}>72 Hours</strong>
              <span style={{ fontSize: '11px', color: '#334155', display: 'block', marginTop: '2px' }}>Routine Maintenance</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentSettingsPage;
