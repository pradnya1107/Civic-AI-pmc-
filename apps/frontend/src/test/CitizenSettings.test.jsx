import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CitizenSettingsPage } from '../pages/CitizenSettingsPage';
import { ProfileModal } from '../components/ProfileModal';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import { authApi, notificationApi } from '../services/api';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      name: 'Rohan Deshmukh',
      fullName: 'Rohan Deshmukh',
      email: 'rohan.deshmukh@example.com',
      phoneNumber: '+91 98765 43210',
      preferredWard: 'kothrud',
      role: 'CITIZEN',
      accountStatus: 'ACTIVE',
      emailVerified: true,
    },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

// Mock APIs
vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      changePassword: vi.fn(),
    },
    notificationApi: {
      getNotifications: vi.fn().mockResolvedValue({
        success: true,
        data: { notifications: [] },
      }),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    },
  };
});

describe('CitizenSettingsPage Component (/settings)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSettings = () => {
    return render(
      <MemoryRouter initialEntries={['/settings']}>
        <ThemeProvider>
          <LanguageProvider>
            <Routes>
              <Route path="/settings" element={<CitizenSettingsPage />} />
            </Routes>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  it('renders Citizen Settings page with profile information and Reset Password section', async () => {
    renderSettings();

    expect(screen.getByRole('heading', { level: 1, name: /Account Settings & Security/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Profile & Ward Preferences/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Reset Password/i })).toBeInTheDocument();

    expect(screen.getByDisplayValue('Rohan Deshmukh')).toBeInTheDocument();
    expect(screen.getByDisplayValue('rohan.deshmukh@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText(/Current \/ Previous Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();
  });

  it('validates password requirements before submission', async () => {
    const user = userEvent.setup();
    renderSettings();

    const submitBtn = screen.getByRole('button', { name: /^Reset Password$/i });

    // Submit without typing anything
    await user.click(submitBtn);

    expect(await screen.findByText('Current / previous password is required.')).toBeInTheDocument();
    expect(screen.getByText('New password is required.')).toBeInTheDocument();
    expect(screen.getByText('Confirm password is required.')).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();

    // Type short password without uppercase or symbol
    await user.type(screen.getByLabelText(/Current \/ Previous Password/i), 'OldPass123!');
    await user.type(screen.getByLabelText(/^New Password/i), 'short');
    await user.type(screen.getByLabelText(/Confirm New Password/i), 'short');
    await user.click(submitBtn);

    expect(await screen.findByText('New password must be at least 8 characters long.')).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();

    // Type 8+ chars without uppercase
    await user.clear(screen.getByLabelText(/^New Password/i));
    await user.clear(screen.getByLabelText(/Confirm New Password/i));
    await user.type(screen.getByLabelText(/^New Password/i), 'lowercase123!');
    await user.type(screen.getByLabelText(/Confirm New Password/i), 'lowercase123!');
    await user.click(submitBtn);

    expect(await screen.findByText('New password must contain at least 1 uppercase letter.')).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();

    // Type 8+ chars without symbol
    await user.clear(screen.getByLabelText(/^New Password/i));
    await user.clear(screen.getByLabelText(/Confirm New Password/i));
    await user.type(screen.getByLabelText(/^New Password/i), 'Uppercase123');
    await user.type(screen.getByLabelText(/Confirm New Password/i), 'Uppercase123');
    await user.click(submitBtn);

    expect(await screen.findByText(/New password must contain at least 1 special character/i)).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();

    // Type mismatching confirm password
    await user.clear(screen.getByLabelText(/^New Password/i));
    await user.clear(screen.getByLabelText(/Confirm New Password/i));
    await user.type(screen.getByLabelText(/^New Password/i), 'ValidPass2026!');
    await user.type(screen.getByLabelText(/Confirm New Password/i), 'MismatchPass2026!');
    await user.click(submitBtn);

    expect(await screen.findByText('New password and confirm password do not match.')).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it('submits password reset and displays success message', async () => {
    const user = userEvent.setup();
    authApi.changePassword.mockResolvedValueOnce({
      success: true,
      message: 'Password updated successfully.',
    });

    renderSettings();

    await user.type(screen.getByLabelText(/Current \/ Previous Password/i), 'CurrentSecret123#');
    await user.type(screen.getByLabelText(/^New Password/i), 'NewSecurePass2026!');
    await user.type(screen.getByLabelText(/Confirm New Password/i), 'NewSecurePass2026!');

    const submitBtn = screen.getByRole('button', { name: /^Reset Password$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(authApi.changePassword).toHaveBeenCalledWith({
        previousPassword: 'CurrentSecret123#',
        newPassword: 'NewSecurePass2026!',
        confirmPassword: 'NewSecurePass2026!',
      });
    });

    expect(await screen.findByText(/Password updated successfully/i)).toBeInTheDocument();
    // Inputs should be cleared
    expect(screen.getByLabelText(/Current \/ Previous Password/i)).toHaveValue('');
    expect(screen.getByLabelText(/^New Password/i)).toHaveValue('');
    expect(screen.getByLabelText(/Confirm New Password/i)).toHaveValue('');
  });

  it('displays backend error message if current password is wrong', async () => {
    const user = userEvent.setup();
    authApi.changePassword.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Previous password is incorrect.',
        },
      },
    });

    renderSettings();

    await user.type(screen.getByLabelText(/Current \/ Previous Password/i), 'WrongPass123!');
    await user.type(screen.getByLabelText(/^New Password/i), 'NewSecurePass2026!');
    await user.type(screen.getByLabelText(/Confirm New Password/i), 'NewSecurePass2026!');

    const submitBtn = screen.getByRole('button', { name: /^Reset Password$/i });
    await user.click(submitBtn);

    expect(await screen.findByText('Previous password is incorrect.')).toBeInTheDocument();
  });
});

describe('ProfileModal Component (Reset Password option in Modal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (props = {}) => {
    return render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <ProfileModal isOpen={true} onClose={vi.fn()} {...props} />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  it('renders Profile tab by default and switches to Reset Password tab', async () => {
    const user = userEvent.setup();
    renderModal();

    expect(screen.getByRole('heading', { name: 'Rohan Deshmukh' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Profile & Preferences/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Reset Password/i })).toHaveAttribute('aria-selected', 'false');

    // Quick switch button in profile callout
    const switchBtn = screen.getByRole('button', { name: /Reset Password →/i });
    await user.click(switchBtn);

    expect(screen.getByRole('tab', { name: /Reset Password/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/Current \/ Previous Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();
  });

  it('opens directly to Reset Password tab when initialTab="password"', () => {
    renderModal({ initialTab: 'password' });

    expect(screen.getByRole('tab', { name: /Reset Password/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/Current \/ Previous Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm New Password/i)).toBeInTheDocument();
  });

  it('submits password reset successfully within ProfileModal', async () => {
    const user = userEvent.setup();
    authApi.changePassword.mockResolvedValueOnce({
      success: true,
      message: 'Password updated successfully.',
    });

    renderModal({ initialTab: 'password' });

    await user.type(screen.getByLabelText(/Current \/ Previous Password/i), 'CurrentSecret123#');
    await user.type(screen.getByLabelText(/^New Password/i), 'BrandNewPass2026!');
    await user.type(screen.getByLabelText(/Confirm New Password/i), 'BrandNewPass2026!');

    const submitBtn = screen.getByRole('button', { name: /^Reset Password$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(authApi.changePassword).toHaveBeenCalledWith({
        previousPassword: 'CurrentSecret123#',
        newPassword: 'BrandNewPass2026!',
        confirmPassword: 'BrandNewPass2026!',
      });
    });

    expect(await screen.findByText(/Password updated successfully/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Current \/ Previous Password/i)).toHaveValue('');
    expect(screen.getByLabelText(/^New Password/i)).toHaveValue('');
    expect(screen.getByLabelText(/Confirm New Password/i)).toHaveValue('');
  });
});

