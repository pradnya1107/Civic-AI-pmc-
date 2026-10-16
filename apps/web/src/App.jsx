import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Citizen Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ComplaintFormPage } from './pages/ComplaintFormPage';
import { ComplaintListPage } from './pages/ComplaintListPage';
import { ComplaintDetailPage } from './pages/ComplaintDetailPage';

// Admin Components & Pages
import { AdminLayout } from './components/admin/AdminLayout';
import { SuperAdminDashboardPage } from './pages/admin/SuperAdminDashboardPage';
import { DepartmentsPage } from './pages/admin/DepartmentsPage';
import { DepartmentAdminsPage } from './pages/admin/DepartmentAdminsPage';
import { AdminComplaintsPage } from './pages/admin/AdminComplaintsPage';
import { AdminCitizensPage } from './pages/admin/AdminCitizensPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminNotificationsPage } from './pages/admin/AdminNotificationsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

/**
 * Root index redirect handler
 * Directs authenticated users to /dashboard and unauthenticated visitors to /login
 */
const RootIndexRedirect = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Initializing CivicAI Platform...</p>
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
};

/**
 * Intelligent Dashboard Dispatcher:
 * Super Admins and Admins automatically see the municipal administration portal.
 * Citizens see their civic grievances portal.
 */
const DashboardDispatcher = () => {
  const { user } = useAuth();
  const role = user?.role || 'CITIZEN';

  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return (
      <AdminLayout>
        <SuperAdminDashboardPage />
      </AdminLayout>
    );
  }

  return <DashboardPage />;
};

export const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Index Route */}
            <Route path="/" element={<RootIndexRedirect />} />

            {/* Public Auth Routes */}
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

            {/* Super Admin Control Center Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <AdminLayout>
                    <SuperAdminDashboardPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/complaints"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <AdminLayout>
                    <AdminComplaintsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/departments"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <AdminLayout>
                    <DepartmentsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/department-admins"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <AdminLayout>
                    <DepartmentAdminsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/citizens"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <AdminLayout>
                    <AdminCitizensPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <AdminLayout>
                    <AdminAnalyticsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <AdminLayout>
                    <AdminNotificationsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <AdminLayout>
                    <AdminSettingsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
