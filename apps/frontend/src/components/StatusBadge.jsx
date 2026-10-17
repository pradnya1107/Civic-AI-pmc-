import React from 'react';

/**
 * Standard Status Configuration
 * Submitted -> gray
 * Verified (or Under Review) -> blue
 * Assigned -> orange
 * In Progress -> yellow
 * Resolved -> green
 * Closed (or Rejected) -> dark
 */
const STATUS_CONFIGS = {
  SUBMITTED: {
    label: 'Submitted',
    variant: 'submitted',
    colorKey: 'gray',
    bgColor: '#f3f4f6',
    textColor: '#374151',
    borderColor: '#d1d5db',
    dotColor: '#9ca3af',
  },
  VERIFIED: {
    label: 'Verified',
    variant: 'verified',
    colorKey: 'blue',
    bgColor: '#eff6ff',
    textColor: '#1d4ed8',
    borderColor: '#bfdbfe',
    dotColor: '#3b82f6',
  },
  UNDER_REVIEW: {
    label: 'Verified',
    variant: 'verified',
    colorKey: 'blue',
    bgColor: '#eff6ff',
    textColor: '#1d4ed8',
    borderColor: '#bfdbfe',
    dotColor: '#3b82f6',
  },
  ASSIGNED: {
    label: 'Assigned',
    variant: 'assigned',
    colorKey: 'orange',
    bgColor: '#fff7ed',
    textColor: '#c2410c',
    borderColor: '#fed7aa',
    dotColor: '#f97316',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    variant: 'in-progress',
    colorKey: 'yellow',
    bgColor: '#fefce8',
    textColor: '#a16207',
    borderColor: '#fef08a',
    dotColor: '#eab308',
  },
  RESOLVED: {
    label: 'Resolved',
    variant: 'resolved',
    colorKey: 'green',
    bgColor: '#f0fdf4',
    textColor: '#15803d',
    borderColor: '#bbf7d0',
    dotColor: '#22c55e',
  },
  CLOSED: {
    label: 'Closed',
    variant: 'closed',
    colorKey: 'dark',
    bgColor: '#1f2937',
    textColor: '#f9fafb',
    borderColor: '#374151',
    dotColor: '#9ca3af',
  },
  REJECTED: {
    label: 'Closed',
    variant: 'closed',
    colorKey: 'dark',
    bgColor: '#1f2937',
    textColor: '#f9fafb',
    borderColor: '#374151',
    dotColor: '#ef4444',
  },
};

/**
 * Normalizes input status string to config key
 */
function normalizeStatus(status) {
  if (!status || typeof status !== 'string') return 'SUBMITTED';
  const clean = status.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return clean;
}

/**
 * StatusBadge Component
 * Renders color-coded status badge with accessible attributes
 *
 * @param {Object} props
 * @param {string} props.status - Complaint status
 * @param {string} [props.className] - Additional CSS class names
 * @param {boolean} [props.showDot=true] - Whether to show the colored status dot
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Size variant
 */
export const StatusBadge = ({
  status,
  className = '',
  showDot = true,
  size = 'md',
  ...rest
}) => {
  const normalizedKey = normalizeStatus(status);
  const config = STATUS_CONFIGS[normalizedKey] || {
    label: status || 'Unknown',
    variant: 'submitted',
    colorKey: 'gray',
    bgColor: '#f3f4f6',
    textColor: '#374151',
    borderColor: '#d1d5db',
    dotColor: '#9ca3af',
  };

  return (
    <span
      role="status"
      aria-label={`Status: ${config.label}`}
      data-status={normalizedKey}
      data-color={config.colorKey}
      className={`status-badge status-badge--${config.variant} status-badge--${size} ${className}`.trim()}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        borderColor: config.borderColor,
      }}
      {...rest}
    >
      {showDot && (
        <span
          className="status-badge__dot"
          style={{ backgroundColor: config.dotColor }}
          aria-hidden="true"
        />
      )}
      <span className="status-badge__text">{config.label}</span>
    </span>
  );
};

export default StatusBadge;
