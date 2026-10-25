import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Format timestamp into human-readable relative or short date format
 */
function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

export const NotificationBell = ({ className = '', role = null }) => {
  let authUser = null;
  try {
    const auth = useAuth();
    authUser = auth?.user;
  } catch {
    authUser = null;
  }

  const effectiveRole = role || authUser?.role || 'CITIZEN';

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getNotifications({ limit: 15 });
      const data = res?.data || res || {};
      const list = data.notifications || [];
      const unread =
        typeof data.unreadCount === 'number'
          ? data.unreadCount
          : list.filter((n) => !n.isRead && !n.readAt).length;

      setNotifications(list);
      setUnreadCount(unread);
    } catch {
      // Graceful degradation when network is interrupted
    }
  };

  // Initial fetch and 30-second polling for MVP
  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 30000);
    return () => clearInterval(intervalId);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  const handleNotificationClick = async (notif) => {
    const notifId = notif.id || notif._id;
    const isUnread = !notif.isRead && !notif.readAt;

    // Optimistically mark as read locally
    if (isUnread) {
      setNotifications((prev) =>
        prev.map((n) =>
          (n.id || n._id) === notifId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));

      try {
        await notificationApi.markAsRead(notifId);
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    setIsOpen(false);

    // Navigate to complaint details based on user panel role
    const complaintId =
      typeof notif.complaintId === 'object' && notif.complaintId !== null
        ? notif.complaintId._id || notif.complaintId.id
        : notif.complaintId;

    if (complaintId) {
      if (effectiveRole === 'ADMIN' || effectiveRole === 'SUPER_ADMIN') {
        navigate(`/admin/complaints/${complaintId}`);
      } else if (effectiveRole === 'DEPARTMENT_ADMIN') {
        navigate(`/department/complaints`);
      } else {
        navigate(`/complaints/${complaintId}`);
      }
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      setIsLoading(true);
      await notificationApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`notification-bell-wrap ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={handleToggle}
        aria-label={`Civic notifications: ${unreadCount} unread`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        id="notification-bell-button"
        title={unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'Notifications'}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span
            className="notification-bell-badge"
            id="notification-bell-badge"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="notification-bell-dropdown"
          role="region"
          aria-label="Civic Notifications Panel"
          id="notification-dropdown-panel"
        >
          {/* Dropdown Header */}
          <div className="notif-dropdown-header">
            <div className="notif-header-title-wrap">
              <span className="notif-header-title">Notifications</span>
              {unreadCount > 0 && (
                <span className="notif-unread-pill">{unreadCount} new</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-mark-all-btn"
                onClick={handleMarkAllRead}
                disabled={isLoading}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="notif-dropdown-list">
            {notifications.length === 0 ? (
              <div className="notif-empty-state">
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="notif-empty-icon"
                  aria-hidden="true"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
                <p className="notif-empty-title">No notifications yet</p>
                <p className="notif-empty-desc">
                  You'll be alerted when municipal officials review or update your reported civic issues.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const notifId = notif.id || notif._id;
                const isUnread = !notif.isRead && !notif.readAt;

                return (
                  <div
                    key={notifId}
                    className={`notif-item ${isUnread ? 'notif-item--unread' : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(notif);
                      }
                    }}
                    aria-label={`${notif.title}: ${notif.message}`}
                  >
                    <div className="notif-item-icon-col">
                      <div className={`notif-type-icon ${isUnread ? 'active' : ''}`}>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      </div>
                    </div>

                    <div className="notif-item-body">
                      <div className="notif-item-top">
                        <span className="notif-item-title">{notif.title}</span>
                        <span className="notif-item-time">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="notif-item-msg">{notif.message}</p>
                    </div>

                    {isUnread && (
                      <div
                        className="notif-item-unread-dot"
                        title="Unread notification"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
