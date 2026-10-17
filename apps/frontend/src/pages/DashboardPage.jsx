import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { complaintApi } from '../services/api';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [complaintStats, setComplaintStats] = useState({
    active: 0,
    inProgress: 0,
    resolved: 0,
  });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await complaintApi.getComplaints();
        const list = response?.data?.complaints || response?.complaints || response?.data || [];
        if (Array.isArray(list) && isMounted) {
          let active = 0;
          let inProgress = 0;
          let resolved = 0;

          list.forEach((c) => {
            const st = (c.status || '').toUpperCase();
            if (st === 'SUBMITTED' || st === 'VERIFIED' || st === 'UNDER_REVIEW' || st === 'ASSIGNED') {
              active++;
            }
            if (st === 'IN_PROGRESS') {
              inProgress++;
            }
            if (st === 'RESOLVED' || st === 'CLOSED') {
              resolved++;
            }
          });

          setComplaintStats({ active, inProgress, resolved });
        }
      } catch {
        // Stats gracefully remain at 0 if offline or error
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = user?.name || user?.fullName || 'Citizen';
  const displayEmail = user?.email || 'N/A';
  const displayRole = user?.role || 'CITIZEN';
  const displayStatus = user?.accountStatus || 'ACTIVE';
  const isVerified = user?.emailVerified;
  const initial = displayName.charAt(0).toUpperCase() || 'C';

  return (
    <div className="app-container">
      {/* Top Portal Navigation */}
      <header className="portal-nav" role="banner">
        <div className="portal-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-primary)' }} aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span className="portal-brand-text">CivicAI PMC</span>
          <span className="portal-badge">Citizen Portal</span>
        </div>

        <div className="portal-user-section">
          <div className="user-profile-badge" aria-label={`Logged in as ${displayName}`}>
            <div className="user-avatar" aria-hidden="true">{initial}</div>
            <div>
              <div className="user-meta-name">{displayName}</div>
              <div className="user-meta-role">{displayRole}</div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-danger"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="Sign out of Citizen Portal"
            id="logout-button"
          >
            {isLoggingOut ? (
              <>
                <span className="spinner" style={{ width: '0.85rem', height: '0.85rem' }} aria-hidden="true" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sign Out</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Dashboard Workspace */}
      <main className="dashboard-main" id="main-content">
        <section className="dashboard-hero" aria-labelledby="welcome-heading">
          <h1 id="welcome-heading" className="dashboard-hero-title">
            Welcome, {displayName}!
          </h1>
          <p className="dashboard-hero-desc">
            Pune Municipal Corporation Civic Intelligence Platform. Report civic grievances,
            monitor departmental action, and track Pune civic infrastructure resolutions in real time.
          </p>
        </section>

        {/* Quick Stats Grid */}
        <section className="stats-grid" aria-label="Grievance Statistics Overview">
          <article className="stat-card">
            <div className="stat-label">Active Complaints</div>
            <div className="stat-value">{complaintStats.active}</div>
          </article>
          <article className="stat-card">
            <div className="stat-label">In Review / Progress</div>
            <div className="stat-value">{complaintStats.inProgress}</div>
          </article>
          <article className="stat-card">
            <div className="stat-label">Resolved Issues</div>
            <div className="stat-value">{complaintStats.resolved}</div>
          </article>
          <article className="stat-card">
            <div className="stat-label">Account Verification</div>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: isVerified ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {isVerified ? 'Verified Citizen' : 'Pending Verification'}
            </div>
          </article>
        </section>

        {/* Informational Cards */}
        <section className="info-cards-grid">
          {/* Profile Overview */}
          <article className="info-card" aria-labelledby="profile-info-heading">
            <div className="info-card-header">
              <h2 id="profile-info-heading" className="info-card-title">Citizen Profile</h2>
              <span className="portal-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)' }}>
                {displayStatus}
              </span>
            </div>
            <div className="profile-details-list">
              <div className="profile-detail-row">
                <span className="profile-detail-label">Full Name:</span>
                <span className="profile-detail-value">{displayName}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">Registered Email:</span>
                <span className="profile-detail-value">{displayEmail}</span>
              </div>
              {user?.phoneNumber && (
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Contact Number:</span>
                  <span className="profile-detail-value">{user.phoneNumber}</span>
                </div>
              )}
              <div className="profile-detail-row">
                <span className="profile-detail-label">Account Role:</span>
                <span className="profile-detail-value">{displayRole}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">Email Verified:</span>
                <span className="profile-detail-value" style={{ color: isVerified ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  {isVerified ? 'Yes (Verified)' : 'Pending OTP Verification'}
                </span>
              </div>
            </div>
          </article>

          {/* Quick Actions / Civic Reporting */}
          <article className="info-card" aria-labelledby="quick-actions-heading">
            <div className="info-card-header">
              <h2 id="quick-actions-heading" className="info-card-title">Civic Services</h2>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Report issues directly to Pune Municipal Corporation departments including Roads, Water Supply, Drainage, Solid Waste Management, and Street Lighting.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link
                to="/complaints/new"
                className="btn btn-primary"
                style={{ justifyContent: 'flex-start' }}
                id="report-an-issue-button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Report an Issue (New Grievance)</span>
              </Link>
              <Link
                to="/complaints"
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start' }}
                id="view-my-complaints-button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
                <span>View My Complaints & Grievance History</span>
              </Link>
            </div>
          </article>
        </section>

        {/* Security & Route Notice */}
        <aside className="security-note-box" aria-label="Security and route notice">
          <div className="security-note-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            CivicAI Security Architecture Notice
          </div>
          <p>
            Client-side route protection verifies your local authenticated session before rendering.
            All backend PMC endpoints independently validate JWT signatures, token freshness, and citizen authorization claims on every request.
          </p>
        </aside>
      </main>
    </div>
  );
};

export default DashboardPage;
