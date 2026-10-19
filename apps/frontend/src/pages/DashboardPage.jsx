import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { CitizenSidebar } from '../components/CitizenSidebar';
import { CitizenTopNav } from '../components/CitizenTopNav';
import { StatusBadge } from '../components/StatusBadge';
import { NearbyIssuesMap } from '../components/NearbyIssuesMap';
import { HelpCenterModal } from '../components/HelpCenterModal';
import { ProfileModal } from '../components/ProfileModal';
import { NotificationDrawer } from '../components/NotificationDrawer';
import { VoiceGreeting } from '../components/VoiceGreeting';
import { complaintApi, notificationApi } from '../services/api';
import { PMC_CATEGORIES } from './ComplaintFormPage';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Layout UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Quick Tracking state
  const [trackingIdInput, setTrackingIdInput] = useState('');
  const [trackingError, setTrackingError] = useState('');

  // Geolocation state for welcome banner
  const [currentArea, setCurrentArea] = useState('Pune Municipal Corporation');
  const [locationDetecting, setLocationDetecting] = useState(false);

  // Live Statistics & Complaints state
  const [complaints, setComplaints] = useState([]);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    communitySupport: 0,
  });

  // Recent Complaints Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Recent Activity Feed
  const [activities, setActivities] = useState([]);

  // Fetch data on mount
  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        setLoadingComplaints(true);

        // Fetch user's complaints
        const res = await complaintApi.getComplaints({ limit: 100 });
        const list = res?.data?.complaints || res?.complaints || res?.data || [];

        if (Array.isArray(list) && isMounted) {
          setComplaints(list);

          // Calculate real live stats
          let pendingCount = 0;
          let inProgressCount = 0;
          let resolvedCount = 0;
          let supportCount = 0;

          list.forEach((c) => {
            const st = (c.status || '').toUpperCase();
            if (st === 'SUBMITTED' || st === 'UNDER_REVIEW') {
              pendingCount++;
            } else if (st === 'ASSIGNED' || st === 'IN_PROGRESS') {
              inProgressCount++;
            } else if (st === 'RESOLVED' || st === 'CLOSED') {
              resolvedCount++;
            }
            supportCount += c.supportCount || 1;
          });

          setStats({
            total: list.length,
            pending: pendingCount,
            inProgress: inProgressCount,
            resolved: resolvedCount,
            communitySupport: supportCount,
          });
        }

        // Fetch notifications for unread count and activity feed
        try {
          const notifRes = await notificationApi.getNotifications({ limit: 8 });
          const notifList = notifRes?.data?.notifications || notifRes?.notifications || notifRes?.data || [];
          if (Array.isArray(notifList) && isMounted) {
            setActivities(notifList);
            const unread = notifList.filter((n) => !n.isRead && !n.read).length;
            setUnreadNotifCount(unread);
          }
        } catch {
          // Graceful fallback
        }
      } catch (err) {
        // Fallback gracefully
      } finally {
        if (isMounted) setLoadingComplaints(false);
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Request location for welcome banner area
  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setLocationDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocationDetecting(false);
        const { latitude, longitude } = pos.coords;
        // Approximation of Pune Wards
        if (latitude > 18.52 && longitude < 73.83) {
          setCurrentArea('Aundh / Baner, Pune');
        } else if (latitude > 18.51 && longitude > 73.83 && longitude < 73.87) {
          setCurrentArea('Shivajinagar / Ghole Rd, Pune');
        } else if (latitude < 18.51 && longitude < 73.83) {
          setCurrentArea('Kothrud / Bavdhan, Pune');
        } else if (latitude < 18.50 && longitude > 73.84) {
          setCurrentArea('Bibwewadi / Dhankawadi, Pune');
        } else {
          setCurrentArea(`Pune (GPS: ${latitude.toFixed(3)}, ${longitude.toFixed(3)})`);
        }
      },
      () => {
        setLocationDetecting(false);
        setCurrentArea('Pune Municipal Corporation');
      },
      { timeout: 5000 },
    );
  };

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    const q = trackingIdInput.trim();
    if (!q) {
      setTrackingError('Please enter a complaint number or ID.');
      return;
    }
    navigate(`/complaints?search=${encodeURIComponent(q)}`);
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

  // Filtered and sorted complaints list
  const filteredComplaints = complaints
    .filter((c) => {
      const st = (c.status || '').toUpperCase();
      let matchStatus = true;
      if (statusFilter === 'PENDING') {
        matchStatus = st === 'SUBMITTED' || st === 'UNDER_REVIEW';
      } else if (statusFilter === 'IN_PROGRESS') {
        matchStatus = st === 'ASSIGNED' || st === 'IN_PROGRESS';
      } else if (statusFilter === 'RESOLVED') {
        matchStatus = st === 'RESOLVED' || st === 'CLOSED';
      }

      const matchCategory = !categoryFilter || c.category === categoryFilter;

      const q = tableSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (c.complaintNumber && c.complaintNumber.toLowerCase().includes(q)) ||
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.location?.address && c.location.address.toLowerCase().includes(q));

      return matchStatus && matchCategory && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (sortBy === 'priority') {
        const pOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  // Pagination calculation
  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage) || 1;
  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="citizen-portal-layout">
      {/* 1. Left Sidebar Navigation */}
      <CitizenSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenNotifications={() => setNotifDrawerOpen(true)}
        unreadCount={unreadNotifCount}
      />

      {/* 2. Main Portal Workspace */}
      <div className="citizen-portal-main">
        {/* Top Navigation */}
        <CitizenTopNav
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
          onOpenNotifications={() => setNotifDrawerOpen(true)}
          unreadCount={unreadNotifCount}
        />

        {/* Main Content Area */}
        <main className="citizen-content-container" id="main-content">
          {/* Section 1: Welcome Hero Banner */}
          <section className="citizen-welcome-hero" aria-labelledby="welcome-heading">
            <div className="citizen-welcome-inner">
              <div className="citizen-welcome-text">
                <div className="d-flex align-center gap-2 mb-2 flex-wrap">
                  <span className="badge badge-teal">Smart City Pune</span>
                  <span className="badge badge-navy">AI Grievance Portal</span>
                  <span className="tagline-badge">
                    {t('tagline', 'Your City, Your Voice.')}
                  </span>
                </div>

                <h1 id="welcome-heading" className="citizen-welcome-title">
                  {t('welcome', 'Welcome')}, {displayName}!
                </h1>

                <p className="citizen-welcome-desc">
                  Pune Municipal Corporation Civic Intelligence Platform. Report potholes, waste overflows, water stagnation, or broken streetlights using multimodal Gemini AI and live GPS tracking.
                </p>

                {/* Location Badge & Voice Note Player */}
                <div className="d-flex align-center gap-3 mt-3 flex-wrap">
                  <div
                    className="location-pill-badge"
                    onClick={handleDetectLocation}
                    title="Click to refresh your Pune ward location"
                  >
                    <span className="location-pin-icon" aria-hidden="true">📍</span>
                    <span>
                      {locationDetecting ? t('locationDetecting', 'Detecting location...') : currentArea}
                    </span>
                    <span className="location-refresh-icon" aria-hidden="true">🔄</span>
                  </div>

                  {/* Voice Note Greeting (Requested by User) */}
                  <VoiceGreeting />
                </div>
              </div>

              {/* Primary Call to Action */}
              <div className="citizen-welcome-action">
                <Link
                  to="/complaints/new"
                  className="btn btn-primary btn-lg report-hero-btn"
                  id="report-an-issue-button"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>{t('reportNewIssueBtn', 'Report New Issue')}</span>
                  <span className="pulsing-dot" aria-hidden="true" />
                </Link>

                {/* Fast Tracking Input */}
                <form onSubmit={handleTrackSubmit} className="hero-track-box mt-3">
                  <div className="hero-track-input-group">
                    <input
                      type="text"
                      className="hero-track-input"
                      placeholder={t('trackInputPlaceholder', 'Track Grievance ID (e.g. CIV-2026-001)...')}
                      value={trackingIdInput}
                      onChange={(e) => {
                        setTrackingIdInput(e.target.value);
                        if (trackingError) setTrackingError('');
                      }}
                      aria-label="Track grievance by ID"
                    />
                    <button type="submit" className="hero-track-btn" aria-label="Submit grievance tracking search">
                      &rarr;
                    </button>
                  </div>
                  {trackingError && (
                    <p className="text-danger text-xs mt-1">{trackingError}</p>
                  )}
                </form>
              </div>
            </div>
          </section>

          {/* Section 2: Real Complaint Statistics Cards */}
          <section className="citizen-stats-section" aria-label="Grievance Statistics Overview">
            <div className="stats-cards-grid">
              {/* Total Complaints */}
              <article className="stat-card-premium stat-card-premium--total">
                <div className="stat-card-header">
                  <span className="stat-card-label">{t('statTotal', 'Total Complaints')}</span>
                  <div className="stat-card-icon stat-icon--blue" aria-hidden="true">📁</div>
                </div>
                <div className="stat-card-value">
                  {loadingComplaints ? <span className="stat-skeleton" /> : stats.total}
                </div>
                <div className="stat-card-footer text-muted">
                  <span>Registered under Pune Municipal Corporation</span>
                </div>
              </article>

              {/* Pending Review */}
              <article className="stat-card-premium stat-card-premium--pending">
                <div className="stat-card-header">
                  <span className="stat-card-label">{t('statPending', 'Pending Review')}</span>
                  <div className="stat-card-icon stat-icon--amber" aria-hidden="true">⏳</div>
                </div>
                <div className="stat-card-value text-warning">
                  {loadingComplaints ? <span className="stat-skeleton" /> : stats.pending}
                </div>
                <div className="stat-card-footer text-muted">
                  <span>Awaiting ward verification & assignment</span>
                </div>
              </article>

              {/* In Progress */}
              <article className="stat-card-premium stat-card-premium--progress">
                <div className="stat-card-header">
                  <span className="stat-card-label">{t('statInProgress', 'In Progress')}</span>
                  <div className="stat-card-icon stat-icon--teal" aria-hidden="true">🛠️</div>
                </div>
                <div className="stat-card-value text-teal">
                  {loadingComplaints ? <span className="stat-skeleton" /> : stats.inProgress}
                </div>
                <div className="stat-card-footer text-muted">
                  <span>Assigned to field engineers & active SLA</span>
                </div>
              </article>

              {/* Resolved & Verified */}
              <article className="stat-card-premium stat-card-premium--resolved">
                <div className="stat-card-header">
                  <span className="stat-card-label">{t('statResolved', 'Resolved & Verified')}</span>
                  <div className="stat-card-icon stat-icon--green" aria-hidden="true">✅</div>
                </div>
                <div className="stat-card-value text-success">
                  {loadingComplaints ? <span className="stat-skeleton" /> : stats.resolved}
                </div>
                <div className="stat-card-footer text-muted">
                  <span>Audited with AI before-and-after photo proof</span>
                </div>
              </article>
            </div>
          </section>

          {/* Section 3: Quick Action Panel */}
          <section className="citizen-quick-actions-section" aria-labelledby="quick-actions-title">
            <h2 id="quick-actions-title" className="section-title">
              {t('quickActionsTitle', 'Quick Civic Actions')}
            </h2>
            <div className="quick-actions-grid">
              <Link to="/complaints/new" className="quick-action-card">
                <div className="quick-action-icon-wrap icon-wrap--teal" aria-hidden="true">
                  📸
                </div>
                <div className="quick-action-body">
                  <div className="quick-action-title">{t('quickReportTitle', 'Report Civic Issue')}</div>
                  <p className="quick-action-desc">
                    {t('quickReportDesc', 'Take a photo with instant AI detection')}
                  </p>
                </div>
                <span className="quick-action-arrow">&rarr;</span>
              </Link>

              <button
                type="button"
                className="quick-action-card text-left"
                onClick={() => {
                  const input = document.querySelector('.hero-track-input');
                  if (input) input.focus();
                }}
              >
                <div className="quick-action-icon-wrap icon-wrap--blue" aria-hidden="true">
                  🔍
                </div>
                <div className="quick-action-body">
                  <div className="quick-action-title">{t('quickTrackTitle', 'Track a Complaint')}</div>
                  <p className="quick-action-desc">
                    {t('quickTrackDesc', 'Check live status and SLA deadline')}
                  </p>
                </div>
                <span className="quick-action-arrow">&rarr;</span>
              </button>

              <Link to="/heatmap" className="quick-action-card">
                <div className="quick-action-icon-wrap icon-wrap--amber" aria-hidden="true">
                  🗺️
                </div>
                <div className="quick-action-body">
                  <div className="quick-action-title">{t('quickMapTitle', 'Explore Nearby Issues')}</div>
                  <p className="quick-action-desc">
                    {t('quickMapDesc', 'View live PMC heatmap and upvote')}
                  </p>
                </div>
                <span className="quick-action-arrow">&rarr;</span>
              </Link>

              <button
                type="button"
                className="quick-action-card text-left"
                onClick={() => setNotifDrawerOpen(true)}
              >
                <div className="quick-action-icon-wrap icon-wrap--purple" aria-hidden="true">
                  🔔
                </div>
                <div className="quick-action-body">
                  <div className="quick-action-title">{t('quickNotifTitle', 'View Notifications')}</div>
                  <p className="quick-action-desc">
                    {t('quickNotifDesc', 'Check status updates from officers')}
                  </p>
                </div>
                <span className="quick-action-arrow">&rarr;</span>
              </button>
            </div>
          </section>

          {/* Section 4: Recent Complaints with Search, Filters, Sorting, and Pagination */}
          <section className="citizen-recent-section" aria-labelledby="recent-complaints-title">
            <div className="d-flex justify-between align-center flex-wrap gap-2 mb-3">
              <div>
                <h2 id="recent-complaints-title" className="section-title">
                  {t('recentComplaintsTitle', 'My Recent Grievances')}
                </h2>
                <p className="section-subtitle">
                  Track the lifecycle of your reported civic issues from review to verified repair.
                </p>
              </div>
              <Link to="/complaints" className="btn btn-outline btn-sm" id="view-my-complaints-button">
                {t('viewAllComplaints', 'View All Complaints')} &rarr;
              </Link>
            </div>

            {/* Filter Tabs & Search Controls */}
            <div className="table-filter-bar">
              {/* Status Tabs */}
              <div className="filter-tabs">
                <button
                  type="button"
                  className={`filter-tab ${statusFilter === 'ALL' ? 'filter-tab--active' : ''}`}
                  onClick={() => {
                    setStatusFilter('ALL');
                    setCurrentPage(1);
                  }}
                >
                  {t('filterAll', 'All')} ({complaints.length})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${statusFilter === 'PENDING' ? 'filter-tab--active' : ''}`}
                  onClick={() => {
                    setStatusFilter('PENDING');
                    setCurrentPage(1);
                  }}
                >
                  {t('filterPending', 'Pending')} ({stats.pending})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${statusFilter === 'IN_PROGRESS' ? 'filter-tab--active' : ''}`}
                  onClick={() => {
                    setStatusFilter('IN_PROGRESS');
                    setCurrentPage(1);
                  }}
                >
                  {t('filterInProgress', 'In Progress')} ({stats.inProgress})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${statusFilter === 'RESOLVED' ? 'filter-tab--active' : ''}`}
                  onClick={() => {
                    setStatusFilter('RESOLVED');
                    setCurrentPage(1);
                  }}
                >
                  {t('filterResolved', 'Resolved')} ({stats.resolved})
                </button>
              </div>

              {/* Category, Sort & Search */}
              <div className="filter-controls">
                <select
                  className="form-select form-select-sm"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by Category"
                >
                  <option value="">All Categories</option>
                  {PMC_CATEGORIES.filter((c) => c.value).map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.value}
                    </option>
                  ))}
                </select>

                <select
                  className="form-select form-select-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort Complaints"
                >
                  <option value="newest">{t('sortByNewest', 'Newest First')}</option>
                  <option value="oldest">{t('sortByOldest', 'Oldest First')}</option>
                  <option value="priority">{t('sortByPriority', 'Highest Priority')}</option>
                </select>

                <input
                  type="text"
                  className="form-input form-input-sm table-search-input"
                  placeholder="Filter table..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter table records"
                />
              </div>
            </div>

            {/* Complaints Table or Empty State */}
            {loadingComplaints ? (
              <div className="p-4 text-center">
                <div className="spinner" aria-hidden="true" />
                <p className="text-muted text-xs mt-2">Loading complaints from PMC database...</p>
              </div>
            ) : paginatedComplaints.length > 0 ? (
              <div className="table-responsive-container">
                <table className="citizen-data-table">
                  <thead>
                    <tr>
                      <th>{t('colId', 'Grievance ID')}</th>
                      <th>Photo</th>
                      <th>{t('colCategory', 'Category')}</th>
                      <th>Title & Location</th>
                      <th>{t('colDate', 'Submitted')}</th>
                      <th>{t('colStatus', 'Status')}</th>
                      <th className="text-right">{t('colAction', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedComplaints.map((c) => {
                      const id = c._id || c.id;
                      const dateStr = c.createdAt
                        ? new Date(c.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                        : 'Recent';

                      return (
                        <tr key={id} className="citizen-table-row">
                          <td className="font-mono text-xs font-semibold text-teal">
                            {c.complaintNumber || id?.slice(-8) || 'CIV-000'}
                          </td>
                          <td>
                            {c.imageUrl ? (
                              <img
                                src={c.imageUrl}
                                alt="Issue thumbnail"
                                className="table-thumbnail"
                              />
                            ) : (
                              <div className="table-thumbnail-fallback" aria-hidden="true">
                                🏙️
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-secondary text-xs">
                              {c.category}
                            </span>
                          </td>
                          <td>
                            <div className="table-cell-title">{c.title}</div>
                            <div className="table-cell-subtitle text-xs text-muted">
                              📍 {c.location?.address || 'Pune Municipal Area'}
                            </div>
                          </td>
                          <td className="text-xs text-muted">
                            {dateStr}
                          </td>
                          <td>
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="text-right">
                            <Link
                              to={`/complaints/${id}`}
                              className="btn btn-outline btn-xs"
                            >
                              {t('viewDetails', 'View Details')} &rarr;
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="table-pagination">
                    <span className="pagination-info text-xs text-muted">
                      Showing {(currentPage - 1) * itemsPerPage + 1} -{' '}
                      {Math.min(currentPage * itemsPerPage, filteredComplaints.length)} of{' '}
                      {filteredComplaints.length}
                    </span>
                    <div className="d-flex gap-1">
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      >
                        &larr; Prev
                      </button>
                      <span className="pagination-current-page text-xs">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Next &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Polished Empty State */
              <div className="citizen-empty-state">
                <div className="empty-state-icon" aria-hidden="true">📋</div>
                <h3 className="empty-state-title">
                  {t('noComplaintsFound', 'No grievances found')}
                </h3>
                <p className="empty-state-desc">
                  {t(
                    'noComplaintsDesc',
                    'You have not submitted any complaints in this category yet. Help improve Pune by reporting issues in your neighborhood.',
                  )}
                </p>
                <Link to="/complaints/new" className="btn btn-primary mt-3">
                  📸 Report First Civic Issue
                </Link>
              </div>
            )}
          </section>

          {/* Section 5: Nearby Civic Issues Interactive Map */}
          <section className="citizen-map-section mt-4" aria-label="Interactive Civic Issues Map">
            <NearbyIssuesMap
              onSelectComplaint={(c) => {
                navigate(`/complaints/${c._id || c.id}`);
              }}
            />
          </section>

          {/* Section 6: Recent Activity & In-App Updates Feed */}
          <section className="citizen-activity-section mt-4" aria-labelledby="activity-heading">
            <div className="d-flex justify-between align-center mb-3">
              <div>
                <h2 id="activity-heading" className="section-title">
                  {t('activityTitle', 'Recent Activity & Notifications')}
                </h2>
                <p className="section-subtitle">
                  Real-time municipal updates and status transitions on civic grievances.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => setNotifDrawerOpen(true)}
              >
                View Full Feed &rarr;
              </button>
            </div>

            <div className="activity-feed-grid">
              {activities.length > 0 ? (
                activities.slice(0, 4).map((act) => (
                  <div
                    key={act._id || act.id}
                    className="activity-card"
                    onClick={() => {
                      const cid = act.complaintId || act.relatedEntityId;
                      if (cid) navigate(`/complaints/${cid}`);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="activity-icon-col" aria-hidden="true">
                      {act.type === 'STATUS_UPDATED' ? '🔄' : act.type === 'DEPARTMENT_ASSIGNED' ? '🏢' : '📢'}
                    </div>
                    <div className="activity-card-body">
                      <div className="activity-title">{act.title || 'Municipal Update'}</div>
                      <p className="activity-text text-xs text-muted">
                        {act.message || act.body || 'Status update logged by municipal authority.'}
                      </p>
                      <span className="activity-time text-xs">
                        {act.createdAt ? new Date(act.createdAt).toLocaleDateString('en-IN') : 'Recent'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="info-box p-3 text-muted text-sm col-span-full">
                  No recent activity logged. Once you report an issue, updates will appear here in real time.
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* Slide-over Notifications Drawer */}
      <NotificationDrawer
        isOpen={notifDrawerOpen}
        onClose={() => setNotifDrawerOpen(false)}
        onUnreadCountChange={(c) => setUnreadNotifCount(c)}
      />

      {/* Help Center & Helplines Modal */}
      <HelpCenterModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
      />

      {/* Profile & Settings Modal */}
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  );
};

export default DashboardPage;
