import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LandingPage } from '../pages/LandingPage';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

// Helper to render LandingPage with providers
const renderLandingPage = (authContextValue = {}) => {
  const defaultAuth = {
    isAuthenticated: false,
    user: null,
    token: null,
    login: vi.fn(),
    logout: vi.fn(),
    ...authContextValue,
  };

  return render(
    <MemoryRouter initialEntries={['/']}>
      <ThemeProvider>
        <AuthContext.Provider value={defaultAuth}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<div data-testid="login-destination">Login Screen</div>} />
            <Route path="/dashboard" element={<div data-testid="dashboard-destination">Citizen Dashboard</div>} />
          </Routes>
        </AuthContext.Provider>
      </ThemeProvider>
    </MemoryRouter>
  );
};

describe('CivicAI LandingPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the Civic AI logo, brand header, and PMC municipal portal badge', () => {
    renderLandingPage();

    expect(screen.getByTestId('civic-landing-page')).toBeInTheDocument();
    expect(screen.getAllByText(/Civic/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PMC Municipal Platform/i).length).toBeGreaterThan(0);

    // Check images with alt "Civic AI Logo"
    const logoImgs = screen.getAllByAltText('Civic AI Logo');
    expect(logoImgs.length).toBeGreaterThan(0);
  });

  it('renders hero headline, subtitle, and exact description of what Civic AI is', () => {
    renderLandingPage();

    expect(screen.getByText(/CIVIC AI PLATFORM/i)).toBeInTheDocument();
    expect(screen.getByText(/Intelligent Citizen Redressal & City Governance/i)).toBeInTheDocument();
    expect(screen.getByText(/CivicAI is Pune’s premier AI-powered civic grievance redressal platform/i)).toBeInTheDocument();
    expect(screen.getByText(/PUNE MUNICIPAL CORPORATION · CIVIC INTELLIGENCE/i)).toBeInTheDocument();
  });

  it('Requirement: "Get Started" buttons link directly to the /login page', () => {
    renderLandingPage();

    // 1. Navbar "Get Started"
    const navGetStarted = screen.getByRole('link', { name: /^Get Started$/i });
    expect(navGetStarted).toHaveAttribute('href', '/login');

    // 2. All "Get Started →" CTAs in hero, card, and bottom banner
    const getStartedArrows = screen.getAllByRole('link', { name: /Get Started/i });
    expect(getStartedArrows.length).toBeGreaterThanOrEqual(4);
    getStartedArrows.forEach((btn) => {
      expect(btn).toHaveAttribute('href', '/login');
    });

    // 3. Sign in link
    const signInLink = screen.getByRole('link', { name: /^Sign In$/i });
    expect(signInLink).toHaveAttribute('href', '/login');
  });

  it('switches between Citizen, Officer, and Super Admin preview roles interactively', () => {
    renderLandingPage();

    // Default: Citizen tab
    expect(screen.getByText(/CITIZEN REPORTING PORTAL/i)).toBeInTheDocument();
    expect(screen.getByText(/Pothole & Road Cave-in on Senapati Bapat Road/i)).toBeInTheDocument();

    // Click Officer tab
    const officerTab = screen.getByRole('tab', { name: /🏢 Officer/i });
    fireEvent.click(officerTab);
    expect(screen.getByText(/DEPARTMENT DISPATCH CONSOLE/i)).toBeInTheDocument();
    expect(screen.getByText(/Overflowing Waste Container near Swargate Depot/i)).toBeInTheDocument();

    // Click Super Admin tab
    const adminTab = screen.getByRole('tab', { name: /🛡️ Super Admin/i });
    fireEvent.click(adminTab);
    expect(screen.getByText(/SUPER ADMIN COMMAND CENTER/i)).toBeInTheDocument();
    expect(screen.getByText(/City-Wide SLA & Ward Density Hotspots/i)).toBeInTheDocument();
  });

  it('renders all 4 process steps of How Civic AI Works', () => {
    renderLandingPage();

    expect(screen.getByText(/Snap & Geotag/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Vision Scan/i)).toBeInTheDocument();
    expect(screen.getByText(/Department Routing/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified Resolution/i)).toBeInTheDocument();
  });

  it('renders all key municipal departments supported by PMC', () => {
    renderLandingPage();

    expect(screen.getByText(/Roads & Traffic/i)).toBeInTheDocument();
    expect(screen.getByText(/Solid Waste Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Water Supply & Drainage/i)).toBeInTheDocument();
    expect(screen.getByText(/Street Lighting & Electrical/i)).toBeInTheDocument();
    expect(screen.getByText(/Public Health & Sanitation/i)).toBeInTheDocument();
    expect(screen.getByText(/Gardens & Tree Management/i)).toBeInTheDocument();
  });

  it('renders FAQ accordion and toggles questions open and closed', () => {
    renderLandingPage();

    // First FAQ is open by default
    expect(screen.getByText(/What is the PMC Working-Day SLA System\?/i)).toBeInTheDocument();

    // Click on "What is the PMC Working-Day SLA System?" question to expand it
    const slaFaqButton = screen.getByRole('button', { name: /What is the PMC Working-Day SLA System\?/i });
    fireEvent.click(slaFaqButton);

    expect(screen.getByText(/Civic AI features a specialized municipal SLA engine tuned to Pune Municipal Corporation rules/i)).toBeInTheDocument();
  });

  it('displays "Go to Dashboard" when user is already authenticated', () => {
    renderLandingPage({
      isAuthenticated: true,
      user: { name: 'Pradnya Ghodke', role: 'CITIZEN' },
    });

    const dashboardLink = screen.getByRole('link', { name: /Go to Dashboard →/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });
});
