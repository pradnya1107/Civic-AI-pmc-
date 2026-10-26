import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { adminApi, departmentApi, complaintApi } from '../../services/api';
import { ComplaintRow } from '../../components/admin/ComplaintRow';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'SUBMITTED', label: 'Submitted (New)' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CLOSED', label: 'Closed' },
];

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'Roads', label: 'Roads & Footpaths' },
  { value: 'Water', label: 'Water Supply' },
  { value: 'Sanitation', label: 'Sanitation & Solid Waste' },
  { value: 'Drainage', label: 'Drainage & Sewerage' },
  { value: 'Electrical', label: 'Electrical & Streetlights' },
  { value: 'Health', label: 'Public Health' },
  { value: 'Building', label: 'Building & Encroachment' },
  { value: 'Traffic', label: 'Traffic & Signage' },
  { value: 'Other', label: 'Other Civic Grievances' },
];

const PRIORITY_OPTIONS = [
  { value: 'ALL', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export const AdminDashboardPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Data states
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    submitted: 0,
    underReview: 0,
    assigned: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    pages: 1,
  });

  // Filter states
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'ALL');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'ALL');
  const [selectedDept, setSelectedDept] = useState(searchParams.get('departmentId') || 'ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // UI status
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Assign Modal
  const [assignModalComplaint, setAssignModalComplaint] = useState(null);
  const [assignDeptId, setAssignDeptId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadDepartments = async () => {
    try {
      const res = await departmentApi.getDepartments({ includeInactive: false });
      const list = res?.data?.departments || res?.departments || res?.data || [];
      setDepartments(Array.isArray(list) ? list : []);
    } catch {
      // Continue even if department loading encounters issue
    }
  };

  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: 15,
        sortBy,
      };

      if (search.trim()) params.search = search.trim();
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (selectedDept !== 'ALL') params.departmentId = selectedDept;
      if (selectedPriority !== 'ALL') params.priority = selectedPriority;

      const res = await adminApi.getComplaints(params);
      const data = res?.data || res || {};
      const list = data.complaints || [];

      setComplaints(Array.isArray(list) ? list : []);

      if (data.pagination) {
        setPagination({
          page: data.pagination.page || currentPage,
          limit: data.pagination.limit || 15,
          total: data.pagination.total || list.length,
          pages: data.pagination.pages || Math.ceil((data.pagination.total || list.length) / 15) || 1,
        });
      }

      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load complaints from municipal server.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, selectedStatus, selectedCategory, selectedDept, selectedPriority, sortBy]);

  const [slaMonitoring, setSlaMonitoring] = useState(null);

  const loadSlaMetrics = async () => {
    try {
      const res = await complaintApi.getSlaMonitoring();
      if (res && res.success) {
        setSlaMonitoring(res.data);
      }
    } catch {
      // Non-blocking SLA metrics load
    }
  };

  useEffect(() => {
    loadDepartments();
    loadSlaMetrics();
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Handle inline status change
  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      await adminApi.updateComplaintStatus(complaintId, { status: newStatus });
      showToast(`Complaint status successfully updated to ${newStatus}.`);

      // Optimistically update list
      setComplaints((prev) =>
        prev.map((c) =>
          (c._id || c.id) === complaintId ? { ...c, status: newStatus } : c
        )
      );
      // Refresh to update server metrics
      fetchComplaints();
      loadSlaMetrics();
    } catch (err) {
      showToast(`Error updating status: ${err?.message || 'Please try again.'}`);
      throw err;
    }
  };

  // Open quick assign modal
  const handleOpenAssignModal = (complaint) => {
    setAssignModalComplaint(complaint);
    setAssignDeptId(complaint.departmentId?._id || complaint.departmentId || '');
    setAssignNotes('');
    setAssignError(null);
  };

  // Submit assign department
  const handleSubmitAssign = async (e) => {
    e.preventDefault();
    if (!assignModalComplaint) return;

    setIsAssigning(true);
    setAssignError(null);
    try {
      const complaintId = assignModalComplaint._id || assignModalComplaint.id;
      await adminApi.assignComplaintDepartment(complaintId, {
        departmentId: assignDeptId || null,
        notes: assignNotes.trim() || undefined,
      });

      const assignedDept = departments.find((d) => (d.id || d._id) === assignDeptId);
      showToast(`Complaint assigned to ${assignedDept ? assignedDept.name : 'department'} successfully!`);
      setAssignModalComplaint(null);
      fetchComplaints();
    } catch (err) {
      setAssignError(err?.message || 'Failed to assign department.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedStatus('ALL');
    setSelectedCategory('ALL');
    setSelectedDept('ALL');
    setSelectedPriority('ALL');
    setSortBy('newest');
    setCurrentPage(1);
    setSearchParams({});
  };

  return (
    <div className="admin-page-container" id="admin-dashboard-page">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="admin-toast admin-toast-success" role="alert" id="admin-toast-alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header with Title and Overview */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Overview</h1>
          <p className="admin-page-subtitle">
            Central grievance management console. Review, assign departments, and track resolution lifecycles.
          </p>
        </div>

        <div className="admin-page-header-actions">
          <Link to="/heatmap" className="btn btn-primary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            <span>AI Civic Heatmap</span>
          </Link>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              fetchComplaints();
              loadSlaMetrics();
            }}
            disabled={isLoading}
            title="Refresh complaint data"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={isLoading ? 'spinner' : ''}
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* SLA Alert Banner */}
      {slaMonitoring && slaMonitoring.overdueCount > 0 && (
        <div
          className="admin-sla-banner"
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderLeft: '4px solid #ef4444',
            color: 'var(--color-text-main)',
            padding: '0.85rem 1.15rem',
            borderRadius: 'var(--radius-md, 8px)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </span>
            <span>
              <strong style={{ color: '#ef4444' }}>PMC SLA Alert:</strong>{' '}
              <strong>{slaMonitoring.overdueCount}</strong> active complaint(s) have exceeded municipal SLA resolution deadlines! Current municipal compliance rate is{' '}
              <strong>{slaMonitoring.complianceRate}%</strong>.
            </span>
          </div>
          <span
            className="badge badge-danger"
            style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              fontWeight: 600,
              fontSize: '0.8rem',
            }}
          >
            Breached SLA ({slaMonitoring.overdueCount})
          </span>
        </div>
      )}

      {/* KPI Metric Summary Cards */}
      <div className="admin-metric-grid" aria-label="Grievance Overview Statistics">
        <div className="metric-card metric-card--primary">
          <div className="metric-card__header">
            <span className="metric-card__label">Total Complaints</span>
            <div className="metric-card__icon" aria-hidden="true">📋</div>
          </div>
          <div className="metric-card__value">{metrics.total || pagination.total || 0}</div>
          <span className="metric-card__subtext">All Pune wards</span>
        </div>

        <div
          className={`metric-card clickable ${selectedStatus === 'SUBMITTED' ? 'metric-card--active' : ''}`}
          onClick={() => {
            setSelectedStatus(selectedStatus === 'SUBMITTED' ? 'ALL' : 'SUBMITTED');
            setCurrentPage(1);
          }}
          title="Filter by Submitted"
        >
          <div className="metric-card__header">
            <span className="metric-card__label">Awaiting Review</span>
            <div className="metric-card__icon text-warning" aria-hidden="true">⏳</div>
          </div>
          <div className="metric-card__value text-warning">{metrics.submitted || 0}</div>
          <span className="metric-card__subtext">Needs verification</span>
        </div>

        <div
          className={`metric-card clickable ${selectedStatus === 'UNDER_REVIEW' ? 'metric-card--active' : ''}`}
          onClick={() => {
            setSelectedStatus(selectedStatus === 'UNDER_REVIEW' ? 'ALL' : 'UNDER_REVIEW');
            setCurrentPage(1);
          }}
          title="Filter by Under Review"
        >
          <div className="metric-card__header">
            <span className="metric-card__label">Under Review</span>
            <div className="metric-card__icon text-info" aria-hidden="true">🔍</div>
          </div>
          <div className="metric-card__value text-info">{metrics.underReview || 0}</div>
          <span className="metric-card__subtext">Being investigated</span>
        </div>

        <div
          className={`metric-card clickable ${selectedStatus === 'IN_PROGRESS' ? 'metric-card--active' : ''}`}
          onClick={() => {
            setSelectedStatus(selectedStatus === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS');
            setCurrentPage(1);
          }}
          title="Filter by In Progress"
        >
          <div className="metric-card__header">
            <span className="metric-card__label">In Progress</span>
            <div className="metric-card__icon text-primary" aria-hidden="true">🛠️</div>
          </div>
          <div className="metric-card__value text-primary">{metrics.inProgress || 0}</div>
          <span className="metric-card__subtext">Field work ongoing</span>
        </div>

        <div
          className={`metric-card clickable ${selectedStatus === 'RESOLVED' ? 'metric-card--active' : ''}`}
          onClick={() => {
            setSelectedStatus(selectedStatus === 'RESOLVED' ? 'ALL' : 'RESOLVED');
            setCurrentPage(1);
          }}
          title="Filter by Resolved"
        >
          <div className="metric-card__header">
            <span className="metric-card__label">Resolved</span>
            <div className="metric-card__icon text-success" aria-hidden="true">✅</div>
          </div>
          <div className="metric-card__value text-success">{metrics.resolved || 0}</div>
          <span className="metric-card__subtext">Successfully solved</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-table-filters multi-filter" role="search" aria-label="Complaint Filters">
        {/* Search */}
        <div className="admin-search-box flex-grow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className="admin-filter-input"
            placeholder="Search by ID, title, citizen, category, or address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search complaints"
            id="admin-complaints-search"
          />
        </div>

        {/* Status Filter */}
        <div className="admin-filter-group">
          <label htmlFor="filter-status" className="filter-label">Status:</label>
          <select
            id="filter-status"
            className="admin-filter-select"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="admin-filter-group">
          <label htmlFor="filter-category" className="filter-label">Category:</label>
          <select
            id="filter-category"
            className="admin-filter-select"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div className="admin-filter-group">
          <label htmlFor="filter-department" className="filter-label">Department:</label>
          <select
            id="filter-department"
            className="admin-filter-select"
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id || d._id} value={d.id || d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div className="admin-filter-group">
          <label htmlFor="filter-priority" className="filter-label">Priority:</label>
          <select
            id="filter-priority"
            className="admin-filter-select"
            value={selectedPriority}
            onChange={(e) => {
              setSelectedPriority(e.target.value);
              setCurrentPage(1);
            }}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="admin-filter-group">
          <label htmlFor="filter-sort" className="filter-label">Sort By:</label>
          <select
            id="filter-sort"
            className="admin-filter-select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="status">Lifecycle Status</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="alert-banner alert-banner-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline" onClick={fetchComplaints}>
            Retry
          </button>
        </div>
      )}

      {/* Sortable Filterable Data Table */}
      <div className="admin-table-container">
        {isLoading ? (
          <div className="admin-loading-table">
            <div className="spinner" />
            <p>Loading complaints directory...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="admin-empty-state">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <h3>No complaints found</h3>
            <p>No complaints match the specified search query or filter selection.</p>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleResetFilters}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <table className="admin-data-table" aria-label="Complaints Management Data Table">
            <thead>
              <tr>
                <th scope="col">Complaint ID</th>
                <th scope="col">Title & Location</th>
                <th scope="col">Department</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
                <th scope="col">Submitted</th>
                <th scope="col" className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <ComplaintRow
                  key={c._id || c.id}
                  complaint={c}
                  departments={departments}
                  onStatusChange={handleStatusChange}
                  onAssignClick={handleOpenAssignModal}
                  showCitizen={false}
                  allowManualStatusChange={false}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.pages > 1 && (
        <div className="admin-pagination-bar">
          <span className="pagination-count-label">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} complaints
          </span>

          <div className="pagination-buttons">
            <button
              type="button"
              className="btn btn-xs btn-outline"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              &larr; Previous
            </button>
            <span className="pagination-current-page">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              type="button"
              className="btn btn-xs btn-outline"
              disabled={currentPage >= pagination.pages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
              aria-label="Next page"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}

      {/* QUICK ASSIGN DEPARTMENT MODAL */}
      {assignModalComplaint && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !isAssigning && setAssignModalComplaint(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-modal-title"
        >
          <div className="admin-modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className="modal-eyebrow font-mono">
                  {assignModalComplaint.complaintNumber || `#${(assignModalComplaint._id || '').slice(-6)}`}
                </span>
                <h3 id="assign-modal-title" className="admin-modal-title">
                  Assign Municipal Department
                </h3>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setAssignModalComplaint(null)}
                disabled={isAssigning}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitAssign} noValidate>
              <div className="admin-modal-body">
                {assignError && (
                  <div className="alert-banner alert-banner-error" role="alert">
                    <span>{assignError}</span>
                  </div>
                )}

                <div className="complaint-summary-box mb-3">
                  <div className="font-semibold text-sm">{assignModalComplaint.title}</div>
                  <div className="text-xs text-muted mt-1">
                    Category: <strong>{assignModalComplaint.category}</strong> | Ward: <strong>{assignModalComplaint.location?.ward || 'Pune'}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="assign-dept-select" className="form-label">
                    Responsible Department <span className="required-star">*</span>
                  </label>
                  <select
                    id="assign-dept-select"
                    className="form-select"
                    value={assignDeptId}
                    onChange={(e) => setAssignDeptId(e.target.value)}
                    disabled={isAssigning}
                    required
                  >
                    <option value="">-- Select PMC Department --</option>
                    {departments.map((d) => (
                      <option key={d.id || d._id} value={d.id || d._id}>
                        {d.name} ({d.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="assign-notes-input" className="form-label">
                    Assignment Instructions / Notes (Optional)
                  </label>
                  <textarea
                    id="assign-notes-input"
                    className="form-textarea"
                    rows={3}
                    placeholder="Instructions for the field inspection team..."
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                    disabled={isAssigning}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setAssignModalComplaint(null)}
                  disabled={isAssigning}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isAssigning}
                  id="confirm-assign-btn"
                >
                  {isAssigning ? 'Assigning...' : 'Assign Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
