import React from 'react';
import { Navbar } from '../components/Navbar';
import { CivicHeatmap } from '../components/CivicHeatmap';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const HeatmapPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  return (
    <div className="portal-page-shell">
      <Navbar />

      <main className="portal-main-container" id="main-content">
        <div className="portal-page-header">
          <div className="header-title-group">
            <div className="d-flex align-center gap-2">
              <span className="badge badge-primary">Pune Smart City GIS</span>
              <span className="badge badge-success">Live Heatmap</span>
            </div>
            <h1 className="page-heading">AI Civic Heatmap & Issue Geolocation</h1>
            <p className="page-subheading">
              Real-time geospatial intelligence tracking potholes, garbage overflow, waterlogging, and streetlight breakdowns across Pune Municipal Corporation wards.
            </p>
          </div>

          <div className="header-actions">
            {isAdmin ? (
              <Link to="/admin" className="btn btn-outline">
                &larr; Admin Command Center
              </Link>
            ) : (
              <Link to="/complaints/new" className="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Report New Issue
              </Link>
            )}
          </div>
        </div>

        {/* Heatmap Card */}
        <div className="portal-card heatmap-full-card">
          <CivicHeatmap isAdmin={isAdmin} height="650px" />
        </div>

        {/* Informational Guidance Cards */}
        <div className="heatmap-info-grid">
          <div className="info-card">
            <div className="info-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h4>Automated SLA Escalation</h4>
            <p>
              Critical issues with high citizen impact are auto-triaged for a 12-hour response window. Nearby reports are automatically consolidated.
            </p>
          </div>

          <div className="info-card">
            <div className="info-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
            </div>
            <h4>Community Verification</h4>
            <p>
              Click any pinpoint to see how many residents have reported or upvoted the same issue. Duplicate reports increase priority automatically.
            </p>
          </div>

          <div className="info-card">
            <div className="info-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h4>AI Before & After Audit</h4>
            <p>
              When PMC field officers mark an issue resolved, our Gemini vision engine verifies that the repair photo matches the original problem.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HeatmapPage;
