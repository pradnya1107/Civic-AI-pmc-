import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';

const getCategoryMeta = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('road') || lower.includes('pothole')) {
    return { icon: '🛣️', gradient: 'linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)', barBg: '#4F46E5' };
  }
  if (lower.includes('waste') || lower.includes('garbage')) {
    return { icon: '🗑️', gradient: 'linear-gradient(180deg, #10B981 0%, #059669 100%)', barBg: '#059669' };
  }
  if (lower.includes('water')) {
    return { icon: '🚰', gradient: 'linear-gradient(180deg, #06B6D4 0%, #0891B2 100%)', barBg: '#0891B2' };
  }
  if (lower.includes('drain')) {
    return { icon: '🌊', gradient: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)', barBg: '#D97706' };
  }
  if (lower.includes('light') || lower.includes('electr')) {
    return { icon: '💡', gradient: 'linear-gradient(180deg, #EC4899 0%, #DB2777 100%)', barBg: '#DB2777' };
  }
  if (lower.includes('build') || lower.includes('construct')) {
    return { icon: '🏗️', gradient: 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)', barBg: '#7C3AED' };
  }
  if (lower.includes('park') || lower.includes('garden')) {
    return { icon: '🌳', gradient: 'linear-gradient(180deg, #84CC16 0%, #65A30D 100%)', barBg: '#65A30D' };
  }
  if (lower.includes('health') || lower.includes('sanitat')) {
    return { icon: '🏥', gradient: 'linear-gradient(180deg, #14B8A6 0%, #0D9488 100%)', barBg: '#0D9488' };
  }
  return { icon: '📋', gradient: 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)', barBg: '#2563EB' };
};

export const AdminAnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [categoryViewMode, setCategoryViewMode] = useState('bar'); // 'bar' | 'ranked'
  const [workloadViewMode, setWorkloadViewMode] = useState('table'); // 'table' | 'cards'
  const [deptSearch, setDeptSearch] = useState('');
  const [deptStatusFilter, setDeptStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'RESOLVED'

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await adminApi.getDashboard();
        if (isMounted) {
          setData(res?.data || res);
        }
      } catch (err) {
        if (isMounted) setError(err?.message || 'Failed to load analytics.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const total = data?.totalComplaints || 0;
  const resolved = data?.resolvedComplaints || 0;
  const inProgress = data?.inProgressComplaints || 0;
  const pending = data?.pendingComplaints || 0;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;
  const categoryStats = data?.complaintsByCategory || [];
  const workloads = data?.departmentWorkloads || [];

  // Filter department workloads
  const filteredWorkloads = workloads.filter((dept) => {
    const matchesSearch =
      dept.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
      (dept.code && dept.code.toLowerCase().includes(deptSearch.toLowerCase()));

    if (!matchesSearch) return false;

    if (deptStatusFilter === 'ACTIVE') {
      return (dept.pendingComplaints || 0) + (dept.inProgressComplaints || 0) > 0;
    }
    if (deptStatusFilter === 'RESOLVED') {
      return dept.resolutionRate === 100;
    }
    return true;
  });

  // Calculate Bar Graph scales
  const maxCategoryCount = Math.max(...categoryStats.map((c) => c.count || 0), 4);
  const gridSteps = [
    maxCategoryCount,
    Math.round(maxCategoryCount * 0.75),
    Math.round(maxCategoryCount * 0.5),
    Math.round(maxCategoryCount * 0.25),
    0,
  ];

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Analytics & Operational Trends</h1>
          <p className="admin-page-subtitle">
            Statistical performance metrics, department resolution rates, and civic complaint distribution across Pune Municipal Corporation.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-banner-error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {/* KPI Overview Grid */}
      <section className="admin-kpi-grid">
        <div className="admin-kpi-card kpi-primary">
          <div className="kpi-info">
            <span className="kpi-label">Total Grievances</span>
            <div className="kpi-value">{isLoading ? '...' : total}</div>
          </div>
        </div>

        <div className="admin-kpi-card kpi-success">
          <div className="kpi-info">
            <span className="kpi-label">Municipal Resolution Rate</span>
            <div className="kpi-value">{isLoading ? '...' : `${resolutionRate}%`}</div>
          </div>
        </div>

        <div className="admin-kpi-card kpi-info">
          <div className="kpi-info">
            <span className="kpi-label">Under Active Remediation</span>
            <div className="kpi-value">{isLoading ? '...' : inProgress}</div>
          </div>
        </div>

        <div className="admin-kpi-card kpi-warning">
          <div className="kpi-info">
            <span className="kpi-label">Pending Initial Action</span>
            <div className="kpi-value">{isLoading ? '...' : pending}</div>
          </div>
        </div>
      </section>

      {/* Analytics Breakdown Grid */}
      <div className="admin-analytics-grid-two">
        {/* 1. Complaint Volume by Category - BAR GRAPH */}
        <article className="analytics-chart-card">
          <div className="analytics-chart-header">
            <div className="chart-header-left">
              <h2 className="admin-card-title">Complaint Volume by Category</h2>
              <p className="admin-card-subtitle">Visual distribution of civic complaints across municipal issue categories</p>
            </div>

            <div className="chart-header-controls">
              <span className="badge badge-neutral text-xs font-mono">
                {categoryStats.length} Categories
              </span>

              <div className="chart-view-toggle">
                <button
                  type="button"
                  className={`chart-toggle-btn ${categoryViewMode === 'bar' ? 'active' : ''}`}
                  onClick={() => setCategoryViewMode('bar')}
                  title="Show Bar Graph"
                >
                  <span>📊</span>
                  <span>Bar Graph</span>
                </button>
                <button
                  type="button"
                  className={`chart-toggle-btn ${categoryViewMode === 'ranked' ? 'active' : ''}`}
                  onClick={() => setCategoryViewMode('ranked')}
                  title="Show Horizontal Ranked Bars"
                >
                  <span>📑</span>
                  <span>Ranked List</span>
                </button>
              </div>
            </div>
          </div>

          {categoryStats.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">
              <p>No complaint records found to visualize.</p>
            </div>
          ) : categoryViewMode === 'bar' ? (
            /* Vertical Bar Graph */
            <div className="bar-graph-wrapper">
              <div className="bar-graph-canvas">
                {/* Horizontal Background Reference Gridlines */}
                <div className="bar-graph-gridlines">
                  {gridSteps.map((step, idx) => (
                    <div key={idx} className="bar-gridline">
                      <span className="gridline-label">{step}</span>
                      <div className="gridline-dash" />
                    </div>
                  ))}
                </div>

                {/* Vertical Bars Columns */}
                <div className="bar-graph-bars-row">
                  {categoryStats.map((cat, idx) => {
                    const count = cat.count || 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const meta = getCategoryMeta(cat._id);
                    // Maximum bar height in pixels inside plot area (total height 220px)
                    const barHeightPx = Math.max(Math.round((count / maxCategoryCount) * 175), 14);

                    return (
                      <div
                        key={idx}
                        className="bar-graph-column-group"
                        title={`${cat._id || 'Unassigned'}: ${count} complaint(s) (${pct}%)`}
                      >
                        {/* Floating Count Badge on top of bar */}
                        <span className="bar-val-pill">
                          {count} ({pct}%)
                        </span>

                        {/* Bar Graphic Element */}
                        <div
                          className="bar-fill-element"
                          style={{
                            height: `${barHeightPx}px`,
                            background: meta.gradient,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Bottom X-Axis Category Labels */}
                <div className="bar-xaxis-labels-row">
                  {categoryStats.map((cat, idx) => {
                    const meta = getCategoryMeta(cat._id);
                    const name = cat._id || 'Unassigned';
                    return (
                      <div key={idx} className="bar-xaxis-label-box" title={name}>
                        <span className="bar-xaxis-title">
                          <span style={{ marginRight: '3px' }}>{meta.icon}</span>
                          {name}
                        </span>
                        <span className="bar-xaxis-pct">
                          {cat.count} issues
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Horizontal Ranked Bar List */
            <div className="ranked-bars-list">
              {categoryStats.map((cat, idx) => {
                const count = cat.count || 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const meta = getCategoryMeta(cat._id);
                return (
                  <div key={idx} className="ranked-bar-item">
                    <div className="ranked-bar-header">
                      <span className="font-semibold text-sm d-flex align-center gap-2">
                        <span>{meta.icon}</span>
                        <span>{cat._id || 'Unassigned'}</span>
                      </span>
                      <span className="font-mono text-sm font-semibold">
                        {count} <span className="text-muted text-xs">({pct}%)</span>
                      </span>
                    </div>
                    <div className="ranked-bar-track">
                      <div
                        className="ranked-bar-fill"
                        style={{
                          width: `${Math.max(pct, 4)}%`,
                          background: meta.gradient,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        {/* 2. Department Workload & Resolution - NEAT FORMATTED CONSOLE */}
        <article className="analytics-chart-card">
          <div className="analytics-chart-header">
            <div className="chart-header-left">
              <h2 className="admin-card-title">Department Workload & Resolution</h2>
              <p className="admin-card-subtitle">Performance breakdown, complaint distribution, and resolution benchmarks by civic jurisdiction</p>
            </div>

            <div className="chart-header-controls">
              {/* Search Filter */}
              <input
                type="text"
                className="form-input text-xs"
                style={{ width: '180px', padding: '0.4rem 0.65rem' }}
                placeholder="Search departments..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
              />

              {/* Status Filter Dropdown */}
              <select
                className="form-select text-xs"
                style={{ width: '150px', padding: '0.4rem 0.65rem' }}
                value={deptStatusFilter}
                onChange={(e) => setDeptStatusFilter(e.target.value)}
              >
                <option value="ALL">All Departments</option>
                <option value="ACTIVE">Active Workload Only</option>
                <option value="RESOLVED">100% Resolved Only</option>
              </select>

              {/* Table / Card View Toggle */}
              <div className="chart-view-toggle">
                <button
                  type="button"
                  className={`chart-toggle-btn ${workloadViewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setWorkloadViewMode('table')}
                  title="Show Structured Table Format"
                >
                  <span>📋</span>
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  className={`chart-toggle-btn ${workloadViewMode === 'cards' ? 'active' : ''}`}
                  onClick={() => setWorkloadViewMode('cards')}
                  title="Show Grid Cards Format"
                >
                  <span>🗂️</span>
                  <span>Cards</span>
                </button>
              </div>
            </div>
          </div>

          {filteredWorkloads.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">
              <p>No departments match the current filter criteria.</p>
            </div>
          ) : workloadViewMode === 'table' ? (
            /* NEAT TABLE FORMAT */
            <div className="neat-workload-wrapper">
              <table className="neat-workload-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Total</th>
                    <th>Pending</th>
                    <th>In Progress</th>
                    <th>Resolved</th>
                    <th>Resolution Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkloads.map((dept) => {
                    const rate = dept.resolutionRate || 0;
                    const rateClass =
                      rate >= 80 ? 'rate-badge-high' : rate >= 50 ? 'rate-badge-med' : 'rate-badge-low';
                    const fillBg =
                      rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : rate > 0 ? '#3B82F6' : '#94A3B8';

                    return (
                      <tr key={dept.id || dept.name}>
                        {/* Department Name & Code */}
                        <td>
                          <div className="workload-dept-cell">
                            <span className="workload-dept-title">{dept.name}</span>
                            {dept.code && (
                              <span className="workload-dept-code">{dept.code}</span>
                            )}
                          </div>
                        </td>

                        {/* Total Complaints */}
                        <td>
                          <span className="stat-pill stat-pill-total">
                            {dept.totalComplaints || 0}
                          </span>
                        </td>

                        {/* Pending Complaints */}
                        <td>
                          <span className="stat-pill stat-pill-pending">
                            {dept.pendingComplaints || 0}
                          </span>
                        </td>

                        {/* In Progress Complaints */}
                        <td>
                          <span className="stat-pill stat-pill-progress">
                            {dept.inProgressComplaints || 0}
                          </span>
                        </td>

                        {/* Resolved Complaints */}
                        <td>
                          <span className="stat-pill stat-pill-resolved">
                            {dept.resolvedComplaints || 0}
                          </span>
                        </td>

                        {/* Resolution Rate */}
                        <td>
                          <div className="neat-rate-wrapper">
                            <div className="neat-rate-meta">
                              <span className={rateClass}>{rate}%</span>
                              <span className="text-muted text-xs font-normal">
                                {rate === 100 ? 'All Resolved' : rate === 0 && dept.totalComplaints > 0 ? 'Pending' : 'Remediating'}
                              </span>
                            </div>
                            <div className="neat-rate-track">
                              <div
                                className="neat-rate-fill"
                                style={{
                                  width: `${rate}%`,
                                  backgroundColor: fillBg,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* NEAT CARDS FORMAT */
            <div className="neat-workload-cards-grid">
              {filteredWorkloads.map((dept) => {
                const rate = dept.resolutionRate || 0;
                const fillBg =
                  rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : rate > 0 ? '#3B82F6' : '#94A3B8';

                return (
                  <div key={dept.id || dept.name} className="neat-dept-card">
                    <div className="d-flex justify-between align-start">
                      <div>
                        <h3 className="font-semibold text-base mb-1">{dept.name}</h3>
                        {dept.code && (
                          <span className="workload-dept-code">{dept.code}</span>
                        )}
                      </div>
                      <span className={`badge ${rate >= 80 ? 'badge-success' : rate > 0 ? 'badge-warning' : 'badge-neutral'}`}>
                        {rate}% Resolved
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="neat-rate-track" style={{ height: '8px' }}>
                      <div
                        className="neat-rate-fill"
                        style={{
                          width: `${rate}%`,
                          backgroundColor: fillBg,
                        }}
                      />
                    </div>

                    {/* 4 Distinct Stat Metric Boxes */}
                    <div className="neat-card-stats-grid">
                      <div className="neat-stat-item">
                        <span className="neat-stat-item-label">Total</span>
                        <span className="neat-stat-item-val font-mono">{dept.totalComplaints || 0}</span>
                      </div>
                      <div className="neat-stat-item">
                        <span className="neat-stat-item-label" style={{ color: '#D97706' }}>Pending</span>
                        <span className="neat-stat-item-val font-mono" style={{ color: '#D97706' }}>{dept.pendingComplaints || 0}</span>
                      </div>
                      <div className="neat-stat-item">
                        <span className="neat-stat-item-label" style={{ color: '#2563EB' }}>In Prog</span>
                        <span className="neat-stat-item-val font-mono" style={{ color: '#2563EB' }}>{dept.inProgressComplaints || 0}</span>
                      </div>
                      <div className="neat-stat-item">
                        <span className="neat-stat-item-label" style={{ color: '#059669' }}>Done</span>
                        <span className="neat-stat-item-val font-mono" style={{ color: '#059669' }}>{dept.resolvedComplaints || 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
