import React, { useState, useEffect, useCallback } from 'react';
import { departmentAdminApi } from '../../services/api';

export const DepartmentAnalyticsPage = ({ lastRefreshed, onRefreshNeeded }) => {
  const [analytics, setAnalytics] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [days, setDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [analyticsRes, officersRes] = await Promise.all([
        departmentAdminApi.getAnalytics({ days }),
        departmentAdminApi.getOfficers(),
      ]);

      setAnalytics(analyticsRes?.data || null);
      setOfficers(officersRes?.data?.officers || []);
    } catch (err) {
      setError(err.message || 'Failed to load department analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Re-fetch whenever global top navigation refresh is triggered
  useEffect(() => {
    if (lastRefreshed) {
      loadAnalytics();
    }
  }, [lastRefreshed]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadAnalytics();
      if (onRefreshNeeded) onRefreshNeeded();
      showToast('Analytics metrics refreshed successfully.');
    } catch {
      showToast('Refresh failed. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      showToast('Generating official analytics report...');
      const blob = await departmentAdminApi.exportComplaintsCsv();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pmc-department-analytics-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast('Analytics report downloaded successfully.');
    } catch (err) {
      showToast('Failed to download report: ' + err.message);
    }
  };

  return (
    <div className="dept-analytics-page" style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#0B1D33',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 9999,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Date Filter */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0B1D33)' }}>
              Department Analytics & SLA Reports
            </h2>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                background: '#0D9488',
                color: '#FFFFFF',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              Real-time Metrics
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
            Track departmental resolution performance, average turnaround time, and ward trends.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Date range filter buttons */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card, #FFFFFF)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color, #E2E8F0)' }}>
            {[
              { label: '7 Days', val: 7 },
              { label: '14 Days', val: 14 },
              { label: '30 Days', val: 30 },
              { label: '90 Days', val: 90 },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setDays(p.val)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  background: days === p.val ? '#0D9488' : 'transparent',
                  color: days === p.val ? '#FFFFFF' : 'var(--text-primary, #0B1D33)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>


          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCsv}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📥</span>
            <span>Download CSV Report</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '20px' }}>
          <span>{error}</span>
          <button type="button" onClick={loadAnalytics} className="btn btn-sm btn-secondary" style={{ marginLeft: '10px' }}>
            Retry
          </button>
        </div>
      )}

      {/* KPI Metric Summary Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-color, #E2E8F0)', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Total Received</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0B1D33', margin: '8px 0 2px 0' }}>
            {analytics?.totalCount || 0}
          </div>
          <span style={{ fontSize: '11px', color: '#0D9488' }}>Past {days} days window</span>
        </div>

        <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-color, #E2E8F0)', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Resolved Cases</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10B981', margin: '8px 0 2px 0' }}>
            {analytics?.resolvedCount || 0}
          </div>
          <span style={{ fontSize: '11px', color: '#10B981' }}>Verified solutions</span>
        </div>

        <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-color, #E2E8F0)', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Resolution Rate</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0D9488', margin: '8px 0 2px 0' }}>
            {analytics?.resolutionRate || 0}%
          </div>
          <span style={{ fontSize: '11px', color: '#64748B' }}>Department efficiency index</span>
        </div>

        <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-color, #E2E8F0)', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Avg Handling Time</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284C7', margin: '8px 0 2px 0' }}>
            {analytics?.avgHandlingTimeHours || 24} hrs
          </div>
          <span style={{ fontSize: '11px', color: '#64748B' }}>Creation to completion</span>
        </div>

        <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-color, #E2E8F0)', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Overdue Cases</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#EF4444', margin: '8px 0 2px 0' }}>
            {analytics?.overdueCount || 0}
          </div>
          <span style={{ fontSize: '11px', color: '#EF4444' }}>Target SLA breached</span>
        </div>
      </div>

      {/* Trend Chart */}
      <div style={{ marginBottom: '28px' }}>
        {/* Received vs Resolved Trend Chart */}
        <div
          style={{
            background: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
            Daily Complaint Inflow vs Resolution
          </h3>
          <span style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '20px' }}>
            Trend analysis over the last {days} days
          </span>

          {analytics?.receivedVsResolved?.length > 0 ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '6px', paddingBottom: '24px', borderBottom: '1px solid #E2E8F0' }}>
              {(() => {
                const maxVal = Math.max(
                  ...analytics.receivedVsResolved.map((item) => Math.max(item.received, item.resolved)),
                  5
                );

                return analytics.receivedVsResolved.map((item) => {
                  const recHeight = Math.round((item.received / maxVal) * 160);
                  const resHeight = Math.round((item.resolved / maxVal) * 160);

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
                      title={`${item.date} | Received: ${item.received}, Resolved: ${item.resolved}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', width: '100%', justifyContent: 'center' }}>
                        <div
                          style={{
                            width: '45%',
                            maxWidth: '14px',
                            height: `${Math.max(recHeight, 4)}px`,
                            background: '#0284C7',
                            borderRadius: '3px 3px 0 0',
                          }}
                        />
                        <div
                          style={{
                            width: '45%',
                            maxWidth: '14px',
                            height: `${Math.max(resHeight, 4)}px`,
                            background: '#10B981',
                            borderRadius: '3px 3px 0 0',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '9px', color: '#94A3B8', marginTop: '6px' }}>
                        {item.date.slice(5)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
              No trend data available for period
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '14px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', background: '#0284C7', borderRadius: '3px' }} />
              <span style={{ color: '#64748B' }}>Complaints Received</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', background: '#10B981', borderRadius: '3px' }} />
              <span style={{ color: '#64748B' }}>Complaints Resolved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ward Hotspots & Officer Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Ward Distribution */}
        <div
          style={{
            background: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
            Ward & Geographic Distribution
          </h3>
          <span style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '20px' }}>
            High-density civic grievance hotspots
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {analytics?.wardDistribution?.length > 0 ? (
              analytics.wardDistribution.map((w) => (
                <div
                  key={w.ward}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'var(--bg-main, #F8FAFC)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #E2E8F0)',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary, #0B1D33)' }}>
                    📍 {w.ward}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      background: 'rgba(13, 148, 136, 0.12)',
                      color: '#0D9488',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {w.count} Cases
                  </span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#94A3B8', padding: '30px' }}>
                No ward distribution data available
              </div>
            )}
          </div>
        </div>

        {/* Officer Workload & Performance Table */}
        <div
          style={{
            background: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
            Officer Performance & Workload
          </h3>
          <span style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '16px' }}>
            Resolution efficiency by field personnel
          </span>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color, #E2E8F0)', color: '#64748B' }}>
                  <th style={{ padding: '8px 6px', fontWeight: 700 }}>Officer</th>
                  <th style={{ padding: '8px 6px', fontWeight: 700 }}>Role</th>
                  <th style={{ padding: '8px 6px', fontWeight: 700, textAlign: 'center' }}>Active</th>
                  <th style={{ padding: '8px 6px', fontWeight: 700, textAlign: 'center' }}>Resolved</th>
                  <th style={{ padding: '8px 6px', fontWeight: 700, textAlign: 'right' }}>Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {officers.map((off) => (
                  <tr key={off.id || off.name} style={{ borderBottom: '1px solid var(--border-color, #F1F5F9)' }}>
                    <td style={{ padding: '10px 6px', fontWeight: 600, color: 'var(--text-primary, #0B1D33)' }}>
                      {off.name}
                    </td>
                    <td style={{ padding: '10px 6px', color: '#64748B' }}>
                      {off.designation}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700, color: '#D97706' }}>
                      {off.activeCount}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700, color: '#10B981' }}>
                      {off.completedCount}
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: '#0D9488' }}>
                      {off.resolutionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentAnalyticsPage;
