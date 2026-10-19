import React, { useState, useEffect, useCallback } from 'react';
import { notificationApi } from '../../services/api';

export const DepartmentNotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterMode, setFilterMode] = useState('ALL');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await notificationApi.getNotifications({ limit: 50 });
      const list = res?.data?.notifications || res?.notifications || [];
      setNotifications(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, isRead: true } : n))
      );
      showToast('Notification marked as read.');
    } catch (err) {
      showToast('Failed to update notification: ' + err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      showToast('All notifications marked as read.');
    } catch (err) {
      showToast('Failed to mark all as read: ' + err.message);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filterMode === 'UNREAD') return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="dept-notifications-page" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Toast */}
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
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0B1D33)' }}>
            Department Notifications & Alerts
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
            Operational updates on assigned complaints, SLA thresholds, and field worker submissions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleMarkAllAsRead}
            >
              Mark All as Read ({unreadCount})
            </button>
          )}

          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card, #FFFFFF)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color, #E2E8F0)' }}>
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                background: filterMode === 'ALL' ? '#0D9488' : 'transparent',
                color: filterMode === 'ALL' ? '#FFFFFF' : 'var(--text-primary, #0B1D33)',
                cursor: 'pointer',
              }}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('UNREAD')}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                background: filterMode === 'UNREAD' ? '#0D9488' : 'transparent',
                color: filterMode === 'UNREAD' ? '#FFFFFF' : 'var(--text-primary, #0B1D33)',
                cursor: 'pointer',
              }}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
          <div className="spinner" style={{ margin: '0 auto 10px auto' }} />
          Loading notifications...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: '60px',
            textAlign: 'center',
            background: 'var(--bg-card, #FFFFFF)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #E2E8F0)',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔔</div>
          <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary, #0B1D33)' }}>
            No Notifications Under Selected Filter
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
            You're all caught up with department alerts.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((n) => {
            const id = n._id || n.id;
            return (
              <div
                key={id}
                style={{
                  background: 'var(--bg-card, #FFFFFF)',
                  border: '1px solid var(--border-color, #E2E8F0)',
                  borderLeft: `4px solid ${n.isRead ? '#CBD5E1' : '#0D9488'}`,
                  borderRadius: '10px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary, #0B1D33)' }}>
                      {n.title}
                    </span>
                    {!n.isRead && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          background: '#0D9488',
                          color: '#FFFFFF',
                          padding: '1px 6px',
                          borderRadius: '10px',
                        }}
                      >
                        NEW
                      </span>
                    )}
                  </div>

                  <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: 'var(--text-muted, #64748B)', lineHeight: 1.4 }}>
                    {n.message}
                  </p>

                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                    {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </span>
                </div>

                {!n.isRead && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleMarkAsRead(id)}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DepartmentNotificationsPage;
