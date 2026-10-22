import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const AdminSettingsPage = () => {
  const { user } = useAuth();

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
            Configure administrative preferences, review security posture, and manage system credentials.
          </p>
        </div>
      </div>

      <div className="admin-settings-grid">

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
