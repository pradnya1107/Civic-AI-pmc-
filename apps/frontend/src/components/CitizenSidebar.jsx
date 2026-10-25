import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const CitizenSidebar = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

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

          <NavLink
            to="/settings"
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
            onClick={onClose}
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span className="sidebar-link-text">{t('navSettings', 'Settings')}</span>
          </NavLink>

        </nav>

        {/* Sidebar Footer: User Card */}
        <div className="sidebar-footer">
          {/* User Mini Profile */}
          <Link
            to="/settings"
            className="sidebar-user-card"
            aria-label={`Logged in as ${displayName}. Open Settings & Security`}
            onClick={onClose}
            style={{ textDecoration: 'none' }}
          >
            <div className="sidebar-user-avatar" aria-hidden="true">{initial}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{displayName}</div>
              <div className="sidebar-user-email">{displayEmail}</div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
};

export default CitizenSidebar;
