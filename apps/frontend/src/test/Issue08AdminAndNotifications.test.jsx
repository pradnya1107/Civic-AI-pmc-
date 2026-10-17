import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminProtectedRoute } from '../components/AdminProtectedRoute';
import { NotificationBell } from '../components/NotificationBell';
import { ComplaintRow } from '../components/admin/ComplaintRow';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminComplaintDetailPage } from '../pages/admin/AdminComplaintDetailPage';
import { AuthProvider } from '../context/AuthContext';
import { authApi, adminApi, notificationApi, departmentApi, TOKEN_STORAGE_KEY } from '../services/api';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    authApi: {
      login: vi.fn(),
      register: vi.fn(),
      getCurrentUser: vi.fn(),
      logout: vi.fn(),
    },
    adminApi: {
      getDashboard: vi.fn(),
      getComplaints: vi.fn(),
      getComplaintById: vi.fn(),
      updateComplaintStatus: vi.fn(),
      assignComplaintDepartment: vi.fn(),
      verifyComplaint: vi.fn(),
      getDepartmentAdmins: vi.fn(),
      getCitizens: vi.fn(),
    },
    notificationApi: {
      getNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    },
    departmentApi: {
      getDepartments: vi.fn(),
    },
  };
});

describe('ISSUE-08: Admin Dashboard UI and In-App Notification System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('1. AdminProtectedRoute Security', () => {
    it('Acceptance Criteria: Given a citizen token, when they try to access /admin/* routes, then they are redirected to /dashboard', async () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, 'mock-citizen-token');
      authApi.getCurrentUser.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: 'citizen-101',
            fullName: 'Ajay Kulkarni',
            role: 'CITIZEN',
          },
        },
      });

      render(
        <MemoryRouter initialEntries={['/admin/complaints']}>
          <AuthProvider>
            <Routes>
              <Route path="/dashboard" element={<div data-testid="citizen-dashboard">Citizen Dashboard</div>} />
              <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
              <Route
                path="/admin/*"
                element={
                  <AdminProtectedRoute>
                    <div data-testid="secret-admin-area">Admin Secret Portal</div>
                  </AdminProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      // Should redirect to /dashboard
      expect(await screen.findByTestId('citizen-dashboard')).toBeInTheDocument();
      expect(screen.queryByTestId('secret-admin-area')).not.toBeInTheDocument();
    });

    it('Redirects unauthenticated visitors attempting to access /admin to /login', async () => {
      authApi.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
              <Route
                path="/admin"
                element={
                  <AdminProtectedRoute>
                    <div data-testid="admin-panel">Admin Panel</div>
                  </AdminProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(await screen.findByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
    });

    it('Allows administrators with role ADMIN or SUPER_ADMIN to access /admin', async () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, 'mock-admin-token');
      authApi.getCurrentUser.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: 'admin-001',
            fullName: 'Super Admin Officer',
            role: 'SUPER_ADMIN',
          },
        },
      });

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <AuthProvider>
            <Routes>
              <Route
                path="/admin"
                element={
                  <AdminProtectedRoute>
                    <div data-testid="admin-panel">Admin Control Center</div>
                  </AdminProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(await screen.findByTestId('admin-panel')).toBeInTheDocument();
    });
  });

  describe('2. NotificationBell Component', () => {
    it('Acceptance Criteria: Given an admin updates a complaint status, when the citizen refreshes, then the notification bell count increments', async () => {
      // First fetch: 1 unread notification
      notificationApi.getNotifications.mockResolvedValueOnce({
        success: true,
        data: {
          notifications: [
            {
              id: 'notif-1',
              title: 'Complaint Submitted',
              message: 'Your complaint CIV-1001 was submitted.',
              readAt: null,
              isRead: false,
              complaintId: 'comp-1001',
            },
          ],
          unreadCount: 1,
        },
      });

      render(
        <MemoryRouter>
          <NotificationBell />
        </MemoryRouter>
      );

      const badge = await screen.findByText('1');
      expect(badge).toBeInTheDocument();

      // Second fetch (after admin updates status): 2 unread notifications
      notificationApi.getNotifications.mockResolvedValue({
        success: true,
        data: {
          notifications: [
            {
              id: 'notif-2',
              title: 'Complaint Status Update',
              message: 'Your complaint CIV-1001 status changed to IN_PROGRESS.',
              readAt: null,
              isRead: false,
              complaintId: 'comp-1001',
            },
            {
              id: 'notif-1',
              title: 'Complaint Submitted',
              message: 'Your complaint CIV-1001 was submitted.',
              readAt: null,
              isRead: false,
              complaintId: 'comp-1001',
            },
          ],
          unreadCount: 2,
        },
      });

      // User refreshes / opens bell
      const bellBtn = screen.getByRole('button', { name: /Civic notifications/i });
      fireEvent.click(bellBtn);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('Complaint Status Update')).toBeInTheDocument();
      });
    });

    it('Acceptance Criteria: Given a citizen clicks a notification, then it is marked read and they navigate to the complaint detail', async () => {
      notificationApi.getNotifications.mockResolvedValue({
        success: true,
        data: {
          notifications: [
            {
              id: 'notif-99',
              title: 'Water Pipe Repaired',
              message: 'Your grievance CIV-999 is now marked RESOLVED.',
              readAt: null,
              isRead: false,
              complaintId: 'comp-999',
              createdAt: new Date().toISOString(),
            },
          ],
          unreadCount: 1,
        },
      });
      notificationApi.markAsRead.mockResolvedValue({
        success: true,
        message: 'Notification marked as read.',
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <div>
                  <NotificationBell />
                </div>
              }
            />
            <Route
              path="/complaints/:id"
              element={<div data-testid="complaint-detail-target">Complaint Detail View</div>}
            />
          </Routes>
        </MemoryRouter>
      );

      // Open notification dropdown
      const bellBtn = await screen.findByRole('button', { name: /Civic notifications/i });
      fireEvent.click(bellBtn);

      // Find the unread notification item
      const notifItem = await screen.findByText('Water Pipe Repaired');
      // Click the parent notification item
      fireEvent.click(notifItem.closest('.notif-item') || notifItem);

      // Verify markAsRead was invoked with notification id
      await waitFor(() => {
        expect(notificationApi.markAsRead).toHaveBeenCalledWith('notif-99');
      });

      // Verify navigated to complaint detail page
      expect(await screen.findByTestId('complaint-detail-target')).toBeInTheDocument();
    });
  });

  describe('3. ComplaintRow Component with Inline Status Dropdown & Assign Button', () => {
    it('Renders complaint row details and handles inline status change and assign click', async () => {
      const mockComplaint = {
        _id: 'c-101',
        complaintNumber: 'CIV-2026-001',
        title: 'Severe Pothole on FC Road',
        category: 'Roads',
        status: 'SUBMITTED',
        priority: 'HIGH',
        departmentId: { _id: 'dept-1', name: 'Roads Department' },
        citizenId: { fullName: 'Priya Joshi', email: 'priya@example.com' },
        location: { address: 'FC Road, Pune' },
        createdAt: new Date().toISOString(),
      };

      const handleStatusChange = vi.fn().mockResolvedValue(undefined);
      const handleAssignClick = vi.fn();

      render(
        <MemoryRouter>
          <table>
            <tbody>
              <ComplaintRow
                complaint={mockComplaint}
                onStatusChange={handleStatusChange}
                onAssignClick={handleAssignClick}
              />
            </tbody>
          </table>
        </MemoryRouter>
      );

      // Verify complaint details rendered
      expect(screen.getByText('CIV-2026-001')).toBeInTheDocument();
      expect(screen.getByText('Severe Pothole on FC Road')).toBeInTheDocument();
      expect(screen.getByText('Priya Joshi')).toBeInTheDocument();
      expect(screen.getByText('Roads Department')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();

      // Test inline status dropdown change
      const statusSelect = screen.getByLabelText(/Update status for CIV-2026-001/i);
      fireEvent.change(statusSelect, { target: { value: 'IN_PROGRESS' } });

      expect(handleStatusChange).toHaveBeenCalledWith('c-101', 'IN_PROGRESS');

      // Test Assign button click
      const assignBtn = screen.getByRole('button', { name: /Assign/i });
      fireEvent.click(assignBtn);

      expect(handleAssignClick).toHaveBeenCalledWith(mockComplaint);
    });
  });

  describe('4. AdminDashboardPage Table & Quick Assign Modal', () => {
    it('Renders data table with metrics, filters, and supports assigning a department', async () => {
      departmentApi.getDepartments.mockResolvedValue({
        success: true,
        data: {
          departments: [
            { id: 'dept-1', name: 'Roads & Infrastructure', slug: 'roads' },
            { id: 'dept-2', name: 'Water & Sanitation', slug: 'water' },
          ],
        },
      });

      adminApi.getComplaints.mockResolvedValue({
        success: true,
        data: {
          complaints: [
            {
              _id: 'c-201',
              complaintNumber: 'CIV-2026-002',
              title: 'Water Pipe Leakage at Kothrud',
              category: 'Water',
              status: 'SUBMITTED',
              priority: 'MEDIUM',
              citizenId: { fullName: 'Ramesh Patil', email: 'ramesh@example.com' },
              location: { address: 'Kothrud, Pune', ward: 'Ward 8' },
              createdAt: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, limit: 15, total: 1, pages: 1 },
          metrics: { total: 1, submitted: 1, underReview: 0, assigned: 0, inProgress: 0, resolved: 0 },
        },
      });

      adminApi.assignComplaintDepartment.mockResolvedValue({
        success: true,
        message: 'Department assigned successfully.',
      });

      render(
        <MemoryRouter>
          <AdminDashboardPage />
        </MemoryRouter>
      );

      // Verify metrics and complaint rendered
      expect(await screen.findByText('Water Pipe Leakage at Kothrud')).toBeInTheDocument();
      expect(screen.getByText('CIV-2026-002')).toBeInTheDocument();

      // Click Assign button in row to open assign modal
      const assignBtn = screen.getByRole('button', { name: /Assign/i });
      fireEvent.click(assignBtn);

      // Modal appears
      expect(await screen.findByText('Assign Municipal Department')).toBeInTheDocument();

      // Select department and submit
      const deptSelect = screen.getByLabelText(/Responsible Department/i);
      fireEvent.change(deptSelect, { target: { value: 'dept-2' } });

      const confirmBtn = screen.getByRole('button', { name: /Assign Department/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(adminApi.assignComplaintDepartment).toHaveBeenCalledWith('c-201', {
          departmentId: 'dept-2',
          notes: undefined,
        });
      });
    });
  });

  describe('5. AdminComplaintDetailPage Verification & Controls', () => {
    it('Renders detail page with Verify, Assign Department, and Update Status controls', async () => {
      departmentApi.getDepartments.mockResolvedValue({
        success: true,
        data: {
          departments: [{ id: 'dept-roads', name: 'Roads Dept', slug: 'roads' }],
        },
      });

      adminApi.getComplaintById.mockResolvedValue({
        success: true,
        data: {
          complaint: {
            _id: 'comp-555',
            complaintNumber: 'CIV-555',
            title: 'Damaged Drainage Chamber',
            description: 'Deep hole in the road chamber causing water stagnation.',
            category: 'Drainage',
            status: 'SUBMITTED',
            priority: 'HIGH',
            citizenId: { fullName: 'Sunita Deshmukh', email: 'sunita@example.com' },
            location: { address: 'Swargate, Pune', ward: 'Ward 12' },
            createdAt: new Date().toISOString(),
          },
          auditLogs: [
            {
              _id: 'log-1',
              action: 'STATUS_UPDATE',
              actorRef: { fullName: 'Admin User', role: 'ADMIN' },
              createdAt: new Date().toISOString(),
              metadata: { oldStatus: 'SUBMITTED', newStatus: 'UNDER_REVIEW' },
            },
          ],
        },
      });

      adminApi.verifyComplaint.mockResolvedValue({
        success: true,
        message: 'Complaint verified successfully.',
      });

      render(
        <MemoryRouter initialEntries={['/admin/complaints/comp-555']}>
          <Routes>
            <Route path="/admin/complaints/:id" element={<AdminComplaintDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText('Damaged Drainage Chamber')).toBeInTheDocument();
      expect(screen.getByText('CIV-555')).toBeInTheDocument();
      expect(screen.getByText('Sunita Deshmukh')).toBeInTheDocument();

      // Click Verify Complaint button
      const verifyBtn = screen.getByRole('button', { name: /✓ Verify Complaint/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(adminApi.verifyComplaint).toHaveBeenCalledWith('comp-555', expect.any(Object));
      });
    });
  });
});
