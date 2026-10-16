import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ComplaintDetailPage } from '../pages/ComplaintDetailPage';
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

describe('ComplaintDetailPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders full complaint details, StatusBadge, and LifecycleStepper', async () => {
    const mockComplaint = {
      _id: '670c538260ab55761a29381f',
      complaintNumber: 'CIV-TEST-777',
      title: 'Garbage dump accumulating near municipal school',
      description: 'Solid waste is not being cleared by PMC sanitation trucks for over a week.',
      category: 'Solid Waste & Garbage',
      location: {
        address: 'Opposite PMC School #14, Yerwada, Pune',
        ward: 'Ward 13 - Yerwada / Kalas / Dhanori',
        latitude: 18.5529,
        longitude: 73.8797,
      },
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      createdAt: '2026-10-14T09:30:00Z',
      updatedAt: '2026-10-15T14:00:00Z',
    };

    complaintApi.getComplaintById.mockResolvedValueOnce({
      success: true,
      data: { complaint: mockComplaint },
    });

    render(
      <MemoryRouter initialEntries={['/complaints/670c538260ab55761a29381f']}>
        <Routes>
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Garbage dump accumulating near municipal school'),
      ).toBeInTheDocument();
    });

    expect(screen.getAllByText('CIV-TEST-777').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Solid waste is not being cleared/i)).toBeInTheDocument();
    expect(screen.getByText('Solid Waste & Garbage')).toBeInTheDocument();
    expect(screen.getByText(/Opposite PMC School #14/i)).toBeInTheDocument();
    expect(screen.getByText(/Ward 13 - Yerwada \/ Kalas \/ Dhanori/i)).toBeInTheDocument();
    expect(screen.getByText(/HIGH Priority/i)).toBeInTheDocument();

    // Verify StatusBadge
    const badge = screen.getByRole('status', { name: /Status: In Progress/i });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-color', 'yellow');

    // Verify LifecycleStepper rendered and active
    const stepperNav = screen.getByRole('navigation', { name: /Complaint Lifecycle Progress/i });
    expect(stepperNav).toBeInTheDocument();
    expect(screen.getByText('Grievance Resolution Progress')).toBeInTheDocument();
  });

  it('renders not found / error view when complaint does not exist', async () => {
    complaintApi.getComplaintById.mockRejectedValueOnce(
      new Error('Complaint not found.'),
    );

    render(
      <MemoryRouter initialEntries={['/complaints/nonexistent123']}>
        <Routes>
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Complaint Not Found')).toBeInTheDocument();
    });

    expect(screen.getByText('Complaint not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Return to My Complaints/i })).toBeInTheDocument();
  });

  it('refreshes complaint status when Refresh Status button is clicked', async () => {
    const user = userEvent.setup();

    const mockInitial = {
      _id: '670c538260ab55761a29381f',
      complaintNumber: 'CIV-TEST-777',
      title: 'Water pipe leak',
      description: 'Water spraying everywhere.',
      category: 'Water Supply',
      status: 'ASSIGNED',
    };

    const mockUpdated = {
      ...mockInitial,
      status: 'RESOLVED',
    };

    complaintApi.getComplaintById
      .mockResolvedValueOnce({
        success: true,
        data: { complaint: mockInitial },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { complaint: mockUpdated },
      });

    render(
      <MemoryRouter initialEntries={['/complaints/670c538260ab55761a29381f']}>
        <Routes>
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      const badge = screen.getByRole('status', { name: /Status: Assigned/i });
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-color', 'orange');
    });

    const refreshBtn = screen.getByRole('button', { name: /Refresh complaint status/i });
    await user.click(refreshBtn);

    await waitFor(() => {
      const badge = screen.getByRole('status', { name: /Status: Resolved/i });
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-color', 'green');
    });

    expect(complaintApi.getComplaintById).toHaveBeenCalledTimes(2);
  });
});
