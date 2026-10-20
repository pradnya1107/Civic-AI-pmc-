import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { departmentAdminApi } from '../../services/api';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'SUBMITTED', label: 'Submitted (New)' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const PRIORITY_OPTIONS = [
  { value: 'ALL', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export const DepartmentComplaintsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filter params from URL
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = searchParams.get('status') || 'ALL';
  const initialFilter = searchParams.get('filter') || '';
  const initialPriority = searchParams.get('priority') || 'ALL';

  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    submitted: 0,
    underReview: 0,
    assigned: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
    overdue: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });

  // Filter state
  const [search, setSearch] = useState(initialSearch);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [selectedPriority, setSelectedPriority] = useState(initialPriority);
  const [selectedOfficer, setSelectedOfficer] = useState('ALL');
  const [activeTab, setActiveTab] = useState(
    initialFilter === 'assigned'
      ? 'assigned'
      : initialFilter === 'priority_overdue'
      ? 'priority_overdue'
      : initialStatus !== 'ALL'
      ? initialStatus
      : 'ALL'
  );
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Modals
  const [assignModalData, setAssignModalData] = useState(null);
  const [statusModalData, setStatusModalData] = useState(null);
  const [priorityModalData, setPriorityModalData] = useState(null);
  const [noteModalData, setNoteModalData] = useState(null);

  // Form states for modals
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [newStatusVal, setNewStatusVal] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [newPriorityVal, setNewPriorityVal] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadOfficers = async () => {
    try {
      const res = await departmentAdminApi.getOfficers();
      const list = res?.data?.officers || [];
      setOfficers(Array.isArray(list) ? list : []);
    } catch {
      // Continue even if officers load fails
    }
  };

  useEffect(() => {
    loadOfficers();
  }, []);

  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: pagination.limit,
        sortBy,
      };

      if (search.trim()) params.search = search.trim();
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedPriority !== 'ALL') params.priority = selectedPriority;
      if (selectedOfficer !== 'ALL') params.officerId = selectedOfficer;

      if (activeTab === 'assigned') {
        params.assignedOnly = true;
      } else if (activeTab === 'priority_overdue') {
        params.overdueOnly = true;
      }

      const res = await departmentAdminApi.getComplaints(params);
      if (res?.success) {
        setComplaints(res.data.complaints || []);
        if (res.data.pagination) setPagination(res.data.pagination);
        if (res.data.metrics) setMetrics(res.data.metrics);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch complaints list.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pagination.limit, sortBy, search, selectedStatus, selectedPriority, selectedOfficer, activeTab]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Tab switching
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    if (tab === 'assigned') {
      setSelectedStatus('ALL');
      setSearchParams({ filter: 'assigned' });
    } else if (tab === 'priority_overdue') {
      setSelectedStatus('ALL');
      setSearchParams({ filter: 'priority_overdue' });
    } else if (tab === 'ALL') {
      setSelectedStatus('ALL');
      setSearchParams({});
    } else {
      setSelectedStatus(tab);
      setSearchParams({ status: tab });
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedStatus('ALL');
    setSelectedPriority('ALL');
    setSelectedOfficer('ALL');
    setActiveTab('ALL');
    setCurrentPage(1);
    setSearchParams({});
  };

  // CSV Export
  const handleExportCsv = async () => {
    try {
      showToast('Generating CSV report...');
      const blob = await departmentAdminApi.exportComplaintsCsv();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pmc-department-complaints-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast('CSV report exported successfully.');
    } catch (err) {
      showToast('Failed to export CSV: ' + err.message);
    }
  };

  // Action handlers
  const handleAssignOfficerSubmit = async (e) => {
    e.preventDefault();
    if (!assignModalData) return;
    setIsSubmittingModal(true);
    try {
      const chosenOfficer = officers.find((o) => o.id === selectedOfficerId || o.name === selectedOfficerId);
      await departmentAdminApi.assignOfficer(assignModalData._id || assignModalData.id, {
        officerId: chosenOfficer?.id,
        name: chosenOfficer?.name || selectedOfficerId,
        phone: chosenOfficer?.phone,
        designation: chosenOfficer?.designation,
      });
      showToast('Field Officer assigned successfully.');
      setAssignModalData(null);
      setSelectedOfficerId('');
      fetchComplaints();
    } catch (err) {
      showToast('Assignment failed: ' + err.message);
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusModalData || !newStatusVal) return;
    setIsSubmittingModal(true);
    try {
      await departmentAdminApi.updateComplaintStatus(statusModalData._id || statusModalData.id, {
        status: newStatusVal,
        notes: statusNotes,
      });
      showToast(`Status updated to ${newStatusVal}.`);
      setStatusModalData(null);
      setStatusNotes('');
      fetchComplaints();
    } catch (err) {
      showToast('Status update failed: ' + err.message);
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handlePrioritySubmit = async (e) => {
    e.preventDefault();
    if (!priorityModalData || !newPriorityVal) return;
    setIsSubmittingModal(true);
    try {
      await departmentAdminApi.updateComplaintPriority(priorityModalData._id || priorityModalData.id, {
        priority: newPriorityVal,
      });
      showToast(`Priority updated to ${newPriorityVal}.`);
      setPriorityModalData(null);
      fetchComplaints();
    } catch (err) {
      showToast('Priority update failed: ' + err.message);
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!noteModalData || !internalNoteText.trim()) return;
    setIsSubmittingModal(true);
    try {
      await departmentAdminApi.addInternalNote(noteModalData._id || noteModalData.id, {
        note: internalNoteText.trim(),
      });
      showToast('Internal investigation note added.');
      setNoteModalData(null);
      setInternalNoteText('');
      fetchComplaints();
    } catch (err) {
      showToast('Failed to add note: ' + err.message);
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const getPriorityBadgeStyle = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return { background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' };
      case 'HIGH':
        return { background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' };
      case 'MEDIUM':
        return { background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' };
      default:
        return { background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' };
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'RESOLVED':
        return { background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' };
      case 'IN_PROGRESS':
        return { background: '#E0F2FE', color: '#0284C7', border: '1px solid #7DD3FC' };
      case 'ASSIGNED':
        return { background: '#FEF9C3', color: '#A16207', border: '1px solid #FDE047' };
      case 'UNDER_REVIEW':
        return { background: '#F3E8FF', color: '#7E22CE', border: '1px solid #D8B4FE' };
      case 'REJECTED':
        return { background: '#FFE4E6', color: '#BE123C', border: '1px solid #FDA4AF' };
      default:
        return { background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' };
    }
  };

  return (
    <div className="dept-complaints-page" style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#0B1D33',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 9999,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Quick Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0B1D33)' }}>
              Complaint Management
            </h2>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                background: '#0D9488',
                color: '#FFFFFF',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {pagination.total} Records
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
            Investigate, assign field officers, track SLAs, and verify civic complaint resolutions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchComplaints}
            title="Refresh Complaints List"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCsv}
            title="Export filtered records as CSV"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Quick Tab Filters */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-color, #E2E8F0)',
          paddingBottom: '12px',
          marginBottom: '20px',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'ALL', label: `All Complaints (${metrics.total || 0})` },
          { id: 'assigned', label: `Assigned Officers (${metrics.assigned || 0})` },
          { id: 'IN_PROGRESS', label: `In Progress (${metrics.inProgress || 0})` },
          { id: 'priority_overdue', label: `Priority & Overdue (${metrics.overdue || 0})` },
          { id: 'RESOLVED', label: `Resolved (${metrics.resolved || 0})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: activeTab === tab.id ? '#0D9488' : 'var(--border-color, #E2E8F0)',
              background: activeTab === tab.id ? '#0D9488' : 'var(--bg-card, #FFFFFF)',
              color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-primary, #0B1D33)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar Card */}
      <div
        style={{
          background: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {/* Search Input */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748B)', display: 'block', marginBottom: '4px' }}>
              SEARCH KEYWORD
            </label>
            <input
              type="text"
              placeholder="ID, Title, Category, Location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ height: '36px', fontSize: '13px' }}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748B)', display: 'block', marginBottom: '4px' }}>
              STATUS
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input"
              style={{ height: '36px', fontSize: '13px' }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748B)', display: 'block', marginBottom: '4px' }}>
              PRIORITY
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input"
              style={{ height: '36px', fontSize: '13px' }}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned Officer Filter */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748B)', display: 'block', marginBottom: '4px' }}>
              ASSIGNED OFFICER
            </label>
            <select
              value={selectedOfficer}
              onChange={(e) => {
                setSelectedOfficer(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input"
              style={{ height: '36px', fontSize: '13px' }}
            >
              <option value="ALL">All Officers</option>
              {officers.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748B)', display: 'block', marginBottom: '4px' }}>
              SORT BY
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-input"
              style={{ height: '36px', fontSize: '13px' }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="deadline">SLA Deadline</option>
              <option value="status">Status Order</option>
            </select>
          </div>
        </div>

        {(search || selectedStatus !== 'ALL' || selectedPriority !== 'ALL' || selectedOfficer !== 'ALL' || activeTab !== 'ALL') && (
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#EF4444',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear All Filters ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Data Table */}
      <div
        style={{
          background: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main, #F8FAFC)', borderBottom: '1px solid var(--border-color, #E2E8F0)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>Complaint ID</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>Photo</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>Category & Title</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>Location & Ward</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>Priority</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>Officer</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted, #64748B)' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-muted, #64748B)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    <div className="spinner" style={{ margin: '0 auto 10px auto' }} />
                    Loading department complaints...
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '50px', textAlign: 'center', color: '#94A3B8' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary, #0B1D33)' }}>
                      No Complaints Found
                    </div>
                    <p style={{ margin: '4px 0 12px 0', fontSize: '13px' }}>
                      Try adjusting your filters or search terms.
                    </p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearFilters}>
                      Reset Filters
                    </button>
                  </td>
                </tr>
              ) : (
                complaints.map((c) => {
                  const id = c._id || c.id;
                  const isOverdue =
                    new Date(c.slaDeadline) < new Date() &&
                    c.status !== 'RESOLVED' &&
                    c.status !== 'REJECTED';

                  return (
                    <tr
                      key={id}
                      style={{
                        borderBottom: '1px solid var(--border-color, #F1F5F9)',
                        transition: 'background 0.15s ease',
                      }}
                      className="dept-table-row"
                    >
                      {/* Complaint ID & Date */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <Link
                          to={`/department/complaints/${id}`}
                          style={{ fontWeight: 700, color: '#0D9488', textDecoration: 'none' }}
                        >
                          {c.complaintNumber}
                        </Link>
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : 'Recent'}
                        </div>
                      </td>

                      {/* Photo Thumbnail */}
                      <td style={{ padding: '14px 16px' }}>
                        {c.imageUrl ? (
                          <img
                            src={c.imageUrl}
                            alt="Grievance thumbnail"
                            onClick={() => setPreviewImage(c.imageUrl)}
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              cursor: 'pointer',
                              border: '1px solid #E2E8F0',
                            }}
                            title="Click to view full photo"
                          />
                        ) : (
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '6px',
                              background: '#F1F5F9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              color: '#94A3B8',
                            }}
                          >
                            📷
                          </div>
                        )}
                      </td>

                      {/* Category & Title */}
                      <td style={{ padding: '14px 16px', maxWidth: '280px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                          {c.category}
                        </div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--text-primary, #0B1D33)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={c.title}
                        >
                          {c.title}
                        </div>
                      </td>

                      {/* Location & Ward */}
                      <td style={{ padding: '14px 16px', maxWidth: '220px' }}>
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: 'var(--text-primary, #0B1D33)',
                          }}
                        >
                          📍 {c.location?.address || 'Pune'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {c.location?.ward || 'General Ward'}
                        </div>
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            ...getPriorityBadgeStyle(c.priority),
                          }}
                        >
                          {c.priority}
                        </span>
                        {isOverdue && (
                          <div style={{ fontSize: '10px', color: '#EF4444', fontWeight: 700, marginTop: '3px' }}>
                            ⚠️ OVERDUE
                          </div>
                        )}
                      </td>

                      {/* Assigned Officer */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        {c.assignedOfficer?.name ? (
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary, #0B1D33)' }}>
                              {c.assignedOfficer.name}
                            </span>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              {c.assignedOfficer.designation || 'Field Officer'}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAssignModalData(c);
                              setSelectedOfficerId('');
                            }}
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: '11px', padding: '3px 8px' }}
                          >
                            + Assign Officer
                          </button>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            ...getStatusBadgeStyle(c.status),
                          }}
                        >
                          {c.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Action Dropdown / Buttons */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <Link
                            to={`/department/complaints/${id}`}
                            className="btn btn-sm btn-primary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            Details
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              setStatusModalData(c);
                              setNewStatusVal(c.status);
                              setStatusNotes('');
                            }}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="Update Status"
                          >
                            Status
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAssignModalData(c);
                              setSelectedOfficerId(c.assignedOfficer?.id || '');
                            }}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="Assign Officer"
                          >
                            Officer
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setNoteModalData(c);
                              setInternalNoteText('');
                            }}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="Add Note"
                          >
                            📝
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {pagination.pages > 1 && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-color, #E2E8F0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              color: 'var(--text-muted, #64748B)',
            }}
          >
            <span>
              Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '800px', maxHeight: '90vh' }}>
            <img
              src={previewImage}
              alt="Grievance Evidence Preview"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain' }}
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                background: '#FFFFFF',
                color: '#0B1D33',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Assign Officer Modal */}
      {assignModalData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
                Assign Field Officer
              </h3>
              <button
                type="button"
                onClick={() => setAssignModalData(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px 0' }}>
              Select a field officer for complaint #{assignModalData.complaintNumber} (
              {assignModalData.title}).
            </p>

            <form onSubmit={handleAssignOfficerSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Select Field Officer
                </label>
                <select
                  className="form-input"
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Officer --</option>
                  {officers.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.name} ({off.designation} - {off.availability}, {off.activeCount} active tasks)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAssignModalData(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingModal || !selectedOfficerId}>
                  {isSubmittingModal ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {statusModalData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
                Update Complaint Status
              </h3>
              <button
                type="button"
                onClick={() => setStatusModalData(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px 0' }}>
              Change workflow status for complaint #{statusModalData.complaintNumber}.
            </p>

            <form onSubmit={handleStatusSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  New Status
                </label>
                <select
                  className="form-input"
                  value={newStatusVal}
                  onChange={(e) => setNewStatusVal(e.target.value)}
                  required
                >
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Status Transition Notes (Optional)
                </label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Explain reason for status change or update action history..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStatusModalData(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingModal}>
                  {isSubmittingModal ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Note Modal */}
      {noteModalData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
                Add Internal Investigation Note
              </h3>
              <button
                type="button"
                onClick={() => setNoteModalData(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px 0' }}>
              Add a confidential departmental note to complaint #{noteModalData.complaintNumber}.
            </p>

            <form onSubmit={handleNoteSubmit}>
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <textarea
                  className="form-input"
                  rows="4"
                  placeholder="Enter internal inspection findings, contractor coordination, or notes..."
                  value={internalNoteText}
                  onChange={(e) => setInternalNoteText(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setNoteModalData(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingModal || !internalNoteText.trim()}>
                  {isSubmittingModal ? 'Saving Note...' : 'Save Internal Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentComplaintsPage;
