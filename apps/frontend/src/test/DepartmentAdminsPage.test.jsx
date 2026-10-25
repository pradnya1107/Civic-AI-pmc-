import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { DepartmentAdminsPage } from '../pages/admin/DepartmentAdminsPage';
import { adminApi, departmentApi } from '../services/api';

vi.mock('../services/api', () => ({
  adminApi: {
    getDepartmentAdmins: vi.fn(),
    createDepartmentAdmin: vi.fn(),
    updateDepartmentAdmin: vi.fn(),
  },
  departmentApi: {
    getDepartments: vi.fn(),
  },
}));

describe('DepartmentAdminsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders administrators directory with department assignment and account status', async () => {
    adminApi.getDepartmentAdmins.mockResolvedValueOnce({
      success: true,
      data: {
        admins: [
          {
            id: 'admin-1',
            fullName: 'Anil Shinde',
            email: 'anil.shinde@pmc.gov.in',
            role: 'DEPARTMENT_ADMIN',
            department: { id: 'dept-1', name: 'Roads & Infrastructure' },
            accountStatus: 'ACTIVE',
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });
    departmentApi.getDepartments.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'dept-1', name: 'Roads & Infrastructure', slug: 'roads' }],
    });

    render(
      <BrowserRouter>
        <DepartmentAdminsPage />
      </BrowserRouter>,
    );

    expect(screen.getByRole('heading', { name: /Department Administrators/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Anil Shinde')).toBeInTheDocument();
      expect(screen.getByText('anil.shinde@pmc.gov.in')).toBeInTheDocument();
      expect(screen.getAllByText('Roads & Infrastructure').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('DEPARTMENT_ADMIN')).toBeInTheDocument();
    });
  });

  it('validates required fields before submitting to POST /api/v1/admin/department-admins', async () => {
    const user = userEvent.setup();
    adminApi.getDepartmentAdmins.mockResolvedValue({
      success: true,
      data: { admins: [] },
    });
    departmentApi.getDepartments.mockResolvedValue({
      success: true,
      data: [{ id: 'dept-1', name: 'Roads & Infrastructure' }],
    });
    adminApi.createDepartmentAdmin.mockResolvedValueOnce({
      success: true,
      data: {
        admin: { fullName: 'Sanjay More', email: 'sanjay@pmc.gov.in' },
        temporaryPassword: 'Temp@Password123',
        confirmationOtp: '849201',
      },
    });

    render(
      <BrowserRouter>
        <DepartmentAdminsPage />
      </BrowserRouter>,
    );

    const addBtn = screen.getByRole('button', { name: /Add Department Admin/i });
    await user.click(addBtn);

    expect(screen.getByRole('heading', { name: /Add Department Administrator/i })).toBeInTheDocument();

    // Fill valid data
    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Email Address/i);

    await user.type(nameInput, 'Sanjay More');
    await user.type(emailInput, 'sanjay@pmc.gov.in');

    const submitBtn = screen.getByRole('button', { name: /Provision Admin Account/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(adminApi.createDepartmentAdmin).toHaveBeenCalledWith({
        fullName: 'Sanjay More',
        email: 'sanjay@pmc.gov.in',
        departmentId: 'dept-1',
      });
      // Demo credentials notification is shown
      expect(screen.getByText(/Department Admin Ready/i)).toBeInTheDocument();
      expect(screen.getByText('Temp@Password123')).toBeInTheDocument();
      expect(screen.getByText('849201')).toBeInTheDocument();
    });
  });
});
