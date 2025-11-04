import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { hospitalAPI } from '../services/api';
import { 
  Building2, 
  Users, 
  Database, 
  Share2, 
  CheckCircle, 
  XCircle, 
  Activity, 
  ArrowLeft, 
  RefreshCw,
  Plus,
  Search,
  X,
  MapPin,
  Mail,
  Phone,
  Trash2,
  TestTube
} from 'lucide-react';
import { toast } from 'react-toastify';

const HospitalManagement = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddHospital, setShowAddHospital] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(null);
  const [stats, setStats] = useState({
    totalHospitals: 0,
    connectedHospitals: 0,
    totalUsers: 0,
    dataTransfers: 0
  });

  const [formData, setFormData] = useState({
    hospitalId: '',
    name: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    contactInfo: {
      email: '',
      phone: '',
      website: ''
    },
    administrator: {
      name: '',
      email: '',
      phone: ''
    },
    metadata: {
      type: 'primary',
      bedCapacity: '',
      specializations: []
    }
  });

  useEffect(() => {
    fetchHospitals();
    fetchStats();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const response = await hospitalAPI.getAll();
      console.log('Hospitals response:', response.data);
      setHospitals(response.data.data || []);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch hospitals');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await hospitalAPI.getNetworkStats();
      console.log('Network stats:', response.data);
      const data = response.data.data;
      setStats({
        totalHospitals: data.totalHospitals || 0,
        connectedHospitals: data.activeHospitals || 0,
        totalUsers: data.totalUsers || 0,
        dataTransfers: data.dataTransfersLast24h || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to fetch network statistics');
    }
  };

  const handleAddHospital = async (e) => {
    e.preventDefault();
    try {
      await hospitalAPI.create(formData);
      toast.success('Hospital added successfully!');
      setShowAddHospital(false);
      setFormData({
        hospitalId: '',
        name: '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: ''
        },
        contactInfo: {
          email: '',
          phone: '',
          website: ''
        },
        administrator: {
          name: '',
          email: '',
          phone: ''
        },
        metadata: {
          type: 'primary',
          bedCapacity: '',
          specializations: []
        }
      });
      fetchHospitals();
      fetchStats();
    } catch (error) {
      console.error('Error adding hospital:', error);
      toast.error(error.response?.data?.message || 'Failed to add hospital');
    }
  };

  const handleSyncHospital = async (hospitalId) => {
    try {
      setSyncing(hospitalId);
      await hospitalAPI.syncStats(hospitalId);
      toast.success('Hospital statistics synced successfully!');
      fetchHospitals();
      fetchStats();
    } catch (error) {
      console.error('Error syncing hospital:', error);
      toast.error(error.response?.data?.message || 'Failed to sync hospital');
    } finally {
      setSyncing(null);
    }
  };

  const handleTestConnection = async (hospitalId) => {
    try {
      const response = await hospitalAPI.testConnection(hospitalId);
      toast.success(`Connection test successful! Ping: ${response.data.data.ping}ms`);
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Connection test failed');
    }
  };

  const handleUpdateStatus = async (hospitalId, newStatus) => {
    try {
      await hospitalAPI.updateStatus(hospitalId, newStatus);
      toast.success('Hospital status updated!');
      fetchHospitals();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDeleteHospital = async (hospitalId) => {
    if (!window.confirm('Are you sure you want to remove this hospital from the network?')) {
      return;
    }
    try {
      await hospitalAPI.delete(hospitalId);
      toast.success('Hospital removed from network');
      fetchHospitals();
      fetchStats();
    } catch (error) {
      console.error('Error deleting hospital:', error);
      toast.error('Failed to remove hospital');
    }
  };

  const filteredHospitals = hospitals.filter(hospital => 
    hospital.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hospital.hospitalId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hospital.address?.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      disconnected: 'bg-red-100 text-red-800',
      suspended: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || badges.pending;
  };

  const getStatusIcon = (status) => {
    if (status === 'active') return <CheckCircle className="h-4 w-4" />;
    if (status === 'pending') return <Activity className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  const formatLastSync = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const syncDate = new Date(date);
    const diffMs = now - syncDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => user ? navigate('/admin/dashboard') : navigate('/login')}
                className="text-gray-600 hover:text-gray-900"
                title={user ? "Back to Dashboard" : "Back to Login"}
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <Building2 className="h-8 w-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Hospital Network Management</h1>
                <p className="text-sm text-gray-500">Centralized Multi-Hospital EHR System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Hospitals</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalHospitals}</p>
              </div>
              <Building2 className="h-12 w-12 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Connected Hospitals</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.connectedHospitals}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.totalUsers}</p>
              </div>
              <Users className="h-12 w-12 text-purple-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Data Transfers (24h)</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{stats.dataTransfers}</p>
              </div>
              <Share2 className="h-12 w-12 text-orange-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search hospitals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => {
                fetchHospitals();
                fetchStats();
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
          <button
            onClick={() => setShowAddHospital(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Hospital</span>
          </button>
        </div>

        {/* Hospitals Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hospital
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Sync
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <span className="ml-3 text-gray-500">Loading hospitals...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredHospitals.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-500">No hospitals found</p>
                    <button
                      onClick={() => setShowAddHospital(true)}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Add First Hospital
                    </button>
                  </td>
                </tr>
              ) : (
                filteredHospitals.map((hospital) => (
                  <tr key={hospital._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{hospital.name}</div>
                          <div className="text-xs text-gray-500">{hospital.hospitalId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                        {hospital.address?.city}, {hospital.address?.state}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={hospital.connectionStatus}
                        onChange={(e) => handleUpdateStatus(hospital._id, e.target.value)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full border-0 focus:ring-2 focus:ring-indigo-500 cursor-pointer ${getStatusBadge(hospital.connectionStatus)}`}
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="disconnected">Disconnected</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {hospital.statistics?.totalUsers || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {hospital.statistics?.totalPatients || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatLastSync(hospital.lastSyncAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSyncHospital(hospital._id)}
                          disabled={syncing === hospital._id}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          title="Sync Statistics"
                        >
                          <RefreshCw className={`h-4 w-4 ${syncing === hospital._id ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleTestConnection(hospital._id)}
                          className="text-green-600 hover:text-green-900"
                          title="Test Connection"
                        >
                          <TestTube className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteHospital(hospital._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Remove Hospital"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Security Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Secure Data Transfer Protocol</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div className="flex items-start space-x-2">
              <Database className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold">Encryption</p>
                <p>AES-256-GCM for all patient data</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold">Transport Security</p>
                <p>TLS 1.3 for data transmission</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold">Compliance</p>
                <p>HIPAA compliant audit logging</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Hospital Modal */}
      {showAddHospital && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center sticky top-0">
              <h3 className="text-lg font-semibold">Add Hospital to Network</h3>
              <button onClick={() => setShowAddHospital(false)} className="text-white hover:text-gray-200">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddHospital} className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hospital ID <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="HOSP001"
                      pattern="^HOSP\d{3}$"
                      value={formData.hospitalId}
                      onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Format: HOSP### (e.g., HOSP001)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hospital Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Address</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street <span className="text-red-600">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.address.street}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-600">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.address.city}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State <span className="text-red-600">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.address.state}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code <span className="text-red-600">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.address.zipCode}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zipCode: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.contactInfo.email}
                      onChange={(e) => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, email: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.contactInfo.phone}
                      onChange={(e) => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, phone: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={formData.contactInfo.website}
                      onChange={(e) => setFormData({ ...formData, contactInfo: { ...formData.contactInfo, website: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Administrator */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Administrator</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.administrator.name}
                      onChange={(e) => setFormData({ ...formData, administrator: { ...formData.administrator, name: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.administrator.email}
                      onChange={(e) => setFormData({ ...formData, administrator: { ...formData.administrator, email: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.administrator.phone}
                      onChange={(e) => setFormData({ ...formData, administrator: { ...formData.administrator, phone: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Additional Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Type</label>
                    <select
                      value={formData.metadata.type}
                      onChange={(e) => setFormData({ ...formData, metadata: { ...formData.metadata, type: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="primary">Primary Care</option>
                      <option value="secondary">Secondary Care</option>
                      <option value="specialty">Specialty Hospital</option>
                      <option value="clinic">Clinic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bed Capacity</label>
                    <input
                      type="number"
                      value={formData.metadata.bedCapacity}
                      onChange={(e) => setFormData({ ...formData, metadata: { ...formData.metadata, bedCapacity: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddHospital(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Hospital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalManagement;
