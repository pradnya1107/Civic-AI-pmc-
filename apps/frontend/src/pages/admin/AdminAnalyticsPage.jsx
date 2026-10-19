import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';

export const AdminAnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
        {/* Category Breakdown */}
        <article className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Complaint Volume by Category</h2>
              <p className="admin-card-subtitle">Identified grievance taxonomy</p>
            </div>
          </div>

          <div className="admin-category-bars">
            {categoryStats.length === 0 ? (
              <p className="text-muted text-sm py-4">No complaint data recorded.</p>
            ) : (
              categoryStats.map((cat, idx) => {
                const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
                return (
                  <div key={idx} className="category-bar-row">
                    <div className="category-bar-meta">
                      <span className="category-bar-name font-medium">{cat._id || 'Unassigned'}</span>
                      <span className="category-bar-count font-mono">{cat.count} ({pct}%)</span>
                    </div>
                    <div className="category-progress-track">
                      <div className="category-progress-fill" style={{ width: `${Math.max(pct, 5)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        {/* Department Performance & Workload */}
        <article className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Department Workload & Resolution</h2>
              <p className="admin-card-subtitle">Performance breakdown by civic jurisdiction</p>
            </div>
          </div>

          <div className="admin-dept-workload-list">
            {workloads.length === 0 ? (
              <p className="text-muted text-sm py-4">No departments found.</p>
            ) : (
              workloads.map((dept) => {
                return (
                  <div key={dept.id} className="dept-workload-item">
                    <div className="workload-header">
                      <span className="font-semibold">{dept.name}</span>
                      <span className="dept-resolution-percent font-semibold text-primary">
                        {dept.resolutionRate}% resolved
                      </span>
                    </div>

                    <div className="dept-progress-track">
                      <div className="dept-progress-fill" style={{ width: `${dept.resolutionRate}%` }} />
                    </div>

                    <div className="workload-stats-row text-xs text-muted">
                      <span>Total: {dept.totalComplaints}</span>
                      <span>Pending: {dept.pendingComplaints}</span>
                      <span>In Progress: {dept.inProgressComplaints}</span>
                      <span>Resolved: {dept.resolvedComplaints}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
