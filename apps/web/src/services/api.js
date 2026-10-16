import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'civicai_auth_token';

/**
 * Retrieve the current stored access token safely from localStorage
 */
export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem('civicai.access-token') || null;
  } catch {
    return null;
  }
};

/**
 * Persist the access token to localStorage
 */
export const setStoredToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem('civicai.access-token', token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem('civicai.access-token');
    }
  } catch {
    // Gracefully handle environments with restricted localStorage
  }
};

/**
 * Remove access token from localStorage
 */
export const removeStoredToken = () => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem('civicai.access-token');
  } catch {
    // Gracefully handle environments with restricted localStorage
  }
};

// Base URL configuration: VITE_API_URL or fallback to relative URL for Vite dev proxy
const rawApiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ? import.meta.env.VITE_API_URL : '';
const cleanBaseUrl = rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : '';

export const api = axios.create({
  baseURL: cleanBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach Bearer token when present
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Graceful error normalization without logging secrets
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred. Please try again.';
    let code = 'UNKNOWN_ERROR';

    if (error.response?.data) {
      if (typeof error.response.data.message === 'string') {
        message = error.response.data.message;
      }
      if (error.response.data.error?.code) {
        code = error.response.data.error.code;
      }
    } else if (error.request) {
      message = 'Unable to connect to CivicAI server. Please check your network connection.';
      code = 'NETWORK_ERROR';
    }

    const enhancedError = new Error(message);
    enhancedError.code = code;
    enhancedError.status = error.response?.status;
    enhancedError.response = error.response;
    return Promise.reject(enhancedError);
  },
);

export const authApi = {
  /**
   * Register a new citizen account
   * POST /api/v1/auth/register
   */
  async register(userData) {
    const response = await api.post('/api/v1/auth/register', userData);
    return response.data;
  },

  /**
   * Citizen Login
   * POST /api/v1/auth/login
   */
  async login(credentials) {
    const response = await api.post('/api/v1/auth/login', credentials);
    return response.data;
  },

  /**
   * Fetch current authenticated citizen profile
   * GET /api/v1/auth/me
   */
  async getCurrentUser() {
    const response = await api.get('/api/v1/auth/me');
    return response.data;
  },

  /**
   * Revoke token and logout
   * POST /api/v1/auth/logout
   */
  async logout() {
    const response = await api.post('/api/v1/auth/logout');
    return response.data;
  },
};

export default api;
