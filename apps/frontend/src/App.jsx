import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { DepartmentProtectedRoute } from './components/DepartmentProtectedRoute';

// Citizen Pages
import { SplashScreen } from './pages/SplashScreen';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ComplaintFormPage } from './pages/ComplaintFormPage';
import { ComplaintListPage } from './pages/ComplaintListPage';
import { ComplaintDetailPage } from './pages/ComplaintDetailPage';
import { HeatmapPage } from './pages/HeatmapPage';

// Super Admin Components & Pages
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminComplaintDetailPage } from './pages/admin/AdminComplaintDetailPage';
import { SuperAdminDashboardPage } from './pages/admin/SuperAdminDashboardPage';
import { DepartmentsPage } from './pages/admin/DepartmentsPage';
import { DepartmentAdminsPage } from './pages/admin/DepartmentAdminsPage';
import { AdminComplaintsPage } from './pages/admin/AdminComplaintsPage';
import { AdminCitizensPage } from './pages/admin/AdminCitizensPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminNotificationsPage } from './pages/admin/AdminNotificationsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

// Department Admin Components & Pages
import { DepartmentLayout } from './components/department/DepartmentLayout';
import { DepartmentDashboardPage } from './pages/department/DepartmentDashboardPage';
import { DepartmentComplaintsPage } from './pages/department/DepartmentComplaintsPage';
import { DepartmentComplaintDetailPage } from './pages/department/DepartmentComplaintDetailPage';
import { DepartmentOfficersPage } from './pages/department/DepartmentOfficersPage';
import { DepartmentVerificationPage } from './pages/department/DepartmentVerificationPage';
import { DepartmentAnalyticsPage } from './pages/department/DepartmentAnalyticsPage';
import { DepartmentNotificationsPage } from './pages/department/DepartmentNotificationsPage';
import { DepartmentSettingsPage } from './pages/department/DepartmentSettingsPage';
import { DepartmentHelpPage } from './pages/department/DepartmentHelpPage';

/**
 * Root index redirect handler
 * Directs authenticated users by role to their respective dashboard
 */
const RootIndexRedirect = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Initializing CivicAI Platform...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/splash" replace />;
  }

  const role = (user?.role || 'CITIZEN').toUpperCase();
  if (role === 'DEPARTMENT_ADMIN') {
    return <Navigate to="/department/dashboard" replace />;
  }
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

/**
 * Intelligent Dashboard Dispatcher:
 * Department Admins land on /department/dashboard.
 * Super Admins land on the Admin Complaint Dashboard.
 * Citizens see their civic grievances portal.
 */
const DashboardDispatcher = () => {
  const { user } = useAuth();
  const role = (user?.role || 'CITIZEN').toUpperCase();

  if (role === 'DEPARTMENT_ADMIN') {
    return <Navigate to="/department/dashboard" replace />;
  }

  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return (
      <AdminLayout>
        <AdminDashboardPage />
      </AdminLayout>
    );
  }

  return <DashboardPage />;
};

export const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <Routes>
              {/* Index Route */}
              <Route path="/" element={<RootIndexRedirect />} />

              {/* Public Welcome & Auth Routes */}
              <Route path="/splash" element={<SplashScreen />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Role-Aware Dashboard */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardDispatcher />
                  </ProtectedRoute>
                }
              />

              {/* Citizen Grievance Routes */}
              <Route
                path="/complaints"
                element={
                  <ProtectedRoute>
                    <ComplaintListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/complaints/new"
                element={
                  <ProtectedRoute>
                    <ComplaintFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/complaints/:id"
                element={
                  <ProtectedRoute>
                    <ComplaintDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/report"
                element={<Navigate to="/complaints/new" replace />}
              />
              <Route
                path="/heatmap"
                element={
                  <ProtectedRoute>
                    <HeatmapPage />
                  </ProtectedRoute>
                }
              />

              {/* Department Admin Portal Routes */}
              <Route
                path="/department"
                element={<Navigate to="/department/dashboard" replace />}
              />
              <Route
                path="/department/dashboard"
                element={
                  <DepartmentProtectedRoute>
                    <DepartmentLayout>
                      <DepartmentDashboardPage />
                    </DepartmentLayout>
                  </DepartmentProtectedRoute>
                }
              />
              <Route
                path="/department/complaints"
                element={
                  <DepartmentProtectedRoute>
                    <DepartmentLayout>
                      <DepartmentComplaintsPage />
                    </DepartmentLayout>
                  </DepartmentProtectedRoute>
                }
              />
              <Route
                path="/department/complaints/:id"
                element={
                  <DepartmentProtectedRoute>
                    <DepartmentLayout>
                      <DepartmentComplaintDetailPage />
                    </DepartmentLayout>
                  </DepartmentProtectedRoute>
                }
              />
              <Route
                path="/department/officers"
                element={
                  <DepartmentProtectedRoute>
                    <DepartmentLayout>
                      <DepartmentOfficersPage />
                    </DepartmentLayout>
                  </DepartmentProtectedRoute>
                }
              />
              <Route
                path="/department/verification"
                element={
                  <DepartmentProtectedRoute>
                    <DepartmentLayout>
                      <DepartmentVerificationPage />
                    </DepartmentLayout>
                  </DepartmentProtectedRoute>
                }
              />
              <Route
                path="/department/analytics"
                element={
                  <DepartmentProtectedRoute>
                    <DepartmentLayout>
                      <DepartmentAnalyticsPage />
                    </DepartmentLayout>
                  </DepartmentProtectedRoute>
                }
              />
              <Route
                path="/department/notifications"
                element={
                  <DepartmentProtectedRoute>
                    <DepartmentLayout>
                      <DepartmentNotificationsPage />
                    </DepartmentLayout>
                  </DepartmentProtectedRoute>
                }
              />
              <Route
                path="/department/settings"
                element={
                  <DepartmentProtectedRoute>
                    <DepartmentLayout>
                      <DepartmentSettingsPage />
                    </DepartmentLayout>
                  </DepartmentProtectedRoute>
                }
              />
              <Route
                path="/department/help"
                element={
                  <DepartmentProtectedRoute>
                    <DepartmentLayout>
                      <DepartmentHelpPage />
                    </DepartmentLayout>
                  </DepartmentProtectedRoute>
                }
              />

              {/* Super Administrative Portal Routes */}
              <Route
                path="/admin"
                element={
                  <AdminProtectedRoute>
                    <AdminLayout>
                      <AdminDashboardPage />
                    </AdminLayout>
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <AdminProtectedRoute>
                    <AdminLayout>
                      <AdminDashboardPage />
                    </AdminLayout>
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/complaints"
                element={
                  <AdminProtectedRoute>
                    <AdminLayout>
                      <AdminDashboardPage />
                    </AdminLayout>
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/complaints/:id"
                element={
                  <AdminProtectedRoute>
                    <AdminLayout>
                      <AdminComplaintDetailPage />
                    </AdminLayout>
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/super-dashboard"
                element={
                  <AdminProtectedRoute>
                    <AdminLayout>
                      <SuperAdminDashboardPage />
                    </AdminLayout>
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/departments"
                element={
                  <AdminProtectedRoute>
                    <AdminLayout>
                      <DepartmentsPage />
                    </AdminLayout>
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/department-admins"
                element={
                  <AdminProtectedRoute>
                    <AdminLayout>
                      <DepartmentAdminsPage />
                    </AdminLayout>
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/citizens"
                element={
                  <AdminProtectedRoute>
                    <AdminLayout>
                      <AdminCitizensPage />
                    </AdminLayout>
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <AdminProtectedRoute>
                    <AdminLayout>
                      <AdminAnalyticsPage />
                    </AdminLayout>
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/notifications"
                element={
                  <AdminProtectedRoute>
                    <AdminLayout>
                      <AdminNotificationsPage />
                    </AdminLayout>
                  </AdminProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <AdminProtectedRoute>
                    <AdminLayout>
                      <AdminSettingsPage />
                    </AdminLayout>
                  </AdminProtectedRoute>
                }
              />

              {/* Catch-all Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
