import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { LifecycleStepper } from '../components/LifecycleStepper';
import { complaintApi } from '../services/api';

/**
 * Format timestamp into detailed civic date
 */
function formatFullDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export const ComplaintDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();

  const [complaint, setComplaint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState(location.state?.message || '');

  // Fetch complaint detail by ID
  const fetchComplaintDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');

    try {
      const response = await complaintApi.getComplaintById(id);
      const data = response?.data?.complaint || response?.complaint || response?.data;
      if (!data) {
        throw new Error('Complaint details could not be found.');
      }
      setComplaint(data);
    } catch (err) {
      setError(err.message || 'Unable to retrieve complaint details. It may not exist or you may lack authorization.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchComplaintDetail();
  }, [fetchComplaintDetail]);

  const complaintNo = complaint?.complaintNumber || `CIV-${id?.slice(-6) || 'PMC'}`;

  return (
    <div className="app-container">
      <Navbar />

      <main className="dashboard-main" id="main-content">
        {/* Breadcrumb Navigation */}
        <nav className="breadcrumb-nav" aria-label="Breadcrumb">
          <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
          <span className="breadcrumb-separator">/</span>
          <Link to="/complaints" className="breadcrumb-link">My Complaints</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current" aria-current="page">
            {isLoading ? 'Loading...' : complaintNo}
          </span>
        </nav>

        {/* Success Toast */}
        {toastMessage && (
          <div className="toast-notification toast-notification--success" role="status">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{toastMessage}</span>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => setToastMessage('')}
              aria-label="Dismiss toast"
            >
              &times;
            </button>
          </div>
        )}

        {/* Loading State Skeleton */}
        {isLoading && (
          <div className="detail-skeleton" aria-busy="true" aria-label="Loading complaint details">
            <div className="skeleton-bar skeleton-bar--short" style={{ height: '32px' }} />
            <div className="skeleton-card" style={{ height: '140px', marginTop: '1rem' }} />
            <div className="skeleton-card" style={{ height: '240px', marginTop: '1.5rem' }} />
          </div>
        )}

        {/* Error / Not Found State */}
        {!isLoading && error && (
          <section className="empty-state-card" aria-label="Error loading complaint">
            <div className="empty-state-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="empty-state-title">Complaint Not Found</h2>
            <p className="empty-state-desc">{error}</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={fetchComplaintDetail}>
                Try Again
              </button>
              <Link to="/complaints" className="btn btn-primary">
                Return to My Complaints
              </Link>
            </div>
          </section>
        )}

        {/* Active Complaint Details */}
        {!isLoading && !error && complaint && (
          <article className="detail-layout">
            {/* Detail Top Header */}
            <div className="detail-header">
              <div className="detail-header__main">
                <div className="detail-number-group">
                  <span className="complaint-number-badge complaint-number-badge--lg">
                    {complaintNo}
                  </span>
                  <StatusBadge status={complaint.status} size="lg" id="detail-status-badge" />
                  {complaint.priority && (
                    <span className={`priority-tag priority-tag--${complaint.priority.toLowerCase()}`}>
                      {complaint.priority} Priority
                    </span>
                  )}
                </div>
                <h1 className="detail-title">{complaint.title}</h1>
              </div>

              <div className="detail-header__actions">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={fetchComplaintDetail}
                  aria-label="Refresh complaint status"
                  id="detail-refresh-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M23 4v6h-6" />
                    <path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  <span>Refresh Status</span>
                </button>

                <Link to="/complaints" className="btn btn-outline btn-sm">
                  Back to List
                </Link>
              </div>
            </div>

            {/* Visual Lifecycle Stepper Card */}
            <section className="detail-card stepper-section" aria-labelledby="stepper-heading">
              <h2 id="stepper-heading" className="detail-card__title">
                Grievance Resolution Progress
              </h2>
              <LifecycleStepper status={complaint.status} />
            </section>

            {/* Information Grid */}
            <div className="detail-grid">
              {/* Left Column: Complaint Details */}
              <section className="detail-card" aria-labelledby="details-heading">
                <h2 id="details-heading" className="detail-card__title">
                  Grievance Details
                </h2>

                <div className="detail-field">
                  <span className="detail-field__label">Description</span>
                  <p className="detail-field__value description-text">
                    {complaint.description}
                  </p>
                </div>

                <div className="detail-field">
                  <span className="detail-field__label">Department / Category</span>
                  <div className="detail-field__value">
                    <span className="category-pill">{complaint.category}</span>
                  </div>
                </div>

                {complaint.departmentId && (
                  <div className="detail-field">
                    <span className="detail-field__label">Assigned PMC Department</span>
                    <p className="detail-field__value">
                      {typeof complaint.departmentId === 'object'
                        ? complaint.departmentId.name || 'Assigned Department'
                        : `Department ID: ${complaint.departmentId}`}
                    </p>
                  </div>
                )}
              </section>

              {/* Right Column: Location & Audit Metadata */}
              <div className="detail-column-secondary">
                {/* Location Card */}
                <section className="detail-card" aria-labelledby="location-heading">
                  <h2 id="location-heading" className="detail-card__title">
                    Grievance Location
                  </h2>

                  <div className="detail-field">
                    <span className="detail-field__label">Address / Landmark</span>
                    <p className="detail-field__value">
                      {complaint.location?.address || 'Pune Municipal Corporation'}
                    </p>
                  </div>

                  {complaint.location?.ward && (
                    <div className="detail-field">
                      <span className="detail-field__label">PMC Ward</span>
                      <p className="detail-field__value">
                        {complaint.location.ward}
                      </p>
                    </div>
                  )}

                  {complaint.location?.latitude !== undefined &&
                    complaint.location?.longitude !== undefined && (
                      <div className="detail-field">
                        <span className="detail-field__label">GPS Coordinates</span>
                        <div className="coordinates-box">
                          <span>
                            {complaint.location.latitude}, {complaint.location.longitude}
                          </span>
                          <a
                            href={`https://maps.google.com/?q=${complaint.location.latitude},${complaint.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="maps-link"
                          >
                            Open in Google Maps &rarr;
                          </a>
                        </div>
                      </div>
                    )}
                </section>

                {/* Audit Timestamps Card */}
                <section className="detail-card" aria-labelledby="timeline-heading">
                  <h2 id="timeline-heading" className="detail-card__title">
                    Filing Timeline
                  </h2>

                  <div className="timeline-list">
                    <div className="timeline-item">
                      <div className="timeline-bullet" />
                      <div>
                        <div className="timeline-time">Submitted</div>
                        <div className="timeline-date">{formatFullDate(complaint.createdAt)}</div>
                      </div>
                    </div>

                    {complaint.updatedAt && complaint.updatedAt !== complaint.createdAt && (
                      <div className="timeline-item">
                        <div className="timeline-bullet timeline-bullet--active" />
                        <div>
                          <div className="timeline-time">Last Status Update</div>
                          <div className="timeline-date">{formatFullDate(complaint.updatedAt)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  );
};

export default ComplaintDetailPage;
