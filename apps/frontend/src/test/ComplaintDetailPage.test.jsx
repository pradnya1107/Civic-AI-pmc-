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

  it('renders direct office information, officer details with privacy protection and without exposing private numbers or raw IDs', async () => {
    const mockComplaint = {
      _id: '6ad5f1493efc170cf99ccc47',
      complaintNumber: 'CIV-TEST-888',
      title: 'Pothole on JM Road',
      description: 'Pothole opened up after excavation.',
      category: 'Roads & Potholes',
      status: 'ASSIGNED',
      location: {
        address: 'Jangali Maharaj Road, Shivajinagar, Pune',
        ward: 'Ward 1 - Shivajinagar / Ghole Road',
      },
      departmentId: {
        _id: '6ad0cefbbc585e29734df5f0',
        name: 'Roads & Infrastructure Department',
        contactNumber: '020-25501000',
        officialEmail: 'roads@punecorporation.org',
      },
      assignedOfficer: {
        name: 'Suresh Patil',
        designation: 'Senior Road Maintenance Engineer',
        phone: '+91 98220 12345',
        assignedAt: '2026-10-20T10:00:00Z',
      },
    };

    complaintApi.getComplaintById.mockResolvedValueOnce({
      success: true,
      data: { complaint: mockComplaint },
    });

    render(
      <MemoryRouter initialEntries={['/complaints/6ad5f1493efc170cf99ccc47']}>
        <Routes>
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Officer Suresh Patil')).toBeInTheDocument();
    });

    // Verify Assigned Municipal Office card is removed as requested
    expect(screen.queryByText(/Assigned Municipal Office/i)).not.toBeInTheDocument();

    // Verify officer details are displayed
    expect(screen.getByText('Senior Road Maintenance Engineer')).toBeInTheDocument();
    expect(screen.getByText(/Active Field Assignment/i)).toBeInTheDocument();
    expect(screen.getByText(/Staff Badge ID:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/020-25501000/).length).toBeGreaterThanOrEqual(1);

    // CRITICAL: Verify private personal phone number is NOT shown to citizen
    expect(screen.queryByText('+91 98220 12345')).not.toBeInTheDocument();

    // Verify privacy shield notice is prominently displayed to citizen
    expect(screen.getByText(/Official Municipal Contact Only/i)).toBeInTheDocument();
    expect(screen.getByText(/personal mobile numbers and private contact details of field staff are protected/i)).toBeInTheDocument();

    // Verify raw MongoDB IDs are NOT visible to the citizen
    expect(screen.queryByText(/Department ID:/i)).not.toBeInTheDocument();
    expect(screen.queryByText('6ad0cefbbc585e29734df5f0')).not.toBeInTheDocument();
  });

  it('sanitizes administrative account names into official designated municipal field engineer', async () => {
    const mockComplaint = {
      _id: '6ad5f1493efc170cf99ccc49',
      complaintNumber: 'CIV-TEST-890',
      title: 'Pothole on FC Road',
      description: 'Pothole on FC Road.',
      category: 'Roads & Potholes',
      status: 'IN_PROGRESS',
      location: {
        address: 'FC Road, Shivajinagar, Pune',
        ward: 'Ward 1 - Shivajinagar / Ghole Road',
      },
      assignedOfficer: {
        name: 'Roads Department Admin',
        designation: 'Lead Department Officer',
        phone: '9822014521',
      },
    };

    complaintApi.getComplaintById.mockResolvedValueOnce({
      success: true,
      data: { complaint: mockComplaint },
    });

    render(
      <MemoryRouter initialEntries={['/complaints/6ad5f1493efc170cf99ccc49']}>
        <Routes>
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Internal backend admin name must be sanitized to real municipal officer
      expect(screen.getByText('Officer Ramesh Patil')).toBeInTheDocument();
    });

    // Admin role label should be sanitized
    expect(screen.queryByText('Roads Department Admin')).not.toBeInTheDocument();
    // Private mobile number must NOT be revealed to citizen
    expect(screen.queryByText('9822014521')).not.toBeInTheDocument();
    // Assigned Municipal Office card must NOT be present
    expect(screen.queryByText(/Assigned Municipal Office/i)).not.toBeInTheDocument();
  });

  it('renders awaiting officer assignment state with PMC helpline when officer is unassigned', async () => {
    const mockComplaint = {
      _id: '6ad5f1493efc170cf99ccc48',
      complaintNumber: 'CIV-TEST-889',
      title: 'Broken streetlight',
      description: 'Streetlight pole not functioning.',
      category: 'Street Lighting',
      status: 'UNDER_REVIEW',
      departmentId: '6ad0cefbbc585e29734df5f0', // Unpopulated raw string from DB
    };

    complaintApi.getComplaintById.mockResolvedValueOnce({
      success: true,
      data: { complaint: mockComplaint },
    });

    render(
      <MemoryRouter initialEntries={['/complaints/6ad5f1493efc170cf99ccc48']}>
        <Routes>
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Awaiting Field Officer Assignment')).toBeInTheDocument();
    });

    expect(screen.getByText('1800-1030-222')).toBeInTheDocument();
    expect(screen.queryByText(/Department ID:/i)).not.toBeInTheDocument();
    expect(screen.queryByText('6ad0cefbbc585e29734df5f0')).not.toBeInTheDocument();
  });
});
