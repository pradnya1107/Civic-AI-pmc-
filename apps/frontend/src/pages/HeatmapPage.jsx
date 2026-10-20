import React from 'react';
import { Navbar } from '../components/Navbar';
import { CivicHeatmap } from '../components/CivicHeatmap';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../components/admin/AdminLayout';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const HeatmapPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const heatmapContent = (
    <div className="heatmap-page-wrapper">
      <div className="admin-page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <div className="d-flex align-center gap-2 mb-2">
            <span className="badge badge-primary">Pune Smart City GIS</span>
            <span className="badge badge-success">Live Geolocation</span>
          </div>
          <h1 className="admin-page-title" style={{ fontSize: '1.75rem' }}>
            AI Civic Heatmap & Issue Geolocation
          </h1>
          <p className="admin-page-subtitle">
            Real-time geospatial intelligence tracking potholes, garbage overflow, waterlogging, and streetlight breakdowns across Pune Municipal Corporation wards.
          </p>
        </div>

        <div className="admin-page-header-actions">
          {isAdmin ? (
            <Link to="/admin" className="btn btn-outline btn-sm">
              &larr; Admin Command Center
            </Link>
          ) : (
            <Link to="/complaints/new" className="btn btn-primary btn-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Report New Issue
            </Link>
          )}
        </div>
      </div>

      {/* Heatmap Card with Error Boundary */}
      <div className="portal-card heatmap-full-card" style={{ marginBottom: '1.5rem' }}>
        <ErrorBoundary>
          <CivicHeatmap isAdmin={isAdmin} height="620px" />
        </ErrorBoundary>
      </div>

      {/* Informational Guidance Cards */}
      <div
        className="heatmap-info-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          marginTop: '1.5rem',
        }}
      >
        <div
          className="info-card"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
          }}
        >
          <div className="info-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: 'var(--color-text-main)' }}>Automated SLA Escalation</h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            Critical issues with high citizen impact are auto-triaged for a 12-hour response window. Nearby reports are automatically consolidated.
          </p>
        </div>

        <div
          className="info-card"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
          }}
        >
          <div className="info-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          </div>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: 'var(--color-text-main)' }}>Community Verification</h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            Click any pinpoint to see how many residents have reported or upvoted the same issue. Duplicate reports increase priority automatically.
          </p>
        </div>

        <div
          className="info-card"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
          }}
        >
          <div className="info-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: 'var(--color-text-main)' }}>AI Before & After Audit</h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            When PMC field officers mark an issue resolved, the verification engine audits that the resolution photo matches the original problem.
          </p>
        </div>
      </div>
    </div>
  );

  if (isAdmin) {
    return (
      <AdminLayout>
        <div className="admin-page-container" id="admin-heatmap-page" style={{ maxWidth: '1440px', margin: '0 auto', padding: '1rem 0' }}>
          {heatmapContent}
        </div>
      </AdminLayout>
    );
  }

  return (
    <div className="portal-page-shell" style={{ minHeight: '100vh', background: 'var(--color-bg-base)' }}>
      <Navbar />
      <main className="portal-main-container" id="main-content" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
        {heatmapContent}
      </main>
    </div>
  );
};

export default HeatmapPage;
