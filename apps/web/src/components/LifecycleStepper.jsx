import React from 'react';

export const LIFECYCLE_STEPS = [
  {
    key: 'SUBMITTED',
    label: 'Submitted',
    description: 'Complaint logged in PMC system',
  },
  {
    key: 'VERIFIED',
    label: 'Verified',
    description: 'Reviewed by PMC grievance officer',
  },
  {
    key: 'ASSIGNED',
    label: 'Assigned',
    description: 'Routed to ward / department team',
  },
  {
    key: 'IN_PROGRESS',
    label: 'In Progress',
    description: 'Ground resolution underway',
  },
  {
    key: 'RESOLVED',
    label: 'Resolved',
    description: 'Resolution completed on site',
  },
  {
    key: 'CLOSED',
    label: 'Closed',
    description: 'Citizen verified and case closed',
  },
];

/**
 * Maps raw status string to stepper step index (0-based)
 */
export function getStepIndex(status) {
  if (!status || typeof status !== 'string') return 0;
  const clean = status.trim().toUpperCase().replace(/[\s-]+/g, '_');

  switch (clean) {
    case 'SUBMITTED':
      return 0;
    case 'VERIFIED':
    case 'UNDER_REVIEW':
      return 1;
    case 'ASSIGNED':
      return 2;
    case 'IN_PROGRESS':
      return 3;
    case 'RESOLVED':
      return 4;
    case 'CLOSED':
      return 5;
    case 'REJECTED':
      return -1; // Special rejected state
    default:
      return 0;
  }
}

/**
 * LifecycleStepper Component
 * Visual step-by-step progress tracking for citizen complaints
 *
 * @param {Object} props
 * @param {string} props.status - Current complaint status
 * @param {string} [props.className] - Optional custom CSS class
 */
export const LifecycleStepper = ({ status, className = '' }) => {
  const isRejected = (status || '').trim().toUpperCase() === 'REJECTED';
  const activeIndex = getStepIndex(status);

  if (isRejected) {
    return (
      <div className={`lifecycle-stepper-container lifecycle-stepper--rejected ${className}`.trim()} role="region" aria-label="Complaint Lifecycle">
        <div className="stepper-rejected-banner" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <div>
            <strong>Grievance Rejected / Closed</strong>
            <p>This complaint did not meet verification criteria or is outside PMC municipal jurisdiction.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <nav className={`lifecycle-stepper-container ${className}`.trim()} aria-label="Complaint Lifecycle Progress">
      <ol className="lifecycle-stepper">
        {LIFECYCLE_STEPS.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isUpcoming = idx > activeIndex;

          let stepState = 'upcoming';
          if (isCompleted) stepState = 'completed';
          if (isCurrent) stepState = 'current';

          return (
            <li
              key={step.key}
              className={`lifecycle-step lifecycle-step--${stepState}`}
              aria-current={isCurrent ? 'step' : undefined}
              data-step={step.key}
              data-state={stepState}
            >
              {/* Connector line between steps */}
              {idx > 0 && (
                <div
                  className={`lifecycle-connector ${isCompleted || isCurrent ? 'lifecycle-connector--active' : ''}`}
                  aria-hidden="true"
                />
              )}

              {/* Step indicator circle */}
              <div className="lifecycle-indicator" aria-hidden="true">
                {isCompleted ? (
                  <svg className="lifecycle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="lifecycle-step-num">{idx + 1}</span>
                )}
              </div>

              {/* Step Label and meta */}
              <div className="lifecycle-details">
                <span className="lifecycle-label">{step.label}</span>
                <span className="lifecycle-desc">{step.description}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default LifecycleStepper;
