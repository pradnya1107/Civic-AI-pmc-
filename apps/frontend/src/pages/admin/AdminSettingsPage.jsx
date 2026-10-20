import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const AdminSettingsPage = () => {
  const { user } = useAuth();
  const { theme, setTheme, isDark } = useTheme();

  const displayName = user?.name || user?.fullName || 'Super Admin';
  const displayEmail = user?.email || 'admin@civicai.com';
  const displayRole = user?.role || 'SUPER_ADMIN';

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Portal Settings & Preferences</h1>
          <p className="admin-page-subtitle">
            Configure system themes, review security posture, and manage administrative settings.
          </p>
        </div>
      </div>

      <div className="admin-settings-grid">
        {/* Appearance & Theme Selection Card */}
        <article className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Appearance & Color Theme</h2>
              <p className="admin-card-subtitle">Choose between government light or dark municipal control themes</p>
            </div>
          </div>

          <div className="theme-options-selector">
            {/* Light Mode Option */}
            <div
              className={`theme-card-option ${theme === 'light' ? 'selected' : ''}`}
              onClick={() => setTheme('light')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setTheme('light')}
              aria-label="Select Light Theme"
            >
              <div className="theme-preview-box light-preview">
                <div className="preview-top" />
                <div className="preview-body">
                  <div className="preview-sidebar" />
                  <div className="preview-content">
                    <div className="preview-line" />
                    <div className="preview-line sm" />
                  </div>
                </div>
              </div>
              <div className="theme-meta">
                <span className="theme-name">Light Mode ☀️</span>
                <span className="theme-desc">Crisp white surfaces, high contrast, government standard</span>
              </div>
            </div>

            {/* Dark Mode Option */}
            <div
              className={`theme-card-option ${theme === 'dark' ? 'selected' : ''}`}
              onClick={() => setTheme('dark')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setTheme('dark')}
              aria-label="Select Dark Theme"
            >
              <div className="theme-preview-box dark-preview">
                <div className="preview-top" />
                <div className="preview-body">
                  <div className="preview-sidebar" />
                  <div className="preview-content">
                    <div className="preview-line" />
                    <div className="preview-line sm" />
                  </div>
                </div>
              </div>
              <div className="theme-meta">
                <span className="theme-name">Dark Mode 🌙</span>
                <span className="theme-desc">Deep navy and slate surfaces, low eye-strain for control rooms</span>
              </div>
            </div>
          </div>
        </article>

        {/* Administrator Profile Card */}
        <article className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Administrative Profile</h2>
              <p className="admin-card-subtitle">Authenticated session credentials</p>
            </div>
          </div>

          <div className="profile-details-list">
            <div className="profile-detail-row">
              <span className="profile-detail-label">Administrator Name</span>
              <span className="profile-detail-value font-semibold">{displayName}</span>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-label">Official Email</span>
              <span className="profile-detail-value font-mono">{displayEmail}</span>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-label">Assigned Role</span>
              <span className="admin-role-pill font-mono">{displayRole}</span>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-label">Email Verification</span>
              <span className="dept-status-badge active">Verified</span>
            </div>
            <div className="profile-detail-row">
              <span className="profile-detail-label">Account Security</span>
              <span className="text-success font-semibold">Active & Authenticated</span>
            </div>
          </div>
        </article>

        {/* Security Architecture & Compliance */}
        <article className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Municipal Security Architecture</h2>
              <p className="admin-card-subtitle">Zero-trust authorization and audit safeguards</p>
            </div>
          </div>

          <div className="security-notice-list text-sm text-muted">
            <p className="mb-2">
              🛡️ <strong>Server-Side Role Enforcement:</strong> All administrative endpoints (Departments, Admins, Status transitions) are strictly protected by server-side JWT verification and role authorization middleware.
            </p>
            <p className="mb-2">
              🔒 <strong>Credential Privacy:</strong> Passwords and authorization secrets are never transmitted in plaintext or displayed in UI forms.
            </p>
            <p>
              🏛️ <strong>Jurisdiction:</strong> Pune Municipal Corporation (PMC) grievance resolution rules require status audit logging for all grievance transitions.
            </p>
          </div>
        </article>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
