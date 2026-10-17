import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adminApi, departmentApi } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { LifecycleStepper } from '../../components/LifecycleStepper';

const STATUS_OPTIONS = [
  { value: 'SUBMITTED', label: 'SUBMITTED (Awaiting Initial Review)' },
  { value: 'UNDER_REVIEW', label: 'UNDER_REVIEW (Verified by PMC Staff)' },
  { value: 'ASSIGNED', label: 'ASSIGNED (Allocated to Municipal Department)' },
  { value: 'IN_PROGRESS', label: 'IN_PROGRESS (Field Remediation Ongoing)' },
  { value: 'RESOLVED', label: 'RESOLVED (Issue Fixed / Cleared)' },
  { value: 'REJECTED', label: 'REJECTED (Invalid / Out of Jurisdiction)' },
  { value: 'CLOSED', label: 'CLOSED (Administrative Case Closed)' },
];

export const AdminComplaintDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form controls
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [assignDeptId, setAssignDeptId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [complaintRes, deptsRes] = await Promise.all([
        adminApi.getComplaintById(id),
        departmentApi.getDepartments({ includeInactive: false }),
      ]);

      const data = complaintRes?.data || complaintRes || {};
      const c = data.complaint || data;
      const logs = data.auditLogs || [];

      setComplaint(c);
      setAuditLogs(Array.isArray(logs) ? logs : []);
      setNewStatus(c.status || 'SUBMITTED');
      setAssignDeptId(c.departmentId?._id || c.departmentId || '');

      const deptList = deptsRes?.data?.departments || deptsRes?.departments || deptsRes?.data || [];
      setDepartments(Array.isArray(deptList) ? deptList : []);
    } catch (err) {
      setError(err?.message || 'Failed to load complaint details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  // 1. Verify Complaint (Moves to UNDER_REVIEW)
  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await adminApi.verifyComplaint(id, {
        notes: 'Verified by PMC administrative supervisor.',
      });
      showToast('Complaint verified successfully and marked Under Review.');
      loadData();
    } catch (err) {
      showToast(`Verification failed: ${err?.message || 'Please try again.'}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // 2. Assign Department
  const handleAssignDepartment = async (e) => {
    e.preventDefault();
    if (!assignDeptId) return;

    setIsAssigning(true);
    try {
      await adminApi.assignComplaintDepartment(id, {
        departmentId: assignDeptId,
        notes: assignNotes.trim() || undefined,
      });
      showToast('Department assigned successfully. Citizen notified.');
      setAssignNotes('');
      loadData();
    } catch (err) {
      showToast(`Department assignment failed: ${err?.message || 'Please try again.'}`);
    } finally {
      setIsAssigning(false);
    }
  };

  // 3. Update Status
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!newStatus) return;

    setIsUpdatingStatus(true);
    try {
      await adminApi.updateComplaintStatus(id, {
        status: newStatus,
        notes: statusNotes.trim() || undefined,
      });
      showToast(`Status successfully changed to ${newStatus}. Citizen notified.`);
      setStatusNotes('');
      loadData();
    } catch (err) {
      showToast(`Status update failed: ${err?.message || 'Please try again.'}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-page-container">
        <div className="admin-loading-table py-12">
          <div className="spinner" />
          <p>Loading complaint record and audit trail...</p>
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="admin-page-container">
        <div className="alert-banner alert-banner-error mb-4" role="alert">
          <span>{error || 'Complaint record not found.'}</span>
        </div>
        <Link to="/admin" className="btn btn-outline btn-sm">
          &larr; Return to Admin Dashboard
        </Link>
      </div>
    );
  }

  const complaintNumber = complaint.complaintNumber || `#${complaint._id.slice(-6)}`;
  const citizen = complaint.citizenId;
  const department = complaint.departmentId;
  const isVerified = complaint.status !== 'SUBMITTED';

  return (
    <div className="admin-page-container" id="admin-complaint-detail-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-toast admin-toast-success" role="alert" id="admin-detail-toast">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="admin-detail-back-bar mb-3">
        <Link to="/admin" className="btn btn-xs btn-outline">
          &larr; Back to Admin Dashboard
        </Link>
        <Link
          to={`/complaints/${complaint._id}`}
          className="btn btn-xs btn-outline"
          title="Open Citizen Public Tracker"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Public Tracker &#8599;
        </Link>
      </div>

      {/* Main Page Header */}
      <div className="admin-page-header">
        <div>
          <div className="complaint-header-meta">
            <span className="font-mono text-primary font-bold text-sm">{complaintNumber}</span>
            <span className="category-tag text-xs">{complaint.category}</span>
            <span className={`priority-pill priority-${(complaint.priority || 'MEDIUM').toLowerCase()}`}>
              {(complaint.priority || 'MEDIUM').toUpperCase()}
            </span>
            <StatusBadge status={complaint.status} size="md" />
          </div>
          <h1 className="admin-page-title mt-2">{complaint.title}</h1>
        </div>

        <div className="admin-header-actions">
          {!isVerified ? (
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={handleVerify}
              disabled={isVerifying}
              id="verify-complaint-btn"
            >
              {isVerifying ? 'Verifying...' : '✓ Verify Complaint'}
            </button>
          ) : (
            <span className="badge badge-success text-xs font-semibold py-1 px-3">
              ✓ Verified by PMC
            </span>
          )}
        </div>
      </div>

      {/* Lifecycle Stepper */}
      <div className="admin-detail-stepper-card mb-4">
        <LifecycleStepper currentStatus={complaint.status} />
      </div>

      {/* Two Column Layout: Details & Controls */}
      <div className="admin-detail-grid">
        {/* Left Column: Complaint Details & Timeline */}
        <div className="admin-detail-main">
          {/* Grievance Details Card */}
          <div className="admin-card mb-4">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Grievance Information</h2>
            </div>
            <div className="admin-card-body">
              <div className="mb-4">
                <span className="detail-field-label">Description</span>
                <p className="detail-field-value text-base mt-1 whitespace-pre-wrap">
                  {complaint.description || 'No description provided.'}
                </p>
              </div>

              <div className="detail-meta-grid">
                <div>
                  <span className="detail-field-label">Location / Address</span>
                  <p className="detail-field-value font-medium">
                    📍 {complaint.location?.address || 'Pune'}
                  </p>
                  {complaint.location?.ward && (
                    <p className="text-xs text-muted">Ward: {complaint.location.ward}</p>
                  )}
                  {complaint.location?.latitude && complaint.location?.longitude && (
                    <p className="text-xs font-mono text-muted">
                      Coords: {complaint.location.latitude}, {complaint.location.longitude}
                    </p>
                  )}
                </div>

                <div>
                  <span className="detail-field-label">Submission Date</span>
                  <p className="detail-field-value">
                    {new Date(complaint.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Citizen Details Card */}
          <div className="admin-card mb-4">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Citizen Details</h2>
            </div>
            <div className="admin-card-body">
              <div className="citizen-profile-row">
                <div className="citizen-avatar-large">
                  {(citizen?.fullName || citizen?.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="citizen-details-meta">
                  <h3 className="text-base font-semibold">
                    {citizen?.fullName || citizen?.name || 'Anonymous Citizen'}
                  </h3>
                  <p className="text-sm text-muted">📧 {citizen?.email || 'N/A'}</p>
                  {citizen?.phoneNumber && (
                    <p className="text-sm text-muted">📞 {citizen.phoneNumber}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Activity Timeline & Audit Logs */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Activity Timeline & Audit Trail</h2>
              <span className="text-xs text-muted">{auditLogs.length} events logged</span>
            </div>
            <div className="admin-card-body">
              {auditLogs.length === 0 ? (
                <div className="text-center py-6 text-muted text-sm">
                  <p>No administrative audit logs recorded for this complaint yet.</p>
                </div>
              ) : (
                <ol className="audit-timeline-list">
                  {auditLogs.map((log) => {
                    const actorName = log.actorRef?.fullName || log.actorRef?.email || 'PMC Administrator';
                    const actorRole = log.actorRef?.role || 'ADMIN';
                    const timeStr = new Date(log.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    });

                    return (
                      <li key={log._id || log.id} className="audit-timeline-item">
                        <div className="audit-timeline-dot" aria-hidden="true" />
                        <div className="audit-timeline-content">
                          <div className="audit-timeline-header">
                            <span className="audit-action-tag">{log.action}</span>
                            <span className="audit-timestamp">{timeStr}</span>
                          </div>
                          <p className="audit-actor-text">
                            By <strong>{actorName}</strong> ({actorRole})
                          </p>
                          {log.metadata && (
                            <div className="audit-metadata-box">
                              {log.metadata.oldStatus && log.metadata.newStatus && (
                                <p className="text-xs">
                                  Status transition: <strong>{String(log.metadata.oldStatus)}</strong> &rarr; <strong>{String(log.metadata.newStatus)}</strong>
                                </p>
                              )}
                              {log.metadata.departmentName && (
                                <p className="text-xs">
                                  Assigned to: <strong>{String(log.metadata.departmentName)}</strong>
                                </p>
                              )}
                              {log.metadata.notes && (
                                <p className="text-xs italic text-muted mt-1">
                                  "{String(log.metadata.notes)}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Administrative Controls */}
        <div className="admin-detail-sidebar">
          {/* Control 1: Update Status */}
          <div className="admin-card mb-4">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Update Status</h2>
            </div>
            <div className="admin-card-body">
              <form onSubmit={handleUpdateStatus} noValidate>
                <div className="form-group">
                  <label htmlFor="detail-status-select" className="form-label">
                    Lifecycle Status
                  </label>
                  <select
                    id="detail-status-select"
                    className="form-select font-semibold"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    disabled={isUpdatingStatus}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="detail-status-notes" className="form-label">
                    Resolution / Progress Notes (Optional)
                  </label>
                  <textarea
                    id="detail-status-notes"
                    className="form-textarea"
                    rows={3}
                    placeholder="Enter notes visible to auditing and notifications..."
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    disabled={isUpdatingStatus}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={isUpdatingStatus}
                  id="save-status-btn"
                >
                  {isUpdatingStatus ? 'Updating Status...' : 'Update Status & Notify Citizen'}
                </button>
              </form>
            </div>
          </div>

          {/* Control 2: Assign Department */}
          <div className="admin-card mb-4">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Assign Department</h2>
            </div>
            <div className="admin-card-body">
              <form onSubmit={handleAssignDepartment} noValidate>
                <div className="form-group">
                  <label htmlFor="detail-dept-select" className="form-label">
                    Assigned Department
                  </label>
                  <select
                    id="detail-dept-select"
                    className="form-select"
                    value={assignDeptId}
                    onChange={(e) => setAssignDeptId(e.target.value)}
                    disabled={isAssigning}
                  >
                    <option value="">-- Unassigned --</option>
                    {departments.map((d) => (
                      <option key={d.id || d._id} value={d.id || d._id}>
                        {d.name} ({d.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="detail-dept-notes" className="form-label">
                    Assignment Instructions (Optional)
                  </label>
                  <textarea
                    id="detail-dept-notes"
                    className="form-textarea"
                    rows={2}
                    placeholder="Instructions for the department field engineer..."
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                    disabled={isAssigning}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-outline btn-block"
                  disabled={isAssigning || !assignDeptId}
                  id="assign-dept-btn"
                >
                  {isAssigning ? 'Assigning...' : 'Assign Department'}
                </button>
              </form>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Quick Actions</h2>
            </div>
            <div className="admin-card-body">
              {!isVerified && (
                <button
                  type="button"
                  className="btn btn-success btn-block mb-2"
                  onClick={handleVerify}
                  disabled={isVerifying}
                >
                  ✓ Verify & Mark Under Review
                </button>
              )}

              <button
                type="button"
                className="btn btn-outline btn-block"
                onClick={() => {
                  setNewStatus('RESOLVED');
                  setStatusNotes('Grievance resolved after on-site municipal verification.');
                }}
              >
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminComplaintDetailPage;
