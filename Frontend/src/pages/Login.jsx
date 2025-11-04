import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

const Login = () => {
  const navigate = useNavigate();
  const { login, verifyMFA, requiresMFA, resetMFA } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    mfaCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset MFA state on component mount to avoid stale state
  // Use empty dependency array to only run once on mount
  React.useEffect(() => {
    console.log('[Login] Component mounted, resetting MFA state');
    if (resetMFA) {
      resetMFA();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array = only run on mount

  // Debug: Log requiresMFA changes
  React.useEffect(() => {
    console.log('[Login] requiresMFA changed to:', requiresMFA);
  }, [requiresMFA]);

  const handleHospitalPortalClick = () => {
    toast.info('Please login with admin credentials to access Hospital Network Portal', {
      autoClose: 4000
    });
    // Optionally navigate to login (already on login page)
    // Or could navigate to /admin/hospitals which will redirect back to login
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('[Login] Attempting login for:', formData.email);
      const result = await login(formData.email, formData.password);
      console.log('[Login] Login result:', result);
      console.log('[Login] Requires MFA:', result?.requiresMFA);
      
      if (!result?.requiresMFA) {
        // Redirect based on role
        const role = result?.user?.role;
        console.log('[Login] User role:', role);
        console.log('[Login] Navigating to dashboard...');
        
        if (role === 'admin') {
          console.log('[Login] Navigating to admin dashboard');
          navigate('/admin/dashboard', { replace: true });
        } else if (role === 'doctor') {
          console.log('[Login] Navigating to doctor dashboard');
          navigate('/doctor/dashboard', { replace: true });
        } else if (role === 'nurse') {
          console.log('[Login] Navigating to nurse dashboard');
          navigate('/nurse/dashboard', { replace: true });
        } else if (role === 'staff') {
          console.log('[Login] Navigating to staff dashboard');
          // Staff users go to nurse dashboard (they can view patient data)
          navigate('/nurse/dashboard', { replace: true });
        } else {
          console.log('[Login] Navigating to default dashboard');
          navigate('/dashboard', { replace: true });
        }
      } else {
        console.log('[Login] MFA required, staying on login page');
      }
    } catch (error) {
      console.error('[Login] Login error:', error);
      if (!error.response) {
        toast.error('Cannot connect to server. Please make sure the backend is running on port 5000.');
      } else if (error.response.status === 401) {
        toast.error('Invalid email or password');
      } else if (error.response.status === 500) {
        toast.error(error.response.data?.message || 'Server error occurred');
      } else {
        toast.error(error.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerify = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await verifyMFA(formData.mfaCode);
      console.log('[Login] MFA result:', result);
      
      // Redirect based on role
      const role = result?.user?.role;
      console.log('[Login] User role after MFA:', role);
      console.log('[Login] Navigating to dashboard after MFA...');
      
      if (role === 'admin') {
        console.log('[Login] Navigating to admin dashboard');
        navigate('/admin/dashboard', { replace: true });
      } else if (role === 'doctor') {
        console.log('[Login] Navigating to doctor dashboard');
        navigate('/doctor/dashboard', { replace: true });
      } else if (role === 'nurse') {
        console.log('[Login] Navigating to nurse dashboard');
        navigate('/nurse/dashboard', { replace: true });
      } else if (role === 'staff') {
        console.log('[Login] Navigating to staff dashboard');
        // Staff users go to nurse dashboard (they can view patient data)
        navigate('/nurse/dashboard', { replace: true });
      } else {
        console.log('[Login] Navigating to default dashboard');
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('[Login] MFA verification error:', error);
      if (!error.response) {
        toast.error('Cannot connect to server. Please make sure the backend is running on port 5000.');
      } else if (error.response.status === 401) {
        toast.error('Invalid or expired MFA code');
      } else if (error.response.status === 500) {
        toast.error(error.response.data?.message || 'Server error occurred');
      } else {
        toast.error(error.response?.data?.message || 'MFA verification failed');
      }
    } finally {
      setLoading(false);
    }
  };

  console.log('[Login] Render - requiresMFA:', requiresMFA);

  if (requiresMFA) {
    console.log('[Login] Showing MFA form');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-2xl">
          <div className="text-center">
            <Shield className="mx-auto h-16 w-16 text-indigo-600" />
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Two-Factor Authentication
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter the code from your authenticator app
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleMFAVerify}>
            <div>
              <label htmlFor="mfaCode" className="sr-only">
                MFA Code
              </label>
              <input
                id="mfaCode"
                name="mfaCode"
                type="text"
                required
                maxLength="6"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter 6-digit code"
                value={formData.mfaCode}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              disabled={loading || formData.mfaCode.length !== 6}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-2xl">
        <div className="text-center">
          <Shield className="mx-auto h-16 w-16 text-indigo-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Secure EHR System
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            HIPAA-Compliant Electronic Health Records
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none relative block w-full pl-10 px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="appearance-none relative block w-full pl-10 pr-10 px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Don't have an account? Register
              </button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleHospitalPortalClick}
              className="w-full flex justify-center items-center py-2 px-4 border border-indigo-300 text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <Shield className="h-4 w-4 mr-2" />
              Hospital Network Portal
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 mt-4">
              🔒 This system is HIPAA compliant and all access is logged
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
