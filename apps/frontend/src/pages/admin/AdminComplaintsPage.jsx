import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { complaintApi, departmentApi } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CLOSED', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: 'ALL', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export const AdminComplaintsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'ALL');
  const [selectedDept, setSelectedDept] = useState(searchParams.get('departmentId') || 'ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'priority'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Manage Modal
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateDeptId, setUpdateDeptId] = useState('');
  const [updatePriority, setUpdatePriority] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [complaintsRes, deptsRes] = await Promise.all([
        complaintApi.getComplaints(),
        departmentApi.getDepartments({ includeInactive: false }),
      ]);

      const list = complaintsRes?.data?.complaints || complaintsRes?.complaints || complaintsRes?.data || [];
      const depts = deptsRes?.data?.departments || deptsRes?.departments || deptsRes?.data || [];

      setComplaints(Array.isArray(list) ? list : []);
      setDepartments(Array.isArray(depts) ? depts : []);
    } catch (err) {
      setError(err?.message || 'Failed to load complaints from backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync state if search params change
  useEffect(() => {
    if (searchParams.get('status')) {
      setSelectedStatus(searchParams.get('status'));
    }
    if (searchParams.get('departmentId')) {
      setSelectedDept(searchParams.get('departmentId'));
    }
    if (searchParams.get('search')) {
      setSearch(searchParams.get('search'));
    }
  }, [searchParams]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const openManageModal = (c) => {
    setActiveComplaint(c);
    setUpdateStatus(c.status || 'SUBMITTED');
    setUpdateDeptId(c.departmentId?._id || c.departmentId || '');
    setUpdatePriority(c.priority || 'MEDIUM');
    setUpdateError(null);
  };

  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    if (!activeComplaint) return;

    setIsUpdating(true);
    setUpdateError(null);
    try {
      const complaintId = activeComplaint._id || activeComplaint.id;
      await complaintApi.updateComplaint(complaintId, {
        status: updateStatus,
        departmentId: updateDeptId || undefined,
        priority: updatePriority,
      });

      showToast(`Complaint #${activeComplaint.complaintNumber || complaintId.slice(-6)} updated successfully!`);
      setActiveComplaint(null);
      await fetchData();
    } catch (err) {
      setUpdateError(err?.message || 'Failed to update complaint.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter complaints
  const filteredComplaints = complaints.filter((c) => {
    // Search
    if (search.trim()) {
      const term = search.toLowerCase();
      const matchNum = c.complaintNumber?.toLowerCase().includes(term);
      const matchTitle = c.title?.toLowerCase().includes(term);
      const matchCat = c.category?.toLowerCase().includes(term);
      const matchAddr = c.location?.address?.toLowerCase().includes(term);
      if (!matchNum && !matchTitle && !matchCat && !matchAddr) return false;
    }

    // Status
    if (selectedStatus !== 'ALL') {
      const st = (c.status || '').toUpperCase();
      if (selectedStatus === 'SUBMITTED' && st !== 'SUBMITTED') return false;
      if (selectedStatus === 'UNDER_REVIEW' && (st !== 'UNDER_REVIEW' && st !== 'VERIFIED')) return false;
      if (selectedStatus === 'IN_PROGRESS' && st !== 'IN_PROGRESS') return false;
      if (selectedStatus === 'RESOLVED' && st !== 'RESOLVED') return false;
      if (selectedStatus === 'REJECTED' && st !== 'REJECTED') return false;
      if (selectedStatus === 'CLOSED' && st !== 'CLOSED') return false;
      if (selectedStatus === 'ASSIGNED' && st !== 'ASSIGNED') return false;
    }

    // Department
    if (selectedDept !== 'ALL') {
      const dId = c.departmentId?._id || c.departmentId || '';
      if (dId !== selectedDept) return false;
    }

    // Priority
    if (selectedPriority !== 'ALL') {
      if ((c.priority || 'MEDIUM').toUpperCase() !== selectedPriority) return false;
    }

    return true;
  });

  // Sort
  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    }
    if (sortBy === 'priority') {
      const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const rankA = rank[(a.priority || 'MEDIUM').toUpperCase()] || 0;
      const rankB = rank[(b.priority || 'MEDIUM').toUpperCase()] || 0;
      return rankB - rankA;
    }
    return 0;
  });

  // Pagination
  const totalItems = sortedComplaints.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedComplaints = sortedComplaints.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="admin-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-toast admin-toast-success" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Complaint Management</h1>
          <p className="admin-page-subtitle">
            Comprehensive grievance directory across all Pune Municipal Corporation jurisdictions.
          </p>
        </div>

        <div className="admin-page-header-actions">
          <span className="total-records-count">
            Total Grievances: <strong>{complaints.length}</strong>
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="admin-table-filters multi-filter">
        {/* Search */}
        <div className="admin-search-box flex-grow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className="admin-filter-input"
            placeholder="Search by ID, title, category, or address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search complaints"
          />
        </div>

        {/* Status Filter */}
        <div className="admin-filter-group">
          <label htmlFor="complaints-status-filter" className="filter-label">Status:</label>
          <select
            id="complaints-status-filter"
            className="admin-filter-select"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div className="admin-filter-group">
          <label htmlFor="complaints-dept-filter" className="filter-label">Department:</label>
          <select
            id="complaints-dept-filter"
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
          <label htmlFor="complaints-priority-filter" className="filter-label">Priority:</label>
          <select
            id="complaints-priority-filter"
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
          <label htmlFor="complaints-sort-filter" className="filter-label">Sort:</label>
          <select
            id="complaints-sort-filter"
            className="admin-filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">Highest Priority</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="alert-banner alert-banner-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline" onClick={fetchData}>
            Retry
          </button>
        </div>
      )}

      {/* Complaints Table */}
      <div className="admin-table-container">
        {isLoading ? (
          <div className="admin-loading-table">
            <div className="spinner" />
            <p>Loading grievances...</p>
          </div>
        ) : paginatedComplaints.length === 0 ? (
          <div className="admin-empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <h3>No complaints found</h3>
            <p>No complaints match your search query and filters.</p>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setSearch('');
                setSelectedStatus('ALL');
                setSelectedDept('ALL');
                setSelectedPriority('ALL');
                setCurrentPage(1);
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <table className="admin-data-table" aria-label="Complaints Management Directory">
            <thead>
              <tr>
                <th scope="col">Complaint ID</th>
                <th scope="col">Title</th>
                <th scope="col">Category</th>
                <th scope="col">Department</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
                <th scope="col">Submitted</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedComplaints.map((c) => {
                const dept = c.departmentId;
                const deptName = dept?.name || 'General Administration';
                const idDisplay = c.complaintNumber || `#${(c._id || '').slice(-6)}`;
                const priorityStr = (c.priority || 'MEDIUM').toUpperCase();
                const dateStr = c.createdAt
                  ? new Date(c.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'N/A';

                return (
                  <tr key={c._id || c.id}>
                    <td>
                      <span className="font-mono text-primary font-semibold text-xs">
                        {idDisplay}
                      </span>
                    </td>
                    <td>
                      <div className="dept-table-name-wrap">
                        <span className="font-semibold max-w-xs truncate" title={c.title}>
                          {c.title}
                        </span>
                        {c.location?.address && (
                          <span className="text-xs text-muted truncate max-w-xs" title={c.location.address}>
                            📍 {c.location.address}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="category-tag text-xs">{c.category}</span>
                    </td>
                    <td className="text-sm">{deptName}</td>
                    <td>
                      <span className={`priority-pill priority-${priorityStr.toLowerCase()}`}>
                        {priorityStr}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="text-muted text-sm">{dateStr}</td>
                    <td className="text-right">
                      <div className="table-actions-row">
                        <button
                          type="button"
                          className="btn btn-xs btn-primary"
                          onClick={() => openManageModal(c)}
                          title="Manage Status & Assignment"
                        >
                          Manage
                        </button>
                        <Link
                          to={`/complaints/${c._id || c.id}`}
                          className="btn btn-xs btn-outline"
                          title="View Public Tracker"
                        >
                          Tracker
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="admin-pagination-bar">
          <span className="pagination-count-label">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} records
          </span>

          <div className="pagination-buttons">
            <button
              type="button"
              className="btn btn-xs btn-outline"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              &larr; Previous
            </button>
            <span className="pagination-current-page">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-xs btn-outline"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}

      {/* MANAGE / UPDATE COMPLAINT MODAL */}
      {activeComplaint && (
        <div className="admin-modal-backdrop" onClick={() => !isUpdating && setActiveComplaint(null)} role="dialog" aria-modal="true" aria-labelledby="manage-modal-title">
          <div className="admin-modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className="modal-eyebrow font-mono">
                  {activeComplaint.complaintNumber || `#${(activeComplaint._id || '').slice(-6)}`}
                </span>
                <h3 id="manage-modal-title" className="admin-modal-title">
                  Update Complaint Status & Assignment
                </h3>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setActiveComplaint(null)}
                disabled={isUpdating}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveUpdate} noValidate>
              <div className="admin-modal-body">
                {updateError && (
                  <div className="alert-banner alert-banner-error" role="alert">
                    <span>{updateError}</span>
                  </div>
                )}

                <div className="complaint-summary-box">
                  <div className="font-semibold text-base mb-1">{activeComplaint.title}</div>
                  <div className="text-xs text-muted">
                    Category: <strong>{activeComplaint.category}</strong> | Location: <strong>{activeComplaint.location?.address || 'Pune'}</strong>
                  </div>
                  {activeComplaint.description && (
                    <p className="text-sm mt-2 text-muted">{activeComplaint.description}</p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="update-complaint-status" className="form-label">
                    Complaint Lifecycle Status <span className="required-star">*</span>
                  </label>
                  <select
                    id="update-complaint-status"
                    className="form-select font-semibold"
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value)}
                    disabled={isUpdating}
                  >
                    <option value="SUBMITTED">SUBMITTED (Awaiting Initial Review)</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW / VERIFIED (Verified by PMC)</option>
                    <option value="ASSIGNED">ASSIGNED (Assigned to Field Unit)</option>
                    <option value="IN_PROGRESS">IN_PROGRESS (Remediation Underway)</option>
                    <option value="RESOLVED">RESOLVED (Grievance Solved)</option>
                    <option value="REJECTED">REJECTED (Out of PMC Jurisdiction / Invalid)</option>
                    <option value="CLOSED">CLOSED (Formally Closed)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="update-complaint-dept" className="form-label">
                    Assigned Municipal Department
                  </label>
                  <select
                    id="update-complaint-dept"
                    className="form-select"
                    value={updateDeptId}
                    onChange={(e) => setUpdateDeptId(e.target.value)}
                    disabled={isUpdating}
                  >
                    <option value="">General Municipal Administration</option>
                    {departments.map((d) => (
                      <option key={d.id || d._id} value={d.id || d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="update-complaint-priority" className="form-label">
                    Priority Level
                  </label>
                  <select
                    id="update-complaint-priority"
                    className="form-select"
                    value={updatePriority}
                    onChange={(e) => setUpdatePriority(e.target.value)}
                    disabled={isUpdating}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL (Emergency / Hazard)</option>
                  </select>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setActiveComplaint(null)}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving Updates...' : 'Confirm & Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminComplaintsPage;
