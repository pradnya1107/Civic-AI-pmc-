import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RegisterPage } from '../pages/RegisterPage';
import { AuthProvider } from '../context/AuthContext';
import { authApi } from '../services/api';

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
  };
});

describe('RegisterPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authApi.getCurrentUser.mockRejectedValue(new Error('No token'));
  });

  const renderRegisterPage = () => {
    return render(
      <MemoryRouter initialEntries={['/register']}>
        <AuthProvider>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<div data-testid="dashboard-screen">Citizen Dashboard</div>} />
            <Route path="/login" element={<div data-testid="login-screen">Sign In Screen</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('renders all required registration inputs and buttons', () => {
    renderRegisterPage();

    expect(screen.getByRole('heading', { name: /Create Citizen Account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirm Password/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register Citizen Account/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign in here/i })).toBeInTheDocument();
  });

  it('Requirement 4: Registration with a missing password does not call the API', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/Full Name/i), 'Pradnya Ghodke');
    await user.type(screen.getByLabelText(/Email Address/i), 'pradnya@example.com');
    // Leaving password empty!

    const submitBtn = screen.getByRole('button', { name: /Register Citizen Account/i });
    await user.click(submitBtn);

    expect(await screen.findByText('Password is required.')).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('validates password complexity (uppercase, lowercase, number, special character, 8+ chars)', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/Full Name/i), 'Pradnya Ghodke');
    await user.type(screen.getByLabelText(/Email Address/i), 'pradnya@example.com');
    await user.type(screen.getByLabelText(/^Password/i, { selector: 'input' }), 'simplepassword');
    await user.type(screen.getByLabelText(/^Confirm Password/i, { selector: 'input' }), 'simplepassword');

    await user.click(screen.getByRole('button', { name: /Register Citizen Account/i }));

    expect(
      await screen.findByText(/Password must contain at least one uppercase letter/i)
    ).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('validates that confirmPassword matches password', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/Full Name/i), 'Pradnya Ghodke');
    await user.type(screen.getByLabelText(/Email Address/i), 'pradnya@example.com');
    await user.type(screen.getByLabelText(/^Password/i, { selector: 'input' }), 'StrongPass#123');
    await user.type(screen.getByLabelText(/^Confirm Password/i, { selector: 'input' }), 'DifferentPass#456');

    await user.click(screen.getByRole('button', { name: /Register Citizen Account/i }));

    expect(await screen.findByText('Confirm password must match password.')).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('calls API and shows success notification on successful registration without pretending to log in', async () => {
    const user = userEvent.setup();

    // Actual backend registration response: Safe user profile, NO access token
    authApi.register.mockResolvedValueOnce({
      success: true,
      message: 'Account created successfully. Verify your email to continue.',
      data: {
        user: {
          id: 'user-789',
          name: 'Pradnya Ghodke',
          fullName: 'Pradnya Ghodke',
          email: 'citizen@example.com',
          role: 'CITIZEN',
          emailVerified: false,
        },
      },
    });

    renderRegisterPage();

    await user.type(screen.getByLabelText(/Full Name/i), 'Pradnya Ghodke');
    await user.type(screen.getByLabelText(/Email Address/i), 'citizen@example.com');
    await user.type(screen.getByLabelText(/^Password/i, { selector: 'input' }), 'StrongPass#123');
    await user.type(screen.getByLabelText(/^Confirm Password/i, { selector: 'input' }), 'StrongPass#123');

    await user.click(screen.getByRole('button', { name: /Register Citizen Account/i }));

    expect(authApi.register).toHaveBeenCalledWith({
      name: 'Pradnya Ghodke',
      email: 'citizen@example.com',
      password: 'StrongPass#123',
      confirmPassword: 'StrongPass#123',
    });

    // Verify success banner appears
    expect(await screen.findByText('Registration Successful!')).toBeInTheDocument();
    expect(screen.getByText(/Verify your email to continue/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Proceed to Sign In/i })).toBeInTheDocument();

    // Verify user is NOT automatically authenticated or redirected to dashboard
    expect(screen.queryByTestId('dashboard-screen')).not.toBeInTheDocument();
  });

  it('displays backend error message if email already exists', async () => {
    const user = userEvent.setup();
    authApi.register.mockRejectedValueOnce(
      new Error('An account with this email already exists.')
    );

    renderRegisterPage();

    await user.type(screen.getByLabelText(/Full Name/i), 'Pradnya Ghodke');
    await user.type(screen.getByLabelText(/Email Address/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/^Password/i, { selector: 'input' }), 'StrongPass#123');
    await user.type(screen.getByLabelText(/^Confirm Password/i, { selector: 'input' }), 'StrongPass#123');

    await user.click(screen.getByRole('button', { name: /Register Citizen Account/i }));

    expect(await screen.findByText('An account with this email already exists.')).toBeInTheDocument();
  });
});
