import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';

// Citizen Pages
import { SplashScreen } from './pages/SplashScreen';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ComplaintFormPage } from './pages/ComplaintFormPage';
import { ComplaintListPage } from './pages/ComplaintListPage';
import { ComplaintDetailPage } from './pages/ComplaintDetailPage';
import { HeatmapPage } from './pages/HeatmapPage';

// Admin Components & Pages
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

  return <Navigate to={isAuthenticated ? '/dashboard' : '/splash'} replace />;
};

/**
 * Intelligent Dashboard Dispatcher:
 * Super Admins and Admins automatically land on the Admin Complaint Dashboard.
 * Citizens see their civic grievances portal.
 */
const DashboardDispatcher = () => {
  const { user } = useAuth();
  const role = (user?.role || 'CITIZEN').toUpperCase();

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

            {/* Administrative Portal Routes (Protected by AdminProtectedRoute) */}
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
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
