import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
});
