import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const DepartmentSettingsPage = ({ lastRefreshed, onRefreshNeeded }) => {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      if (onRefreshNeeded) onRefreshNeeded();
      showToast('Settings & department profile refreshed.');
    }, 500);
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
            background: '#0B1D33',
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
          <span>✓</span>
          <span>{toastMessage}</span>
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
