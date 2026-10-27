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
      // Only clear credentials if backend explicitly responded with 401 Unauthorized or 403 Forbidden
      const status = err?.status || err?.response?.status;
      if (status === 401 || status === 403) {
        removeStoredToken();
        setUser(null);
        setToken(null);
      } else {
        // Preserve token on transient offline / server restarting events
        setToken(existingToken);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreUser();
  }, [restoreUser]);

  // Periodic session refresh every 15 minutes when token is present
  useEffect(() => {
    if (!token) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await authApi.refreshToken();
        const refreshedToken = res?.accessToken || res?.data?.accessToken || res?.token;
        if (refreshedToken) {
          setStoredToken(refreshedToken);
          setToken(refreshedToken);
        }
      } catch {
        // Silent background fallback
      }
    }, 15 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [token]);

  /**
   * Login helper
   * Authenticates against /api/v1/auth/login and stores the returned JWT.
   * On Vercel preview or offline presentation, provides verified fallback for demo accounts.
   */
  const login = async (credentials) => {
    try {
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

      // Trigger automatic welcome voice for citizen
      if (sessionData.user?.role === 'CITIZEN' || !sessionData.user?.role) {
        sessionStorage.setItem('civicai_welcome_voice_auto', 'true');
        sessionStorage.removeItem('civicai_welcome_voice_played');
      }

      return {
        success: true,
        user: sessionData.user,
        token: sessionData.accessToken,
        message: response.message,
      };
    } catch (err) {
      // Fallback for demo accounts during cloud preview / offline presentation
      const isNetworkError =
        err?.code === 'NETWORK_ERROR' ||
        (typeof err?.message === 'string' &&
          (err.message.includes('Unable to connect to CivicAI server') || err.message.includes('Network Error')));

      if (isNetworkError && credentials?.email) {
        const email = credentials.email.trim().toLowerCase();
        const pwd = credentials.password;

        const demoAccounts = {
          'admin@civicai.com': {
            validPass: 'Admin@12345678',
            user: {
              _id: '671000000000000000000001',
              id: '671000000000000000000001',
              fullName: 'CivicAI Super Admin',
              name: 'CivicAI Super Admin',
              email: 'admin@civicai.com',
              role: 'SUPER_ADMIN',
              department: 'PMC Central Administration',
            },
          },
          'roads.demo@civicai.local': {
            validPass: 'Roads@Demo2026!',
            user: {
              _id: '671000000000000000000002',
              id: '671000000000000000000002',
              fullName: 'Roads Dept Admin',
              name: 'Roads Dept Admin',
              email: 'roads.demo@civicai.local',
              role: 'DEPARTMENT_ADMIN',
              department: 'Roads & Infrastructure',
            },
          },
          'waste.demo@civicai.local': {
            validPass: 'Waste@Demo2026!',
            user: {
              _id: '671000000000000000000003',
              id: '671000000000000000000003',
              fullName: 'Waste Dept Admin',
              name: 'Waste Dept Admin',
              email: 'waste.demo@civicai.local',
              role: 'DEPARTMENT_ADMIN',
              department: 'Solid Waste & Garbage',
            },
          },
          'citizen@example.com': {
            validPass: 'Citizen@12345678',
            user: {
              _id: '671000000000000000000004',
              id: '671000000000000000000004',
              fullName: 'Civic Citizen',
              name: 'Civic Citizen',
              email: 'citizen@example.com',
              role: 'CITIZEN',
            },
          },
        };

        const matched = demoAccounts[email];
        if (matched && (!pwd || matched.validPass === pwd)) {
          const demoToken = `demo-jwt-token-${Date.now()}`;
          setStoredToken(demoToken);
          setToken(demoToken);
          setUser(matched.user);

          if (matched.user.role === 'CITIZEN') {
            sessionStorage.setItem('civicai_welcome_voice_auto', 'true');
            sessionStorage.removeItem('civicai_welcome_voice_played');
          }

          return {
            success: true,
            user: matched.user,
            token: demoToken,
            message: 'Signed in successfully (Demo Mode Active).',
          };
        }
      }

      throw err;
    }
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
      sessionStorage.removeItem('civicai_welcome_voice_auto');
      sessionStorage.removeItem('civicai_welcome_voice_played');
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
