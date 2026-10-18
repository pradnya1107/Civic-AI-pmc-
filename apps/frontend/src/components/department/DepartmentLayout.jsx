import React, { useState, useEffect } from 'react';
import { DepartmentSidebar } from './DepartmentSidebar';
import { DepartmentTopNav } from './DepartmentTopNav';
import { departmentAdminApi } from '../../services/api';

export const DepartmentLayout = ({ children, onGlobalRefresh, departmentProfile }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [departmentInfo, setDepartmentInfo] = useState(departmentProfile || null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  useEffect(() => {
    if (!departmentInfo) {
      departmentAdminApi
        .getMe()
        .then((res) => {
          if (res?.data?.admin?.department) {
            setDepartmentInfo(res.data.admin.department);
          }
        })
        .catch(() => {});
    }
  }, [departmentInfo]);

  const handleRefresh = () => {
    setLastRefreshed(new Date());
    if (onGlobalRefresh) {
      onGlobalRefresh();
    }
  };

  return (
    <div className="dept-app-shell admin-app-shell">
      <DepartmentSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        departmentName={departmentInfo?.name}
      />

      <div className={`admin-main-wrap ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <DepartmentTopNav
          departmentName={departmentInfo?.name}
          lastRefreshed={lastRefreshed}
          onRefresh={handleRefresh}
          onOpenMobile={() => setIsMobileOpen(true)}
        />

        <main className="admin-page-content" style={{ padding: '24px', background: 'var(--bg-main, #F3F6FA)' }}>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, {
                departmentInfo,
                lastRefreshed,
                onRefreshNeeded: handleRefresh,
              });
            }
            return child;
          })}
        </main>
      </div>
    </div>
  );
};

export default DepartmentLayout;
