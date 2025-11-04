import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auditAPI, adminAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Filter, 
  Download,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Eye,
  User,
  Calendar,
  Activity,
  ArrowLeft,
  Lock,
  Mail,
  Ban,
  Flag,
  Info,
  ExternalLink,
  Copy,
  MapPin,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';

const AuditLogs = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLogs: 0,
    breakGlassCount: 0,
    deniedAccessCount: 0,
    actionStats: [],
    topUsers: []
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(50);
  
  // Filters
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    status: '',
    userId: '',
    patientId: '',
    startDate: '',
    endDate: '',
    breakGlass: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [currentPage, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit,
        ...filters
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === false) {
          delete params[key];
        }
      });

      console.log('Fetching logs with params:', params);
      const response = await auditAPI.getAll(params);
      console.log('Audit logs response:', response.data);
      
      setLogs(response.data.logs || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await auditAPI.getStats(params);
      console.log('Stats response:', response.data);
      setStats(response.data.data || {
        totalLogs: 0,
        breakGlassCount: 0,
        deniedAccessCount: 0,
        actionStats: [],
        topUsers: []
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      resourceType: '',
      status: '',
      userId: '',
      patientId: '',
      startDate: '',
      endDate: '',
      breakGlass: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const exportLogs = async () => {
    try {
      toast.info('Preparing export... This feature will download logs as CSV');
      // TODO: Implement CSV export
      const csvContent = [
        ['Timestamp', 'User', 'Action', 'Resource', 'Status', 'IP Address'],
        ...filteredLogs.map(log => [
          new Date(log.timestamp).toISOString(),
          log.userEmail || 'N/A',
          log.action,
          log.resourceType || 'N/A',
          log.status,
          log.ipAddress || 'N/A'
        ])
      ].map(row => row.join(',')).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast.success('Export completed!');
    } catch (error) {
      toast.error('Failed to export logs');
    }
  };

  const getActionIcon = (action) => {
    if (action?.includes('VIEW')) return <Eye className="w-4 h-4" />;
    if (action?.includes('CREATE')) return <CheckCircle className="w-4 h-4" />;
    if (action?.includes('UPDATE')) return <Activity className="w-4 h-4" />;
    if (action?.includes('DELETE')) return <XCircle className="w-4 h-4" />;
    if (action?.includes('DENIED')) return <AlertTriangle className="w-4 h-4" />;
    if (action?.includes('BREAK_GLASS')) return <Shield className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getStatusBadge = (status) => {
    const badges = {
      SUCCESS: 'bg-green-100 text-green-800',
      FAILURE: 'bg-red-100 text-red-800',
      DENIED: 'bg-yellow-100 text-yellow-800',
      PARTIAL: 'bg-blue-100 text-blue-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const viewLogDetails = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const openActionModal = (log, type) => {
    console.log('[Audit Logs] Opening action modal:', type, 'for log:', log);
    setSelectedLog(log);
    setActionType(type);
    setActionReason('');
    setShowActionModal(true);
  };

  const handleTakeAction = async () => {
    console.log('[Audit Logs] handleTakeAction called:', actionType, 'Reason length:', actionReason.length);
    
    if (!actionReason || actionReason.length < 20) {
      toast.error('Please provide a detailed reason (minimum 20 characters)');
      return;
    }

    try {
      let response;
      
      switch (actionType) {
        case 'suspend-user':
          // Use selectedLog.user (ObjectId) instead of selectedLog.userId
          const userId = selectedLog.user?._id || selectedLog.user;
          console.log('[Audit Logs] Suspending user:', userId, 'from log:', selectedLog);
          if (!userId) {
            toast.error('User ID not found in audit log');
            return;
          }
          response = await adminAPI.suspendUser(userId, {
            reason: actionReason,
            auditLogId: selectedLog._id
          });
          console.log('[Audit Logs] User suspended successfully:', response);
          toast.success('User suspended successfully');
          break;
          
        case 'flag-review':
          // Flag for manual review - could implement backend endpoint later
          console.log('Flagging log for review:', selectedLog._id, actionReason);
          toast.success('Log flagged for review');
          break;
          
        case 'send-warning':
          // Send warning email to user - could implement backend endpoint later
          console.log('Sending warning to user:', selectedLog.userEmail, actionReason);
          toast.success('Warning email sent to user');
          break;
          
        default:
          toast.error('Unknown action type');
      }

      setShowActionModal(false);
      setActionReason('');
      fetchLogs();
    } catch (error) {
      console.error('Error taking action:', error);
      toast.error(error.response?.data?.message || 'Failed to complete action');
    }
  };

  const getIPLocation = (ip) => {
    // Simple IP location identifier
    if (ip === '::1' || ip === '127.0.0.1') return 'Localhost';
    if (ip?.startsWith('192.168.')) return 'Local Network';
    if (ip?.startsWith('10.')) return 'Private Network';
    return 'External';
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.userEmail?.toLowerCase().includes(search) ||
      log.action?.toLowerCase().includes(search) ||
      log.resourceType?.toLowerCase().includes(search) ||
      log.ipAddress?.includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft className="h-6 w-6 text-gray-600" />
              </button>
              <FileText className="h-8 w-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
                <p className="text-sm text-gray-500">System Activity & Security Monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Logs</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalLogs?.toLocaleString() || 0}
                </p>
              </div>
              <FileText className="h-12 w-12 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Break Glass Access</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {stats.breakGlassCount || 0}
                </p>
              </div>
              <Shield className="h-12 w-12 text-orange-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Access Denied</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {stats.deniedAccessCount || 0}
                </p>
              </div>
              <AlertTriangle className="h-12 w-12 text-red-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Top Action</p>
                <p className="text-sm font-semibold text-gray-900 mt-2">
                  {stats.actionStats?.[0]?._id || 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.actionStats?.[0]?.count || 0} times
                </p>
              </div>
              <Activity className="h-12 w-12 text-green-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by email, action, IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              {Object.values(filters).some(v => v !== '') && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={exportLogs}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Action Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                  <select
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Actions</option>
                    <optgroup label="Authentication">
                      <option value="LOGIN">Login</option>
                      <option value="LOGOUT">Logout</option>
                      <option value="LOGIN_FAILED">Login Failed</option>
                    </optgroup>
                    <optgroup label="EHR Actions">
                      <option value="VIEW_EHR">View EHR</option>
                      <option value="CREATE_EHR">Create EHR</option>
                      <option value="UPDATE_EHR">Update EHR</option>
                      <option value="DELETE_EHR">Delete EHR</option>
                    </optgroup>
                    <optgroup label="Patient Actions">
                      <option value="VIEW_PATIENT">View Patient</option>
                      <option value="CREATE_PATIENT">Create Patient</option>
                      <option value="UPDATE_PATIENT">Update Patient</option>
                      <option value="DELETE_PATIENT">Delete Patient</option>
                    </optgroup>
                    <optgroup label="User Actions">
                      <option value="CREATE_USER">Create User</option>
                      <option value="UPDATE_USER">Update User</option>
                      <option value="DELETE_USER">Delete User</option>
                      <option value="UNLOCK_USER">Unlock User</option>
                    </optgroup>
                    <optgroup label="Hospital Network">
                      <option value="VIEW_HOSPITALS">View Hospitals</option>
                      <option value="VIEW_HOSPITAL">View Hospital</option>
                      <option value="CREATE_HOSPITAL">Create Hospital</option>
                      <option value="UPDATE_HOSPITAL">Update Hospital</option>
                      <option value="DELETE_HOSPITAL">Delete Hospital</option>
                      <option value="UPDATE_HOSPITAL_STATUS">Update Hospital Status</option>
                      <option value="SYNC_HOSPITAL">Sync Hospital</option>
                      <option value="TEST_HOSPITAL_CONNECTION">Test Hospital Connection</option>
                      <option value="VIEW_NETWORK_STATS">View Network Stats</option>
                    </optgroup>
                    <optgroup label="Security">
                      <option value="BREAK_GLASS_ACCESS">Break Glass Access</option>
                      <option value="MFA_ENABLED">MFA Enabled</option>
                      <option value="MFA_DISABLED">MFA Disabled</option>
                      <option value="PASSWORD_CHANGE">Password Change</option>
                      <option value="ROLE_CHANGE">Role Change</option>
                      <option value="ACCESS_DENIED">Access Denied</option>
                    </optgroup>
                    <optgroup label="Other">
                      <option value="EXPORT_DATA">Export Data</option>
                    </optgroup>
                  </select>
                </div>

                {/* Resource Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resource Type</label>
                  <select
                    value={filters.resourceType}
                    onChange={(e) => handleFilterChange('resourceType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Resources</option>
                    <option value="User">User</option>
                    <option value="Patient">Patient</option>
                    <option value="EHR">EHR</option>
                    <option value="Hospital">Hospital</option>
                    <option value="System">System</option>
                    <option value="Report">Report</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Status</option>
                    <option value="SUCCESS">Success</option>
                    <option value="FAILURE">Failure</option>
                    <option value="DENIED">Denied</option>
                  </select>
                </div>

                {/* Break Glass Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Break Glass</label>
                  <select
                    value={filters.breakGlass}
                    onChange={(e) => handleFilterChange('breakGlass', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address & Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span className="ml-3">Loading audit logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium">No audit logs found</p>
                      <p className="text-sm mt-2">Try adjusting your filters or search criteria</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{log.userEmail || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{log.userRole}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="mr-2">{getActionIcon(log.action)}</span>
                          <span className="text-sm text-gray-900">{log.action}</span>
                          {log.breakGlass?.isBreakGlass && (
                            <Shield className="ml-2 h-4 w-4 text-orange-600" title="Break Glass Access" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.resourceType || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                {log.ipAddress || 'N/A'}
                              </code>
                              {log.ipAddress && (
                                <button
                                  onClick={() => copyToClipboard(log.ipAddress)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Copy IP"
                                >
                                  <Copy className="h-3 w-3 text-gray-500" />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 mt-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {getIPLocation(log.ipAddress)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs">
                          {log.breakGlass?.justification && (
                            <div className="text-xs text-orange-600 mb-1 truncate">
                              🚨 Break Glass: {log.breakGlass.justification}
                            </div>
                          )}
                          {log.details?.errorMessage && (
                            <div className="text-xs text-red-600 truncate">
                              ❌ Error: {log.details.errorMessage}
                            </div>
                          )}
                          {!log.breakGlass?.justification && !log.details?.errorMessage && (
                            <span className="text-xs text-gray-400">No additional details</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => viewLogDetails(log)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                          {log.breakGlass?.isBreakGlass && user?.role === 'admin' && (
                            <>
                              <button
                                onClick={() => openActionModal(log, 'flag-review')}
                                className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                                title="Flag for Review"
                              >
                                <Flag className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openActionModal(log, 'send-warning')}
                                className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                                title="Send Warning"
                              >
                                <Mail className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openActionModal(log, 'suspend-user')}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Suspend User"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filteredLogs.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Log Detail Modal */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center sticky top-0">
              <h3 className="text-lg font-semibold">Audit Log Details</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-white hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Timestamp and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{formatDate(selectedLog.timestamp)}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(selectedLog.status)}`}>
                    {selectedLog.status}
                  </span>
                </div>
              </div>

              {/* User Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  User Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">User ID</label>
                    <p className="text-sm text-gray-900 font-mono">{selectedLog.userId}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Email</label>
                    <p className="text-sm text-gray-900">{selectedLog.userEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Role</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedLog.userRole}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Department</label>
                    <p className="text-sm text-gray-900">{selectedLog.userDepartment || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Action Information */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  Action Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Action Type</label>
                    <div className="flex items-center space-x-2">
                      {getActionIcon(selectedLog.action)}
                      <p className="text-sm text-gray-900 font-semibold">{selectedLog.action}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Resource Type</label>
                    <p className="text-sm text-gray-900">{selectedLog.resourceType || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Resource ID</label>
                    <p className="text-sm text-gray-900 font-mono">{selectedLog.resourceId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Patient ID</label>
                    <p className="text-sm text-gray-900 font-mono">{selectedLog.patientId || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Network Information */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Network Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">IP Address</label>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm font-mono bg-white px-3 py-2 rounded border border-gray-300">
                        {selectedLog.ipAddress || 'N/A'}
                      </code>
                      {selectedLog.ipAddress && (
                        <button
                          onClick={() => copyToClipboard(selectedLog.ipAddress)}
                          className="p-2 bg-white hover:bg-gray-100 rounded border border-gray-300"
                          title="Copy IP Address"
                        >
                          <Copy className="h-4 w-4 text-gray-600" />
                        </button>
                      )}
                      <a
                        href={`https://www.iplocation.net/ip-lookup?query=${selectedLog.ipAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white hover:bg-gray-100 rounded border border-gray-300"
                        title="Lookup IP Location"
                      >
                        <ExternalLink className="h-4 w-4 text-gray-600" />
                      </a>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Location Type</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <MapPin className="h-4 w-4 text-purple-600" />
                      <span className="text-sm text-gray-900 font-medium">{getIPLocation(selectedLog.ipAddress)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Break Glass Information */}
              {selectedLog.breakGlass?.isBreakGlass && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-orange-900 mb-3 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Break Glass Emergency Access
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-orange-800">Justification</label>
                      <p className="text-sm text-orange-900 bg-white p-3 rounded border border-orange-200 mt-1">
                        {selectedLog.breakGlass.justification}
                      </p>
                    </div>
                    <div className="flex items-start space-x-2 text-xs text-orange-800 mt-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>This was an emergency access event that bypassed normal authorization controls. All break glass events are permanently logged and reviewed.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Details */}
              {selectedLog.details?.errorMessage && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-red-900 mb-2 flex items-center">
                    <XCircle className="h-4 w-4 mr-2" />
                    Error Details
                  </h4>
                  <p className="text-sm text-red-900 bg-white p-3 rounded border border-red-200">
                    {selectedLog.details.errorMessage}
                  </p>
                </div>
              )}

              {/* Changes Made */}
              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Changes Made</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedLog.changes).map(([field, values]) => (
                      <div key={field} className="bg-white p-3 rounded border border-green-200">
                        <label className="block text-xs font-medium text-gray-600">{field}</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div>
                            <span className="text-xs text-gray-500">Before:</span>
                            <p className="text-sm text-red-600 line-through">{JSON.stringify(values.before)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">After:</span>
                            <p className="text-sm text-green-600 font-semibold">{JSON.stringify(values.after)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 sticky bottom-0">
              {selectedLog.breakGlass?.isBreakGlass && user?.role === 'admin' && (
                <>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openActionModal(selectedLog, 'flag-review');
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center space-x-2"
                  >
                    <Flag className="h-4 w-4" />
                    <span>Flag for Review</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openActionModal(selectedLog, 'send-warning');
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center space-x-2"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Send Warning</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openActionModal(selectedLog, 'suspend-user');
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
                  >
                    <Ban className="h-4 w-4" />
                    <span>Suspend User</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="bg-red-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Take Action on Suspicious Activity
              </h3>
              <button
                onClick={() => setShowActionModal(false)}
                className="text-white hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Log Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Log Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">User:</span>
                    <span className="ml-2 font-medium text-gray-900">{selectedLog.userEmail}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Action:</span>
                    <span className="ml-2 font-medium text-gray-900">{selectedLog.action}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">IP Address:</span>
                    <code className="ml-2 font-mono text-gray-900 bg-white px-2 py-0.5 rounded">
                      {selectedLog.ipAddress}
                    </code>
                  </div>
                  <div>
                    <span className="text-gray-600">Time:</span>
                    <span className="ml-2 font-medium text-gray-900">{formatDate(selectedLog.timestamp)}</span>
                  </div>
                </div>
                {selectedLog.breakGlass?.justification && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-sm text-gray-600">Break Glass Reason:</span>
                    <p className="text-sm text-gray-900 mt-1 italic">"{selectedLog.breakGlass.justification}"</p>
                  </div>
                )}
              </div>

              {/* Action Type */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-yellow-900 mb-2">Action Type</h4>
                <p className="text-sm text-yellow-900">
                  {actionType === 'suspend-user' && '🔒 Suspend User Account - This will immediately disable the user\'s access to the system.'}
                  {actionType === 'send-warning' && '📧 Send Warning Email - This will send a formal warning to the user about policy violations.'}
                  {actionType === 'flag-review' && '🚩 Flag for Manual Review - This will mark the log for administrative review and investigation.'}
                </p>
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Action <span className="text-red-600">*</span>
                  <span className="text-xs text-gray-500 ml-2">(minimum 20 characters)</span>
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Provide a detailed explanation for taking this action. This will be permanently logged..."
                />
                <div className="mt-1 flex justify-between">
                  <span className={`text-xs ${actionReason.length < 20 ? 'text-red-600' : 'text-green-600'}`}>
                    {actionReason.length} / 20 characters minimum
                  </span>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-800">
                  <p className="font-semibold mb-1">Warning: This action will be permanently logged</p>
                  <p>All administrative actions are recorded in the audit trail and cannot be undone. Make sure you have thoroughly reviewed the log before proceeding.</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowActionModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleTakeAction}
                disabled={actionReason.length < 20}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Lock className="h-4 w-4" />
                <span>Confirm Action</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
