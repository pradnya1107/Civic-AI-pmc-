import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LifecycleStepper, LIFECYCLE_STEPS } from '../components/LifecycleStepper';

describe('LifecycleStepper Component', () => {
  it('renders all standard lifecycle steps in order', () => {
    render(<LifecycleStepper status="SUBMITTED" />);

    LIFECYCLE_STEPS.forEach((step) => {
      expect(screen.getByText(step.label)).toBeInTheDocument();
    });
  });

  it('marks Submitted as the current active step when status is SUBMITTED', () => {
    render(<LifecycleStepper status="SUBMITTED" />);

    const submittedItem = screen.getByText('Submitted').closest('li');
    expect(submittedItem).toHaveAttribute('aria-current', 'step');
    expect(submittedItem).toHaveAttribute('data-state', 'current');

    const verifiedItem = screen.getByText('Verified').closest('li');
    expect(verifiedItem).not.toHaveAttribute('aria-current');
    expect(verifiedItem).toHaveAttribute('data-state', 'upcoming');
  });

  it('marks previous steps as completed and In Progress as current when status is IN_PROGRESS', () => {
    render(<LifecycleStepper status="IN_PROGRESS" />);

    const submittedItem = screen.getByText('Submitted').closest('li');
    expect(submittedItem).toHaveAttribute('data-state', 'completed');

    const verifiedItem = screen.getByText('Verified').closest('li');
    expect(verifiedItem).toHaveAttribute('data-state', 'completed');

    const assignedItem = screen.getByText('Assigned').closest('li');
    expect(assignedItem).toHaveAttribute('data-state', 'completed');

    const inProgressItem = screen.getByText('In Progress').closest('li');
    expect(inProgressItem).toHaveAttribute('aria-current', 'step');
    expect(inProgressItem).toHaveAttribute('data-state', 'current');

    const resolvedItem = screen.getByText('Resolved').closest('li');
    expect(resolvedItem).toHaveAttribute('data-state', 'upcoming');
  });

  it('marks all steps up to Resolved as completed when status is RESOLVED', () => {
    render(<LifecycleStepper status="RESOLVED" />);

    const resolvedItem = screen.getByText('Resolved').closest('li');
    expect(resolvedItem).toHaveAttribute('aria-current', 'step');
    expect(resolvedItem).toHaveAttribute('data-state', 'current');

    const closedItem = screen.getByText('Closed').closest('li');
    expect(closedItem).toHaveAttribute('data-state', 'upcoming');
  });

  it('renders a rejection notice when status is REJECTED', () => {
    render(<LifecycleStepper status="REJECTED" />);

    expect(screen.getByText(/Grievance Rejected \/ Closed/i)).toBeInTheDocument();
  });
});
