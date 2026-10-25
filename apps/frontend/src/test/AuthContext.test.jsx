import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { DashboardPage } from '../pages/DashboardPage';
import { authApi, TOKEN_STORAGE_KEY } from '../services/api';

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

// Test component to inspect AuthContext values
const TestConsumer = () => {
  const { user, token, isAuthenticated, logout } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="user-name">{user?.name || 'none'}</div>
      <div data-testid="token-val">{token || 'none'}</div>
      <button onClick={logout} data-testid="logout-btn">
        Logout
      </button>
    </div>
  );
};

describe('AuthContext and Dashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('restores user from token on mount via /api/v1/auth/me', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'stored-jwt-token');

    authApi.getCurrentUser.mockResolvedValueOnce({
      success: true,
      data: {
        user: {
          id: 'u-123',
          name: 'Pooja Patil',
          fullName: 'Pooja Patil',
          email: 'pooja@example.com',
          role: 'CITIZEN',
          emailVerified: true,
          accountStatus: 'ACTIVE',
        },
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(await screen.findByText('authenticated')).toBeInTheDocument();
    expect(screen.getByText('Pooja Patil')).toBeInTheDocument();
    expect(screen.getByText('stored-jwt-token')).toBeInTheDocument();
  });

  it('Acceptance Criteria: Logout clears JWT from localStorage, clears user state, and redirects to Login', async () => {
    const user = userEvent.setup();
    localStorage.setItem(TOKEN_STORAGE_KEY, 'active-access-token');

    authApi.getCurrentUser.mockResolvedValueOnce({
      success: true,
      data: {
        user: {
          id: 'u-999',
          name: 'Anita Sharma',
          fullName: 'Anita Sharma',
          email: 'anita@example.com',
          role: 'CITIZEN',
          emailVerified: true,
          accountStatus: 'ACTIVE',
        },
      },
    });

    authApi.logout.mockResolvedValueOnce({
      success: true,
      message: 'Signed out successfully.',
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/login" element={<div data-testid="login-page">Sign In Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Verify user is rendered on Dashboard
    expect(await screen.findByRole('heading', { name: /Welcome, Anita Sharma!/i })).toBeInTheDocument();
    expect(screen.getByText('anita@example.com')).toBeInTheDocument();

    // Open user profile dropdown and click Sign Out button
    const profileTrigger = screen.getByRole('button', { name: /User profile/i });
    await user.click(profileTrigger);
    const logoutBtn = screen.getByRole('button', { name: /Sign out of Citizen Portal/i });
    await user.click(logoutBtn);

    // Verify API logout was called
    expect(authApi.logout).toHaveBeenCalled();

    // Verify localStorage token was cleared
    await waitFor(() => {
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });

    // Verify redirected to login
    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
  });
});
