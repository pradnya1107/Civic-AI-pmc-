import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';
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

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderProtectedRoutes = (initialRoute = '/dashboard') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div data-testid="login-screen">Login Screen</div>} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div data-testid="protected-dashboard">Secret Citizen Dashboard</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('Requirement 5: Unauthenticated users without a token are redirected from /dashboard to /login', async () => {
    // No token in localStorage
    authApi.getCurrentUser.mockRejectedValue(new Error('No token'));

    renderProtectedRoutes('/dashboard');

    // Should redirect to /login
    expect(await screen.findByTestId('login-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-dashboard')).not.toBeInTheDocument();
  });

  it('allows authenticated users with a valid token and profile to view /dashboard', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-mock-token');

    authApi.getCurrentUser.mockResolvedValueOnce({
      success: true,
      data: {
        user: {
          id: 'user-001',
          name: 'Sunil Shinde',
          fullName: 'Sunil Shinde',
          email: 'sunil@example.com',
          role: 'CITIZEN',
          emailVerified: true,
          accountStatus: 'ACTIVE',
        },
      },
    });

    renderProtectedRoutes('/dashboard');

    expect(await screen.findByTestId('protected-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('login-screen')).not.toBeInTheDocument();
  });

  it('redirects to /login when stored token fails verification (/api/v1/auth/me returns 401)', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'expired-token');

    const authError = new Error('Authentication is required.');
    authError.status = 401;
    authApi.getCurrentUser.mockRejectedValueOnce(authError);

    renderProtectedRoutes('/dashboard');

    expect(await screen.findByTestId('login-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-dashboard')).not.toBeInTheDocument();

    // Verify token was cleared from localStorage
    await waitFor(() => {
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });
});
