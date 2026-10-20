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
    // 401 Unauthorized handling: clear credentials and redirect to login
    if (error.response?.status === 401) {
      removeStoredToken();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        try {
          window.location.href = '/login';
        } catch {
          // Graceful fallback for non-browser/jsdom environments
        }
      }
    }

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

export const complaintApi = {
  /**
   * Submit a new citizen grievance / complaint
   * POST /api/v1/complaints
   */
  async createComplaint(complaintData) {
    const response = await api.post('/api/v1/complaints', complaintData);
    return response.data;
  },

  /**
   * Fetch complaints submitted by the citizen
   * GET /api/v1/complaints
   */
  async getComplaints(params = {}) {
    const response = await api.get('/api/v1/complaints', { params });
    return response.data;
  },

  /**
   * Fetch specific complaint details by id
   * GET /api/v1/complaints/:id
   */
  async getComplaintById(id) {
    const response = await api.get(`/api/v1/complaints/${id}`);
    return response.data;
  },

  /**
   * Fetch heatmap geo-points for Pune civic map
   * GET /api/v1/complaints/heatmap
   */
  async getHeatmapData(params = {}) {
    const response = await api.get('/api/v1/complaints/heatmap', { params });
    return response.data;
  },

  /**
   * Check for nearby potential duplicate complaints
   * POST /api/v1/complaints/check-duplicates
   */
  async checkDuplicates(data) {
    const response = await api.post('/api/v1/complaints/check-duplicates', data);
    return response.data;
  },

  /**
   * Citizen community upvote / support a complaint
   * POST /api/v1/complaints/:id/support
   */
  async supportComplaint(id) {
    const response = await api.post(`/api/v1/complaints/${id}/support`);
    return response.data;
  },

  /**
   * Admin resolve complaint with before-and-after photo verification
   * POST /api/v1/complaints/:id/resolve
   */
  async resolveComplaint(id, data) {
    const response = await api.post(`/api/v1/complaints/${id}/resolve`, data);
    return response.data;
  },

  /**
   * Citizen confirm resolution satisfaction and provide feedback
   * POST /api/v1/complaints/:id/confirm
   */
  async confirmResolution(id, data) {
    const response = await api.post(`/api/v1/complaints/${id}/confirm`, data);
    return response.data;
  },

  /**
   * Citizen dispute an unresolved or unsatisfactory resolution
   * POST /api/v1/complaints/:id/dispute
   */
  async disputeResolution(id, data) {
    const response = await api.post(`/api/v1/complaints/${id}/dispute`, data);
    return response.data;
  },

  /**
   * Get SLA monitoring metrics and overdue alerts
   * GET /api/v1/complaints/sla-monitoring
   */
  async getSlaMonitoring() {
    const response = await api.get('/api/v1/complaints/sla-monitoring');
    return response.data;
  },

  /**
   * Update complaint status, department assignment, or priority (Admin/SuperAdmin)
   * PATCH /api/v1/complaints/:id
   */
  async updateComplaint(id, data) {
    const response = await api.patch(`/api/v1/complaints/${id}`, data);
    return response.data;
  },

  /**
   * Delete complaint
   * DELETE /api/v1/complaints/:id
   */
  async deleteComplaint(id) {
    const response = await api.delete(`/api/v1/complaints/${id}`);
    return response.data;
  },

  /**
   * Get AI category, priority, and summary suggestions for a complaint (ISSUE-09)
   * GET /api/v1/complaints/:id/ai
   */
  async getAiAnalysis(id) {
    const response = await api.get(`/api/v1/complaints/${id}/ai`);
    return response.data;
  },
};

export const aiApi = {
  /**
   * Check Gemini AI connection status
   * GET /api/v1/ai/status
   */
  async getAiStatus() {
    const response = await api.get('/api/v1/ai/status');
    return response.data;
  },

  /**
   * Get AI category, priority, and summary suggestions for a complaint (ISSUE-09)
   * GET /api/v1/complaints/:id/ai
   */
  async getAiAnalysis(complaintId) {
    const response = await api.get(`/api/v1/complaints/${complaintId}/ai`);
    return response.data;
  },

  /**
   * Analyze complaint image + text with Gemini Vision
   * POST /api/v1/ai/analyze-complaint
   */
  async analyzeComplaint(data) {
    const response = await api.post('/api/v1/ai/analyze-complaint', data);
    return response.data;
  },

  /**
   * Verify before-and-after resolution repair photo
   * POST /api/v1/ai/verify-resolution
   */
  async verifyResolution(data) {
    const response = await api.post('/api/v1/ai/verify-resolution', data);
    return response.data;
  },
};

export const departmentApi = {
  /**
   * List all departments with complaint & admin stats
   * GET /api/v1/departments
   */
  async getDepartments(params = {}) {
    const response = await api.get('/api/v1/departments', { params });
    return response.data;
  },

  /**
   * Get department by ID
   * GET /api/v1/departments/:id
   */
  async getDepartmentById(id) {
    const response = await api.get(`/api/v1/departments/${id}`);
    return response.data;
  },

  /**
   * Create a new civic department
   * POST /api/v1/departments
   */
  async createDepartment(data) {
    const response = await api.post('/api/v1/departments', data);
    return response.data;
  },

  /**
   * Update an existing department
   * PATCH /api/v1/departments/:id
   */
  async updateDepartment(id, data) {
    const response = await api.patch(`/api/v1/departments/${id}`, data);
    return response.data;
  },
};

export const adminApi = {
  /**
   * Fetch municipal super admin dashboard metrics, KPI counters, and department workloads
   * GET /api/v1/admin/dashboard
   */
  async getDashboard() {
    const response = await api.get('/api/v1/admin/dashboard');
    return response.data;
  },

  /**
   * Fetch department administrators directory
   * GET /api/v1/admin/department-admins
   */
  async getDepartmentAdmins() {
    const response = await api.get('/api/v1/admin/department-admins');
    return response.data;
  },

  /**
   * Create a new department administrator
   * POST /api/v1/admin/department-admins
   */
  async createDepartmentAdmin(data) {
    const response = await api.post('/api/v1/admin/department-admins', data);
    return response.data;
  },

  /**
   * Update department admin details, assignment, or account status
   * PATCH /api/v1/admin/department-admins/:id
   */
  async updateDepartmentAdmin(id, data) {
    const response = await api.patch(`/api/v1/admin/department-admins/${id}`, data);
    return response.data;
  },

  /**
   * Fetch registered citizens directory
   * GET /api/v1/admin/citizens
   */
  async getCitizens(params = {}) {
    const response = await api.get('/api/v1/admin/citizens', { params });
    return response.data;
  },

  /**
   * Fetch all complaints with filter, sort, and pagination (Admin Portal)
   * GET /api/v1/admin/complaints
   */
  async getComplaints(params = {}) {
    const response = await api.get('/api/v1/admin/complaints', { params });
    return response.data;
  },

  /**
   * Fetch single complaint with timeline / audit trail
   * GET /api/v1/admin/complaints/:id
   */
  async getComplaintById(id) {
    const response = await api.get(`/api/v1/admin/complaints/${id}`);
    return response.data;
  },

  /**
   * Update complaint status
   * PATCH /api/v1/admin/complaints/:id/status
   */
  async updateComplaintStatus(id, data) {
    const response = await api.patch(`/api/v1/admin/complaints/${id}/status`, data);
    return response.data;
  },

  /**
   * Assign department to complaint
   * PATCH /api/v1/admin/complaints/:id/assign
   */
  async assignComplaintDepartment(id, data) {
    const response = await api.patch(`/api/v1/admin/complaints/${id}/assign`, data);
    return response.data;
  },

  /**
   * Verify complaint
   * PATCH /api/v1/admin/complaints/:id/verify
   */
  async verifyComplaint(id, data = {}) {
    const response = await api.patch(`/api/v1/admin/complaints/${id}/verify`, data);
    return response.data;
  },
};

export const notificationApi = {
  /**
   * Fetch user/admin notifications
   * GET /api/v1/notifications
   */
  async getNotifications(params = {}) {
    const response = await api.get('/api/v1/notifications', { params });
    return response.data;
  },

  /**
   * Mark notification as read
   * PATCH /api/v1/notifications/:id/read
   */
  async markAsRead(id) {
    const response = await api.patch(`/api/v1/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Mark all notifications as read
   * PATCH /api/v1/notifications/read-all
   */
  async markAllAsRead() {
    const response = await api.patch('/api/v1/notifications/read-all');
    return response.data;
  },
};

export const departmentAdminApi = {
  /**
   * Fetch authenticated department admin profile and assigned department
   * GET /api/v1/department-admin/me
   */
  async getMe() {
    const response = await api.get('/api/v1/department-admin/me');
    return response.data;
  },

  /**
   * Fetch department dashboard KPIs, counts, priority queue, and recent activity
   * GET /api/v1/department-admin/dashboard
   */
  async getDashboard() {
    const response = await api.get('/api/v1/department-admin/dashboard');
    return response.data;
  },

  /**
   * Fetch department analytics, received vs resolved trends, and ward distributions
   * GET /api/v1/department-admin/analytics
   */
  async getAnalytics(params = {}) {
    const response = await api.get('/api/v1/department-admin/analytics', { params });
    return response.data;
  },

  /**
   * Fetch department complaints with search, filter, sort, and pagination
   * GET /api/v1/department-admin/complaints
   */
  async getComplaints(params = {}) {
    const response = await api.get('/api/v1/department-admin/complaints', { params });
    return response.data;
  },

  /**
   * Fetch single department complaint details with audit logs
   * GET /api/v1/department-admin/complaints/:id
   */
  async getComplaintById(id) {
    const response = await api.get(`/api/v1/department-admin/complaints/${id}`);
    return response.data;
  },

  /**
   * Update complaint status
   * PATCH /api/v1/department-admin/complaints/:id/status
   */
  async updateComplaintStatus(id, data) {
    const response = await api.patch(`/api/v1/department-admin/complaints/${id}/status`, data);
    return response.data;
  },

  /**
   * Update complaint priority
   * PATCH /api/v1/department-admin/complaints/:id/priority
   */
  async updateComplaintPriority(id, data) {
    const response = await api.patch(`/api/v1/department-admin/complaints/${id}/priority`, data);
    return response.data;
  },

  /**
   * Assign or reassign officer to complaint
   * PATCH /api/v1/department-admin/complaints/:id/assign-officer
   */
  async assignOfficer(id, data) {
    const response = await api.patch(`/api/v1/department-admin/complaints/${id}/assign-officer`, data);
    return response.data;
  },

  /**
   * Add internal investigation note
   * POST /api/v1/department-admin/complaints/:id/notes
   */
  async addInternalNote(id, data) {
    const response = await api.post(`/api/v1/department-admin/complaints/${id}/notes`, data);
    return response.data;
  },

  /**
   * Verify or reject submitted resolution evidence
   * PATCH /api/v1/department-admin/complaints/:id/verify-resolution
   */
  async verifyResolution(id, data) {
    const response = await api.patch(`/api/v1/department-admin/complaints/${id}/verify-resolution`, data);
    return response.data;
  },

  /**
   * Fetch department officers and field workers
   * GET /api/v1/department-admin/officers
   */
  async getOfficers() {
    const response = await api.get('/api/v1/department-admin/officers');
    return response.data;
  },

  /**
   * Create new department field officer
   * POST /api/v1/department-admin/officers
   */
  async createOfficer(data) {
    const response = await api.post('/api/v1/department-admin/officers', data);
    return response.data;
  },

  /**
   * Export department complaints CSV
   * GET /api/v1/department-admin/complaints/export
   */
  async exportComplaintsCsv() {
    const response = await api.get('/api/v1/department-admin/complaints/export', {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default api;



