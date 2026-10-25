import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HeatmapPage } from '../pages/HeatmapPage';
import * as AuthContext from '../context/AuthContext';
import { complaintApi } from '../services/api';

vi.mock('../services/api', () => ({
  complaintApi: {
    getHeatmapData: vi.fn(),
  },
  notificationApi: {
    getNotifications: vi.fn().mockResolvedValue({ success: true, data: { notifications: [] } }),
  },
}));

describe('HeatmapPage Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with super admin user within AdminLayout', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { role: 'SUPER_ADMIN', name: 'CivicAI Admin', email: 'admin@civicai.com' },
      isAuthenticated: true,
      isLoading: false,
    });

    complaintApi.getHeatmapData.mockResolvedValueOnce({
      success: true,
      data: {
        points: [
          {
            _id: 'c1',
            title: 'Pothole on FC Road',
            category: 'Roads',
            priority: 'HIGH',
            status: 'SUBMITTED',
            location: { latitude: 18.5204, longitude: 73.8567, ward: 'Shivajinagar' },
          },
        ],
        count: 1,
      },
    });

    render(
      <BrowserRouter>
        <HeatmapPage />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: /AI Civic Heatmap/i })).toBeInTheDocument();
    expect(screen.getByText(/Admin Command Center/i)).toBeInTheDocument();
  });

  it('renders with citizen user gracefully with Report New Issue button', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { role: 'CITIZEN', name: 'Citizen Demo', email: 'citizen@example.com' },
      isAuthenticated: true,
      isLoading: false,
    });

    complaintApi.getHeatmapData.mockResolvedValueOnce({
      success: true,
      data: {
        points: [],
        count: 0,
      },
    });

    render(
      <BrowserRouter>
        <HeatmapPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/AI Civic Heatmap/i)).toBeInTheDocument();
    expect(screen.getByText(/Report New Issue/i)).toBeInTheDocument();
  });

  it('renders bottom-right map legend table with issue names and symbols', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'u1', _id: 'u1', role: 'CITIZEN', name: 'Citizen Demo', email: 'citizen@example.com' },
      isAuthenticated: true,
      isLoading: false,
    });

    complaintApi.getHeatmapData.mockResolvedValueOnce({
      success: true,
      data: {
        points: [
          {
            _id: 'c1',
            title: 'Water pipe leak in Kothrud',
            category: 'Water Supply',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            citizenId: 'u1',
            location: { latitude: 18.5074, longitude: 73.8077, ward: 'Kothrud' },
          },
        ],
        count: 1,
      },
    });

    render(
      <BrowserRouter>
        <HeatmapPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const legend = document.querySelector('.heatmap-compact-legend');
      expect(legend).toBeInTheDocument();
      expect(within(legend).getByText('LEGEND')).toBeInTheDocument();
      expect(within(legend).getByText('Roads & Potholes')).toBeInTheDocument();
      expect(within(legend).getByText('Water Supply & Leaks')).toBeInTheDocument();
      expect(within(legend).getByText('Solid Waste & Garbage')).toBeInTheDocument();
      expect(within(legend).getByText('Street Lighting Outage')).toBeInTheDocument();
      expect(within(legend).getByText('Drainage & Sewage')).toBeInTheDocument();
    });

    const legend = document.querySelector('.heatmap-compact-legend');
    // Check symbols are rendered inside legend
    expect(within(legend).getByText('🛣️')).toBeInTheDocument();
    expect(within(legend).getByText('🚰')).toBeInTheDocument();
    expect(within(legend).getByText('🗑️')).toBeInTheDocument();
    expect(within(legend).getByText('💡')).toBeInTheDocument();
    expect(within(legend).getByText('🌊')).toBeInTheDocument();

    // Check SLA severity labels inside legend
    expect(within(legend).getByText(/<12h/i)).toBeInTheDocument();
    expect(within(legend).getByText(/<24h/i)).toBeInTheDocument();
    expect(within(legend).getByText(/<48h/i)).toBeInTheDocument();
    expect(within(legend).getByText(/<72h/i)).toBeInTheDocument();
  });
});

