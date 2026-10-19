import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { DepartmentProtectedRoute } from '../components/DepartmentProtectedRoute';
import { DepartmentDashboardPage } from '../pages/department/DepartmentDashboardPage';
import { DepartmentComplaintsPage } from '../pages/department/DepartmentComplaintsPage';
import { DepartmentVerificationPage } from '../pages/department/DepartmentVerificationPage';
import { departmentAdminApi } from '../services/api';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    departmentAdminApi: {
      getMe: vi.fn(),
      getDashboard: vi.fn(),
      getAnalytics: vi.fn(),
      getComplaints: vi.fn(),
      getComplaintById: vi.fn(),
      updateComplaintStatus: vi.fn(),
      updateComplaintPriority: vi.fn(),
      assignOfficer: vi.fn(),
      addInternalNote: vi.fn(),
      verifyResolution: vi.fn(),
      getOfficers: vi.fn(),
      createOfficer: vi.fn(),
      exportComplaintsCsv: vi.fn(),
    },
  };
});

describe('Department Admin Dashboard & Modules', () => {
  const mockDeptAdminUser = {
    id: 'dept-admin-01',
    fullName: 'Roads Department Admin',
    name: 'Roads Department Admin',
    email: 'roads.demo@civicai.local',
    role: 'DEPARTMENT_ADMIN',
    departmentId: 'dept-roads-123',
    departmentName: 'Roads Department',
  };

  const mockDashboardData = {
    department: {
      id: 'dept-roads-123',
      name: 'Roads Department',
      slug: 'roads',
    },
    counts: {
      total: 24,
      pending: 5,
      inProgress: 12,
      resolved: 6,
      rejected: 1,
      overdue: 3,
      resolutionRate: 25,
    },
    priorityQueue: [
      {
        id: 'comp-01',
        complaintNumber: 'PMC-2026-00101',
        title: 'Dangerous Pothole on FC Road',
        category: 'Roads & Potholes',
        priority: 'CRITICAL',
        status: 'IN_PROGRESS',
        isOverdue: true,
        location: { address: 'FC Road, Pune', ward: 'Ward 1' },
        createdAt: new Date().toISOString(),
      },
    ],
    recentActivity: [
      {
        id: 'act-01',
        action: 'STATUS_UPDATE',
        performedBy: 'Roads Department Admin',
        metadata: { complaintNumber: 'PMC-2026-00101', notes: 'Inspection scheduled' },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const mockAnalyticsData = {
    receivedVsResolved: [
      { date: '2026-10-17', received: 4, resolved: 2 },
      { date: '2026-10-18', received: 3, resolved: 3 },
    ],
    categoryDistribution: [{ category: 'Roads & Potholes', count: 24, percentage: 100 }],
    statusDistribution: { SUBMITTED: 2, UNDER_REVIEW: 3, IN_PROGRESS: 12, RESOLVED: 6, REJECTED: 1 },
    avgHandlingTimeHours: 18,
    overdueCount: 3,
    totalCount: 24,
    resolvedCount: 6,
    resolutionRate: 25,
  };

  const mockOfficersList = [
    {
      id: 'officer-01',
      name: 'Officer Ramesh Patil',
      designation: 'Senior Road Inspector',
      phone: '9822014521',
      email: 'ramesh.patil@pmc.gov.in',
      activeCount: 3,
      completedCount: 8,
      availability: 'AVAILABLE',
      resolutionRate: 72,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    departmentAdminApi.getDashboard.mockResolvedValue({ success: true, data: mockDashboardData });
    departmentAdminApi.getAnalytics.mockResolvedValue({ success: true, data: mockAnalyticsData });
    departmentAdminApi.getOfficers.mockResolvedValue({ success: true, data: { officers: mockOfficersList } });
  });

  const renderWithAuth = (ui, authValue) => {
    return render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/department/dashboard']}>
          {ui}
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  describe('1. DepartmentProtectedRoute Security Guard', () => {
    it('redirects unauthenticated visitors to /login', () => {
      render(
        <AuthContext.Provider value={{ isAuthenticated: false, isLoading: false, user: null }}>
          <MemoryRouter initialEntries={['/department/dashboard']}>
            <Routes>
              <Route
                path="/department/dashboard"
                element={
                  <DepartmentProtectedRoute>
                    <div>Secret Department Content</div>
                  </DepartmentProtectedRoute>
                }
              />
              <Route path="/login" element={<div>Login Page Screen</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(screen.getByText('Login Page Screen')).toBeInTheDocument();
      expect(screen.queryByText('Secret Department Content')).not.toBeInTheDocument();
    });

    it('redirects regular citizen users to /dashboard', () => {
      render(
        <AuthContext.Provider
          value={{
            isAuthenticated: true,
            isLoading: false,
            user: { role: 'CITIZEN', fullName: 'Citizen John' },
          }}
        >
          <MemoryRouter initialEntries={['/department/dashboard']}>
            <Routes>
              <Route
                path="/department/dashboard"
                element={
                  <DepartmentProtectedRoute>
                    <div>Secret Department Content</div>
                  </DepartmentProtectedRoute>
                }
              />
              <Route path="/dashboard" element={<div>Citizen Portal Dashboard</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(screen.getByText('Citizen Portal Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Secret Department Content')).not.toBeInTheDocument();
    });

    it('allows authorized DEPARTMENT_ADMIN to view department pages', () => {
      render(
        <AuthContext.Provider
          value={{
            isAuthenticated: true,
            isLoading: false,
            user: mockDeptAdminUser,
          }}
        >
          <MemoryRouter initialEntries={['/department/dashboard']}>
            <DepartmentProtectedRoute>
              <div>Authorized Department Console</div>
            </DepartmentProtectedRoute>
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(screen.getByText('Authorized Department Console')).toBeInTheDocument();
    });
  });

  describe('2. DepartmentDashboardPage Overview', () => {
    it('renders welcome hero with administrator name, department badge, and authorized KPI cards', async () => {
      renderWithAuth(<DepartmentDashboardPage />, {
        isAuthenticated: true,
        isLoading: false,
        user: mockDeptAdminUser,
      });

      expect(await screen.findByText(/Welcome back, Roads Department Admin/i)).toBeInTheDocument();
      expect(screen.getAllByText('Roads Department')[0]).toBeInTheDocument();

      // Verify KPI values rendered from mockDashboardData
      expect(screen.getByText('24')).toBeInTheDocument(); // Total
      expect(screen.getByText('5')).toBeInTheDocument(); // Pending
      expect(screen.getByText('12')).toBeInTheDocument(); // In Progress
      expect(screen.getAllByText('3')[0]).toBeInTheDocument(); // Overdue
      expect(screen.getAllByText('6')[0]).toBeInTheDocument(); // Resolved
      expect(screen.getByText('25%')).toBeInTheDocument(); // Resolution Rate

      // Verify Priority Queue item
      expect(screen.getByText('Dangerous Pothole on FC Road')).toBeInTheDocument();
      expect(screen.getByText('PMC-2026-00101')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('OVERDUE')).toBeInTheDocument();

      // Verify Recent Activity
      expect(screen.getByText(/STATUS UPDATE/i)).toBeInTheDocument();
    });
  });

  describe('3. DepartmentComplaintsPage Management & Actions', () => {
    const mockComplaintsList = [
      {
        _id: 'c-101',
        complaintNumber: 'PMC-2026-00101',
        title: 'Dangerous Pothole on FC Road',
        category: 'Roads & Potholes',
        location: { address: 'FC Road, Pune', ward: 'Ward 1' },
        priority: 'CRITICAL',
        status: 'IN_PROGRESS',
        slaDeadline: new Date(Date.now() - 3600000).toISOString(),
        assignedOfficer: { name: 'Officer Ramesh Patil', designation: 'Senior Road Inspector' },
        imageUrl: 'https://example.com/pothole.jpg',
        createdAt: new Date().toISOString(),
      },
    ];

    beforeEach(() => {
      departmentAdminApi.getComplaints.mockResolvedValue({
        success: true,
        data: {
          complaints: mockComplaintsList,
          pagination: { page: 1, limit: 10, total: 1, pages: 1 },
          metrics: { total: 1, inProgress: 1, overdue: 1 },
        },
      });
    });

    it('renders complaint table with search, columns, and opens Assign Officer modal', async () => {
      const user = userEvent.setup();

      renderWithAuth(<DepartmentComplaintsPage />, {
        isAuthenticated: true,
        isLoading: false,
        user: mockDeptAdminUser,
      });

      expect(await screen.findByText('Dangerous Pothole on FC Road')).toBeInTheDocument();
      expect(screen.getByText('PMC-2026-00101')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getAllByText('Officer Ramesh Patil')[0]).toBeInTheDocument();

      // Click "Officer" action button to open assign modal
      const officerActionBtn = screen.getByTitle('Assign Officer');
      await user.click(officerActionBtn);

      expect(await screen.findByText('Assign Field Officer')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirm Assignment/i })).toBeInTheDocument();
    });

    it('opens Update Status modal and submits status transition', async () => {
      const user = userEvent.setup();
      departmentAdminApi.updateComplaintStatus.mockResolvedValueOnce({
        success: true,
        data: { complaint: { ...mockComplaintsList[0], status: 'RESOLVED' } },
      });

      renderWithAuth(<DepartmentComplaintsPage />, {
        isAuthenticated: true,
        isLoading: false,
        user: mockDeptAdminUser,
      });

      expect(await screen.findByText('Dangerous Pothole on FC Road')).toBeInTheDocument();

      const statusActionBtn = screen.getByTitle('Update Status');
      await user.click(statusActionBtn);

      expect(await screen.findByText('Update Complaint Status')).toBeInTheDocument();
      const updateBtn = screen.getByRole('button', { name: /^Update Status$/i });
      await user.click(updateBtn);

      await waitFor(() => {
        expect(departmentAdminApi.updateComplaintStatus).toHaveBeenCalled();
      });
    });
  });

  describe('4. DepartmentVerificationPage Quality Audit', () => {
    const mockVerificationList = [
      {
        _id: 'c-106',
        complaintNumber: 'PMC-2026-00106',
        title: 'Large Cavity near Sambhaji Park',
        category: 'Roads & Potholes',
        location: { address: 'JM Road, Pune', ward: 'Ward 1' },
        status: 'RESOLVED',
        imageUrl: 'https://example.com/before.jpg',
        resolutionImageUrl: 'https://example.com/after.jpg',
        resolutionNotes: 'Bituminous cold mix compaction completed.',
        aiAnalysis: {
          resolutionVerdict: 'RESOLVED_VERIFIED',
          resolutionConfidence: 94,
        },
      },
    ];

    beforeEach(() => {
      departmentAdminApi.getComplaints.mockResolvedValue({
        success: true,
        data: { complaints: mockVerificationList },
      });
    });

    it('renders before-and-after photo evidence side by side and provides audit action', async () => {
      const user = userEvent.setup();

      renderWithAuth(<DepartmentVerificationPage />, {
        isAuthenticated: true,
        isLoading: false,
        user: mockDeptAdminUser,
      });

      expect(await screen.findByText('Large Cavity near Sambhaji Park')).toBeInTheDocument();
      expect(screen.getByText(/BEFORE \(Initial Grievance\)/i)).toBeInTheDocument();
      expect(screen.getByText(/AFTER \(Field Repair Completion\)/i)).toBeInTheDocument();
      expect(screen.getByText(/RESOLVED VERIFIED/i)).toBeInTheDocument();

      const auditBtn = screen.getByRole('button', { name: /Audit & Verify/i });
      await user.click(auditBtn);

      expect(await screen.findByText(/Audit Resolution: #PMC-2026-00106/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Approve \(Mark Resolved\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reject \(Re-open Work\)/i })).toBeInTheDocument();
    });
  });
});
