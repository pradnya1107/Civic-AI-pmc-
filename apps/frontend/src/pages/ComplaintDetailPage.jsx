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

  // Community support state
  const [isSupporting, setIsSupporting] = useState(false);
  const [hasSupported, setHasSupported] = useState(false);

  // Citizen Confirmation & Dispute state
  const [rating, setRating] = useState(5);
  const [confirmFeedback, setConfirmFeedback] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);

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

  // Support complaint handler
  const handleSupport = async () => {
    if (!id || isSupporting) return;
    try {
      setIsSupporting(true);
      const res = await complaintApi.supportComplaint(id);
      if (res && res.success) {
        setHasSupported(true);
        setToastMessage('Grievance supported! Impact count incremented and SLA priority escalated.');
        fetchComplaintDetail();
      }
    } catch (err) {
      setToastMessage(err.message || 'Unable to support this complaint at this moment.');
    } finally {
      setIsSupporting(false);
    }
  };

  // Confirm resolution handler
  const handleConfirmResolution = async (e) => {
    e.preventDefault();
    if (!id || isConfirming) return;
    try {
      setIsConfirming(true);
      const res = await complaintApi.confirmResolution(id, {
        rating: Number(rating),
        feedback: confirmFeedback.trim(),
      });
      if (res && res.success) {
        setToastMessage('Thank you! Your resolution satisfaction has been recorded.');
        fetchComplaintDetail();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit confirmation.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Dispute resolution handler
  const handleDisputeResolution = async (e) => {
    e.preventDefault();
    if (!id || isDisputing) return;
    if (!disputeReason.trim()) {
      alert('Please provide a reason explaining why the issue is still unresolved.');
      return;
    }
    try {
      setIsDisputing(true);
      const res = await complaintApi.disputeResolution(id, {
        disputeReason: disputeReason.trim(),
      });
      if (res && res.success) {
        setShowDisputeModal(false);
        setToastMessage('Grievance reopened for municipal re-inspection.');
        fetchComplaintDetail();
      }
    } catch (err) {
      setError(err.message || 'Failed to dispute resolution.');
    } finally {
      setIsDisputing(false);
    }
  };

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
                  {complaint.slaDeadline && (
                    <span className="sla-deadline-tag">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      SLA: {new Date(complaint.slaDeadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h1 className="detail-title">{complaint.title}</h1>
              </div>

              <div className="detail-header__actions">
                {/* Community Support Button */}
                <button
                  type="button"
                  className={`btn btn-sm ${hasSupported ? 'btn-success' : 'btn-outline'}`}
                  onClick={handleSupport}
                  disabled={isSupporting}
                  title="Upvote / Support this civic issue"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                  </svg>
                  <span>{complaint.supportCount || 1} Citizens Impacted</span>
                </button>

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

            {/* Before-and-After Verification Showcase (When Resolved or has repair image) */}
            {(complaint.resolutionImageUrl || complaint.status === 'RESOLVED') && (
              <section className="detail-card verification-section" aria-labelledby="verification-heading">
                <div className="verification-header">
                  <div className="d-flex align-center gap-2">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#10b981' }}>
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <h2 id="verification-heading" className="detail-card__title mb-0">
                      AI Before-and-After Resolution Verification
                    </h2>
                  </div>
                  {complaint.verificationStatus && (
                    <span className={`badge badge-${complaint.verificationStatus === 'RESOLVED_VERIFIED' ? 'success' : 'warning'}`}>
                      {complaint.verificationStatus.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <div className="before-after-grid">
                  <div className="photo-compare-card">
                    <div className="compare-tag compare-tag-before">Original Problem Photo</div>
                    {complaint.imageUrl ? (
                      <img src={complaint.imageUrl} alt="Original reported grievance" className="compare-img" />
                    ) : (
                      <div className="compare-empty">No original photo submitted</div>
                    )}
                  </div>

                  <div className="photo-compare-card">
                    <div className="compare-tag compare-tag-after">Field Officer Repair Photo</div>
                    {complaint.resolutionImageUrl ? (
                      <img src={complaint.resolutionImageUrl} alt="Repair work evidence" className="compare-img" />
                    ) : (
                      <div className="compare-empty">Repair photo pending upload</div>
                    )}
                  </div>
                </div>

                {complaint.resolutionNotes && (
                  <div className="resolution-notes-box">
                    <strong>Officer Field Report:</strong> {complaint.resolutionNotes}
                  </div>
                )}

                {complaint.verificationConfidence !== undefined && (
                  <div className="ai-verification-meta">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#10b981' }}>
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    <span>Gemini Vision AI Confidence: {complaint.verificationConfidence}%</span>
                  </div>
                )}
              </section>
            )}

            {/* Citizen Confirmation & Dispute Panel */}
            {complaint.status === 'RESOLVED' && (
              <section className="detail-card citizen-feedback-card" aria-labelledby="feedback-heading">
                <h2 id="feedback-heading" className="detail-card__title">
                  Citizen Resolution Confirmation & Quality Rating
                </h2>

                {complaint.citizenConfirmation?.confirmed ? (
                  <div className="confirmed-success-panel">
                    <div className="d-flex align-center gap-2">
                      <span className="badge badge-success">Resolution Confirmed by Citizen</span>
                      <span className="star-rating-display">
                        {'★'.repeat(complaint.citizenConfirmation.rating || 5)}
                        {'☆'.repeat(5 - (complaint.citizenConfirmation.rating || 5))}
                      </span>
                    </div>
                    {complaint.citizenConfirmation.feedback && (
                      <p className="mt-2 text-muted">
                        <em>"{complaint.citizenConfirmation.feedback}"</em>
                      </p>
                    )}
                    <span className="text-xs text-muted">
                      Confirmed on {formatFullDate(complaint.citizenConfirmation.confirmedAt)}
                    </span>
                  </div>
                ) : complaint.citizenConfirmation?.disputed ? (
                  <div className="dispute-alert-panel">
                    <div className="d-flex align-center gap-2">
                      <span className="badge badge-danger">Resolution Disputed by Citizen</span>
                    </div>
                    <p className="mt-2">
                      <strong>Dispute Reason:</strong> {complaint.citizenConfirmation.disputeReason}
                    </p>
                    <span className="text-xs text-muted">
                      Flagged on {formatFullDate(complaint.citizenConfirmation.disputedAt)}
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleConfirmResolution} className="confirmation-form">
                    <p className="form-subtext">
                      PMC field engineers have marked this issue as resolved. Please review the repair photo and confirm if you are satisfied.
                    </p>

                    <div className="rating-select-group">
                      <label className="form-label">Satisfaction Rating:</label>
                      <div className="star-rating-buttons">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={`star-btn ${rating >= star ? 'star-active' : ''}`}
                            onClick={() => setRating(star)}
                            title={`${star} Star`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group mt-2">
                      <label htmlFor="confirm-feedback" className="form-label">
                        Citizen Feedback / Comments (Optional):
                      </label>
                      <textarea
                        id="confirm-feedback"
                        rows={2}
                        className="form-input form-textarea"
                        placeholder="e.g. Pothole cleanly filled and road resurfaced smoothly. Thank you PMC!"
                        value={confirmFeedback}
                        onChange={(e) => setConfirmFeedback(e.target.value)}
                      />
                    </div>

                    <div className="confirmation-actions">
                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={isConfirming}
                      >
                        {isConfirming ? 'Submitting...' : '✓ Confirm Resolution Satisfaction'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => setShowDisputeModal(true)}
                      >
                        ⚠️ Issue Unresolved? Dispute & Reopen
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}

            {/* Dispute Modal */}
            {showDisputeModal && (
              <div className="dispute-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="dispute-title">
                <div className="dispute-modal-content">
                  <div className="modal-header">
                    <h3 id="dispute-title" className="modal-title">Dispute Grievance Resolution</h3>
                    <button type="button" className="close-btn" onClick={() => setShowDisputeModal(false)}>&times;</button>
                  </div>
                  <form onSubmit={handleDisputeResolution}>
                    <p className="modal-desc">
                      If the repair was incomplete, substandard, or not performed, tell us why. The grievance will be immediately reopened and reassigned for municipal inspection.
                    </p>
                    <div className="form-group">
                      <label htmlFor="dispute-reason-input" className="form-label">
                        Reason for Dispute <span className="required-star">*</span>
                      </label>
                      <textarea
                        id="dispute-reason-input"
                        rows={4}
                        className="form-input form-textarea"
                        placeholder="e.g. Garbage was only partially cleared, debris is still blocking pedestrian pathway..."
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        required
                      />
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="btn btn-outline" onClick={() => setShowDisputeModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-danger" disabled={isDisputing}>
                        {isDisputing ? 'Reopening Issue...' : 'Submit Dispute & Reopen Ticket'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Information Grid */}
            <div className="detail-grid">
              {/* Left Column: Complaint Details & AI Card */}
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

                {/* AI Analysis Card */}
                {complaint.aiAnalysis && (
                  <div className="ai-detail-box mt-3">
                    <div className="ai-detail-header">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-primary)' }}>
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                      <strong>Gemini AI Diagnostics:</strong>
                    </div>
                    <p className="ai-detail-assessment">{complaint.aiAnalysis.description}</p>
                    <div className="ai-detail-pills">
                      <span className="badge badge-sm badge-primary">
                        Score: {complaint.aiAnalysis.severityScore}/100
                      </span>
                      <span className="badge badge-sm badge-info">
                        Dept: {complaint.aiAnalysis.department}
                      </span>
                      {complaint.aiAnalysis.safetyHazards?.length > 0 && (
                        <span className="badge badge-sm badge-danger">
                          Hazards: {complaint.aiAnalysis.safetyHazards.join(', ')}
                        </span>
                      )}
                    </div>
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
