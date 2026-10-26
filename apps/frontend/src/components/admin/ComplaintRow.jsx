import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StatusBadge } from '../StatusBadge';

const STATUS_CHOICES = [
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CLOSED', label: 'Closed' },
];

export const ComplaintRow = ({
  complaint,
  departments = [],
  onStatusChange,
  onAssignClick,
  isUpdating = false,
  showCitizen = true,
  allowManualStatusChange = true,
}) => {
  const navigate = useNavigate();
  const [localStatus, setLocalStatus] = useState(complaint.status || 'SUBMITTED');
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const complaintId = complaint._id || complaint.id;
  const complaintNumber = complaint.complaintNumber || `#${complaintId.slice(-6)}`;
  const deptName = complaint.departmentId?.name || 'Unassigned';
  const citizenName =
    complaint.citizenId?.fullName ||
    complaint.citizenId?.name ||
    'Citizen';
  const citizenEmail = complaint.citizenId?.email;

  const handleStatusSelect = async (e) => {
    const newStatus = e.target.value;
    setLocalStatus(newStatus);
    setIsChangingStatus(true);
    try {
      if (onStatusChange) {
        await onStatusChange(complaintId, newStatus);
      }
    } catch {
      // Revert if error
      setLocalStatus(complaint.status || 'SUBMITTED');
    } finally {
      setIsChangingStatus(false);
    }
  };

  const priorityStr = (complaint.priority || 'MEDIUM').toUpperCase();
  const dateStr = complaint.createdAt
    ? new Date(complaint.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  return (
    <tr
      className="complaint-table-row"
      data-testid={`complaint-row-${complaintId}`}
      id={`complaint-row-${complaintId}`}
    >
      {/* Complaint Identifier */}
      <td>
        <Link
          to={`/admin/complaints/${complaintId}`}
          className="font-mono text-primary font-semibold text-xs complaint-number-link"
          title={`View full details for complaint ${complaintNumber}`}
        >
          {complaintNumber}
        </Link>
      </td>

      {/* Title & Location */}
      <td>
        <div className="dept-table-name-wrap">
          <Link
            to={`/admin/complaints/${complaintId}`}
            className="font-semibold text-sm hover-underline truncate max-w-xs block text-main"
            title={complaint.title}
          >
            {complaint.title}
          </Link>
          <div className="complaint-meta-subtext">
            <span className="category-tag text-xs">{complaint.category || 'General'}</span>
            {complaint.location?.address && (
              <span className="text-xs text-muted truncate max-w-xs" title={complaint.location.address}>
                📍 {complaint.location.address}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Citizen Information */}
      {showCitizen && (
        <td>
          <div className="citizen-info-cell">
            <span className="citizen-name text-sm font-medium">{citizenName}</span>
            {citizenEmail && (
              <span className="citizen-email text-xs text-muted truncate">{citizenEmail}</span>
            )}
          </div>
        </td>
      )}

      {/* Department & Quick Assign */}
      <td>
        <div className="dept-assign-cell">
          <span
            className={`dept-badge text-xs ${complaint.departmentId ? 'dept-badge-assigned' : 'dept-badge-unassigned'}`}
          >
            {deptName}
          </span>
          <button
            type="button"
            className="btn btn-xs btn-outline assign-quick-btn"
            onClick={() => onAssignClick && onAssignClick(complaint)}
            title="Assign or reassign municipal department"
            disabled={isUpdating}
          >
            {complaint.departmentId ? 'Reassign' : 'Assign'}
          </button>
        </div>
      </td>

      {/* Priority */}
      <td>
        <span className={`priority-pill priority-${priorityStr.toLowerCase()}`}>
          {priorityStr}
        </span>
      </td>

      {/* Lifecycle Status */}
      <td>
        {allowManualStatusChange ? (
          <div className="inline-status-select-wrap">
            <select
              className={`inline-status-select status-${localStatus.toLowerCase()}`}
              value={localStatus}
              onChange={handleStatusSelect}
              disabled={isUpdating || isChangingStatus}
              aria-label={`Update status for ${complaintNumber}`}
              id={`status-select-${complaintId}`}
            >
              {STATUS_CHOICES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {isChangingStatus && (
              <span className="inline-status-spinner spinner" aria-label="Updating status..." />
            )}
          </div>
        ) : (
          <StatusBadge status={localStatus} size="sm" />
        )}
      </td>

      {/* Submitted Date */}
      <td className="text-muted text-xs whitespace-nowrap">{dateStr}</td>

      {/* Row Actions */}
      <td className="text-right">
        <div className="table-actions-row">
          <Link
            to={`/admin/complaints/${complaintId}`}
            className="btn btn-xs btn-primary"
            title="Inspect full details, verification, and audit trail"
          >
            View Details
          </Link>
        </div>
      </td>
    </tr>
  );
};

export default ComplaintRow;
