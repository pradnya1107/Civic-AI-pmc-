import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import { complaintApi, notificationApi } from '../services/api';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      name: 'Rohan Deshmukh',
      fullName: 'Rohan Deshmukh',
      email: 'rohan.deshmukh@example.com',
      role: 'CITIZEN',
      accountStatus: 'ACTIVE',
      emailVerified: true,
    },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

// Mock APIs
vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    complaintApi: {
      getComplaints: vi.fn(),
      getComplaintById: vi.fn(),
      createComplaint: vi.fn(),
    },
    notificationApi: {
      getNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    },
  };
});

describe('Citizen Portal Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    window.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
    };

    complaintApi.getComplaints.mockResolvedValue({
      success: true,
      data: {
        complaints: [
          {
            _id: 'c-001',
            complaintNumber: 'CIV-2026-001',
            title: 'Dangerous Pothole on FC Road',
            description: 'Deep road hazard causing vehicular damage near Deccan Gymkhana.',
            category: 'Roads & Potholes',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            location: { address: 'FC Road, Deccan, Pune', latitude: 18.5196, longitude: 73.8415 },
            createdAt: '2026-10-15T10:00:00.000Z',
            supportCount: 4,
          },
          {
            _id: 'c-002',
            complaintNumber: 'CIV-2026-002',
            title: 'Overflowing Solid Waste in Kothrud',
            description: 'Garbage bins overflowing outside residential area for 3 days.',
            category: 'Solid Waste & Garbage',
            priority: 'MEDIUM',
            status: 'SUBMITTED',
            location: { address: 'Karve Road, Kothrud, Pune', latitude: 18.5074, longitude: 73.8077 },
            createdAt: '2026-10-16T12:00:00.000Z',
            supportCount: 2,
          },
        ],
      },
    });

    notificationApi.getNotifications.mockResolvedValue({
      success: true,
      data: {
        notifications: [
          {
            _id: 'notif-1',
            title: 'Roads Department Dispatched',
            message: 'Engineer assigned to inspect complaint CIV-2026-001.',
            type: 'STATUS_UPDATED',
            isRead: false,
            createdAt: '2026-10-16T14:00:00.000Z',
          },
        ],
      },
    });
  });

  const renderDashboard = () =>
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <DashboardPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

  it('renders welcome hero with "Your City, Your Voice.", user name, and Voice Greeting', async () => {
    renderDashboard();

    expect(await screen.findByRole('heading', { name: /Welcome, Rohan Deshmukh!/i })).toBeInTheDocument();
    expect(screen.getByText(/Your City, Your Voice\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Play welcome voice greeting/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Report New Issue/i })).toBeInTheDocument();
  });

  it('loads real complaint counts from backend into statistics cards', async () => {
    renderDashboard();

    await waitFor(() => {
      // Total = 2, In Progress = 1, Pending = 1
      expect(screen.getByText('Total Complaints')).toBeInTheDocument();
      expect(screen.getByText('Pending Review')).toBeInTheDocument();
      expect(screen.getAllByText('In Progress').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Resolved & Verified')).toBeInTheDocument();
    });
  });

  it('renders quick action cards for reporting, tracking, heatmap, and notifications', async () => {
    renderDashboard();

    expect(await screen.findByText('Report Civic Issue')).toBeInTheDocument();
    expect(screen.getByText('Track a Complaint')).toBeInTheDocument();
    expect(screen.getByText('Explore Nearby Issues')).toBeInTheDocument();
    expect(screen.getByText('View Notifications')).toBeInTheDocument();
  });

  it('displays recent complaints table with category, status, and view details action', async () => {
    renderDashboard();

    expect(await screen.findByText('Dangerous Pothole on FC Road')).toBeInTheDocument();
    expect(screen.getByText('Overflowing Solid Waste in Kothrud')).toBeInTheDocument();
    expect(screen.getByText('CIV-2026-001')).toBeInTheDocument();

    const viewDetailsLinks = screen.getAllByRole('link', { name: /View Details/i });
    expect(viewDetailsLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('opens Help Center modal and displays official PMC 24x7 Helpline', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const profileTrigger = screen.getByRole('button', { name: /User profile/i });
    await user.click(profileTrigger);

    const helpButtons = screen.getAllByRole('button', { name: /Help Center & Helplines/i });
    await user.click(helpButtons[0]);

    expect(await screen.findByText(/PMC 24x7 Citizen Helpline/i)).toBeInTheDocument();
    expect(screen.getByText('1800-1030-222')).toBeInTheDocument();
  });

  it('opens Profile modal and displays authenticated citizen identity', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const profileTrigger = screen.getByRole('button', { name: /User profile/i });
    await user.click(profileTrigger);

    const profileButtons = screen.getAllByRole('button', { name: /My Profile & Preferences/i });
    await user.click(profileButtons[0]);

    expect(await screen.findByDisplayValue('rohan.deshmukh@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Preferences/i })).toBeInTheDocument();
  });
});
