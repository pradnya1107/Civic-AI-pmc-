import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { departmentAdminApi } from '../../services/api';

export const DepartmentDashboardPage = ({ onRefreshNeeded }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metricsData, setMetricsData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsDays, setAnalyticsDays] = useState(14);
  const [officersData, setOfficersData] = useState([]);

  const adminName = user?.fullName || user?.name || 'Department Administrator';

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashRes, analyticsRes, officersRes] = await Promise.all([
        departmentAdminApi.getDashboard(),
        departmentAdminApi.getAnalytics({ days: analyticsDays }),
        departmentAdminApi.getOfficers(),
      ]);

      setMetricsData(dashRes?.data || null);
      setAnalyticsData(analyticsRes?.data || null);
      setOfficersData(officersRes?.data?.officers || []);
    } catch (err) {
      setError(err.message || 'Failed to load department dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [analyticsDays]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleCardClick = (filterType, filterVal) => {
    if (filterType === 'status') {
      navigate(`/department/complaints?status=${filterVal}`);
    } else if (filterType === 'overdue') {
      navigate('/department/complaints?filter=priority_overdue');
    } else {
      navigate('/department/complaints');
    }
  };

  const counts = metricsData?.counts || {
    total: 0,
    pending: 0,
    inProgress: 0,
    overdue: 0,
    resolved: 0,
    resolutionRate: 0,
  };

  const priorityQueue = metricsData?.priorityQueue || [];
  const recentActivity = metricsData?.recentActivity || [];
  const deptName = metricsData?.department?.name || user?.departmentName || 'Civic Department';

  const getPriorityBadgeStyle = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return { background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' };
      case 'HIGH':
        return { background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' };
      case 'MEDIUM':
        return { background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' };
      default:
        return { background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' };
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'RESOLVED':
        return { background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' };
      case 'IN_PROGRESS':
        return { background: '#E0F2FE', color: '#0284C7', border: '1px solid #7DD3FC' };
      case 'ASSIGNED':
        return { background: '#FEF9C3', color: '#A16207', border: '1px solid #FDE047' };
      case 'UNDER_REVIEW':
        return { background: '#F3E8FF', color: '#7E22CE', border: '1px solid #D8B4FE' };
      case 'REJECTED':
        return { background: '#FFE4E6', color: '#BE123C', border: '1px solid #FDA4AF' };
      default:
        return { background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' };
    }
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return 'Just now';
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 1) return 'Recent';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (isLoading && !metricsData) {
    return (
      <div style={{ padding: '20px' }}>
        <div className="dept-skeleton-hero" style={{ height: '90px', borderRadius: '12px', background: '#E2E8F0', marginBottom: '20px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ height: '110px', borderRadius: '12px', background: '#E2E8F0' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dept-dashboard-container" style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div
        className="dept-hero-banner"
        style={{
          background: 'linear-gradient(135deg, #0B1D33 0%, #162E4A 100%)',
          color: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px 28px',
          marginBottom: '24px',
          boxShadow: '0 4px 15px rgba(11, 29, 51, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span
              style={{
                background: '#0D9488',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              {deptName}
            </span>
            <span style={{ fontSize: '13px', color: '#94A3B8' }}>• Operations Center</span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', color: '#FFFFFF' }}>
            Welcome back, {adminName}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#CBD5E1', maxWidth: '640px' }}>
            Monitor civic grievances, dispatch field officers, and review resolution evidence for {deptName}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            to="/department/complaints"
            className="btn btn-primary"
            style={{
              background: '#0D9488',
              borderColor: '#0D9488',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              fontWeight: 600,
            }}
          >
            <span>Manage Complaints</span>
            <span>→</span>
          </Link>
          <Link
            to="/department/verification"
            className="btn btn-secondary"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderColor: 'rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
            }}
          >
            <span>Resolution Verification</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '20px' }}>
          <span>{error}</span>
          <button type="button" onClick={loadDashboardData} className="btn btn-sm btn-secondary" style={{ marginLeft: '12px' }}>
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div
        className="dept-kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* Total Assigned Complaints */}
        <div
          onClick={() => handleCardClick('all')}
          className="dept-kpi-card"
          style={{
            background: 'var(--color-bg-card, #FFFFFF)',
            border: '1px solid var(--color-border, #E2E8F0)',
            borderTop: '4px solid #0B1D33',
            borderRadius: '12px',
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          }}
          title="Click to view all department complaints"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-dim, #64748B)', textTransform: 'uppercase' }}>
              Total Complaints
            </span>
            <span style={{ fontSize: '18px' }}>📋</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text-main, #0B1D33)', margin: '10px 0 4px 0' }}>
            {counts.total}
          </div>
          <div style={{ fontSize: '12px', color: '#0D9488', fontWeight: 600 }}>Click to view all →</div>
        </div>

        {/* New / Pending Complaints */}
        <div
          onClick={() => handleCardClick('status', 'SUBMITTED')}
          className="dept-kpi-card"
          style={{
            background: 'var(--color-bg-card, #FFFFFF)',
            border: '1px solid var(--color-border, #E2E8F0)',
            borderTop: '4px solid #F59E0B',
            borderRadius: '12px',
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          }}
          title="Click to view submitted & under review complaints"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-dim, #64748B)', textTransform: 'uppercase' }}>
              New / Pending
            </span>
            <span style={{ fontSize: '18px' }}>⏳</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#D97706', margin: '10px 0 4px 0' }}>
            {counts.pending}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-dim, #64748B)' }}>Awaiting review</div>
        </div>

        {/* In Progress */}
        <div
          onClick={() => handleCardClick('status', 'IN_PROGRESS')}
          className="dept-kpi-card"
          style={{
            background: 'var(--color-bg-card, #FFFFFF)',
            border: '1px solid var(--color-border, #E2E8F0)',
            borderTop: '4px solid #0284C7',
            borderRadius: '12px',
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          }}
          title="Click to view assigned & in-progress complaints"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-dim, #64748B)', textTransform: 'uppercase' }}>
              In Progress
            </span>
            <span style={{ fontSize: '18px' }}>🔧</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284C7', margin: '10px 0 4px 0' }}>
            {counts.inProgress}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-dim, #64748B)' }}>Field work active</div>
        </div>

        {/* Overdue Complaints */}
        <div
          onClick={() => handleCardClick('overdue')}
          className="dept-kpi-card"
          style={{
            background: 'var(--color-bg-card, #FFFFFF)',
            border: '1px solid var(--color-border, #E2E8F0)',
            borderTop: '4px solid #EF4444',
            borderRadius: '12px',
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          }}
          title="Click to view overdue complaints"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-dim, #64748B)', textTransform: 'uppercase' }}>
              Overdue Cases
            </span>
            <span style={{ fontSize: '18px' }}>⚠️</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#DC2626', margin: '10px 0 4px 0' }}>
            {counts.overdue}
          </div>
          <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>Breached SLA target</div>
        </div>

        {/* Resolved Complaints */}
        <div
          onClick={() => handleCardClick('status', 'RESOLVED')}
          className="dept-kpi-card"
          style={{
            background: 'var(--color-bg-card, #FFFFFF)',
            border: '1px solid var(--color-border, #E2E8F0)',
            borderTop: '4px solid #10B981',
            borderRadius: '12px',
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          }}
          title="Click to view resolved complaints"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-dim, #64748B)', textTransform: 'uppercase' }}>
              Resolved
            </span>
            <span style={{ fontSize: '18px' }}>✅</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#059669', margin: '10px 0 4px 0' }}>
            {counts.resolved}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-dim, #64748B)' }}>Completed & closed</div>
        </div>

        {/* Resolution Rate */}
        <div
          className="dept-kpi-card"
          style={{
            background: 'var(--color-bg-card, #FFFFFF)',
            border: '1px solid var(--color-border, #E2E8F0)',
            borderTop: '4px solid #0D9488',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-dim, #64748B)', textTransform: 'uppercase' }}>
              Resolution Rate
            </span>
            <span style={{ fontSize: '18px' }}>🎯</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0D9488', margin: '10px 0 4px 0' }}>
            {counts.resolutionRate}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-dim, #64748B)' }}>Performance index</div>
        </div>
      </div>

      {/* Analytics & Officer Workload Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Complaints Trend Chart */}
        <div
          style={{
            background: 'var(--color-bg-card, #FFFFFF)',
            border: '1px solid var(--color-border, #E2E8F0)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-main, #0B1D33)' }}>
                Complaints Trend (Received vs Resolved)
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--color-text-dim, #64748B)' }}>Past {analyticsDays} days timeline</span>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setAnalyticsDays(d)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: analyticsDays === d ? '#0D9488' : 'var(--border-color, #E2E8F0)',
                    background: analyticsDays === d ? '#0D9488' : 'transparent',
                    color: analyticsDays === d ? '#FFFFFF' : 'var(--text-muted, #64748B)',
                    cursor: 'pointer',
                  }}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>

          {/* SVG Bar Chart */}
          {analyticsData?.receivedVsResolved?.length > 0 ? (
            <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '20px', borderBottom: '1px solid #E2E8F0' }}>
              {(() => {
                const maxVal = Math.max(
                  ...analyticsData.receivedVsResolved.map((item) => Math.max(item.received, item.resolved)),
                  5
                );
                return analyticsData.receivedVsResolved.map((item) => {
                  const recHeight = Math.round((item.received / maxVal) * 140);
                  const resHeight = Math.round((item.resolved / maxVal) * 140);
                  const label = item.date.slice(5);

                  return (
                    <div
                      key={item.date}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        height: '100%',
                        justifyContent: 'flex-end',
                      }}
                      title={`${item.date} - Received: ${item.received}, Resolved: ${item.resolved}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', width: '100%', justifyContent: 'center' }}>
                        <div
                          style={{
                            width: '45%',
                            maxWidth: '12px',
                            height: `${Math.max(recHeight, 4)}px`,
                            background: '#0284C7',
                            borderRadius: '3px 3px 0 0',
                          }}
                        />
                        <div
                          style={{
                            width: '45%',
                            maxWidth: '12px',
                            height: `${Math.max(resHeight, 4)}px`,
                            background: '#10B981',
                            borderRadius: '3px 3px 0 0',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '9px', color: '#94A3B8', marginTop: '4px', transform: 'scale(0.9)' }}>
                        {label}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
              No complaints in selected period
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', background: '#0284C7', borderRadius: '2px' }} />
              <span style={{ color: 'var(--text-muted, #64748B)' }}>Received</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', background: '#10B981', borderRadius: '2px' }} />
              <span style={{ color: 'var(--text-muted, #64748B)' }}>Resolved</span>
            </div>
          </div>
        </div>

        {/* Officer Workload Breakdown */}
        <div
          style={{
            background: 'var(--color-bg-card, #FFFFFF)',
            border: '1px solid var(--color-border, #E2E8F0)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-main, #0B1D33)' }}>
                Field Officers & Workload
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--color-text-dim, #64748B)' }}>Active assignments & capacity</span>
            </div>
            <Link
              to="/department/officers"
              style={{ fontSize: '12px', fontWeight: 600, color: '#0D9488', textDecoration: 'none' }}
            >
              Manage Officers →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {officersData.slice(0, 4).map((officer) => {
              const maxCapacity = 8;
              const loadPercent = Math.min(100, Math.round((officer.activeCount / maxCapacity) * 100));

              return (
                <div
                  key={officer.id || officer.name}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--color-bg-surface-hover, #F8FAFC)',
                    border: '1px solid var(--color-border, #E2E8F0)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-main, #0B1D33)' }}>
                        {officer.name}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-dim, #64748B)', marginLeft: '6px' }}>
                        ({officer.designation})
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: officer.availability === 'BUSY' ? '#FEE2E2' : '#DCFCE7',
                        color: officer.availability === 'BUSY' ? '#B91C1C' : '#15803D',
                      }}
                    >
                      {officer.availability}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, height: '6px', background: 'var(--color-border, #E2E8F0)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${loadPercent}%`,
                          height: '100%',
                          background: loadPercent > 75 ? '#EF4444' : '#0D9488',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-dim, #64748B)', whiteSpace: 'nowrap' }}>
                      <strong>{officer.activeCount}</strong> open / {officer.completedCount} done
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Priority Queue & Recent Activity Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '20px' }}>
        {/* Priority Queue */}
        <div
          style={{
            background: 'var(--color-bg-card, #FFFFFF)',
            border: '1px solid var(--color-border, #E2E8F0)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🚨</span>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-main, #0B1D33)' }}>
                Urgent & Overdue Priority Queue
              </h3>
            </div>
            <Link
              to="/department/complaints?filter=priority_overdue"
              style={{ fontSize: '12px', fontWeight: 600, color: '#0D9488', textDecoration: 'none' }}
            >
              View All ({priorityQueue.length}) →
            </Link>
          </div>

          {priorityQueue.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
              🎉 No urgent or overdue complaints currently pending!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {priorityQueue.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border, #E2E8F0)',
                    background: c.isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'var(--color-bg-card, #FFFFFF)',
                    borderLeft: `4px solid ${c.isOverdue ? '#EF4444' : '#F59E0B'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9488' }}>
                        {c.complaintNumber}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          ...getPriorityBadgeStyle(c.priority),
                        }}
                      >
                        {c.priority}
                      </span>
                      {c.isOverdue && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: '#EF4444',
                            color: '#FFFFFF',
                          }}
                        >
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '13px',
                        color: 'var(--color-text-main, #0B1D33)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-dim, #64748B)', marginTop: '2px' }}>
                      📍 {c.location?.ward || c.location?.address?.slice(0, 30) || 'Pune'} • {getTimeAgo(c.createdAt)}
                    </div>
                  </div>

                  <Link
                    to={`/department/complaints/${c.id}`}
                    className="btn btn-sm btn-secondary"
                    style={{ whiteSpace: 'nowrap', padding: '6px 12px' }}
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Department Activity */}
        <div
          style={{
            background: 'var(--color-bg-card, #FFFFFF)',
            border: '1px solid var(--color-border, #E2E8F0)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>⚡</span>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-main, #0B1D33)' }}>
                Recent Operational Activity
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-dim, #64748B)' }}>Audit Log Feed</span>
          </div>

          {recentActivity.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
              No recent audit activity recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentActivity.map((act) => {
                const actionLabel = act.action.replace(/_/g, ' ');

                return (
                  <div
                    key={act.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      borderBottom: '1px solid var(--border-color, #F1F5F9)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      fontSize: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#0D9488',
                        marginTop: '5px',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--text-primary, #0B1D33)', fontWeight: 600 }}>
                        <span>{act.performedBy}</span>
                        <span style={{ fontWeight: 400, color: '#64748B' }}> performed </span>
                        <span style={{ color: '#0D9488', fontWeight: 600 }}>{actionLabel}</span>
                      </div>
                      {act.metadata?.complaintNumber && (
                        <div style={{ color: '#64748B', fontSize: '11px', marginTop: '2px' }}>
                          Complaint #{act.metadata.complaintNumber}
                          {act.metadata.notes ? ` • "${act.metadata.notes.slice(0, 60)}"` : ''}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                      {getTimeAgo(act.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentDashboardPage;
