import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ============================================================================
 * IMPORTANT SECURITY ARCHITECTURE NOTE:
 * Client-side route protection (such as ProtectedRoute) enhances user experience
 * by preventing unauthenticated access to UI views and dashboard screens.
 * 
 * However, client-side route protection MUST NEVER be treated as a substitute
 * for backend API authorization. The backend API independently validates JWT
 * signatures, token versions, and user permissions on every protected endpoint.
 * ============================================================================
 */

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Prevent flash of redirection while the token is being verified against /api/v1/auth/me
  if (isLoading) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>Verifying civic session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve intended destination so user can be redirected after successful login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : null;
};

export default ProtectedRoute;
