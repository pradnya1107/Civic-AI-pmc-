import React, { useState, useEffect, createContext, useContext } from 'react';
import { CitizenSidebar } from './CitizenSidebar';
import { CitizenTopNav } from './CitizenTopNav';
import { HelpCenterModal } from './HelpCenterModal';
import { ProfileModal } from './ProfileModal';
import { NotificationDrawer } from './NotificationDrawer';
import { AICitizenChatbot } from './AICitizenChatbot';
import { notificationApi } from '../services/api';

export const CitizenPortalContext = createContext({
  openNotifications: () => {},
  openHelp: () => {},
  openProfile: () => {},
  openSidebar: () => {},
  unreadCount: 0,
});

export const useCitizenPortal = () => useContext(CitizenPortalContext);

export const CitizenLayout = ({
  children,
  notifDrawerOpen: externalNotifOpen,
  onCloseNotifications: externalCloseNotif,
  onOpenNotifications: externalOpenNotif,
  unreadCount: externalUnreadCount,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [internalNotifOpen, setInternalNotifOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Synchronize unread count from notifications API
  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await notificationApi.getNotifications({ limit: 15 });
        const list = res?.data?.notifications || res?.notifications || res?.data || [];
        if (Array.isArray(list) && isMounted) {
          const unread = list.filter((n) => !n.isRead && !n.read).length;
          setUnreadNotifCount(unread);
        }
      } catch {
        // Fallback gracefully
      }
    };
    fetchUnread();
    return () => {
      isMounted = false;
    };
  }, []);

  const isDrawerOpen = externalNotifOpen !== undefined ? externalNotifOpen : internalNotifOpen;
  const effectiveUnread = externalUnreadCount !== undefined ? externalUnreadCount : unreadNotifCount;

  const handleOpenNotifications = () => {
    setInternalNotifOpen(true);
    if (externalOpenNotif) externalOpenNotif();
  };

  const handleCloseNotifications = () => {
    setInternalNotifOpen(false);
    if (externalCloseNotif) externalCloseNotif();
  };

  const contextValue = {
    openNotifications: handleOpenNotifications,
    openHelp: () => setHelpOpen(true),
    openProfile: () => setProfileOpen(true),
    openSidebar: () => setSidebarOpen(true),
    unreadCount: effectiveUnread,
  };

  return (
    <CitizenPortalContext.Provider value={contextValue}>
      <div className="citizen-portal-layout">
        {/* 1. Left Sidebar Navigation - Persistent across all citizen tabs */}
        <CitizenSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* 2. Main Portal Workspace */}
        <div className="citizen-portal-main">
          {/* Top Bar with Search, Day/Night toggle, Notifications bell, Citizen Profile */}
          <CitizenTopNav
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onOpenHelp={() => setHelpOpen(true)}
            onOpenProfile={() => setProfileOpen(true)}
            onOpenNotifications={handleOpenNotifications}
            unreadCount={effectiveUnread}
          />

          {/* Content Area */}
          <main className="citizen-content-container" id="main-content">
            {children}
          </main>
        </div>

        {/* Slide-over Notifications Drawer */}
        <NotificationDrawer
          isOpen={isDrawerOpen}
          onClose={handleCloseNotifications}
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

        {/* 3. Floating AI Citizen Support Chatbot (Ask CivicAI) */}
        <AICitizenChatbot />
      </div>
    </CitizenPortalContext.Provider>
  );
};

export default CitizenLayout;
