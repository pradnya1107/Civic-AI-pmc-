import React, { useEffect, useState } from 'react';
import { complaintApi } from '../services/api';

const AVAILABLE_CATEGORIES = [
  'Water Supply',
  'Roads & Infrastructure',
  'Waste Management',
  'Electricity',
  'Drainage & Sewerage',
  'Street Lighting & Electrical',
  'Public Health',
  'Building & Construction',
  'Parks & Gardens',
  'General Administration',
];

const AVAILABLE_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function AISuggestionsCard({
  complaintId,
  currentCategory,
  currentPriority,
  onComplaintUpdated,
}) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Manual override modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState(currentCategory || '');
  const [overridePriority, setOverridePriority] = useState(currentPriority || 'MEDIUM');

  useEffect(() => {
    let isMounted = true;

    async function fetchAnalysis() {
      if (!complaintId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await complaintApi.getAiAnalysis(complaintId);
        if (isMounted) {
          const data = res?.data?.analysis || res?.analysis || res?.data || null;
          setAnalysis(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'No AI analysis generated for this grievance.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchAnalysis();

    return () => {
      isMounted = false;
    };
  }, [complaintId]);

  const handleAcceptCategory = async () => {
    if (!analysis?.suggestedCategory || actionLoading) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await complaintApi.updateComplaint(complaintId, {
        category: analysis.suggestedCategory,
      });
      setFeedback({ type: 'success', message: `Category updated to "${analysis.suggestedCategory}".` });
      if (onComplaintUpdated) onComplaintUpdated(res?.data?.complaint || res?.complaint || res?.data);
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to update category.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptPriority = async () => {
    if (!analysis?.suggestedPriority || actionLoading) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await complaintApi.updateComplaint(complaintId, {
        priority: analysis.suggestedPriority,
      });
      setFeedback({ type: 'success', message: `Priority updated to "${analysis.suggestedPriority}".` });
      if (onComplaintUpdated) onComplaintUpdated(res?.data?.complaint || res?.complaint || res?.data);
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to update priority.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualOverride = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await complaintApi.updateComplaint(complaintId, {
        category: overrideCategory,
        priority: overridePriority,
      });
      setFeedback({ type: 'success', message: 'Category & priority manually overridden.' });
      setShowOverrideModal(false);
      if (onComplaintUpdated) onComplaintUpdated(res?.data?.complaint || res?.complaint || res?.data);
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to override complaint.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-card mb-4" id="ai-suggestions-loading">
        <div className="admin-card-body p-4 text-center text-muted">
          <div className="spinner mb-2" />
          <p className="text-xs">Fetching AI Analysis suggestions...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="admin-card mb-4" id="ai-suggestions-empty">
        <div className="admin-card-header">
          <h2 className="admin-card-title text-sm">AI Suggestions</h2>
        </div>
        <div className="admin-card-body p-3">
          <p className="text-xs text-muted mb-0">
            {error || 'No AI classification available yet. AI runs automatically upon grievance submission.'}
          </p>
        </div>
      </div>
    );
  }

  const confidencePct = Math.round((analysis.confidence || 0.85) * 100);

  return (
    <div className="admin-card mb-4" id="ai-suggestions-card" style={{ borderLeft: '3px solid var(--color-primary)' }}>
      <div className="admin-card-header d-flex justify-between align-center">
        <div className="d-flex align-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-primary)' }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <h2 className="admin-card-title">AI Suggestions</h2>
        </div>
        <span className="badge badge-primary text-xs">{confidencePct}% Confidence</span>
      </div>

      <div className="admin-card-body">
        {feedback && (
          <div className={`alert-banner alert-banner-${feedback.type === 'success' ? 'success' : 'error'} mb-3 py-1 px-2 text-xs`}>
            {feedback.message}
          </div>
        )}

        {analysis.summary && (
          <div className="ai-summary-snippet mb-3 p-2 rounded text-xs" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <strong style={{ color: 'var(--color-primary)' }}>Plain Summary:</strong> {analysis.summary}
          </div>
        )}

        {/* Category suggestion */}
        <div className="ai-suggestion-item mb-3">
          <div className="d-flex justify-between align-center mb-1">
            <span className="text-xs text-muted">Category:</span>
            <strong className="text-xs">{analysis.suggestedCategory}</strong>
          </div>
          {currentCategory !== analysis.suggestedCategory ? (
            <button
              type="button"
              className="btn btn-outline btn-xs w-full"
              onClick={handleAcceptCategory}
              disabled={actionLoading}
              id="accept-ai-category-btn"
            >
              {actionLoading ? 'Updating...' : `Accept Category (${analysis.suggestedCategory})`}
            </button>
          ) : (
            <span className="text-xs text-success font-semibold">✓ Category matches AI suggestion</span>
          )}
        </div>

        {/* Priority suggestion */}
        <div className="ai-suggestion-item mb-3">
          <div className="d-flex justify-between align-center mb-1">
            <span className="text-xs text-muted">Priority:</span>
            <span className={`priority-pill priority-${(analysis.suggestedPriority || 'medium').toLowerCase()}`}>
              {analysis.suggestedPriority}
            </span>
          </div>
          {currentPriority !== analysis.suggestedPriority ? (
            <button
              type="button"
              className="btn btn-outline btn-xs w-full"
              onClick={handleAcceptPriority}
              disabled={actionLoading}
              id="accept-ai-priority-btn"
            >
              {actionLoading ? 'Updating...' : `Accept Priority (${analysis.suggestedPriority})`}
            </button>
          ) : (
            <span className="text-xs text-success font-semibold">✓ Priority matches AI suggestion</span>
          )}
        </div>

        {/* Override button */}
        <div className="pt-2 border-top">
          <button
            type="button"
            className="btn btn-ghost btn-xs w-full text-muted"
            onClick={() => setShowOverrideModal(true)}
            id="override-ai-btn"
          >
            ✏️ Manual Override (Custom Category / Priority)
          </button>
        </div>
      </div>

      {/* Manual Override Modal */}
      {showOverrideModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Override AI Classification</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowOverrideModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleManualOverride}>
              <div className="modal-body">
                <div className="form-group mb-3">
                  <label htmlFor="override-category" className="form-label text-xs">Category</label>
                  <select
                    id="override-category"
                    className="form-select form-input-sm"
                    value={overrideCategory}
                    onChange={(e) => setOverrideCategory(e.target.value)}
                  >
                    {AVAILABLE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-2">
                  <label htmlFor="override-priority" className="form-label text-xs">Priority</label>
                  <select
                    id="override-priority"
                    className="form-select form-input-sm"
                    value={overridePriority}
                    onChange={(e) => setOverridePriority(e.target.value)}
                  >
                    {AVAILABLE_PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer d-flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => setShowOverrideModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-xs"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : 'Save Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AISuggestionsCard;
