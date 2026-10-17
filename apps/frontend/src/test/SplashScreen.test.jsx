import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SplashScreen } from '../pages/SplashScreen';
import { AuthProvider } from '../context/AuthContext';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  getStoredToken: vi.fn(() => null),
  setStoredToken: vi.fn(),
  removeStoredToken: vi.fn(),
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('ISSUE-06: SplashScreen Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders CivicAI logo, Pune cityscape illustration, and municipal badge', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SplashScreen autoRedirect={false} />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('splash-screen')).toBeInTheDocument();
    expect(screen.getByText(/CIVIC TECHNOLOGY FOR PUNE/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Illustration of a greener Pune skyline at dusk/i)).toBeInTheDocument();
    expect(screen.getByText(/PUNE · A CITY IN MOTION/i)).toBeInTheDocument();
    expect(screen.getByText(/Smarter Cities/i)).toBeInTheDocument();
    expect(screen.getByText(/Building a better Pune, together/i)).toBeInTheDocument();
    expect(screen.getByText(/MADE FOR OUR CITY · PMC CIVIC-AI/i)).toBeInTheDocument();
  });

  it('renders navigation links to Login and Register', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SplashScreen autoRedirect={false} />
        </AuthProvider>
      </MemoryRouter>
    );

    const loginLink = screen.getByRole('link', { name: /Citizen Sign In/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');

    const registerLink = screen.getByRole('link', { name: /Create Account/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('clicking "Get Started" navigates unauthenticated user to /login', () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/splash']}>
        <AuthProvider>
          <Routes>
            <Route path="/splash" element={<SplashScreen autoRedirect={false} />} />
            <Route path="/login" element={<div>Citizen Login Destination</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    const getStartedBtn = screen.getByRole('button', { name: /Get Started and enter portal/i });
    expect(getStartedBtn).toBeInTheDocument();

    fireEvent.click(getStartedBtn);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText(/Citizen Login Destination/i)).toBeInTheDocument();
  });

  it('autoRedirect transitions to /login after configured delay', () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/splash']}>
        <AuthProvider>
          <Routes>
            <Route path="/splash" element={<SplashScreen autoRedirect={true} redirectDelay={2000} />} />
            <Route path="/login" element={<div>Citizen Login Auto Transition</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('splash-screen')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText(/Citizen Login Auto Transition/i)).toBeInTheDocument();
  });
});
