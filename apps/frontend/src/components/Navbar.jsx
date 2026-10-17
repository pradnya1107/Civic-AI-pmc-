import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = user?.name || user?.fullName || 'Citizen';
  const displayRole = user?.role || 'CITIZEN';
  const initial = displayName.charAt(0).toUpperCase() || 'C';

  return (
    <header className="portal-nav" role="banner">
      <div className="portal-nav__inner">
        {/* Brand / Logo */}
        <Link to="/dashboard" className="portal-brand" aria-label="CivicAI PMC Dashboard">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-primary)' }} aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="portal-brand-text">CivicAI PMC</span>
          <span className="portal-badge">Citizen Portal</span>
        </Link>

        {/* Navigation Links */}
        <nav className={`portal-nav__links ${mobileMenuOpen ? 'portal-nav__links--open' : ''}`} aria-label="Portal Navigation">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/complaints"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            My Complaints
          </NavLink>
          <NavLink
            to="/heatmap"
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            🗺️ AI Heatmap
          </NavLink>
          <NavLink
            to="/complaints/new"
            className={({ isActive }) => `btn btn-primary btn-sm ${isActive ? 'btn-primary--active' : ''}`}
            style={{ textDecoration: 'none' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Report an Issue</span>
          </NavLink>
        </nav>

        {/* User profile, Notifications & Logout */}
        <div className="portal-user-section">
          <NotificationBell />

          <div className="user-profile-badge" aria-label={`Logged in as ${displayName}`}>
            <div className="user-avatar" aria-hidden="true">{initial}</div>
            <div className="user-meta">
              <div className="user-meta-name">{displayName}</div>
              <div className="user-meta-role">{displayRole}</div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="Sign out of Citizen Portal"
            id="logout-button"
          >
            {isLoggingOut ? (
              <>
                <span className="spinner" style={{ width: '0.85rem', height: '0.85rem' }} aria-hidden="true" />
                <span className="hide-mobile">Signing out...</span>
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="hide-mobile">Sign Out</span>
              </>
            )}
          </button>

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
