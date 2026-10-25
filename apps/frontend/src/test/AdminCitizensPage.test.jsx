import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminCitizensPage } from '../pages/admin/AdminCitizensPage';
import { adminApi } from '../services/api';

vi.mock('../services/api', () => ({
  adminApi: {
    getCitizens: vi.fn(),
    updateCitizenStatus: vi.fn(),
  },
}));

describe('AdminCitizensPage - Active Status Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders citizens with their status and allows toggling active status', async () => {
    adminApi.getCitizens.mockResolvedValueOnce({
      citizens: [
        {
          id: 'cit-101',
          fullName: 'Priya Kulkarni',
          email: 'priya@example.com',
          phoneNumber: '9822011223',
          emailVerified: true,
          accountStatus: 'ACTIVE',
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });

    render(<AdminCitizensPage />);

    await waitFor(() => {
      expect(screen.getByText('Priya Kulkarni')).toBeInTheDocument();
    });

    // Check status badge
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();

    // Check action button
    const toggleButton = screen.getByRole('button', { name: /Deactivate Priya Kulkarni/i });
    expect(toggleButton).toBeInTheDocument();

    adminApi.updateCitizenStatus.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'cit-101',
        fullName: 'Priya Kulkarni',
        accountStatus: 'DISABLED',
      },
    });

    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(adminApi.updateCitizenStatus).toHaveBeenCalledWith('cit-101', {
        accountStatus: 'DISABLED',
      });
      expect(screen.getByText('Citizen account status updated to DISABLED.')).toBeInTheDocument();
      expect(screen.getByText('DISABLED')).toBeInTheDocument();
    });
  });
});
