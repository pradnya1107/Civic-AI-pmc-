import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CitizenLayout } from '../components/CitizenLayout';
import { StatusBadge } from '../components/StatusBadge';
import { complaintApi } from '../services/api';

/**
 * Format timestamp into friendly civic date
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export const ComplaintListPage = () => {
  const location = useLocation();
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [bannerNotice, setBannerNotice] = useState(location.state?.message || '');

  // Fetch complaints from API
  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await complaintApi.getComplaints();
      // Handle various response wrappers
      const list = response?.data?.complaints || response?.complaints || response?.data || [];
      setComplaints(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Unable to load complaints. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Filter complaints based on status and search query
  const filteredComplaints = complaints.filter((item) => {
    // Status filter
    if (selectedStatus !== 'ALL') {
      const itemStatus = (item.status || '').toUpperCase().replace(/[\s-]+/g, '_');
      if (selectedStatus === 'VERIFIED' && itemStatus !== 'VERIFIED' && itemStatus !== 'UNDER_REVIEW') {
        return false;
      }
      if (selectedStatus === 'CLOSED' && itemStatus !== 'CLOSED' && itemStatus !== 'REJECTED') {
        return false;
      }
      if (selectedStatus !== 'VERIFIED' && selectedStatus !== 'CLOSED' && itemStatus !== selectedStatus) {
        return false;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = (item.title || '').toLowerCase().includes(q);
      const numberMatch = (item.complaintNumber || '').toLowerCase().includes(q);
      const catMatch = (item.category || '').toLowerCase().includes(q);
      const locMatch = (item.location?.address || '').toLowerCase().includes(q) || (item.location?.ward || '').toLowerCase().includes(q);
      return titleMatch || numberMatch || catMatch || locMatch;
    }

    return true;
  });

  return (
    <CitizenLayout>
      <div className="citizen-page-inner">
        {/* Breadcrumb Navigation */}
        <nav className="breadcrumb-nav" aria-label="Breadcrumb">
          <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current" aria-current="page">My Complaints</span>
        </nav>

        {/* Temporary Banner Notice (e.g. redirected after submit) */}
        {bannerNotice && (
          <div className="toast-notification toast-notification--success" role="status">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{bannerNotice}</span>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => setBannerNotice('')}
              aria-label="Dismiss message"
            >
              &times;
            </button>
          </div>
        )}

        {/* Page Header */}
        <header className="page-header">
          <div>
            <h1 className="page-title">My Grievances & Complaints</h1>
            <p className="page-subtitle">
              Track the progress, departmental routing, and on-ground resolution of your submitted PMC issues.
            </p>
          </div>
          <div className="page-header__actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={fetchComplaints}
              disabled={isLoading}
              aria-label="Refresh complaint list"
              id="refresh-complaints-btn"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={isLoading ? 'spin-icon' : ''}
                aria-hidden="true"
              >
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>Refresh</span>
            </button>

            <Link
              to="/complaints/new"
              className="btn btn-primary btn-sm"
              id="report-issue-header-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Report an Issue</span>
            </Link>
          </div>
        </header>

        {/* Filter & Search Bar */}
        <section className="filter-bar" aria-label="Complaint Filters">
          <div className="search-input-wrapper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              className="form-input search-input"
              placeholder="Search by title, ticket #, ward, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search complaints"
              id="complaint-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          {/* Status Filter Buttons */}
          <div className="status-filter-group" role="group" aria-label="Filter complaints by status">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'SUBMITTED', label: 'Submitted' },
              { id: 'VERIFIED', label: 'Verified' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'RESOLVED', label: 'Resolved' },
              { id: 'CLOSED', label: 'Closed' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                className={`filter-chip ${selectedStatus === st.id ? 'filter-chip--active' : ''}`}
                onClick={() => setSelectedStatus(st.id)}
                aria-pressed={selectedStatus === st.id}
              >
                {st.label}
              </button>
            ))}
          </div>
        </section>

        {/* Error Alert State */}
        {error && (
          <div className="alert-banner alert-banner--error" role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ flex: 1 }}>
              <strong>Failed to retrieve complaints:</strong> {error}
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={fetchComplaints}>
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="complaint-cards-grid" aria-busy="true" aria-label="Loading complaints">
            {[1, 2, 3].map((sk) => (
              <div key={sk} className="complaint-card skeleton-card">
                <div className="skeleton-bar skeleton-bar--short" />
                <div className="skeleton-bar skeleton-bar--title" />
                <div className="skeleton-bar skeleton-bar--desc" />
                <div className="skeleton-bar skeleton-bar--meta" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State: No complaints exist at all */}
        {!isLoading && !error && complaints.length === 0 && (
          <section className="empty-state-card" aria-label="No complaints found">
            <div className="empty-state-icon" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
            </div>
            <h2 className="empty-state-title">No complaints found</h2>
            <p className="empty-state-desc">
              You haven't submitted any civic grievances yet. Notice a pothole, water leak, or uncollected waste in your area? Report it to PMC now.
            </p>
            <Link
              to="/complaints/new"
              className="btn btn-primary"
              id="empty-state-report-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Report an Issue</span>
            </Link>
          </section>
        )}

        {/* Empty State: Search filter yielded 0 results */}
        {!isLoading && !error && complaints.length > 0 && filteredComplaints.length === 0 && (
          <section className="empty-state-card" aria-label="No matching complaints">
            <div className="empty-state-icon" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h2 className="empty-state-title">No matching complaints</h2>
            <p className="empty-state-desc">
              No grievances match your current search query or status filter. Try clearing filters.
            </p>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('ALL');
              }}
            >
              Reset Filters
            </button>
          </section>
        )}

        {/* Complaint Cards Grid */}
        {!isLoading && !error && filteredComplaints.length > 0 && (
          <div className="complaint-cards-grid" role="list" aria-label="Complaints list">
            {filteredComplaints.map((complaint) => {
              const compId = complaint._id || complaint.id;
              const complaintNo = complaint.complaintNumber || `CIV-${compId?.slice(-6) || 'PMC'}`;

              return (
                <article
                  key={compId}
                  className="complaint-card"
                  role="listitem"
                  data-complaint-id={compId}
                  data-status={complaint.status}
                >
                  <div className="complaint-card__header">
                    <span className="complaint-number-badge">
                      {complaintNo}
                    </span>
                    <StatusBadge status={complaint.status} size="sm" />
                  </div>

                  <h2 className="complaint-card__title">
                    <Link to={`/complaints/${compId}`} className="complaint-card__link">
                      {complaint.title}
                    </Link>
                  </h2>

                  <p className="complaint-card__desc">
                    {complaint.description}
                  </p>

                  <div className="complaint-card__meta">
                    <div className="meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                      <span>{complaint.category || 'General'}</span>
                    </div>

                    <div className="meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span className="meta-location-text">
                        {complaint.location?.address || 'Pune'}
                        {complaint.location?.ward ? ` (${complaint.location.ward})` : ''}
                      </span>
                    </div>

                    <div className="meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{formatDate(complaint.createdAt)}</span>
                    </div>
                  </div>

                  <div className="complaint-card__footer">
                    <Link
                      to={`/complaints/${compId}`}
                      className="btn btn-outline btn-sm card-action-btn"
                      aria-label={`View full details for ticket ${complaintNo}`}
                    >
                      <span>Track Status</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </CitizenLayout>
  );
};

export default ComplaintListPage;
