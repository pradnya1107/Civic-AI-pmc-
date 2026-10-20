import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const DepartmentSidebar = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  departmentName,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = user?.fullName || user?.name || 'Department Admin';
  const deptTitle = departmentName || user?.departmentName || 'Civic Operations';
  const initial = displayName.charAt(0).toUpperCase() || 'D';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    {
      to: '/department/dashboard',
      label: 'Dashboard Overview',
      shortLabel: 'Overview',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
    {
      to: '/department/complaints',
      end: true,
      label: 'Complaint Management',
      shortLabel: 'Complaints',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      ),
    },
    {
      to: '/department/complaints?filter=assigned',
      label: 'Assigned Complaints',
      shortLabel: 'Assigned',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <polyline points="17 11 19 13 23 9" />
        </svg>
      ),
      isActive: () =>
        location.pathname === '/department/complaints' &&
        location.search.includes('filter=assigned'),
    },
    {
      to: '/department/complaints?filter=priority_overdue',
      label: 'Priority & Overdue Cases',
      shortLabel: 'Priority',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      isActive: () =>
        location.pathname === '/department/complaints' &&
        location.search.includes('filter=priority_overdue'),
    },
    {
      to: '/department/officers',
      label: 'Officer / Field Workers',
      shortLabel: 'Officers',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      to: '/department/verification',
      label: 'Resolution Verification',
      shortLabel: 'Verification',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      to: '/department/analytics',
      label: 'Department Analytics',
      shortLabel: 'Analytics',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      to: '/department/notifications',
      label: 'Notifications',
      shortLabel: 'Alerts',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      to: '/department/settings',
      label: 'Profile & Settings',
      shortLabel: 'Settings',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
    {
      to: '/department/help',
      label: 'Help & Support',
      shortLabel: 'Help',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`dept-sidebar admin-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
        aria-label="Department Operations Navigation"
      >
        {/* Brand / Department Header */}
        <div className="admin-sidebar-header">
          <Link to="/department/dashboard" className="admin-brand-link" title="CivicAI Operations Center">
            <div className="admin-brand-logo-wrap" style={{ background: '#0D9488' }} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18" />
                <path d="M5 21V7l7-4 7 4v14" />
                <path d="M9 10a2 2 0 0 1 4 0v11" />
              </svg>
            </div>
            {!isCollapsed && (
              <div className="admin-brand-text-wrap">
                <span className="admin-brand-title">CivicAI PMC</span>
                <span
                  className="dept-brand-badge"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#0D9488',
                    background: 'rgba(13, 148, 136, 0.12)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    display: 'inline-block',
                    maxWidth: '160px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {deptTitle}
                </span>
              </div>
            )}
          </Link>

          {/* Collapse Toggle */}
          <button
            type="button"
            className="admin-sidebar-collapse-btn"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isCollapsed ? (
                <polyline points="9 18 15 12 9 6" />
              ) : (
                <polyline points="15 18 9 12 15 6" />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="admin-sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
          <ul className="admin-nav-list">
            {navItems.map((item) => {
              const active = item.isActive
                ? item.isActive()
                : item.end
                ? location.pathname === item.to && !location.search
                : location.pathname === item.to;

              return (
                <li key={item.to} className="admin-nav-item">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={`admin-nav-link ${active ? 'active' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                    onClick={onCloseMobile}
                    style={active ? { borderLeft: '3px solid #0D9488', color: '#0D9488' } : {}}
                  >
                    <span className="admin-nav-icon">{item.icon}</span>
                    {!isCollapsed && <span className="admin-nav-label">{item.label}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer: User profile and logout */}
        <div className="admin-sidebar-footer">
          <div className="admin-footer-profile" title={`Signed in as ${displayName}`}>
            <div className="admin-avatar-circle" style={{ background: '#0D9488', color: '#FFFFFF' }} aria-hidden="true">
              {initial}
            </div>
            {!isCollapsed && (
              <div className="admin-profile-meta">
                <span className="admin-profile-name">{displayName}</span>
                <span className="admin-profile-role" style={{ color: '#0D9488' }}>
                  Dept Administrator
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="admin-logout-btn"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="Sign out of Department Admin Portal"
            title="Sign Out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!isCollapsed && <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default DepartmentSidebar;
