import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { notificationApi } from '../../services/api';

export const DepartmentTopNav = ({
  departmentName,
  lastRefreshed,
  onRefresh,
  onOpenMobile,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const displayName = user?.fullName || user?.name || 'Department Admin';
  const deptTitle = departmentName || user?.departmentName || 'Civic Operations';
  const initial = displayName.charAt(0).toUpperCase() || 'D';

  const [isNavSpinning, setIsNavSpinning] = useState(false);

  const handleNavRefresh = () => {
    setIsNavSpinning(true);
    setTimeout(() => setIsNavSpinning(false), 800);
    if (onRefresh) onRefresh();
  };

  const currentDateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const lastRefreshStr = lastRefreshed
    ? new Date(lastRefreshed).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Just now';

  // Sync search input with URL search param when on complaints page
  useEffect(() => {
    if (location.pathname === '/department/complaints') {
      const sp = new URLSearchParams(location.search);
      const query = sp.get('search');
      if (query !== null) {
        setSearchQuery(query);
      }
    }
  }, [location.pathname, location.search]);

  // Fetch notifications
  const loadNotifications = async () => {
    try {
      const res = await notificationApi.getNotifications({ limit: 5 });
      const list = res?.data?.notifications || res?.notifications || [];
      setNotifications(Array.isArray(list) ? list : []);
      const unread = list.filter((n) => !n.isRead).length;
      setUnreadCount(res?.data?.unreadCount !== undefined ? res.data.unreadCount : unread);
    } catch {
      // Fallback silently
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotificationMenu(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    navigate(`/department/complaints${query ? `?search=${encodeURIComponent(query)}` : ''}`);
  };

  const handleMarkAsRead = async (notifId) => {
    try {
      await notificationApi.markAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId || n.id === notifId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignore
    }
  };

  return (
    <header className="dept-topnav admin-topnav" role="banner">
      {/* Left: Mobile hamburger & Department Title */}
      <div className="admin-topnav-left">
        <button
          type="button"
          className="admin-mobile-toggle-btn"
          onClick={onOpenMobile}
          aria-label="Open navigation sidebar"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="dept-header-title-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--color-text-main, #0B1D33)' }}>
              Department Operations
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#0D9488',
                background: 'rgba(13, 148, 136, 0.12)',
                border: '1px solid rgba(13, 148, 136, 0.25)',
                padding: '2px 8px',
                borderRadius: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {deptTitle}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-dim, #64748B)', marginTop: '2px', display: 'flex', gap: '10px' }}>
            <span>📅 {currentDateStr}</span>
            <span>•</span>
            <span>
              Updated: <strong style={{ color: 'var(--color-text-main, #0B1D33)' }}>{lastRefreshStr}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Search bar */}
      <div className="admin-topnav-center">
        <form onSubmit={handleSearchSubmit} className="admin-quick-search-form" role="search">
          <div className="admin-search-input-wrap">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="admin-search-icon"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              className="admin-quick-search-input"
              placeholder="Search complaint #, category, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search department complaints"
              id="dept-global-search"
            />
          </div>
        </form>
      </div>

      {/* Right: Actions, Refresh, Dark mode, Notifications, Profile */}
      <div className="admin-topnav-right">
        {/* Refresh Button */}
        {onRefresh && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleNavRefresh}
            title="Refresh dashboard data"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                display: 'inline-block',
                animation: isNavSpinning ? 'spin 0.75s linear' : 'none',
              }}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span className="hidden-sm">Refresh</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          type="button"
          className="admin-theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={theme === 'dark' ? 'Switch to Light Mode (Sun ☀️)' : 'Switch to Dark Mode (Moon 🌙)'}
          id="dept-theme-toggle"
        >
          <div className={`theme-toggle-inner ${theme === 'dark' ? 'is-dark' : 'is-light'}`}>
            {theme === 'dark' ? (
              <span className="theme-icon moon-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </span>
            ) : (
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

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            type="button"
            className="admin-notif-btn"
            onClick={() => setShowNotificationMenu((prev) => !prev)}
            aria-label={`Notifications, ${unreadCount} unread`}
            title="Notifications"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="admin-notif-badge" aria-hidden="true">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotificationMenu && (
            <div
              className="admin-dropdown-menu"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '320px',
                zIndex: 1000,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-main)' }}>
                  Notifications ({unreadCount})
                </span>
                <Link
                  to="/department/notifications"
                  onClick={() => setShowNotificationMenu(false)}
                  style={{ fontSize: '12px', color: '#0D9488', textDecoration: 'none', fontWeight: 600 }}
                >
                  View All
                </Link>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '13px' }}>
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id || n.id}
                      onClick={() => handleMarkAsRead(n._id || n.id)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--color-border)',
                        background: n.isRead ? 'transparent' : 'rgba(13, 148, 136, 0.08)',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ fontWeight: n.isRead ? 500 : 700, color: 'var(--color-text-main)' }}>
                        {n.title}
                      </div>
                      <div style={{ color: 'var(--color-text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginTop: '4px' }}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="admin-profile-dropdown-wrap" ref={profileRef}>
          <button
            type="button"
            className="admin-profile-trigger-btn"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            aria-expanded={showProfileMenu}
            aria-haspopup="true"
            aria-label="Department Administrator profile menu"
          >
            <div
              className="admin-profile-avatar"
              style={{ background: 'linear-gradient(135deg, #0D9488, #0B1D33)' }}
              aria-hidden="true"
            >
              {initial}
            </div>
            <div className="admin-profile-summary hidden-sm">
              <span className="admin-profile-name-short">{displayName}</span>
              <span className="admin-role-pill" style={{ color: '#0D9488' }}>
                {deptTitle}
              </span>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`dropdown-chevron ${showProfileMenu ? 'open' : ''}`}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showProfileMenu && (
            <div className="admin-dropdown-menu" role="menu" style={{ width: '230px' }}>
              <div className="admin-dropdown-header">
                <div className="admin-dropdown-user-name">{displayName}</div>
                <div className="admin-dropdown-user-email">{user?.email}</div>
                <div className="admin-dropdown-role-tag" style={{ color: '#0D9488' }}>
                  {deptTitle} Admin
                </div>
              </div>

              <div className="admin-dropdown-divider" />

              <Link
                to="/department/settings"
                className="admin-dropdown-item"
                role="menuitem"
                onClick={() => setShowProfileMenu(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Profile & Settings</span>
              </Link>

              <Link
                to="/department/help"
                className="admin-dropdown-item"
                role="menuitem"
                onClick={() => setShowProfileMenu(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Help & Guidelines</span>
              </Link>

              <div className="admin-dropdown-divider" />

              <button
                type="button"
                className="admin-dropdown-item admin-logout-item"
                role="menuitem"
                onClick={async () => {
                  setShowProfileMenu(false);
                  await logout();
                  navigate('/login', { replace: true });
                }}
                style={{ width: '100%', textAlign: 'left', color: 'var(--color-error)' }}
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

export default DepartmentTopNav;
