import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { complaintApi, notificationApi } from '../services/api';

export const CitizenTopNav = ({
  onToggleSidebar,
  onOpenHelp,
  onOpenProfile,
  onOpenNotifications,
  unreadCount = 0,
}) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, languages, t } = useLanguage();
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Profile dropdown state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Language dropdown state
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await complaintApi.getComplaints({ search: q, limit: 6 });
        const list = res?.data?.complaints || res?.complaints || res?.data || [];
        setSearchResults(Array.isArray(list) ? list : []);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      navigate(`/complaints?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectResult = (complaintId) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(`/complaints/${complaintId}`);
  };

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
    <header className="citizen-top-nav" role="banner">
      <div className="citizen-top-nav__inner">
        {/* Left: Mobile hamburger & Logo (on mobile) */}
        <div className="citizen-top-nav__left">
          <button
            type="button"
            className="mobile-sidebar-toggle"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        {/* Center: Global Search Bar */}
        <div className="citizen-top-nav__search" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="global-search-form">
            <div className="global-search-input-wrap">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="global-search-icon"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="global-search-input"
                placeholder={t('searchPlaceholder', 'Search complaints by ID, title, or location...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setSearchOpen(true);
                }}
                aria-label="Search grievances"
              />
              {isSearching && (
                <span className="search-spinner spinner" aria-hidden="true" />
              )}
            </div>
          </form>

          {/* Autocomplete Dropdown */}
          {searchOpen && (
            <div className="search-results-dropdown" role="listbox">
              {searchResults.length > 0 ? (
                <>
                  <div className="search-results-header">
                    Matching Grievances ({searchResults.length})
                  </div>
                  {searchResults.map((item) => (
                    <div
                      key={item._id || item.id}
                      className="search-result-item"
                      role="option"
                      onClick={() => handleSelectResult(item._id || item.id)}
                    >
                      <div className="search-result-badge">
                        {item.complaintNumber || 'Grievance'}
                      </div>
                      <div className="search-result-body">
                        <div className="search-result-title">{item.title}</div>
                        <div className="search-result-meta">
                          <span>{item.category}</span>
                          <span>•</span>
                          <span>📍 {item.location?.address || 'Pune'}</span>
                        </div>
                      </div>
                      <span className="search-result-status badge badge-sm">
                        {item.status}
                      </span>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="search-results-view-all"
                    onClick={handleSearchSubmit}
                  >
                    View all results for "{searchQuery}" &rarr;
                  </button>
                </>
              ) : (
                <div className="search-results-empty">
                  No grievances matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section: Language, Theme, Notification, User Profile */}
        <div className="citizen-top-nav__actions">
          {/* Language Selector Dropdown */}
          <div className="nav-dropdown-wrap" ref={langRef}>
            <button
              type="button"
              className="nav-action-btn lang-select-btn"
              onClick={() => setLangOpen(!langOpen)}
              aria-label="Select Language"
              aria-expanded={langOpen}
            >
              <span className="lang-icon" aria-hidden="true">🌐</span>
              <span className="lang-code-text">{language.toUpperCase()}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {langOpen && (
              <div className="nav-dropdown-menu lang-dropdown-menu">
                <div className="nav-dropdown-header">Select Language / भाषा निवडा</div>
                {languages.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    className={`nav-dropdown-item ${language === l.code ? 'nav-dropdown-item--active' : ''}`}
                    onClick={() => {
                      setLanguage(l.code);
                      setLangOpen(false);
                    }}
                  >
                    <span className="lang-name">{l.native}</span>
                    <span className="lang-sub">({l.label})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle (Light / Dark Mode) */}
          <button
            type="button"
            className="nav-action-btn theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={`Toggle ${isDark ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Notification Bell */}
          <button
            type="button"
            className="nav-action-btn notif-bell-btn"
            onClick={onOpenNotifications}
            aria-label={`Notifications, ${unreadCount} unread`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="notif-badge-dot" aria-label={`${unreadCount} unread`}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Dropdown */}
          <div className="nav-dropdown-wrap" ref={profileRef}>
            <button
              type="button"
              className="user-profile-btn"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-label={`User profile for ${displayName}`}
              aria-expanded={profileOpen}
            >
              <div className="nav-user-avatar" aria-hidden="true">{initial}</div>
              <div className="nav-user-info hide-mobile">
                <span className="nav-user-name">{displayName}</span>
                <span className="nav-user-role">{displayRole}</span>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="hide-mobile">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {profileOpen && (
              <div className="nav-dropdown-menu profile-dropdown-menu">
                <div className="profile-dropdown-header">
                  <div className="profile-dropdown-name">{displayName}</div>
                  <div className="profile-dropdown-email">{displayEmail}</div>
                  <span className="badge badge-primary text-xs mt-1">{displayRole}</span>
                </div>

                <div className="profile-dropdown-divider" />

                <button
                  type="button"
                  className="nav-dropdown-item"
                  onClick={() => {
                    setProfileOpen(false);
                    if (onOpenProfile) onOpenProfile();
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>My Profile & Preferences</span>
                </button>

                <button
                  type="button"
                  className="nav-dropdown-item"
                  onClick={() => {
                    setProfileOpen(false);
                    if (onOpenHelp) onOpenHelp();
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Help Center & Helplines</span>
                </button>

                <div className="profile-dropdown-divider" />

                <button
                  type="button"
                  className="nav-dropdown-item text-danger"
                  onClick={handleLogout}
                  aria-label="Sign out of Citizen Portal"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      </div>
    </header>
  );
};

export default CitizenTopNav;
