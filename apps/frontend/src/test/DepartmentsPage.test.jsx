import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { DepartmentsPage } from '../pages/admin/DepartmentsPage';
import { departmentApi, adminApi } from '../services/api';

vi.mock('../services/api', () => ({
  departmentApi: {
    getDepartments: vi.fn(),
    createDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    getDepartmentById: vi.fn(),
    getAdminCandidates: vi.fn(),
  },
  adminApi: {
    getDepartmentAdmins: vi.fn(),
  },
}));

describe('DepartmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders department directory with complaint counts, codes, and resolution rates', async () => {
    departmentApi.getDepartments.mockResolvedValueOnce({
      success: true,
      data: {
        departments: [
          {
            id: 'dept-1',
            name: 'Solid Waste Management',
            code: 'WASTE',
            category: 'Solid Waste & Garbage',
            officialEmail: 'waste@pmc.gov.in',
            contactNumber: '+91 20 2550 1111',
            slug: 'waste-management',
            description: 'Garbage and city cleaning',
            isActive: true,
            complaintCount: 15,
            resolvedCount: 12,
            resolutionRate: 80,
            adminCount: 2,
            admin: { id: 'adm-1', fullName: 'Suresh Patil', email: 'suresh@pmc.gov.in' },
          },
        ],
      },
    });
    departmentApi.getAdminCandidates.mockResolvedValue({
      success: true,
      data: { candidates: [] },
    });

    render(
      <BrowserRouter>
        <DepartmentsPage />
      </BrowserRouter>,
    );

    expect(screen.getByText(/Department Management/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Solid Waste Management')).toBeInTheDocument();
      expect(screen.getByText('WASTE')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('Suresh Patil')).toBeInTheDocument();
    });
  });

  it('opens create modal, validates required fields, and submits department creation with all 5 compulsory fields', async () => {
    const user = userEvent.setup();
    departmentApi.getDepartments.mockResolvedValue({
      success: true,
      data: { departments: [] },
    });
    departmentApi.getAdminCandidates.mockResolvedValue({
      success: true,
      data: {
        candidates: [
          { id: 'adm-1', fullName: 'Anand Shinde', email: 'anand@pmc.gov.in', role: 'DEPARTMENT_ADMIN' },
        ],
      },
    });
    departmentApi.createDepartment.mockResolvedValueOnce({
      success: true,
      data: { id: 'dept-2', name: 'Water Works', code: 'WATER', isActive: true },
    });

    render(
      <BrowserRouter>
        <DepartmentsPage />
      </BrowserRouter>,
    );

    // Click create button (one plus sign)
    const createBtn = document.getElementById('btn-create-department');
    await user.click(createBtn);

    // Modal is open
    expect(screen.getByRole('heading', { name: /Create Civic Department/i })).toBeInTheDocument();

    // Click submit without filling fields -> validation error
    const submitBtn = document.getElementById('submit-create-department');
    await user.click(submitBtn);

    expect(screen.getByText(/Department name is required/i)).toBeInTheDocument();
    expect(departmentApi.createDepartment).not.toHaveBeenCalled();

    // 1. Fill Department Name
    const nameInput = screen.getByLabelText(/Department Name/i);
    await user.type(nameInput, 'Water Works');

    // 2. Fill Department Code
    const codeInput = screen.getByLabelText(/Department Code/i);
    await user.clear(codeInput);
    await user.type(codeInput, 'WATER');

    // 3. Select Department Category
    const categorySelect = screen.getByLabelText(/Department Category/i);
    await user.selectOptions(categorySelect, 'Water Supply');

    // 4. Fill Official Email
    const emailInput = screen.getByLabelText(/Official Email/i);
    await user.type(emailInput, 'water.dept@pmc.gov.in');

    // 5. Fill Contact Number
    const phoneInput = screen.getByLabelText(/Official Contact Number/i);
    await user.type(phoneInput, '+91 20 2550 2222');

    // 6. Select Department Admin (already has candidates loaded)
    const adminSelect = document.getElementById('dept-create-admin-id');
    await user.selectOptions(adminSelect, 'adm-1');

    await user.click(submitBtn);

    await waitFor(() => {
      expect(departmentApi.createDepartment).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Water Works',
          code: 'WATER',
          category: 'Water Supply',
          officialEmail: 'water.dept@pmc.gov.in',
          contactNumber: '+91 20 2550 2222',
          adminId: 'adm-1',
        }),
      );
    });
  });
});
