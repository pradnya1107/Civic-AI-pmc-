import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';

describe('StatusBadge Component', () => {
  it('renders Submitted status with gray color styling', () => {
    render(<StatusBadge status="Submitted" />);
    const badge = screen.getByRole('status');

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Submitted');
    expect(badge).toHaveAttribute('data-color', 'gray');
    expect(badge.className).toContain('status-badge--submitted');
    expect(badge).toHaveStyle({
      backgroundColor: '#f3f4f6',
      color: '#374151',
    });
  });

  it('renders Verified status with blue color styling', () => {
    render(<StatusBadge status="Verified" />);
    const badge = screen.getByRole('status');

    expect(badge).toHaveTextContent('Verified');
    expect(badge).toHaveAttribute('data-color', 'blue');
    expect(badge.className).toContain('status-badge--verified');
    expect(badge).toHaveStyle({
      backgroundColor: '#eff6ff',
      color: '#1d4ed8',
    });
  });

  it('handles backend UNDER_REVIEW mapped to Verified (blue)', () => {
    render(<StatusBadge status="UNDER_REVIEW" />);
    const badge = screen.getByRole('status');

    expect(badge).toHaveTextContent('Verified');
    expect(badge).toHaveAttribute('data-color', 'blue');
  });

  it('renders Assigned status with orange color styling', () => {
    render(<StatusBadge status="Assigned" />);
    const badge = screen.getByRole('status');

    expect(badge).toHaveTextContent('Assigned');
    expect(badge).toHaveAttribute('data-color', 'orange');
    expect(badge.className).toContain('status-badge--assigned');
    expect(badge).toHaveStyle({
      backgroundColor: '#fff7ed',
      color: '#c2410c',
    });
  });

  it('renders In Progress status with yellow color styling', () => {
    render(<StatusBadge status="In Progress" />);
    const badge = screen.getByRole('status');

    expect(badge).toHaveTextContent('In Progress');
    expect(badge).toHaveAttribute('data-color', 'yellow');
    expect(badge.className).toContain('status-badge--in-progress');
    expect(badge).toHaveStyle({
      backgroundColor: '#fefce8',
      color: '#a16207',
    });
  });

  it('handles backend IN_PROGRESS casing correctly', () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    const badge = screen.getByRole('status');

    expect(badge).toHaveTextContent('In Progress');
    expect(badge).toHaveAttribute('data-color', 'yellow');
  });

  it('renders Resolved status with green color styling', () => {
    render(<StatusBadge status="Resolved" />);
    const badge = screen.getByRole('status');

    expect(badge).toHaveTextContent('Resolved');
    expect(badge).toHaveAttribute('data-color', 'green');
    expect(badge.className).toContain('status-badge--resolved');
    expect(badge).toHaveStyle({
      backgroundColor: '#f0fdf4',
      color: '#15803d',
    });
  });

  it('renders Closed status with dark color styling', () => {
    render(<StatusBadge status="Closed" />);
    const badge = screen.getByRole('status');

    expect(badge).toHaveTextContent('Closed');
    expect(badge).toHaveAttribute('data-color', 'dark');
    expect(badge.className).toContain('status-badge--closed');
    expect(badge).toHaveStyle({
      backgroundColor: '#1f2937',
      color: '#f9fafb',
    });
  });

  it('handles backend REJECTED status as closed (dark)', () => {
    render(<StatusBadge status="REJECTED" />);
    const badge = screen.getByRole('status');

    expect(badge).toHaveTextContent('Closed');
    expect(badge).toHaveAttribute('data-color', 'dark');
  });

  it('includes accessible aria-label', () => {
    render(<StatusBadge status="SUBMITTED" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-label', 'Status: Submitted');
  });
});
