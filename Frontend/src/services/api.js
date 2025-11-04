import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      console.error('Network Error:', error.message);
      // Don't show toast for network errors - let components handle it
      return Promise.reject(error);
    }

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          // Implement token refresh logic here if needed
          // For now, redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Don't show automatic toast - let components handle error messages
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verifyMFA: (data) => api.post('/auth/verify-mfa', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  setupMFA: () => api.post('/auth/setup-mfa'),
  enableMFA: (code) => api.post('/auth/enable-mfa', { code }),
  disableMFA: (password, code) => api.post('/auth/disable-mfa', { password, code }),
};

// Patient APIs
export const patientAPI = {
  getAll: (params) => api.get('/patients', { params }),
  getById: (id, breakGlassData = null) => {
    if (breakGlassData) {
      return api.post(`/patients/${id}/break-glass`, breakGlassData);
    }
    return api.get(`/patients/${id}`);
  },
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  delete: (id) => api.delete(`/patients/${id}`),
  assignProvider: (id, data) => api.post(`/patients/${id}/assign`, data),
  updateConsent: (id, consent) => api.put(`/patients/${id}/consent`, { consent }),
};

// EHR APIs
export const ehrAPI = {
  getMyPatients: (params) => api.get('/ehr/my-patients', { params }),
  getPatientEHRs: (patientId, params) => api.get(`/ehr/patient/${patientId}`, { params }),
  getById: (id, breakGlassData = null) => {
    if (breakGlassData) {
      return api.post(`/ehr/${id}/break-glass`, breakGlassData);
    }
    return api.get(`/ehr/${id}`);
  },
  create: (data) => api.post('/ehr', data),
  update: (id, data) => api.put(`/ehr/${id}`, data),
  amend: (id, data) => api.post(`/ehr/${id}/amend`, data),
  sign: (id) => api.post(`/ehr/${id}/sign`),
  delete: (id) => api.delete(`/ehr/${id}`),
};

// Audit Log APIs
export const auditAPI = {
  getAll: (params) => api.get('/audit-logs', { params }),
  getBreakGlass: (params) => api.get('/audit-logs/break-glass', { params }),
  getUserLogs: (userId, params) => api.get(`/audit-logs/user/${userId}`, { params }),
  getPatientLogs: (patientId, params) => api.get(`/audit-logs/patient/${patientId}`, { params }),
  getStats: (params) => api.get('/audit-logs/stats/summary', { params }),
};

// Admin APIs
export const adminAPI = {
  getAllUsers: () => api.get('/admin/users'),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  unlockUser: (id) => api.post(`/admin/users/${id}/unlock`),
  suspendUser: (id, data) => api.post(`/admin/users/${id}/suspend`, data),
  getSystemStats: () => api.get('/admin/stats'),
};

// Hospital Network APIs
export const hospitalAPI = {
  getAll: (params) => api.get('/hospitals', { params }),
  getById: (id) => api.get(`/hospitals/${id}`),
  create: (data) => api.post('/hospitals', data),
  update: (id, data) => api.put(`/hospitals/${id}`, data),
  delete: (id) => api.delete(`/hospitals/${id}`),
  updateStatus: (id, status) => api.put(`/hospitals/${id}/status`, { status }),
  syncStats: (id) => api.post(`/hospitals/${id}/sync`),
  testConnection: (id) => api.post(`/hospitals/${id}/test-connection`),
  getNetworkStats: () => api.get('/hospitals/stats/network'),
};

export default api;
