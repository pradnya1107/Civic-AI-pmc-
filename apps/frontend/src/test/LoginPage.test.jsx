import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { AuthProvider } from '../context/AuthContext';
import { authApi, TOKEN_STORAGE_KEY } from '../services/api';

// Mock authApi methods
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

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Default getCurrentUser rejection so initial restore completes without user
    authApi.getCurrentUser.mockRejectedValue(new Error('No token'));
  });

  const renderLoginPage = (initialRoute = '/login') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<div data-testid="dashboard-screen">Citizen Dashboard</div>} />
            <Route path="/register" element={<div data-testid="register-screen">Register Screen</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('Requirement 1: renders the Login form with inputs, submit button, and registration link', async () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { name: /CivicAI Citizen Portal/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sign In$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Register Citizen Account/i })).toBeInTheDocument();
  });

  it('Requirement 2: validates required fields when submitting empty form', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });
    await user.click(submitBtn);

    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('Requirement 3: displays a validation error for invalid email format', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });

    await user.type(emailInput, 'invalid-email-address');
    await user.type(passwordInput, 'ValidPassword123!');
    await user.click(submitBtn);

    expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('toggles password visibility with the show/hide password control', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const passwordInput = screen.getByLabelText(/^Password/i);
    const toggleBtn = screen.getByRole('button', { name: /Show password/i });

    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /Hide password/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('Requirement 6: successful Login stores the token and navigates to the Dashboard', async () => {
    const user = userEvent.setup();
    const fakeToken = 'mock-jwt-access-token.eyJhbGciOi...';
    const fakeUserData = {
      id: 'citizen-101',
      name: 'Ramesh Kulkarni',
      fullName: 'Ramesh Kulkarni',
      email: 'ramesh@example.com',
      role: 'CITIZEN',
      emailVerified: true,
      accountStatus: 'ACTIVE',
    };

    authApi.login.mockResolvedValueOnce({
      success: true,
      message: 'Signed in successfully.',
      data: {
        accessToken: fakeToken,
        tokenType: 'Bearer',
        expiresIn: '15m',
        user: fakeUserData,
      },
    });

    renderLoginPage();

    await user.type(screen.getByLabelText(/Email Address/i), 'ramesh@example.com');
    await user.type(screen.getByLabelText(/^Password/i), 'StrongPass#123');
    await user.click(screen.getByRole('button', { name: /^Sign In$/i }));

    // Verify API called with trimmed email
    expect(authApi.login).toHaveBeenCalledWith({
      email: 'ramesh@example.com',
      password: 'StrongPass#123',
    });

    // Verify token stored in localStorage
    await waitFor(() => {
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe(fakeToken);
    });

    // Verify navigation to dashboard
    expect(await screen.findByTestId('dashboard-screen')).toBeInTheDocument();
  });

  it('displays backend error message when login fails', async () => {
    const user = userEvent.setup();
    authApi.login.mockRejectedValueOnce(
      new Error('Email or password is incorrect, or the account is not eligible to sign in.')
    );

    renderLoginPage();

    await user.type(screen.getByLabelText(/Email Address/i), 'ramesh@example.com');
    await user.type(screen.getByLabelText(/^Password/i), 'WrongPassword123!');
    await user.click(screen.getByRole('button', { name: /^Sign In$/i }));

    expect(
      await screen.findByText('Email or password is incorrect, or the account is not eligible to sign in.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-screen')).not.toBeInTheDocument();
  });
});
