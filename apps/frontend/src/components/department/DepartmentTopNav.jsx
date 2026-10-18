import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    if (searchQuery.trim()) {
      navigate(`/department/complaints?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
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
    <header className="dept-topnav admin-topnav" role="banner" style={{ borderBottom: '1px solid var(--border-color, #E2E8F0)' }}>
      {/* Left: Mobile hamburger & Department Title */}
      <div className="admin-topnav-left" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          type="button"
          className="admin-mobile-menu-btn"
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
            <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0B1D33)' }}>
              Department Operations Dashboard
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
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', marginTop: '2px', display: 'flex', gap: '12px' }}>
            <span>📅 {currentDateStr}</span>
            <span>•</span>
            <span>
              Updated: <strong style={{ color: 'var(--text-primary, #0B1D33)' }}>{lastRefreshStr}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Search bar */}
      <div className="admin-topnav-center" style={{ flex: 1, maxWidth: '420px', margin: '0 20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative', width: '100%' }}>
          <input
            type="search"
            placeholder="Search complaint #, category, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{
              paddingLeft: '34px',
              height: '38px',
              fontSize: '13px',
              borderRadius: '8px',
              background: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-color, #E2E8F0)',
            }}
          />
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8',
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </form>
      </div>

      {/* Right: Actions, Refresh, Dark mode, Notifications, Profile */}
      <div className="admin-topnav-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Refresh Button */}
        {onRefresh && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            title="Refresh dashboard data"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          className="admin-icon-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            color: 'var(--text-primary, #0B1D33)',
          }}
        >
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            type="button"
            className="admin-icon-btn"
            onClick={() => setShowNotificationMenu((prev) => !prev)}
            aria-label={`Notifications, ${unreadCount} unread`}
            style={{
              position: 'relative',
              background: 'transparent',
              border: '1px solid var(--border-color, #E2E8F0)',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: 'var(--text-primary, #0B1D33)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  padding: '1px 5px',
                  lineHeight: '14px',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotificationMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '320px',
                background: 'var(--bg-card, #FFFFFF)',
                border: '1px solid var(--border-color, #E2E8F0)',
                borderRadius: '10px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color, #E2E8F0)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary, #0B1D33)' }}>
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
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id || n.id}
                      onClick={() => handleMarkAsRead(n._id || n.id)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--border-color, #F1F5F9)',
                        background: n.isRead ? 'transparent' : 'rgba(13, 148, 136, 0.05)',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ fontWeight: n.isRead ? 500 : 700, color: 'var(--text-primary, #0B1D33)' }}>
                        {n.title}
                      </div>
                      <div style={{ color: 'var(--text-muted, #64748B)', marginTop: '2px', lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>
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
        <div style={{ position: 'relative' }} ref={profileRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              border: '1px solid var(--border-color, #E2E8F0)',
              borderRadius: '8px',
              padding: '4px 10px 4px 6px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#0D9488',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {initial}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }} className="hidden-sm">
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #0B1D33)', display: 'block' }}>
                {displayName}
              </span>
              <span style={{ fontSize: '10px', color: '#0D9488', fontWeight: 600 }}>
                {deptTitle}
              </span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94A3B8' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '220px',
                background: 'var(--bg-card, #FFFFFF)',
                border: '1px solid var(--border-color, #E2E8F0)',
                borderRadius: '10px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                padding: '6px 0',
              }}
            >
              <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-color, #E2E8F0)' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary, #0B1D33)' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>{user?.email}</div>
                <div style={{ fontSize: '10px', color: '#0D9488', fontWeight: 700, marginTop: '2px' }}>
                  {deptTitle} Admin
                </div>
              </div>

              <Link
                to="/department/settings"
                onClick={() => setShowProfileMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  color: 'var(--text-primary, #0B1D33)',
                  textDecoration: 'none',
                }}
              >
                <span>⚙️ Profile & Settings</span>
              </Link>

              <Link
                to="/department/help"
                onClick={() => setShowProfileMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  color: 'var(--text-primary, #0B1D33)',
                  textDecoration: 'none',
                }}
              >
                <span>❓ Help & Support</span>
              </Link>

              <div style={{ borderTop: '1px solid var(--border-color, #E2E8F0)', margin: '4px 0' }} />

              <button
                type="button"
                onClick={async () => {
                  setShowProfileMenu(false);
                  await logout();
                  navigate('/login', { replace: true });
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  color: '#EF4444',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span>🚪 Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DepartmentTopNav;
