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
import { DepartmentSidebar } from '../components/department/DepartmentSidebar';
import { DepartmentSettingsPage } from '../pages/department/DepartmentSettingsPage';
import { DepartmentAnalyticsPage } from '../pages/department/DepartmentAnalyticsPage';
import { DepartmentOfficersPage } from '../pages/department/DepartmentOfficersPage';
import { DepartmentComplaintDetailPage } from '../pages/department/DepartmentComplaintDetailPage';
import { departmentAdminApi, aiApi } from '../services/api';

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
      resolveComplaint: vi.fn(),
      updateComplaintPriority: vi.fn(),
      assignOfficer: vi.fn(),
      addInternalNote: vi.fn(),
      verifyResolution: vi.fn(),
      getOfficers: vi.fn(),
      createOfficer: vi.fn(),
      exportComplaintsCsv: vi.fn(),
    },
    aiApi: {
      verifyResolution: vi.fn(),
      classifyImage: vi.fn(),
      prioritizeComplaint: vi.fn(),
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
      expect(screen.getAllByText('Ramesh Patil')[0]).toBeInTheDocument();

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

  describe('5. DepartmentSidebar & DepartmentSettings Cleanups', () => {
    it('DepartmentSidebar renders Overview and other core modules, and removes Assigned, Priority, Notifications, Settings, Help, and Sign Out', () => {
      renderWithAuth(
        <DepartmentSidebar
          isCollapsed={false}
          onToggleCollapse={vi.fn()}
          isMobileOpen={false}
          onCloseMobile={vi.fn()}
          departmentName="Roads Department"
        />,
        {
          isAuthenticated: true,
          isLoading: false,
          user: mockDeptAdminUser,
        }
      );

      // Retained items (including Overview)
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
      expect(screen.getByText('Complaint Management')).toBeInTheDocument();
      expect(screen.getByText('Officer / Field Workers')).toBeInTheDocument();
      expect(screen.getByText('Resolution Verification')).toBeInTheDocument();
      expect(screen.getByText('Department Analytics')).toBeInTheDocument();

      // Removed items
      expect(screen.queryByText('Assigned Complaints')).not.toBeInTheDocument();
      expect(screen.queryByText('Priority & Overdue Cases')).not.toBeInTheDocument();
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
      expect(screen.queryByText('Profile & Settings')).not.toBeInTheDocument();
      expect(screen.queryByText('Help & Support')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Sign out of Department Admin Portal/i })).not.toBeInTheDocument();
      expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
    });

    it('DepartmentSettingsPage does not contain Interface Appearance option', () => {
      renderWithAuth(<DepartmentSettingsPage />, {
        isAuthenticated: true,
        isLoading: false,
        user: mockDeptAdminUser,
      });

      expect(screen.getByText('Profile & Department Settings')).toBeInTheDocument();
      expect(screen.getByText('Administrator Identity')).toBeInTheDocument();
      expect(screen.getByText('Service Level Agreement (SLA) Targets')).toBeInTheDocument();
      expect(screen.queryByText(/Interface Appearance/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Switch to Light/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Switch to Dark/i)).not.toBeInTheDocument();
    });

    it('DepartmentAnalyticsPage does not contain Category Distribution', async () => {
      renderWithAuth(<DepartmentAnalyticsPage />, {
        isAuthenticated: true,
        isLoading: false,
        user: mockDeptAdminUser,
      });

      expect(await screen.findByText(/Daily Complaint Inflow vs Resolution/i)).toBeInTheDocument();
      expect(screen.queryByText(/Category Distribution/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Breakdown of issue types within department/i)).not.toBeInTheDocument();
    });

    it('Assign Field Officer modal removes AVAILABLE text and excludes department admin', async () => {
      const user = userEvent.setup();
      departmentAdminApi.getComplaints.mockResolvedValueOnce({
        success: true,
        data: {
          complaints: [
            {
              _id: 'c-101',
              complaintNumber: 'PMC-2026-00101',
              title: 'Dangerous Pothole on FC Road',
              category: 'Roads & Potholes',
              location: { address: 'FC Road, Pune', ward: 'Ward 1' },
              priority: 'CRITICAL',
              status: 'IN_PROGRESS',
              slaDeadline: new Date(Date.now() - 3600000).toISOString(),
              assignedOfficer: null,
              imageUrl: 'https://example.com/pothole.jpg',
              createdAt: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, pages: 1 },
          metrics: { total: 1, inProgress: 1, overdue: 1 },
        },
      });
      const mixedOfficers = [
        {
          id: 'admin-01',
          name: 'Roads Department Admin',
          designation: 'Lead Department Officer',
          availability: 'AVAILABLE',
          activeCount: 0,
        },
        {
          id: 'officer-01',
          name: 'Officer Ramesh Patil',
          designation: 'Senior Field Officer',
          availability: 'AVAILABLE',
          activeCount: 0,
        },
      ];
      departmentAdminApi.getOfficers.mockResolvedValueOnce({
        success: true,
        data: { officers: mixedOfficers },
      });

      renderWithAuth(<DepartmentComplaintsPage />, {
        isAuthenticated: true,
        isLoading: false,
        user: mockDeptAdminUser,
      });

      expect(await screen.findByText('Dangerous Pothole on FC Road')).toBeInTheDocument();

      const officerActionBtn = screen.getByTitle('Assign Officer');
      await user.click(officerActionBtn);

      expect(await screen.findByText('Assign Field Officer')).toBeInTheDocument();

      // Check dropdown options
      const officerSelect = screen.getByLabelText(/Select Field Officer/i);
      expect(officerSelect).toBeInTheDocument();

      // Excludes Roads Department Admin
      expect(screen.queryByText(/Roads Department Admin/i)).not.toBeInTheDocument();

      // Formatted as "Ramesh Patil (Senior Field Officer)" without "Officer" prefix or "AVAILABLE" text
      expect(screen.getByText('Ramesh Patil (Senior Field Officer)')).toBeInTheDocument();
      expect(screen.queryByText(/AVAILABLE/i)).not.toBeInTheDocument();
    });

    it('DepartmentOfficersPage removes Officer prefix before officer name and uses proper avatar initial', async () => {
      departmentAdminApi.getOfficers.mockResolvedValueOnce({
        success: true,
        data: {
          officers: [
            {
              id: 'officer-01',
              name: 'Officer Ramesh Patil',
              designation: 'Senior Road Inspector',
              phone: '9822014521',
              email: 'ramesh.patil@civicai.local',
              activeCount: 0,
              completedCount: 5,
              availability: 'AVAILABLE',
            },
          ],
        },
      });

      renderWithAuth(<DepartmentOfficersPage />, {
        isAuthenticated: true,
        isLoading: false,
        user: mockDeptAdminUser,
      });

      expect(await screen.findByText('Ramesh Patil')).toBeInTheDocument();
      expect(screen.queryByText('Officer Ramesh Patil')).not.toBeInTheDocument();
      expect(screen.getByText('R')).toBeInTheDocument();
    });

    it('Only TopNav contains the refresh button, in-page refresh buttons are removed, and top bar refresh re-fetches tab data', async () => {
      // 1. DepartmentDashboardPage has NO in-page refresh button, but re-fetches on lastRefreshed
      const { unmount: unmountDash, rerender: rerenderDash } = renderWithAuth(
        <DepartmentDashboardPage lastRefreshed={new Date('2026-10-23T00:00:00Z')} />,
        { isAuthenticated: true, isLoading: false, user: mockDeptAdminUser }
      );
      expect(screen.queryByTitle('Refresh Dashboard Overview')).not.toBeInTheDocument();
      departmentAdminApi.getDashboard.mockClear();
      rerenderDash(
        <AuthContext.Provider value={{ isAuthenticated: true, isLoading: false, user: mockDeptAdminUser }}>
          <MemoryRouter initialEntries={['/department/dashboard']}>
            <DepartmentDashboardPage lastRefreshed={new Date('2026-10-23T00:01:00Z')} />
          </MemoryRouter>
        </AuthContext.Provider>
      );
      expect(departmentAdminApi.getDashboard).toHaveBeenCalled();
      unmountDash();

      // 2. DepartmentOfficersPage has NO in-page refresh button
      const { unmount: unmountOfficers } = renderWithAuth(
        <DepartmentOfficersPage />,
        { isAuthenticated: true, isLoading: false, user: mockDeptAdminUser }
      );
      expect(screen.queryByTitle('Refresh Field Officers Directory')).not.toBeInTheDocument();
      unmountOfficers();

      // 3. DepartmentVerificationPage has NO in-page refresh button
      const { unmount: unmountVerif } = renderWithAuth(
        <DepartmentVerificationPage />,
        { isAuthenticated: true, isLoading: false, user: mockDeptAdminUser }
      );
      expect(screen.queryByTitle('Refresh Resolution Verification List')).not.toBeInTheDocument();
      unmountVerif();

      // 4. DepartmentAnalyticsPage has NO in-page refresh button
      const { unmount: unmountAnalytics } = renderWithAuth(
        <DepartmentAnalyticsPage />,
        { isAuthenticated: true, isLoading: false, user: mockDeptAdminUser }
      );
      expect(screen.queryByTitle('Refresh Analytics Metrics')).not.toBeInTheDocument();
      unmountAnalytics();

      // 5. DepartmentComplaintsPage has NO in-page refresh button
      const { unmount: unmountComplaints } = renderWithAuth(
        <DepartmentComplaintsPage />,
        { isAuthenticated: true, isLoading: false, user: mockDeptAdminUser }
      );
      expect(screen.queryByTitle('Refresh Complaints List')).not.toBeInTheDocument();
      unmountComplaints();
    });

    it('Complete Issue with Photo modal allows uploading photo and submitting resolution with AI scan', async () => {
      const user = userEvent.setup();
      const mockComplaintDetail = {
        id: 'comp-101',
        _id: 'comp-101',
        complaintNumber: 'PMC-ROADS-2026-101',
        title: 'Dangerous Pothole on Karve Road',
        description: 'Large pothole in middle of lane.',
        category: 'Roads & Potholes',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
        assignedOfficer: { name: 'Ramesh Patil', designation: 'Senior Field Officer' },
        createdAt: '2026-10-20T10:00:00Z',
      };

      departmentAdminApi.getComplaintById.mockResolvedValue({
        data: {
          complaint: mockComplaintDetail,
          auditLogs: [],
        },
      });

      departmentAdminApi.resolveComplaint.mockResolvedValue({
        success: true,
        data: {
          complaint: {
            ...mockComplaintDetail,
            status: 'RESOLVED',
            resolutionImageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800',
            resolutionNotes: 'Filled and leveled with hot asphalt.',
            resolutionAuthenticity: {
              isAiGenerated: false,
              assessment: 'AUTHENTIC_REAL_PHOTO',
              confidence: 'HIGH',
              explanation: 'Real camera optical capture with authentic asphalt and physical repair textures.',
            },
          },
        },
      });

      aiApi.verifyResolution.mockResolvedValue({
        data: {
          authenticityAssessment: {
            isAiGenerated: false,
            possibleAiGenerated: false,
            isRelevantRepair: true,
            isAnotherUnrelatedPhoto: false,
            assessment: 'AUTHENTIC_REAL_PHOTO',
            confidence: 'HIGH',
            indicators: ['Natural optical camera sensor noise', 'Authentic manual bitumen trowel marks'],
            explanation: 'AI analysis confirms authentic on-site camera capture with real aggregate.',
          },
        },
      });

      render(
        <AuthContext.Provider value={{ isAuthenticated: true, isLoading: false, user: mockDeptAdminUser }}>
          <MemoryRouter initialEntries={['/department/complaints/comp-101']}>
            <Routes>
              <Route path="/department/complaints/:id" element={<DepartmentComplaintDetailPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );

      // Verify page loaded
      expect(await screen.findByText('Dangerous Pothole on Karve Road')).toBeInTheDocument();

      // Click "Complete Issue & Upload Photo" button
      const completeBtn = screen.getByRole('button', { name: /Complete Issue & Upload Photo/i });
      expect(completeBtn).toBeInTheDocument();
      await user.click(completeBtn);

      // Verify modal opened
      expect(screen.getByText('Complete Issue & Submit Repair Photo')).toBeInTheDocument();
      expect(screen.getByText(/Civic AI Vision will automatically audit the image to verify whether it is an/i)).toBeInTheDocument();

      // Type real photo URL
      const photoInput = screen.getByPlaceholderText(/https:\/\/... or paste image data URL/i);
      await user.type(photoInput, 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800');

      // Click "Scan Photo with AI"
      const scanBtn = screen.getByRole('button', { name: /Scan Photo with AI/i });
      await user.click(scanBtn);

      // Verify authentic badge shows
      expect(await screen.findByText(/Authentic Real Photo Verified \(Normal Camera\)/i)).toBeInTheDocument();

      // Enter remediation notes
      const notesInput = screen.getByPlaceholderText(/Describe repair actions taken/i);
      await user.type(notesInput, 'Filled and leveled with hot asphalt.');

      // Submit resolution
      const submitBtn = screen.getByRole('button', { name: /Complete Issue & Submit Resolution/i });
      await user.click(submitBtn);

      // Verify resolveComplaint was called with photo and notes
      expect(departmentAdminApi.resolveComplaint).toHaveBeenCalledWith('comp-101', expect.objectContaining({
        resolutionImageUrl: expect.stringContaining('images.unsplash.com'),
      }));
    });

    it('blocks submission and displays AI warning when AI-generated photo is selected or scanned', async () => {
      const user = userEvent.setup();
      departmentAdminApi.getComplaintById.mockResolvedValueOnce({
        data: {
          complaint: {
            id: 'comp-102',
            _id: 'comp-102',
            complaintNumber: 'PMC-ROADS-2026-102',
            title: 'Damaged Divider',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            imageUrl: 'https://images.unsplash.com/photo-divider',
          },
          auditLogs: [],
        },
      });

      aiApi.verifyResolution.mockResolvedValueOnce({
        data: {
          authenticityAssessment: {
            isAiGenerated: true,
            possibleAiGenerated: true,
            isRelevantRepair: false,
            isAnotherUnrelatedPhoto: false,
            assessment: 'POSSIBLE_AI_GENERATED',
            confidence: 'HIGH',
            indicators: ['Synthetic generative diffusion texture patterns detected'],
            explanation: 'Flagged as AI-generated / digitally fabricated rather than an authentic on-site camera capture.',
          },
        },
      });

      render(
        <AuthContext.Provider value={{ isAuthenticated: true, isLoading: false, user: mockDeptAdminUser }}>
          <MemoryRouter initialEntries={['/department/complaints/comp-102']}>
            <Routes>
              <Route path="/department/complaints/:id" element={<DepartmentComplaintDetailPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(await screen.findByText('Damaged Divider')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Complete Issue & Upload Photo/i }));

      const photoInput = screen.getByPlaceholderText(/https:\/\/... or paste image data URL/i);
      await user.type(photoInput, 'https://images.unsplash.com/photo-ai-gen-synthetic-sample?w=800');

      // Click "Scan Photo with AI"
      const scanBtn = screen.getByRole('button', { name: /Scan Photo with AI/i });
      await user.click(scanBtn);

      // Verify AI-Generated warning is displayed below the photo
      expect(await screen.findByText(/AI-Created \/ Synthetic Image Detected/i)).toBeInTheDocument();
      expect(screen.getByText(/AI-generated photos are not accepted\. Real camera photo required\./i)).toBeInTheDocument();

      // Verify submit button is disabled with "Submission Blocked"
      const blockedBtn = screen.getByRole('button', { name: /Submission Blocked \(AI Photo Detected\)/i });
      expect(blockedBtn).toBeInTheDocument();
      expect(blockedBtn).toBeDisabled();

      // resolveComplaint must NOT have been called
      expect(departmentAdminApi.resolveComplaint).not.toHaveBeenCalled();
    });

    it('allows submission when an authentic real camera photo is scanned, without unrelated blocking', async () => {
      const user = userEvent.setup();
      departmentAdminApi.getComplaintById.mockResolvedValueOnce({
        data: {
          complaint: {
            id: 'comp-103',
            _id: 'comp-103',
            complaintNumber: 'PMC-ROADS-2026-103',
            title: 'Broken Manhole Cover',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            imageUrl: 'https://images.unsplash.com/photo-manhole',
          },
          auditLogs: [],
        },
      });

      aiApi.verifyResolution.mockResolvedValueOnce({
        data: {
          authenticityAssessment: {
            isAiGenerated: false,
            possibleAiGenerated: false,
            isRelevantRepair: true,
            isAnotherUnrelatedPhoto: false,
            assessment: 'AUTHENTIC_REAL_PHOTO',
            confidence: 'HIGH',
            indicators: ['Natural optical camera sensor noise observed', 'Physical repair aggregate verified'],
            explanation: 'Verified genuine camera photograph of on-site repair work.',
          },
        },
      });

      render(
        <AuthContext.Provider value={{ isAuthenticated: true, isLoading: false, user: mockDeptAdminUser }}>
          <MemoryRouter initialEntries={['/department/complaints/comp-103']}>
            <Routes>
              <Route path="/department/complaints/:id" element={<DepartmentComplaintDetailPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(await screen.findByText('Broken Manhole Cover')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Complete Issue & Upload Photo/i }));

      const photoInput = screen.getByPlaceholderText(/https:\/\/... or paste image data URL/i);
      await user.type(photoInput, 'https://images.unsplash.com/photo-real-camera-repair');

      const scanBtn = screen.getByRole('button', { name: /Scan Photo with AI/i });
      await user.click(scanBtn);

      expect(await screen.findByText(/Authentic Real Photo Verified \(Normal Camera\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Verified authentic on-site evidence\. File can now be submitted\./i)).toBeInTheDocument();

      // Submit button should be enabled for resolution
      const submitBtn = screen.getByRole('button', { name: /Complete Issue & Submit Resolution/i });
      expect(submitBtn).toBeInTheDocument();
    });

    it('renders AI Photo Authenticity verdict badge for real photo vs AI-generated photo', async () => {
      // 1. Complaint with REAL photo
      const realPhotoComplaint = {
        id: 'comp-real',
        _id: 'comp-real',
        complaintNumber: 'PMC-ROADS-2026-REAL',
        title: 'Repaired Pothole on JM Road',
        category: 'Roads & Potholes',
        status: 'RESOLVED',
        priority: 'HIGH',
        imageUrl: 'https://images.unsplash.com/photo-1',
        resolutionImageUrl: 'https://images.unsplash.com/photo-real-camera.jpg',
        resolutionNotes: 'Completed on-site repair.',
        resolutionAuthenticity: {
          isAiGenerated: false,
          assessment: 'AUTHENTIC_REAL_PHOTO',
          confidence: 'HIGH',
          indicators: ['Natural optical camera sensor noise', 'Authentic manual bitumen trowel marks'],
          explanation: 'AI analysis confirms authentic on-site camera capture with real aggregate.',
        },
      };

      departmentAdminApi.getComplaintById.mockResolvedValueOnce({
        data: { complaint: realPhotoComplaint, auditLogs: [] },
      });

      const { unmount: unmountReal } = render(
        <AuthContext.Provider value={{ isAuthenticated: true, isLoading: false, user: mockDeptAdminUser }}>
          <MemoryRouter initialEntries={['/department/complaints/comp-real']}>
            <Routes>
              <Route path="/department/complaints/:id" element={<DepartmentComplaintDetailPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(await screen.findByText(/Authentic Real Photo \(Normal Camera Capture\)/i)).toBeInTheDocument();
      expect(screen.getByText(/✓ AUTHENTIC REAL PHOTO/i)).toBeInTheDocument();
      expect(screen.getByText(/Authentic manual bitumen trowel marks/i)).toBeInTheDocument();
      unmountReal();

      // 2. Complaint with AI-GENERATED photo
      const aiPhotoComplaint = {
        id: 'comp-ai',
        _id: 'comp-ai',
        complaintNumber: 'PMC-ROADS-2026-AI',
        title: 'Suspicious AI Repair on FC Road',
        category: 'Roads & Potholes',
        status: 'RESOLVED',
        priority: 'MEDIUM',
        imageUrl: 'https://images.unsplash.com/photo-2',
        resolutionImageUrl: 'https://images.unsplash.com/photo-ai-generated-fake.jpg',
        resolutionNotes: 'Fabricated repair report.',
        resolutionAuthenticity: {
          isAiGenerated: true,
          assessment: 'POSSIBLE_AI_GENERATED',
          confidence: 'HIGH',
          indicators: ['Hyper-smooth synthetic textures', 'Absence of camera sensor grain'],
          explanation: 'AI forensic scan detected synthetic generative diffusion artifacts.',
        },
      };

      departmentAdminApi.getComplaintById.mockResolvedValueOnce({
        data: { complaint: aiPhotoComplaint, auditLogs: [] },
      });

      const { unmount: unmountAi } = render(
        <AuthContext.Provider value={{ isAuthenticated: true, isLoading: false, user: mockDeptAdminUser }}>
          <MemoryRouter initialEntries={['/department/complaints/comp-ai']}>
            <Routes>
              <Route path="/department/complaints/:id" element={<DepartmentComplaintDetailPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(await screen.findByText(/Likely AI-Generated \/ Synthetic Photo Detected/i)).toBeInTheDocument();
      expect(screen.getByText(/⚠️ AI-GENERATED SYNTHESIS/i)).toBeInTheDocument();
      expect(screen.getByText(/Supervisor Alert: This resolution evidence appears digitally fabricated/i)).toBeInTheDocument();
      unmountAi();
    });

    it('DepartmentVerificationPage displays AI Photo Authenticity verdict on repair photos', async () => {
      const verificationComplaints = [
        {
          id: 'verif-01',
          _id: 'verif-01',
          complaintNumber: 'PMC-VERIF-01',
          title: 'Asphalt Patch Repair Audit',
          category: 'Roads & Potholes',
          status: 'IN_PROGRESS',
          imageUrl: 'https://images.unsplash.com/before.jpg',
          resolutionImageUrl: 'https://images.unsplash.com/photo-ai-generated-test.jpg',
          resolutionNotes: 'Repair done.',
          resolutionAuthenticity: {
            isAiGenerated: true,
            assessment: 'POSSIBLE_AI_GENERATED',
            confidence: 'HIGH',
            explanation: 'Synthetic generative cues flagged. Require on-site verification.',
          },
        },
      ];

      departmentAdminApi.getComplaints.mockResolvedValue({
        data: { complaints: verificationComplaints },
      });

      render(
        <AuthContext.Provider value={{ isAuthenticated: true, isLoading: false, user: mockDeptAdminUser }}>
          <MemoryRouter initialEntries={['/department/verification']}>
            <Routes>
              <Route path="/department/verification" element={<DepartmentVerificationPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(await screen.findByText('Asphalt Patch Repair Audit')).toBeInTheDocument();
      expect(screen.getByText(/⚠️ AI-Generated Photo Detected/i)).toBeInTheDocument();
      expect(screen.getByText(/Photo Origin: Possible AI-Generated Image/i)).toBeInTheDocument();
    });
  });
});


