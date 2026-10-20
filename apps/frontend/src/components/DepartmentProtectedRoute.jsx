import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * DepartmentProtectedRoute
 * Ensures only authenticated users with DEPARTMENT_ADMIN, ADMIN, or SUPER_ADMIN role can access department views.
 * Regular citizens are automatically redirected to /dashboard.
 * Unauthenticated visitors are redirected to /login.
 */
export const DepartmentProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Verifying department credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = (user?.role || 'CITIZEN').toUpperCase();
  if (userRole !== 'DEPARTMENT_ADMIN' && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : null;
};

export default DepartmentProtectedRoute;
