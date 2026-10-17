import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export const NotificationDrawer = ({ isOpen, onClose, onUnreadCountChange }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications();
      const list = res?.data?.notifications || res?.notifications || res?.data || [];
      if (Array.isArray(list)) {
        setNotifications(list);
        const unread = list.filter((n) => !n.isRead && !n.read).length;
        if (onUnreadCountChange) onUnreadCountChange(unread);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => ((n._id || n.id) === id ? { ...n, isRead: true, read: true } : n)),
      );
      const unread = notifications.filter((n) => (n._id || n.id) !== id && !n.isRead && !n.read).length;
      if (onUnreadCountChange) onUnreadCountChange(unread);
    } catch {
      // Ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, read: true })),
      );
      if (onUnreadCountChange) onUnreadCountChange(0);
    } catch {
      // Ignore
    }
  };

  const handleNotificationClick = (item) => {
    const complaintId = item.complaintId || item.relatedEntityId;
    if (item._id || item.id) {
      handleMarkAsRead({ stopPropagation: () => {} }, item._id || item.id);
    }
    onClose();
    if (complaintId) {
      navigate(`/complaints/${complaintId}`);
    } else {
      navigate('/complaints');
    }
  };

  if (!isOpen) return null;

  const filteredList = notifications.filter((n) => {
    const isUnread = !n.isRead && !n.read;
    if (filter === 'unread') return isUnread;
    return true;
  });

  const unreadTotal = notifications.filter((n) => !n.isRead && !n.read).length;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="notification-drawer" role="dialog" aria-modal="true" aria-labelledby="notif-drawer-title">
        <div className="notification-drawer__header">
          <div className="d-flex align-center gap-2">
            <span className="notif-icon-circle" aria-hidden="true">🔔</span>
            <div>
              <h2 id="notif-drawer-title" className="notification-drawer__title">
                {t('navNotifications', 'Notifications')}
              </h2>
              <span className="text-xs text-muted">
                {unreadTotal} unread update{unreadTotal === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close notifications"
          >
            &times;
          </button>
        </div>

        {/* Filter controls and Mark All Read */}
        <div className="notification-drawer__subbar">
          <div className="d-flex gap-1">
            <button
              type="button"
              className={`pill-btn ${filter === 'all' ? 'pill-btn--active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              className={`pill-btn ${filter === 'unread' ? 'pill-btn--active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadTotal})
            </button>
          </div>
          {unreadTotal > 0 && (
            <button
              type="button"
              className="btn-link-action text-xs"
              onClick={handleMarkAllAsRead}
            >
              {t('markAllRead', 'Mark All Read')}
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="notification-drawer__body">
          {loading ? (
            <div className="p-4 text-center">
              <div className="spinner" aria-hidden="true" />
              <p className="text-muted text-xs mt-2">Loading updates...</p>
            </div>
          ) : filteredList.length > 0 ? (
            <div className="notif-list">
              {filteredList.map((item) => {
                const id = item._id || item.id;
                const isUnread = !item.isRead && !item.read;
                const dateStr = item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent';

                return (
                  <div
                    key={id}
                    className={`notif-item ${isUnread ? 'notif-item--unread' : ''}`}
                    onClick={() => handleNotificationClick(item)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="notif-item__indicator" aria-hidden="true">
                      {isUnread && <span className="unread-dot" />}
                    </div>
                    <div className="notif-item__content">
                      <div className="notif-item__title">
                        {item.title || 'Municipal Update'}
                      </div>
                      <div className="notif-item__message">
                        {item.message || item.body || 'Your complaint status has been updated.'}
                      </div>
                      <div className="notif-item__meta">
                        <span className="notif-item__time">🕒 {dateStr}</span>
                        {item.type && (
                          <span className="badge badge-sm badge-secondary">
                            {item.type}
                          </span>
                        )}
                      </div>
                    </div>
                    {isUnread && (
                      <button
                        type="button"
                        className="btn-mark-read"
                        onClick={(e) => handleMarkAsRead(e, id)}
                        title="Mark as read"
                        aria-label="Mark notification as read"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-muted">
              <span style={{ fontSize: '2rem' }}>📭</span>
              <p className="mt-2 text-sm">
                {filter === 'unread' ? 'No unread notifications' : t('noNotifications', 'No notifications yet')}
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default NotificationDrawer;
