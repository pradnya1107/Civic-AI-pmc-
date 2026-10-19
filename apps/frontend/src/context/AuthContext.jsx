import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, getStoredToken, setStoredToken, removeStoredToken } from '../services/api';

/**
 * ============================================================================
 * SECURITY NOTE & ARCHITECTURAL LIMITATIONS:
 * Per Issue #9 requirements, the JWT access token is stored in browser localStorage.
 * 
 * XSS RISKS:
 * - Data stored in localStorage is accessible to any script running on the origin.
 * - If malicious scripts execute (via third-party script compromise, unsanitized DOM
 *   injection, or rogue extensions), tokens stored in localStorage can be extracted.
 * 
 * DEFENSE-IN-DEPTH APPLIED:
 * 1. Tokens have short expiration durations on the backend.
 * 2. Passwords and credentials are NEVER saved in localStorage or sessionStorage.
 * 3. Logout explicitly triggers /api/v1/auth/logout, incrementing the user's
 *    tokenVersion in MongoDB to revoke the access token server-side.
 * 4. Stored tokens are validated on startup against /api/v1/auth/me and immediately
 *    purged if rejected.
 * ============================================================================
 */

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getStoredToken());
  const [isLoading, setIsLoading] = useState(true);

  // Restore existing session on mount using /api/v1/auth/me
  const restoreUser = useCallback(async () => {
    const existingToken = getStoredToken();
    if (!existingToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await authApi.getCurrentUser();
      if (response?.data?.user) {
        setUser(response.data.user);
        setToken(existingToken);
      } else {
        // Incomplete profile response, clean up
        removeStoredToken();
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      // Token is expired, invalid, or revoked
      removeStoredToken();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreUser();
  }, [restoreUser]);

  /**
   * Login helper
   * Authenticates against /api/v1/auth/login and stores the returned JWT
   */
  const login = async (credentials) => {
    const response = await authApi.login(credentials);

    if (response?.requiresOtp || response?.data?.requiresOtp) {
      return {
        requiresOtp: true,
        data: response.data || response,
        message: response.message || 'Two-factor OTP required.',
      };
    }

    const sessionData = response?.data;

    if (!sessionData?.accessToken || !sessionData?.user) {
      throw new Error('Incomplete authentication response from server.');
    }

    // Persist token and update state
    setStoredToken(sessionData.accessToken);
    setToken(sessionData.accessToken);
    setUser(sessionData.user);

    return {
      success: true,
      user: sessionData.user,
      token: sessionData.accessToken,
      message: response.message,
    };
  };

  /**
   * Registration helper
   * Registers a new citizen account against /api/v1/auth/register
   * Note: The backend creates an unverified account and does not return an access token.
   * If an access token is returned (in case of future changes), it will store it.
   */
  const register = async (registrationData) => {
    const response = await authApi.register(registrationData);
    const data = response?.data;

    // Follow actual backend contract: store token only if backend returns one
    if (data?.accessToken && data?.user) {
      setStoredToken(data.accessToken);
      setToken(data.accessToken);
      setUser(data.user);
    }

    return {
      success: true,
      message: response.message || 'Account created successfully.',
      user: data?.user,
      hasToken: Boolean(data?.accessToken),
    };
  };

  /**
   * Logout helper
   * Calls server revocation endpoint and purges local credentials
   */
  const logout = async () => {
    try {
      if (token) {
        await authApi.logout();
      }
    } catch {
      // Even if network or revocation call fails, always clean up client state
    } finally {
      removeStoredToken();
      setUser(null);
      setToken(null);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    register,
    logout,
    restoreUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
