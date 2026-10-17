import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { complaintApi } from '../services/api';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [trackingIdInput, setTrackingIdInput] = useState('');
  const [trackingError, setTrackingError] = useState('');

  const [complaintStats, setComplaintStats] = useState({
    active: 0,
    inProgress: 0,
    resolved: 0,
    totalCommunitySupport: 0,
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
          let totalCommunitySupport = 0;

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
            totalCommunitySupport += (c.supportCount || 1);
          });

          setComplaintStats({ active, inProgress, resolved, totalCommunitySupport });
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

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    const q = trackingIdInput.trim();
    if (!q) {
      setTrackingError('Please enter a complaint or tracking ID.');
      return;
    }
    // Navigate directly to complaint detail or filter complaints
    navigate(`/complaints?search=${encodeURIComponent(q)}`);
  };

  const displayName = user?.name || user?.fullName || 'Citizen';
  const displayEmail = user?.email || 'N/A';
  const displayRole = user?.role || 'CITIZEN';
  const displayStatus = user?.accountStatus || 'ACTIVE';
  const isVerified = user?.emailVerified;
  const initial = displayName.charAt(0).toUpperCase() || 'C';

  return (
    <div className="app-container">
      {/* Top Unified Portal Navigation */}
      <Navbar />

      {/* Main Dashboard Workspace */}
      <main className="dashboard-main" id="main-content">
        <section className="dashboard-hero" aria-labelledby="welcome-heading">
          <div className="d-flex align-center gap-2 mb-2">
            <span className="badge badge-primary">Smart City Pune</span>
            <span className="badge badge-success">AI Grievance Portal</span>
          </div>
          <h1 id="welcome-heading" className="dashboard-hero-title">
            Welcome, {displayName}!
          </h1>
          <p className="dashboard-hero-desc">
            Pune Municipal Corporation Civic Intelligence Platform. Report potholes, garbage, or drainage breakdowns, inspect live AI heatmaps, and monitor automated before-and-after repair audits.
          </p>

          {/* Quick Tracking ID Search Bar */}
          <form onSubmit={handleTrackSubmit} className="quick-track-bar mt-4">
            <div className="quick-track-input-group">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="quick-track-input"
                placeholder="Track by Grievance ID (e.g. CIV-2026-001 or keyword)..."
                value={trackingIdInput}
                onChange={(e) => {
                  setTrackingIdInput(e.target.value);
                  if (trackingError) setTrackingError('');
                }}
              />
              <button type="submit" className="btn btn-primary btn-track">
                Track Status &rarr;
              </button>
            </div>
            {trackingError && <p className="text-danger text-xs mt-1">{trackingError}</p>}
          </form>
        </section>

        {/* Quick Stats Grid */}
        <section className="stats-grid" aria-label="Grievance Statistics Overview">
          <article className="stat-card">
            <div className="stat-label">Active Grievances</div>
            <div className="stat-value">{complaintStats.active}</div>
          </article>
          <article className="stat-card">
            <div className="stat-label">In Remediation</div>
            <div className="stat-value text-info">{complaintStats.inProgress}</div>
          </article>
          <article className="stat-card">
            <div className="stat-label">Resolved & Verified</div>
            <div className="stat-value text-success">{complaintStats.resolved}</div>
          </article>
          <article className="stat-card">
            <div className="stat-label">Community Impact</div>
            <div className="stat-value text-primary">{complaintStats.totalCommunitySupport}</div>
          </article>
        </section>

        {/* Smart City Features Banner */}
        <section className="heatmap-cta-banner">
          <div className="heatmap-cta-content">
            <div className="d-flex align-center gap-2">
              <span className="badge badge-warning">GIS Geolocation</span>
              <span className="badge badge-primary">Multimodal AI 1.5</span>
            </div>
            <h2 className="heatmap-cta-title">Explore Pune's Live AI Civic Heatmap</h2>
            <p className="heatmap-cta-desc">
              View real-time hotspots of potholes, solid waste accumulation, waterlogging, and streetlights across all 15 PMC wards with SLA priority rings.
            </p>
            <div className="d-flex gap-2 mt-3">
              <Link to="/heatmap" className="btn btn-primary">
                🗺️ Open Live Civic Heatmap
              </Link>
              <Link to="/complaints/new" className="btn btn-outline" id="report-an-issue-button">
                📸 Report with AI Photo Scanner
              </Link>
            </div>
          </div>
          <div className="heatmap-cta-graphic" aria-hidden="true">
            <div className="radar-circle" />
            <div className="radar-ping" />
          </div>
        </section>

        {/* Informational Cards */}
        <section className="info-cards-grid mt-4">
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
              <h2 id="quick-actions-heading" className="info-card-title">Civic Services & Tracking</h2>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Report issues directly to Pune Municipal Corporation departments. Support neighbors' complaints to automatically escalate municipal response priority.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link
                to="/complaints/new"
                className="btn btn-primary"
                style={{ justifyContent: 'flex-start' }}
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
              <Link
                to="/heatmap"
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
                <span>Browse PMC Ward Heatmap & Upvote Issues</span>
              </Link>
            </div>
          </article>
        </section>

        {/* Security & Route Notice */}
        <aside className="security-note-box mt-4" aria-label="Security and route notice">
          <div className="security-note-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            CivicAI Smart City Security & Auditing Architecture
          </div>
          <p>
            All citizen reports are cryptographically signed with tamper-proof audit trails. Gemini AI multimodal vision verifies before-and-after photo integrity, and citizen satisfaction ratings drive department SLA accountability.
          </p>
        </aside>
      </main>
    </div>
  );
};

export default DashboardPage;
