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
    const selectExistingBtn = screen.getByRole('button', { name: /Select Existing User/i });
    await user.click(selectExistingBtn);
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

  it('validates password complexity and confirm password when creating new department administrator', async () => {
    const user = userEvent.setup();
    departmentApi.getDepartments.mockResolvedValue({
      success: true,
      data: { departments: [] },
    });
    departmentApi.getAdminCandidates.mockResolvedValue({
      success: true,
      data: { candidates: [] },
    });
    departmentApi.createDepartment.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'dept-3',
        name: 'Gardens & Parks',
        code: 'GARDEN',
        createdAdminNotice: {
          admin: { fullName: 'Pooja Patil', email: 'pooja.patil@pmc.gov.in' },
          temporaryPassword: 'AdminPassword@2026',
        },
      },
    });

    render(
      <BrowserRouter>
        <DepartmentsPage />
      </BrowserRouter>,
    );

    const createBtn = document.getElementById('btn-create-department');
    await user.click(createBtn);

    // Fill department basic info
    await user.type(screen.getByLabelText(/Department Name/i), 'Gardens & Parks');
    const codeInput = screen.getByLabelText(/Department Code/i);
    await user.clear(codeInput);
    await user.type(codeInput, 'GARDEN');
    await user.selectOptions(screen.getByLabelText(/Department Category/i), 'Garden & Tree Trimming');
    await user.type(screen.getByLabelText(/Official Email/i), 'gardens@pmc.gov.in');
    await user.type(screen.getByLabelText(/Official Contact Number/i), '+91 20 2550 3333');

    // Admin fields are active by default in NEW mode
    const adminNameInput = screen.getByLabelText(/Admin Full Name/i);
    const adminEmailInput = screen.getByLabelText(/Admin Email/i);
    const passwordInput = screen.getByLabelText(/Admin Password/i);
    const confirmInput = screen.getByLabelText(/^Confirm Password/i);

    await user.type(adminNameInput, 'Pooja Patil');
    await user.type(adminEmailInput, 'pooja.patil@pmc.gov.in');

    // Test weak password (<8 chars)
    await user.type(passwordInput, 'Weak@1');
    await user.type(confirmInput, 'Weak@1');
    const submitBtn = document.getElementById('submit-create-department');
    await user.click(submitBtn);
    expect(await screen.findByText(/Password must be at least 8 characters long/i)).toBeInTheDocument();

    // Test password without symbol
    await user.clear(passwordInput);
    await user.clear(confirmInput);
    await user.type(passwordInput, 'Password2026');
    await user.type(confirmInput, 'Password2026');
    await user.click(submitBtn);
    expect(await screen.findByText(/Password must contain at least 1 specific symbol/i)).toBeInTheDocument();

    // Test password mismatch
    await user.clear(passwordInput);
    await user.clear(confirmInput);
    await user.type(passwordInput, 'ValidPassword@2026');
    await user.type(confirmInput, 'MismatchPassword@2026');
    await user.click(submitBtn);
    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();

    // Valid password & confirm password
    await user.clear(confirmInput);
    await user.type(confirmInput, 'ValidPassword@2026');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(departmentApi.createDepartment).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Gardens & Parks',
          code: 'GARDEN',
          newAdmin: {
            fullName: 'Pooja Patil',
            email: 'pooja.patil@pmc.gov.in',
            password: 'ValidPassword@2026',
            confirmPassword: 'ValidPassword@2026',
          },
        }),
      );
    });
  });
});
