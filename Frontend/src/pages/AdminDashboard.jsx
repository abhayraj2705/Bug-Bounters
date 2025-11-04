import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { authAPI, adminAPI, hospitalAPI } from '../services/api';
import { 
  Users, 
  Activity, 
  Shield, 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  X,
  UserPlus,
  BarChart3,
  FileText,
  Unlock,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    usersByRole: {}
  });
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'staff',
    department: '',
    hospitalId: 'HOS-001'
  });

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllUsers();
      setUsers(response.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied: Admin privileges required');
      } else {
        toast.error('Failed to fetch users');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch system statistics
  const fetchStats = async () => {
    try {
      const response = await adminAPI.getSystemStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchHospitals = async () => {
    try {
      const response = await hospitalAPI.getAll();
      setHospitals(response.data.data || []);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      toast.error('Failed to load hospitals');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchHospitals();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      // Format data properly for backend
      const registerData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        attributes: {
          hospitalId: formData.hospitalId
        }
      };

      // Add department if provided
      if (formData.department) {
        registerData.attributes.department = formData.department;
      }

      const response = await authAPI.register(registerData);
      toast.success('User created successfully!');
      setShowAddModal(false);
      setFormData({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'staff',
        department: '',
        hospitalId: 'HOS-001'
      });
      fetchUsers();
      fetchStats(); // Refresh stats after adding user
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.response?.status === 400) {
        const errorMsg = error.response.data?.message || 'Invalid user data';
        // Check if it's an email validation error
        if (errorMsg.toLowerCase().includes('email')) {
          toast.error('Please enter a valid email address with a proper domain (e.g., user@example.com)');
        } else {
          toast.error(errorMsg);
        }
      } else {
        toast.error('Failed to create user');
      }
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        email: selectedUser.email,
        role: selectedUser.role,
        attributes: selectedUser.attributes
      };
      await adminAPI.updateUser(selectedUser._id, updateData);
      toast.success('User updated successfully!');
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
      fetchStats(); // Refresh stats after updating user
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This will deactivate their account.')) return;
    
    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deactivated successfully!');
      fetchUsers();
      fetchStats(); // Refresh stats after deleting user
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleUnlockUser = async (userId) => {
    try {
      await adminAPI.unlockUser(userId);
      toast.success('User account unlocked successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Error unlocking user:', error);
      toast.error(error.response?.data?.message || 'Failed to unlock user');
    }
  };

  const handleActivateUser = async (userId) => {
    if (!window.confirm('Are you sure you want to activate this user account?')) return;
    
    try {
      await adminAPI.updateUser(userId, { isActive: true });
      toast.success('User account activated successfully!');
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error(error.response?.data?.message || 'Failed to activate user');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesHospital = !hospitalFilter || u.attributes?.hospitalId === hospitalFilter;
    
    return matchesSearch && matchesHospital;
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Electronic Health Record System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/mfa-setup')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center space-x-2"
              >
                <Shield className="h-4 w-4" />
                <span>MFA Setup</span>
              </button>
              <button
                onClick={() => navigate('/admin/hospitals')}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition flex items-center space-x-2"
              >
                <Activity className="h-4 w-4" />
                <span>Hospital Network</span>
              </button>
              <button
                onClick={() => navigate('/admin/audit-logs')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>Audit Logs</span>
              </button>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
                {user?.mfaEnabled && <p className="text-xs text-green-600 flex items-center justify-end"><Shield className="h-3 w-3 mr-1" />MFA Enabled</p>}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Doctors</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.usersByRole?.doctor || 0}
                </p>
              </div>
              <Activity className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Nurses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.usersByRole?.nurse || 0}
                </p>
              </div>
              <FileText className="h-10 w-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
              </div>
              <BarChart3 className="h-10 w-10 text-orange-500" />
            </div>
          </div>
        </div>

        {/* User Management Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate('/admin/audit-logs')}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
                >
                  <FileText className="h-5 w-5" />
                  <span>View Audit Logs</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add User</span>
                </button>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by username, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <select
                  value={hospitalFilter}
                  onChange={(e) => setHospitalFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Hospitals</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital._id} value={hospital.hospitalId}>
                      {hospital.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hospital
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status & Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      No users found. Click "Add User" to create the first user.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold">
                              {u.firstName?.[0]}{u.lastName?.[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {u.firstName} {u.lastName}
                            </div>
                            <div className="text-sm text-gray-500">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          u.role === 'admin' ? 'bg-red-100 text-red-800' :
                          u.role === 'doctor' ? 'bg-green-100 text-green-800' :
                          u.role === 'nurse' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.attributes?.department || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {hospitals.find(h => h.hospitalId === u.attributes?.hospitalId)?.name || u.attributes?.hospitalId || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {/* Status Badge */}
                          {u.accountLockedUntil && new Date(u.accountLockedUntil) > new Date() ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Locked
                            </span>
                          ) : !u.isActive ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                          
                          {/* Action Buttons */}
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setShowEditModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit user"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {u.accountLockedUntil && new Date(u.accountLockedUntil) > new Date() && (
                            <button
                              onClick={() => handleUnlockUser(u._id)}
                              className="text-green-600 hover:text-green-900"
                              title="Unlock account"
                            >
                              <Unlock className="h-4 w-4" />
                            </button>
                          )}
                          {!u.isActive ? (
                            <button
                              onClick={() => handleActivateUser(u._id)}
                              className="text-green-600 hover:text-green-900"
                              title="Activate user"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeleteUser(u._id)}
                              title="Deactivate user"
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-semibold text-gray-900">Add New User</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                  title="Please enter a valid email address (e.g., user@example.com)"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Min 8 characters"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="staff">Staff</option>
                    <option value="nurse">Nurse</option>
                    <option value="doctor">Doctor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Department</option>
                    <option value="cardiology">Cardiology</option>
                    <option value="neurology">Neurology</option>
                    <option value="pediatrics">Pediatrics</option>
                    <option value="emergency">Emergency</option>
                    <option value="general">General</option>
                    <option value="surgery">Surgery</option>
                    <option value="oncology">Oncology</option>
                    <option value="icu">ICU</option>
                    <option value="administration">Administration</option>
                    <option value="reception">Reception</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hospital *
                </label>
                <select
                  required
                  value={formData.hospitalId}
                  onChange={(e) => setFormData({...formData, hospitalId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Hospital</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital._id} value={hospital.hospitalId}>
                      {hospital.name} ({hospital.hospitalId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  <div className="flex items-center space-x-2">
                    <UserPlus className="h-5 w-5" />
                    <span>Create User</span>
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-semibold text-gray-900">Edit User</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={selectedUser.firstName}
                    onChange={(e) => setSelectedUser({...selectedUser, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={selectedUser.lastName}
                    onChange={(e) => setSelectedUser({...selectedUser, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username (Read-only)
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedUser.username}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                  title="Please enter a valid email address (e.g., user@example.com)"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="user@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    required
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="staff">Staff</option>
                    <option value="nurse">Nurse</option>
                    <option value="doctor">Doctor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <select
                    value={selectedUser.attributes?.department || ''}
                    onChange={(e) => setSelectedUser({
                      ...selectedUser, 
                      attributes: {...selectedUser.attributes, department: e.target.value}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Department</option>
                    <option value="cardiology">Cardiology</option>
                    <option value="neurology">Neurology</option>
                    <option value="pediatrics">Pediatrics</option>
                    <option value="emergency">Emergency</option>
                    <option value="general">General</option>
                    <option value="surgery">Surgery</option>
                    <option value="oncology">Oncology</option>
                    <option value="icu">ICU</option>
                    <option value="administration">Administration</option>
                    <option value="reception">Reception</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hospital *
                </label>
                <select
                  required
                  value={selectedUser.attributes?.hospitalId || ''}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser, 
                    attributes: {...selectedUser.attributes, hospitalId: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Hospital</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital._id} value={hospital.hospitalId}>
                      {hospital.name} ({hospital.hospitalId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  <div className="flex items-center space-x-2">
                    <Edit2 className="h-5 w-5" />
                    <span>Update User</span>
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
