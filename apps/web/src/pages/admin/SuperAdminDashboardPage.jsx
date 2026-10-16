import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi, departmentApi } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';

// Helper for category and department icons
const getDeptIcon = (slug = '', name = '') => {
  const s = (slug + ' ' + name).toLowerCase();
  if (s.includes('road') || s.includes('traffic') || s.includes('pothole')) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19L8 5h8l4 14" />
        <line x1="12" y1="8" x2="12" y2="10" />
        <line x1="12" y1="14" x2="12" y2="16" />
      </svg>
    );
  }
  if (s.includes('water') || s.includes('drainage') || s.includes('pipe')) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    );
  }
  if (s.includes('waste') || s.includes('sanitation') || s.includes('garbage')) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    );
  }
  if (s.includes('light') || s.includes('electric') || s.includes('power')) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
      </svg>
    );
  }
  if (s.includes('health') || s.includes('hospital') || s.includes('medical')) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    );
  }
  if (s.includes('park') || s.includes('tree') || s.includes('garden')) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 19 22 19 12 2" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
};

export const SuperAdminDashboardPage = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deptSearch, setDeptSearch] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getDashboard();
      setDashboardData(res?.data || res);
    } catch (err) {
      setError(err?.message || 'Failed to load Super Admin dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const todayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const departmentWorkloads = dashboardData?.departmentWorkloads || [];
  const filteredDepts = departmentWorkloads.filter((dept) => {
    if (!deptSearch) return true;
    const term = deptSearch.toLowerCase();
    return (
      dept.name?.toLowerCase().includes(term) ||
      dept.description?.toLowerCase().includes(term)
    );
  });

  const recentComplaints = dashboardData?.recentComplaints || [];
  const complaintsByCategory = dashboardData?.complaintsByCategory || [];

  return (
    <div className="admin-page-container">
      {/* Welcome Section */}
      <section className="admin-welcome-hero" aria-labelledby="admin-welcome-title">
        <div className="admin-welcome-content">
          <div className="admin-welcome-date-badge">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{todayDate}</span>
            <span className="live-indicator-dot" title="Live Database Connection" />
          </div>

          <h1 id="admin-welcome-title" className="admin-welcome-title">
            Welcome back, Super Admin
          </h1>
          <p className="admin-welcome-subtitle">
            Monitor civic complaints, coordinate departments, and track city-wide service performance across Pune Municipal Corporation.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="admin-hero-actions">
          <Link to="/admin/complaints" className="btn btn-primary" id="hero-view-complaints">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>View Complaints</span>
          </Link>

          <Link to="/admin/departments" className="btn btn-secondary" id="hero-add-department">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Department</span>
          </Link>

          <Link to="/admin/department-admins" className="btn btn-outline" id="hero-manage-admins">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Manage Admins</span>
          </Link>
        </div>
      </section>

      {/* Error state */}
      {error && (
        <div className="alert-banner alert-banner-error" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="alert-content">
            <strong>Data sync notice:</strong> {error}
          </div>
          <button type="button" className="btn btn-sm btn-outline" onClick={fetchDashboard}>
            Retry
          </button>
        </div>
      )}

      {/* KPI Statistic Cards */}
      <section className="admin-kpi-grid" aria-label="City-wide Performance Overview">
        {/* Total Complaints */}
        <div
          className="admin-kpi-card kpi-primary"
          onClick={() => navigate('/admin/complaints')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/complaints')}
          aria-label={`Total Complaints: ${dashboardData?.totalComplaints ?? 0}`}
        >
          <div className="kpi-icon-wrap" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Complaints</span>
            <div className="kpi-value">
              {isLoading ? <span className="skeleton-text" /> : dashboardData?.totalComplaints ?? 0}
            </div>
          </div>
          <div className="kpi-action-hint">
            <span>View all</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        {/* Pending Verification */}
        <div
          className="admin-kpi-card kpi-warning"
          onClick={() => navigate('/admin/complaints?status=SUBMITTED')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/complaints?status=SUBMITTED')}
          aria-label={`Pending Verification: ${dashboardData?.pendingComplaints ?? 0}`}
        >
          <div className="kpi-icon-wrap" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Pending Verification</span>
            <div className="kpi-value">
              {isLoading ? <span className="skeleton-text" /> : dashboardData?.pendingComplaints ?? 0}
            </div>
          </div>
          <div className="kpi-action-hint">
            <span>Review</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        {/* In Progress */}
        <div
          className="admin-kpi-card kpi-info"
          onClick={() => navigate('/admin/complaints?status=IN_PROGRESS')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/complaints?status=IN_PROGRESS')}
          aria-label={`In Progress Complaints: ${dashboardData?.inProgressComplaints ?? 0}`}
        >
          <div className="kpi-icon-wrap" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </div>
          <div className="kpi-info">
            <span className="kpi-label">In Progress</span>
            <div className="kpi-value">
              {isLoading ? <span className="skeleton-text" /> : dashboardData?.inProgressComplaints ?? 0}
            </div>
          </div>
          <div className="kpi-action-hint">
            <span>Track</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        {/* Resolved Complaints */}
        <div
          className="admin-kpi-card kpi-success"
          onClick={() => navigate('/admin/complaints?status=RESOLVED')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/complaints?status=RESOLVED')}
          aria-label={`Resolved Complaints: ${dashboardData?.resolvedComplaints ?? 0}`}
        >
          <div className="kpi-icon-wrap" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Resolved Complaints</span>
            <div className="kpi-value">
              {isLoading ? <span className="skeleton-text" /> : dashboardData?.resolvedComplaints ?? 0}
            </div>
          </div>
          <div className="kpi-action-hint">
            <span>Inspect</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        {/* Total Departments */}
        <div
          className="admin-kpi-card kpi-purple"
          onClick={() => navigate('/admin/departments')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/departments')}
          aria-label={`Total Departments: ${dashboardData?.totalDepartments ?? 0}`}
        >
          <div className="kpi-icon-wrap" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Departments</span>
            <div className="kpi-value">
              {isLoading ? <span className="skeleton-text" /> : dashboardData?.totalDepartments ?? 0}
            </div>
          </div>
          <div className="kpi-action-hint">
            <span>Manage</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        {/* Active Admins */}
        <div
          className="admin-kpi-card kpi-cyan"
          onClick={() => navigate('/admin/department-admins')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/department-admins')}
          aria-label={`Active Department Admins: ${dashboardData?.activeAdmins ?? 0}`}
        >
          <div className="kpi-icon-wrap" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Active Dept Admins</span>
            <div className="kpi-value">
              {isLoading ? <span className="skeleton-text" /> : dashboardData?.activeAdmins ?? 0}
            </div>
          </div>
          <div className="kpi-action-hint">
            <span>Directory</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </section>

      {/* Analytics & Category Breakdown Section */}
      <section className="admin-analytics-overview-grid" aria-label="City Trends and Analytics">
        {/* Category Breakdown */}
        <article className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Complaint Distribution by Category</h2>
              <p className="admin-card-subtitle">Live volume across municipal services</p>
            </div>
            <Link to="/admin/analytics" className="card-header-link">
              Detailed Trends &rarr;
            </Link>
          </div>

          <div className="admin-category-bars">
            {complaintsByCategory.length === 0 ? (
              <div className="admin-empty-state-sm">No categorized complaints recorded yet.</div>
            ) : (
              complaintsByCategory.map((item, idx) => {
                const totalC = dashboardData?.totalComplaints || 1;
                const pct = Math.round((item.count / totalC) * 100);
                return (
                  <div key={idx} className="category-bar-row">
                    <div className="category-bar-meta">
                      <span className="category-bar-name">{item._id || 'Unassigned'}</span>
                      <span className="category-bar-count">
                        {item.count} complaints ({pct}%)
                      </span>
                    </div>
                    <div className="category-progress-track">
                      <div
                        className="category-progress-fill"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        role="progressbar"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        {/* Overall City Resolution Rate & Status Breakdown */}
        <article className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Municipal Resolution Performance</h2>
              <p className="admin-card-subtitle">Lifecycle stage distribution</p>
            </div>
          </div>

          <div className="admin-resolution-stats">
            {(() => {
              const total = dashboardData?.totalComplaints || 0;
              const resolved = dashboardData?.resolvedComplaints || 0;
              const overallRate = total > 0 ? Math.round((resolved / total) * 100) : 100;
              return (
                <div className="overall-rate-showcase">
                  <div className="rate-big-circle">
                    <span className="rate-num">{overallRate}%</span>
                    <span className="rate-sub">Resolution Rate</span>
                  </div>
                  <div className="status-pill-list">
                    <div className="status-pill-item">
                      <span className="pill-dot submitted" />
                      <span className="pill-text">Submitted: {dashboardData?.statusCounts?.submitted || 0}</span>
                    </div>
                    <div className="status-pill-item">
                      <span className="pill-dot review" />
                      <span className="pill-text">Under Review: {dashboardData?.statusCounts?.underReview || 0}</span>
                    </div>
                    <div className="status-pill-item">
                      <span className="pill-dot progress" />
                      <span className="pill-text">In Progress: {dashboardData?.statusCounts?.inProgress || 0}</span>
                    </div>
                    <div className="status-pill-item">
                      <span className="pill-dot resolved" />
                      <span className="pill-text">Resolved: {dashboardData?.statusCounts?.resolved || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </article>
      </section>

      {/* Department Index Cards Section */}
      <section className="admin-section" aria-labelledby="dept-index-title">
        <div className="admin-section-header">
          <div>
            <h2 id="dept-index-title" className="admin-section-title">
              Department Overview
            </h2>
            <p className="admin-section-subtitle">
              Workload, administrative ownership, and performance across civic departments
            </p>
          </div>

          <div className="admin-section-actions">
            <div className="admin-filter-search-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                className="admin-filter-input"
                placeholder="Search departments..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                aria-label="Filter departments"
              />
            </div>
            <Link to="/admin/departments" className="btn btn-sm btn-primary">
              Manage All
            </Link>
          </div>
        </div>

        {filteredDepts.length === 0 ? (
          <div className="admin-empty-card">
            <div className="admin-empty-icon" aria-hidden="true">🏛️</div>
            <h3>No departments matching query</h3>
            <p>Create departments or refine your search query.</p>
            <Link to="/admin/departments" className="btn btn-primary btn-sm">
              + Create Department
            </Link>
          </div>
        ) : (
          <div className="admin-dept-cards-grid">
            {filteredDepts.map((dept) => {
              const adminsList = dept.assignedAdmins || [];
              const primaryAdmin = adminsList[0]?.name || 'Unassigned';

              return (
                <article key={dept.id} className="dept-index-card">
                  <div className="dept-card-top">
                    <div className="dept-icon-wrapper" aria-hidden="true">
                      {getDeptIcon(dept.slug, dept.name)}
                    </div>
                    <div className="dept-card-titles">
                      <h3 className="dept-card-name">{dept.name}</h3>
                      <span className={`dept-status-badge ${dept.isActive ? 'active' : 'inactive'}`}>
                        {dept.isActive ? 'Active Department' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <p className="dept-card-desc">
                    {dept.description || 'Dedicated municipal grievance management and operations.'}
                  </p>

                  {/* Complaint Stats Grid */}
                  <div className="dept-metrics-grid">
                    <div className="dept-metric-box">
                      <span className="metric-val">{dept.totalComplaints}</span>
                      <span className="metric-lbl">Total</span>
                    </div>
                    <div className="dept-metric-box pending">
                      <span className="metric-val">{dept.pendingComplaints}</span>
                      <span className="metric-lbl">Pending</span>
                    </div>
                    <div className="dept-metric-box progress">
                      <span className="metric-val">{dept.inProgressComplaints}</span>
                      <span className="metric-lbl">In Progress</span>
                    </div>
                    <div className="dept-metric-box resolved">
                      <span className="metric-val">{dept.resolvedComplaints}</span>
                      <span className="metric-lbl">Resolved</span>
                    </div>
                  </div>

                  {/* Resolution Rate Progress */}
                  <div className="dept-resolution-row">
                    <div className="dept-resolution-meta">
                      <span>Resolution Rate</span>
                      <span className="dept-resolution-percent">{dept.resolutionRate}%</span>
                    </div>
                    <div className="dept-progress-track">
                      <div
                        className="dept-progress-fill"
                        style={{ width: `${dept.resolutionRate}%` }}
                        role="progressbar"
                        aria-valuenow={dept.resolutionRate}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>

                  {/* Assigned Admin Footer */}
                  <div className="dept-card-admin-row">
                    <div className="dept-admin-assigned-info">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span className="dept-admin-name" title={adminsList.map(a => a.name).join(', ') || 'No Admin'}>
                        {adminsList.length > 0
                          ? `${primaryAdmin}${adminsList.length > 1 ? ` (+${adminsList.length - 1})` : ''}`
                          : 'No Admin Assigned'}
                      </span>
                    </div>

                    <div className="dept-card-actions">
                      <Link
                        to={`/admin/complaints?departmentId=${dept.id}`}
                        className="btn btn-xs btn-outline"
                        title={`View ${dept.name} complaints`}
                      >
                        Complaints
                      </Link>
                      <Link
                        to="/admin/departments"
                        className="btn btn-xs btn-secondary"
                        title={`Manage ${dept.name}`}
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Complaints Activity Table */}
      <section className="admin-section" aria-labelledby="recent-complaints-title">
        <div className="admin-section-header">
          <div>
            <h2 id="recent-complaints-title" className="admin-section-title">
              Recent Complaints
            </h2>
            <p className="admin-section-subtitle">
              Live incoming grievances submitted across Pune municipal jurisdictions
            </p>
          </div>

          <Link to="/admin/complaints" className="btn btn-sm btn-primary">
            View All Complaints &rarr;
          </Link>
        </div>

        <div className="admin-table-container">
          {recentComplaints.length === 0 ? (
            <div className="admin-empty-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <h3>No complaints reported yet</h3>
              <p>Complaints submitted by citizens will appear here in real-time.</p>
            </div>
          ) : (
            <table className="admin-data-table" aria-label="Recent Civic Complaints">
              <thead>
                <tr>
                  <th scope="col">Complaint ID</th>
                  <th scope="col">Title</th>
                  <th scope="col">Category</th>
                  <th scope="col">Location</th>
                  <th scope="col">Department</th>
                  <th scope="col">Status</th>
                  <th scope="col">Submitted</th>
                  <th scope="col" className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentComplaints.map((item) => {
                  const dept = item.departmentId;
                  const deptName = dept?.name || 'General Administration';
                  const dateStr = item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'N/A';

                  return (
                    <tr key={item._id || item.complaintNumber}>
                      <td className="font-mono text-primary font-semibold">
                        {item.complaintNumber || `#${(item._id || '').slice(-6)}`}
                      </td>
                      <td className="font-medium max-w-xs truncate" title={item.title}>
                        {item.title}
                      </td>
                      <td>
                        <span className="category-tag">{item.category}</span>
                      </td>
                      <td className="text-muted text-sm max-w-xs truncate" title={item.location?.address || 'Pune'}>
                        {item.location?.address || item.location?.city || 'Pune, MH'}
                      </td>
                      <td className="text-sm">{deptName}</td>
                      <td>
                        <StatusBadge status={item.status} size="sm" />
                      </td>
                      <td className="text-muted text-sm">{dateStr}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-xs btn-outline"
                          onClick={() => setSelectedComplaint(item)}
                          aria-label={`View details for complaint ${item.complaintNumber || item.title}`}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Complaint Quick Detail Modal */}
      {selectedComplaint && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedComplaint(null)} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className="modal-eyebrow font-mono">
                  {selectedComplaint.complaintNumber || `#${(selectedComplaint._id || '').slice(-6)}`}
                </span>
                <h3 id="modal-title" className="admin-modal-title">
                  {selectedComplaint.title}
                </h3>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setSelectedComplaint(null)}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="detail-meta-row">
                <div className="detail-meta-item">
                  <span className="detail-label">Status</span>
                  <StatusBadge status={selectedComplaint.status} />
                </div>
                <div className="detail-meta-item">
                  <span className="detail-label">Category</span>
                  <span className="category-tag">{selectedComplaint.category}</span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-label">Priority</span>
                  <span className={`priority-pill priority-${(selectedComplaint.priority || 'MEDIUM').toLowerCase()}`}>
                    {selectedComplaint.priority || 'MEDIUM'}
                  </span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-label">Department</span>
                  <span className="font-medium">
                    {selectedComplaint.departmentId?.name || 'General Municipal Admin'}
                  </span>
                </div>
              </div>

              <div className="detail-field">
                <span className="detail-label">Location & Address</span>
                <p className="detail-val">
                  {selectedComplaint.location?.address || 'Pune Municipal Corporation jurisdiction'}
                </p>
              </div>

              {selectedComplaint.description && (
                <div className="detail-field">
                  <span className="detail-label">Grievance Description</span>
                  <p className="detail-val-box">{selectedComplaint.description}</p>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedComplaint(null)}
              >
                Close
              </button>
              <Link
                to={`/complaints/${selectedComplaint._id || selectedComplaint.id}`}
                className="btn btn-primary"
              >
                Open Full Complaint Page &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboardPage;
