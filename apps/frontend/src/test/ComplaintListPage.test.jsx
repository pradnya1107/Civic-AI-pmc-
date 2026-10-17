import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ComplaintListPage } from '../pages/ComplaintListPage';
import { complaintApi } from '../services/api';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Pooja Patil', email: 'pooja@example.com', role: 'CITIZEN' },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

// Mock complaintApi
vi.mock('../services/api', () => ({
  complaintApi: {
    createComplaint: vi.fn(),
    getComplaints: vi.fn(),
    getComplaintById: vi.fn(),
  },
}));

describe('ComplaintListPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Acceptance Criteria: Given no complaints exist, when the list loads, then an empty state with a "Report an Issue" CTA is shown', async () => {
    complaintApi.getComplaints.mockResolvedValueOnce({
      success: true,
      data: { complaints: [], pagination: { total: 0 } },
    });

    render(
      <MemoryRouter>
        <ComplaintListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/No complaints found/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/You haven't submitted any civic grievances yet/i)).toBeInTheDocument();
    const emptyStateSection = screen.getByLabelText(/No complaints found/i);
    const ctaBtn = within(emptyStateSection).getByRole('link', { name: /Report an Issue/i });
    expect(ctaBtn).toBeInTheDocument();
    expect(ctaBtn).toHaveAttribute('href', '/complaints/new');
  });

  it('Acceptance Criteria: Given a logged-in citizen, when they submit a valid complaint, then it appears in their list with status "Submitted"', async () => {
    const mockComplaints = [
      {
        _id: '670c538260ab55761a29381f',
        complaintNumber: 'CIV-2026-001',
        title: 'Deep pothole on Karve Road',
        description: 'Vehicles are getting damaged due to sharp edges.',
        category: 'Roads & Potholes',
        location: { address: 'Near Nal Stop, Karve Road', ward: 'Ward 2' },
        status: 'SUBMITTED',
        createdAt: '2026-10-16T10:00:00Z',
      },
    ];

    complaintApi.getComplaints.mockResolvedValueOnce({
      success: true,
      data: { complaints: mockComplaints, pagination: { total: 1 } },
    });

    render(
      <MemoryRouter>
        <ComplaintListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Deep pothole on Karve Road')).toBeInTheDocument();
    });

    expect(screen.getByText('CIV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Roads & Potholes')).toBeInTheDocument();

    const statusBadge = screen.getByRole('status');
    expect(statusBadge).toHaveTextContent('Submitted');
    expect(statusBadge).toHaveAttribute('data-color', 'gray');
  });

  it('Acceptance Criteria: Given the complaint list, when an admin changes the status to "In Progress", then on refresh the citizen sees the updated badge', async () => {
    const user = userEvent.setup();

    // First fetch: status is SUBMITTED
    complaintApi.getComplaints.mockResolvedValueOnce({
      success: true,
      data: {
        complaints: [
          {
            _id: '670c538260ab55761a29381f',
            complaintNumber: 'CIV-2026-001',
            title: 'Deep pothole on Karve Road',
            description: 'Vehicles are getting damaged due to sharp edges.',
            category: 'Roads & Potholes',
            location: { address: 'Near Nal Stop, Karve Road' },
            status: 'SUBMITTED',
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <ComplaintListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Submitted');
      expect(badge).toHaveAttribute('data-color', 'gray');
    });

    // Mock second fetch after PMC admin updates status to IN_PROGRESS
    complaintApi.getComplaints.mockResolvedValueOnce({
      success: true,
      data: {
        complaints: [
          {
            _id: '670c538260ab55761a29381f',
            complaintNumber: 'CIV-2026-001',
            title: 'Deep pothole on Karve Road',
            description: 'Vehicles are getting damaged due to sharp edges.',
            category: 'Roads & Potholes',
            location: { address: 'Near Nal Stop, Karve Road' },
            status: 'IN_PROGRESS',
          },
        ],
      },
    });

    // Citizen clicks Refresh button
    const refreshBtn = screen.getByRole('button', { name: /Refresh complaint list/i });
    await user.click(refreshBtn);

    await waitFor(() => {
      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('In Progress');
      expect(badge).toHaveAttribute('data-color', 'yellow');
    });
  });

  it('renders an error message with a retry button when fetch fails', async () => {
    const user = userEvent.setup();

    complaintApi.getComplaints.mockRejectedValueOnce(
      new Error('Failed to connect to CivicAI backend'),
    );

    render(
      <MemoryRouter>
        <ComplaintListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to connect to CivicAI backend/i),
      ).toBeInTheDocument();
    });

    // Retry should trigger another fetch
    complaintApi.getComplaints.mockResolvedValueOnce({
      success: true,
      data: { complaints: [] },
    });

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText(/No complaints found/i)).toBeInTheDocument();
    });
  });

  it('filters complaints correctly using the search bar', async () => {
    const user = userEvent.setup();

    const mockComplaints = [
      {
        _id: '1',
        complaintNumber: 'CIV-001',
        title: 'Water pipe burst',
        description: 'Water spraying everywhere.',
        category: 'Water Supply',
        status: 'SUBMITTED',
      },
      {
        _id: '2',
        complaintNumber: 'CIV-002',
        title: 'Street light broken',
        description: 'Dark alley at night.',
        category: 'Street Lighting & Electrical',
        status: 'RESOLVED',
      },
    ];

    complaintApi.getComplaints.mockResolvedValueOnce({
      success: true,
      data: { complaints: mockComplaints },
    });

    render(
      <MemoryRouter>
        <ComplaintListPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Water pipe burst')).toBeInTheDocument();
      expect(screen.getByText('Street light broken')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by title/i);
    await user.type(searchInput, 'Water');

    expect(screen.getByText('Water pipe burst')).toBeInTheDocument();
    expect(screen.queryByText('Street light broken')).not.toBeInTheDocument();
  });
});
