import React, { useState, useEffect } from 'react';
import { notificationApi } from '../../services/api';

export const AdminNotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await notificationApi.getNotifications({ limit: 50 });
      const list = res?.data?.notifications || res?.notifications || [];
      setNotifications(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => ((n._id || n.id) === id ? { ...n, isRead: true } : n)),
      );
    } catch {
      // Ignore
    }
  };

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Administrative Alerts & Notifications</h1>
          <p className="admin-page-subtitle">
            System notices, grievance escalations, and departmental updates across Pune Municipal Corporation.
          </p>
        </div>

        <button type="button" className="btn btn-outline btn-sm" onClick={fetchNotifications}>
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert-banner alert-banner-error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {/* Notifications List */}
      <div className="admin-card">
        {isLoading ? (
          <div className="admin-loading-table">
            <div className="spinner" />
            <p>Loading alerts...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="admin-empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <h3>No notifications at this time</h3>
            <p>New civic alerts and status updates will be displayed here.</p>
          </div>
        ) : (
          <div className="notif-feed-list">
            {notifications.map((notif) => {
              const id = notif._id || notif.id;
              const dateStr = notif.createdAt
                ? new Date(notif.createdAt).toLocaleString('en-IN')
                : 'Recent';

              return (
                <div key={id} className={`notif-item ${notif.isRead ? 'read' : 'unread'}`}>
                  <div className="notif-indicator" />
                  <div className="notif-main-content">
                    <div className="notif-header">
                      <span className="notif-title font-semibold">{notif.title || 'Civic Notice'}</span>
                      <span className="notif-date text-xs text-muted">{dateStr}</span>
                    </div>
                    <p className="notif-body text-sm text-muted">{notif.message}</p>
                  </div>
                  {!notif.isRead && (
                    <button
                      type="button"
                      className="btn btn-xs btn-outline"
                      onClick={() => handleMarkAsRead(id)}
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
