import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { notificationApi } from '../../services/api';
import { NotificationBell } from '../NotificationBell';

export const AdminTopNav = ({ onOpenMobile }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const profileMenuRef = useRef(null);

  const displayName = user?.name || user?.fullName || 'Super Admin';
  const displayEmail = user?.email || 'admin@civicai.com';
  const displayRole = user?.role || 'SUPER_ADMIN';
  const initial = displayName.charAt(0).toUpperCase() || 'A';

  // Fetch notifications for badge
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await notificationApi.getNotifications({ unreadOnly: true, limit: 10 });
        const list = res?.data?.notifications || res?.notifications || [];
        if (isMounted) {
          const unread = Array.isArray(list) ? list.filter((n) => !n.isRead).length : 0;
          setUnreadCount(unread);
        }
      } catch {
        // Graceful fallback
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Compute breadcrumbs and title from pathname
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/admin' || path === '/dashboard') {
      return [{ label: 'Municipal Administration', to: '/admin' }, { label: 'Overview' }];
    }
    if (path.startsWith('/admin/complaints')) {
      return [{ label: 'Administration', to: '/admin' }, { label: 'Complaints Directory' }];
    }
    if (path.startsWith('/admin/departments')) {
      return [{ label: 'Administration', to: '/admin' }, { label: 'Departments Management' }];
    }
    if (path.startsWith('/admin/department-admins')) {
      return [{ label: 'Administration', to: '/admin' }, { label: 'Department Administrators' }];
    }
    if (path.startsWith('/admin/citizens')) {
      return [{ label: 'Administration', to: '/admin' }, { label: 'Citizens Directory' }];
    }
    if (path.startsWith('/admin/analytics')) {
      return [{ label: 'Administration', to: '/admin' }, { label: 'Analytics & Performance' }];
    }
    if (path.startsWith('/admin/notifications')) {
      return [{ label: 'Administration', to: '/admin' }, { label: 'Alerts & Notifications' }];
    }
    if (path.startsWith('/admin/settings')) {
      return [{ label: 'Administration', to: '/admin' }, { label: 'Portal Settings' }];
    }
    return [{ label: 'Super Admin', to: '/admin' }];
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin/complaints?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="admin-topnav" role="banner">
      {/* Left Section: Mobile toggle & Breadcrumbs */}
      <div className="admin-topnav-left">
        <button
          type="button"
          className="admin-mobile-toggle-btn"
          onClick={onOpenMobile}
          aria-label="Open mobile navigation drawer"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Breadcrumb Trail */}
        <nav className="admin-breadcrumbs" aria-label="Breadcrumb navigation">
          <ol className="admin-breadcrumb-list">
            <li className="admin-breadcrumb-item">
              <Link to="/admin" className="admin-breadcrumb-link" title="Super Admin Home">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span className="sr-only">Home</span>
              </Link>
            </li>
            {breadcrumbs.map((crumb, idx) => (
              <li key={idx} className="admin-breadcrumb-item">
                <span className="admin-breadcrumb-sep" aria-hidden="true">/</span>
                {crumb.to ? (
                  <Link to={crumb.to} className="admin-breadcrumb-link">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="admin-breadcrumb-current" aria-current="page">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Center Search Control */}
      <div className="admin-topnav-center">
        <form onSubmit={handleSearchSubmit} className="admin-quick-search-form" role="search">
          <div className="admin-search-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="admin-search-icon" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              className="admin-quick-search-input"
              placeholder="Search complaints, IDs, citizens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Quick search through complaints and records"
              id="admin-global-search"
            />
          </div>
        </form>
      </div>

      {/* Right Controls: Theme Toggle, Notifications, Profile Menu */}
      <div className="admin-topnav-right">
        {/* Animated Sun ☀️ / Moon 🌙 Theme Switcher */}
        <button
          type="button"
          className="admin-theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={isDark ? 'Switch to Light Mode (Sun ☀️)' : 'Switch to Dark Mode (Moon 🌙)'}
          id="theme-toggle-button"
        >
          <div className={`theme-toggle-inner ${isDark ? 'is-dark' : 'is-light'}`}>
            {isDark ? (
              // Moon Icon with animated stars
              <span className="theme-icon moon-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </span>
            ) : (
              // Sun Icon with glowing rays
              <span className="theme-icon sun-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              </span>
            )}
          </div>
        </button>

        {/* Unified CivicAI Notification Bell Component */}
        <NotificationBell role="ADMIN" className="admin-unified-bell" />

        {/* Quick Action Button */}
        <Link
          to="/admin/departments"
          className="admin-quick-add-btn"
          title="Manage & Create Departments"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="quick-add-text">Department</span>
        </Link>

        {/* Profile Avatar Dropdown */}
        <div className="admin-profile-dropdown-wrap" ref={profileMenuRef}>
          <button
            type="button"
            className="admin-profile-trigger-btn"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="true"
            aria-label="User profile and portal options"
            id="admin-profile-dropdown-trigger"
          >
            <div className="admin-profile-avatar" aria-hidden="true">
              {initial}
            </div>
            <div className="admin-profile-summary">
              <span className="admin-profile-name-short">{displayName}</span>
              <span className="admin-role-pill">{displayRole}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`dropdown-chevron ${isProfileMenuOpen ? 'open' : ''}`} aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isProfileMenuOpen && (
            <div className="admin-dropdown-menu" role="menu">
              <div className="admin-dropdown-header">
                <div className="admin-dropdown-user-name">{displayName}</div>
                <div className="admin-dropdown-user-email">{displayEmail}</div>
                <div className="admin-dropdown-role-tag">Municipal Super Admin</div>
              </div>

              <div className="admin-dropdown-divider" />

              <Link
                to="/admin"
                className="admin-dropdown-item"
                role="menuitem"
                onClick={() => setIsProfileMenuOpen(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Dashboard Overview</span>
              </Link>

              <Link
                to="/admin/settings"
                className="admin-dropdown-item"
                role="menuitem"
                onClick={() => setIsProfileMenuOpen(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Portal Settings</span>
              </Link>

              <div className="admin-dropdown-divider" />

              <button
                type="button"
                className="admin-dropdown-item danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminTopNav;
