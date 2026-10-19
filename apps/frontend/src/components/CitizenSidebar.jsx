import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export const CitizenSidebar = ({
  isOpen,
  onClose,
  onOpenHelp,
  onOpenProfile,
  onOpenNotifications,
  unreadCount = 0,
}) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  const displayName = user?.name || user?.fullName || 'Citizen';
  const displayEmail = user?.email || 'N/A';
  const displayRole = user?.role || 'CITIZEN';
  const initial = displayName.charAt(0).toUpperCase() || 'C';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`citizen-sidebar ${isOpen ? 'citizen-sidebar--open' : ''}`}
        aria-label="Citizen Portal Navigation"
      >
        {/* Brand Header */}
        <div className="sidebar-brand">
          <Link to="/dashboard" className="sidebar-brand-link" onClick={onClose}>
            <div className="sidebar-brand-logo" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="sidebar-brand-text">
              <span className="brand-title">CivicAI PMC</span>
              <span className="brand-badge">Smart City</span>
            </div>
          </Link>
          <button
            type="button"
            className="sidebar-close-mobile-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            &times;
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">MAIN SERVICES</div>

          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
            onClick={onClose}
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
            </span>
            <span className="sidebar-link-text">{t('navOverview', 'Overview')}</span>
          </NavLink>

          <NavLink
            to="/complaints/new"
            className={({ isActive }) => `sidebar-link sidebar-link--highlight ${isActive ? 'sidebar-link--active' : ''}`}
            onClick={onClose}
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </span>
            <span className="sidebar-link-text">{t('navReportIssue', 'Report an Issue')}</span>
            <span className="sidebar-badge-new">AI</span>
          </NavLink>

          <NavLink
            to="/complaints"
            end
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
            onClick={onClose}
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </span>
            <span className="sidebar-link-text">{t('navMyComplaints', 'My Complaints')}</span>
          </NavLink>

          <NavLink
            to="/heatmap"
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
            onClick={onClose}
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
            </span>
            <span className="sidebar-link-text">{t('navExploreMap', 'Explore Map')}</span>
          </NavLink>

          <div className="sidebar-section-label mt-3">CITIZEN TOOLS</div>

          <button
            type="button"
            className="sidebar-link sidebar-btn-link"
            onClick={() => {
              if (onOpenNotifications) onOpenNotifications();
              onClose();
            }}
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </span>
            <span className="sidebar-link-text">{t('navNotifications', 'Notifications')}</span>
            {unreadCount > 0 && (
              <span className="sidebar-counter">{unreadCount}</span>
            )}
          </button>

          <button
            type="button"
            className="sidebar-link sidebar-btn-link"
            onClick={() => {
              if (onOpenHelp) onOpenHelp();
              onClose();
            }}
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <span className="sidebar-link-text">{t('navHelpSupport', 'Help & Support')}</span>
          </button>

          <button
            type="button"
            className="sidebar-link sidebar-btn-link"
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              onClose();
            }}
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <span className="sidebar-link-text">{t('navProfile', 'Profile')}</span>
          </button>
        </nav>

        {/* Sidebar Footer: Theme Toggle, User Card, Sign Out */}
        <div className="sidebar-footer">
          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            className="theme-switch-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            <span className="theme-switch-icon" aria-hidden="true">
              {isDark ? '☀️' : '🌙'}
            </span>
            <span className="theme-switch-label">
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          {/* User Mini Profile */}
          <div className="sidebar-user-card" aria-label={`Logged in as ${displayName}`}>
            <div className="sidebar-user-avatar" aria-hidden="true">{initial}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{displayName}</div>
              <div className="sidebar-user-email">{displayEmail}</div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            className="btn btn-outline btn-sm sidebar-logout-btn"
            onClick={handleLogout}
            aria-label="Sign out of Citizen Portal"
            id="logout-button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>{t('navSignOut', 'Sign Out')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default CitizenSidebar;
