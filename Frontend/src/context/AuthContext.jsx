import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaToken, setMfaToken] = useState(null);

  useEffect(() => {
    // Check if user is logged in on mount
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          console.log('[AuthContext] User loaded from localStorage:', parsedUser);
          
          // Optionally verify token with backend
          try {
            const response = await authAPI.getMe();
            console.log('[AuthContext] getMe response:', response.data);
            setUser(response.data.data);
            localStorage.setItem('user', JSON.stringify(response.data.data));
          } catch (verifyError) {
            console.warn('[AuthContext] getMe failed, but keeping localStorage user:', verifyError);
            // Keep the user from localStorage if getMe fails
            // Only logout if it's a 401 (unauthorized)
            if (verifyError.response?.status === 401) {
              console.log('[AuthContext] Token expired, logging out');
              logout();
            }
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          // Only logout if there's a parsing error or 401
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      console.log('[AuthContext] Login response:', response.data);
      
      // Handle MFA requirement
      if (response.data.requiresMFA) {
        console.log('[AuthContext] MFA required, setting state');
        console.log('[AuthContext] MFA token:', response.data.mfaToken);
        setRequiresMFA(true);
        setMfaToken(response.data.mfaToken);
        console.log('[AuthContext] State updated - requiresMFA should now be true');
        return { requiresMFA: true, mfaToken: response.data.mfaToken };
      }

      console.log('[AuthContext] MFA not required, proceeding with tokens');

      // Extract tokens and user data from response
      const tokens = response.data.tokens;
      const userData = response.data.user;
      
      console.log('[AuthContext] Tokens:', { 
        hasAccessToken: !!tokens?.accessToken, 
        hasRefreshToken: !!tokens?.refreshToken 
      });
      console.log('[AuthContext] User data:', userData);
      
      // Store in localStorage
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setUser(userData);
      setRequiresMFA(false);
      setMfaToken(null);
      
      console.log('[AuthContext] State updated, user:', userData);
      console.log('[AuthContext] isAuthenticated will be:', !!userData);
      
      toast.success('Login successful!');
      return { success: true, user: userData, requiresMFA: false };
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle different error types
      if (!error.response) {
        toast.error('Cannot connect to server. Please make sure the backend is running.');
      } else if (error.response.status === 500) {
        const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Server error occurred';
        toast.error(`Server Error: ${errorMsg}`);
      } else if (error.response.status === 401) {
        toast.error('Invalid email or password');
      } else {
        const message = error.response?.data?.message || 'Login failed';
        toast.error(message);
      }
      throw error;
    }
  };

  const verifyMFA = async (code) => {
    try {
      const response = await authAPI.verifyMFA({
        mfaToken,
        code
      });

      // Extract tokens and user data from response
      const tokens = response.data.tokens;
      const userData = response.data.user;
      
      // Store in localStorage
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setUser(userData);
      setRequiresMFA(false);
      setMfaToken(null);
      
      toast.success('MFA verification successful!');
      return { success: true, user: userData };
    } catch (error) {
      console.error('MFA verification error:', error);
      
      // Handle different error types
      if (!error.response) {
        toast.error('Cannot connect to server. Please make sure the backend is running.');
      } else if (error.response.status === 500) {
        const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Server error occurred';
        toast.error(`Server Error: ${errorMsg}`);
      } else if (error.response.status === 401) {
        toast.error('Invalid or expired MFA code');
      } else {
        const message = error.response?.data?.message || 'MFA verification failed';
        toast.error(message);
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      setRequiresMFA(false);
      setMfaToken(null);
      toast.info('Logged out successfully');
    }
  };

  const resetMFA = () => {
    setRequiresMFA(false);
    setMfaToken(null);
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      toast.success('Registration successful! Please login.');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    // Implement permission checking logic based on role and attributes
    // For now, admins have all permissions
    if (user.role === 'admin') return true;
    
    // Add more specific permission checks here
    return false;
  };

  // MFA MANAGEMENT FUNCTIONS
  const setupMFA = async () => {
    try {
      const response = await authAPI.setupMFA();
      return response.data.data; // { qrCode, secret, backupCodes }
    } catch (error) {
      toast.error('Failed to setup MFA');
      throw error;
    }
  };

  const enableMFA = async (code) => {
    try {
      await authAPI.enableMFA(code);
      // Update user state to reflect MFA enabled
      const updatedUser = { ...user, mfaEnabled: true };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('MFA enabled successfully!');
      return true;
    } catch (error) {
      toast.error('Invalid verification code');
      throw error;
    }
  };

  const disableMFA = async (password, code) => {
    try {
      await authAPI.disableMFA(password, code);
      // Update user state
      const updatedUser = { ...user, mfaEnabled: false };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('MFA disabled successfully');
      return true;
    } catch (error) {
      toast.error('Failed to disable MFA');
      throw error;
    }
  };

  const value = {
    user,
    loading,
    requiresMFA,
    login,
    verifyMFA,
    logout,
    register,
    resetMFA,      // Reset MFA state
    setupMFA,      // NEW
    enableMFA,     // NEW
    disableMFA,    // NEW
    hasRole,
    hasPermission,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
