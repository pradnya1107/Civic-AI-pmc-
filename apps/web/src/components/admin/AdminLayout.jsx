import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopNav } from './AdminTopNav';

export const AdminLayout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const openMobile = () => {
    setIsMobileOpen(true);
  };

  const closeMobile = () => {
    setIsMobileOpen(false);
  };

  return (
    <div className={`admin-portal-root ${isCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
      {/* Accessibility skip link */}
      <a href="#admin-main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Sidebar Navigation */}
      <AdminSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={closeMobile}
      />

      {/* Main Administrative Container */}
      <div className="admin-main-wrapper">
        <AdminTopNav onOpenMobile={openMobile} />

        <main id="admin-main-content" className="admin-content-area" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
