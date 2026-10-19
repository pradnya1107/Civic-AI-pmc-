import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SuperAdminDashboardPage } from '../pages/admin/SuperAdminDashboardPage';
import { adminApi } from '../services/api';

vi.mock('../services/api', () => ({
  adminApi: {
    getDashboard: vi.fn(),
  },
  departmentApi: {
    getDepartments: vi.fn(),
  },
}));

describe('SuperAdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome hero and loads live KPI metrics from adminApi', async () => {
    adminApi.getDashboard.mockResolvedValueOnce({
      success: true,
      data: {
        totalComplaints: 42,
        pendingComplaints: 12,
        inProgressComplaints: 10,
        resolvedComplaints: 20,
        totalDepartments: 6,
        activeAdmins: 4,
        totalCitizens: 120,
        complaintsByCategory: [
          { _id: 'Roads & Potholes', count: 18 },
          { _id: 'Water Supply', count: 12 },
        ],
        departmentWorkloads: [
          {
            id: 'dept-1',
            name: 'Roads & Infrastructure',
            slug: 'roads-infrastructure',
            description: 'PMC Road Maintenance',
            isActive: true,
            totalComplaints: 18,
            pendingComplaints: 6,
            inProgressComplaints: 4,
            resolvedComplaints: 8,
            resolutionRate: 44,
            assignedAdmins: [{ name: 'Rajesh Deshmukh', email: 'rajesh@pmc.gov.in' }],
          },
        ],
        recentComplaints: [
          {
            _id: 'cmp-101',
            complaintNumber: 'PMC-2026-001',
            title: 'Massive pothole on FC Road',
            category: 'Roads',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });

    render(
      <BrowserRouter>
        <SuperAdminDashboardPage />
      </BrowserRouter>,
    );

    expect(screen.getByText(/Welcome back, Super Admin/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('Roads & Infrastructure')).toBeInTheDocument();
      expect(screen.getByText(/Massive pothole on FC Road/i)).toBeInTheDocument();
    });
  });

  it('displays empty states gracefully when no complaints or departments are reported', async () => {
    adminApi.getDashboard.mockResolvedValueOnce({
      success: true,
      data: {
        totalComplaints: 0,
        pendingComplaints: 0,
        inProgressComplaints: 0,
        resolvedComplaints: 0,
        totalDepartments: 0,
        activeAdmins: 0,
        departmentWorkloads: [],
        recentComplaints: [],
        complaintsByCategory: [],
      },
    });

    render(
      <BrowserRouter>
        <SuperAdminDashboardPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/No complaints reported yet/i)).toBeInTheDocument();
      expect(screen.getByText(/No departments matching query/i)).toBeInTheDocument();
    });
  });
});
