import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { DepartmentsPage } from '../pages/admin/DepartmentsPage';
import { departmentApi } from '../services/api';

vi.mock('../services/api', () => ({
  departmentApi: {
    getDepartments: vi.fn(),
    createDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    getDepartmentById: vi.fn(),
  },
}));

describe('DepartmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders department directory with complaint counts and resolution rates', async () => {
    departmentApi.getDepartments.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'dept-1',
          name: 'Solid Waste Management',
          slug: 'waste-management',
          description: 'Garbage and city cleaning',
          isActive: true,
          complaintCount: 15,
          resolvedCount: 12,
          resolutionRate: 80,
          adminCount: 2,
        },
      ],
    });

    render(
      <BrowserRouter>
        <DepartmentsPage />
      </BrowserRouter>,
    );

    expect(screen.getByText(/Department Management/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Solid Waste Management')).toBeInTheDocument();
      expect(screen.getByText('waste-management')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('2 Admins')).toBeInTheDocument();
    });
  });

  it('opens create modal, validates required fields, and submits department creation', async () => {
    const user = userEvent.setup();
    departmentApi.getDepartments.mockResolvedValue({
      success: true,
      data: [],
    });
    departmentApi.createDepartment.mockResolvedValueOnce({
      success: true,
      data: { id: 'dept-2', name: 'Water Works', isActive: true },
    });

    render(
      <BrowserRouter>
        <DepartmentsPage />
      </BrowserRouter>,
    );

    const createBtn = screen.getByRole('button', { name: /\+ Create Department/i });
    await user.click(createBtn);

    // Modal is open
    expect(screen.getByRole('heading', { name: /Create Civic Department/i })).toBeInTheDocument();

    // Click submit without name -> validation error
    const submitBtn = screen.getByRole('button', { name: /^Create Department$/i });
    await user.click(submitBtn);

    expect(screen.getByText(/Department name is required/i)).toBeInTheDocument();
    expect(departmentApi.createDepartment).not.toHaveBeenCalled();

    // Fill valid name
    const nameInput = screen.getByLabelText(/Department Name/i);
    await user.type(nameInput, 'Water Works');

    await user.click(submitBtn);

    await waitFor(() => {
      expect(departmentApi.createDepartment).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Water Works' }),
      );
    });
  });
});
