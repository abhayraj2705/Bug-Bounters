import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { patientPortalAPI } from '../services/api';
import { 
  Heart, 
  User,
  FileText,
  Activity,
  Pill,
  Calendar,
  AlertCircle,
  Download,
  Eye,
  Shield,
  X,
  Thermometer,
  ClipboardList
} from 'lucide-react';
import { toast } from 'react-toastify';

const PatientDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [patientData, setPatientData] = useState(null);
  const [ehrRecords, setEhrRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchPatientData();
    fetchEHRRecords();
  }, []);

  const fetchPatientData = async () => {
    try {
      const response = await patientPortalAPI.getMyProfile();
      const data = response.data?.data;
      setPatientData(data?.patient || data);
    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast.error('Failed to load your profile information');
    }
  };

  const fetchEHRRecords = async () => {
    try {
      setLoading(true);
      const response = await patientPortalAPI.getMyEHRRecords();
      setEhrRecords(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching EHR records:', error);
      toast.error('Failed to load your medical records');
    } finally {
      setLoading(false);
    }
  };

  const viewRecordDetails = (record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const downloadRecord = (record) => {
    // Generate a simple text report
    const content = `
MEDICAL RECORD
==============

Patient: ${patientData?.firstName} ${patientData?.lastName}
Date: ${new Date(record.createdAt).toLocaleDateString()}
Visit Type: ${record.visitType}
Department: ${record.department}

CHIEF COMPLAINT:
${record.chiefComplaint || 'N/A'}

DIAGNOSIS:
${record.diagnosis?.primary || 'N/A'}

VITAL SIGNS:
${record.vitals ? `
- Temperature: ${record.vitals.temperature || 'N/A'}
- Blood Pressure: ${record.vitals.bloodPressure || 'N/A'}
- Heart Rate: ${record.vitals.heartRate || 'N/A'}
- Respiratory Rate: ${record.vitals.respiratoryRate || 'N/A'}
- Oxygen Saturation: ${record.vitals.oxygenSaturation || 'N/A'}
` : 'No vitals recorded'}

MEDICATIONS:
${record.medications?.length > 0 ? record.medications.map(m => `- ${m.name}: ${m.dosage} (${m.route})`).join('\n') : 'None prescribed'}

CLINICAL NOTES:
${record.clinicalNotes || 'N/A'}

Attending Provider: ${record.attendingPhysician || 'N/A'}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-record-${new Date(record.createdAt).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Record downloaded successfully');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVisitTypeColor = (type) => {
    const colors = {
      emergency: 'bg-red-100 text-red-800',
      inpatient: 'bg-purple-100 text-purple-800',
      outpatient: 'bg-blue-100 text-blue-800',
      'follow-up': 'bg-green-100 text-green-800',
      consultation: 'bg-yellow-100 text-yellow-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your medical records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Heart className="h-8 w-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Patient Portal</h1>
                <p className="text-sm text-gray-500">Your Medical Records</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {patientData?.firstName} {patientData?.lastName}
                </p>
                <p className="text-xs text-gray-500">Patient</p>
                {user?.mfaEnabled && (
                  <p className="text-xs text-green-600 flex items-center justify-end">
                    <Shield className="h-3 w-3 mr-1" />
                    MFA Enabled
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate('/mfa-setup')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition flex items-center space-x-2"
                title="Setup Two-Factor Authentication"
              >
                <Shield className="h-4 w-4" />
                <span>MFA Setup</span>
              </button>
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
        {/* Patient Information Card */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-6 w-6 mr-2 text-indigo-600" />
            Your Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Patient ID</p>
              <p className="text-lg font-medium text-gray-900">{patientData?.patientId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="text-lg font-medium text-gray-900">
                {patientData?.dateOfBirth ? new Date(patientData.dateOfBirth).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Blood Type</p>
              <span className="inline-block px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                {patientData?.bloodType || 'N/A'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gender</p>
              <p className="text-lg font-medium text-gray-900">{patientData?.gender || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Contact</p>
              <p className="text-lg font-medium text-gray-900">{patientData?.contactNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-lg font-medium text-gray-900">{patientData?.email || user?.email}</p>
            </div>
            {patientData?.allergies && (
              <div className="md:col-span-3">
                <p className="text-sm text-gray-500">Allergies</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {patientData.allergies.split(',').map((allergy, idx) => (
                    <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                      {allergy.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{ehrRecords.length}</p>
              </div>
              <FileText className="h-10 w-10 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Last Visit</p>
                <p className="text-lg font-semibold text-gray-900">
                  {ehrRecords.length > 0 
                    ? new Date(ehrRecords[0].createdAt).toLocaleDateString()
                    : 'No visits'}
                </p>
              </div>
              <Calendar className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Medications</p>
                <p className="text-2xl font-bold text-gray-900">
                  {ehrRecords.reduce((count, record) => 
                    count + (record.medications?.length || 0), 0
                  )}
                </p>
              </div>
              <Pill className="h-10 w-10 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Medical Records */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FileText className="h-6 w-6 mr-2 text-indigo-600" />
              Your Medical Records
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              View and download your complete medical history
            </p>
          </div>

          <div className="overflow-x-auto">
            {ehrRecords.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No medical records found</p>
                <p className="text-sm text-gray-500 mt-2">
                  Your medical records will appear here after your first visit
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visit Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chief Complaint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ehrRecords.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(record.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getVisitTypeColor(record.visitType)}`}>
                          {record.visitType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.department}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate">{record.chiefComplaint}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.attendingPhysician || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => viewRecordDetails(record)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4 inline" />
                        </button>
                        <button
                          onClick={() => downloadRecord(record)}
                          className="text-green-600 hover:text-green-900"
                          title="Download"
                        >
                          <Download className="h-4 w-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Medical Record Details</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Visit Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Visit Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedRecord.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Visit Type:</span>
                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getVisitTypeColor(selectedRecord.visitType)}`}>
                      {selectedRecord.visitType}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Department:</span>
                    <span className="ml-2 font-medium">{selectedRecord.department}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Provider:</span>
                    <span className="ml-2 font-medium">{selectedRecord.attendingPhysician || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Chief Complaint */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Chief Complaint</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                  {selectedRecord.chiefComplaint || 'N/A'}
                </p>
              </div>

              {/* Vital Signs */}
              {selectedRecord.vitals && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <Thermometer className="h-4 w-4 mr-2" />
                    Vital Signs
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedRecord.vitals.temperature && (
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Temperature</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedRecord.vitals.temperature}°F</p>
                      </div>
                    )}
                    {selectedRecord.vitals.bloodPressure && (
                      <div className="bg-red-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Blood Pressure</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedRecord.vitals.bloodPressure}</p>
                      </div>
                    )}
                    {selectedRecord.vitals.heartRate && (
                      <div className="bg-pink-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Heart Rate</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedRecord.vitals.heartRate} bpm</p>
                      </div>
                    )}
                    {selectedRecord.vitals.respiratoryRate && (
                      <div className="bg-green-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Respiratory Rate</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedRecord.vitals.respiratoryRate} rpm</p>
                      </div>
                    )}
                    {selectedRecord.vitals.oxygenSaturation && (
                      <div className="bg-indigo-50 p-3 rounded">
                        <p className="text-xs text-gray-600">Oxygen Saturation</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedRecord.vitals.oxygenSaturation}%</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Diagnosis</h4>
                <div className="bg-yellow-50 p-3 rounded">
                  <p className="text-sm text-gray-700">
                    <strong>Primary:</strong> {selectedRecord.diagnosis?.primary || 'N/A'}
                  </p>
                  {selectedRecord.diagnosis?.secondary && (
                    <p className="text-sm text-gray-700 mt-1">
                      <strong>Secondary:</strong> {selectedRecord.diagnosis.secondary}
                    </p>
                  )}
                </div>
              </div>

              {/* Medications */}
              {selectedRecord.medications && selectedRecord.medications.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <Pill className="h-4 w-4 mr-2" />
                    Medications
                  </h4>
                  <div className="space-y-2">
                    {selectedRecord.medications.map((med, idx) => (
                      <div key={idx} className="bg-purple-50 p-3 rounded">
                        <p className="font-medium text-gray-900">{med.name}</p>
                        <p className="text-sm text-gray-600">
                          {med.dosage} • {med.route} • {med.frequency}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clinical Notes */}
              {selectedRecord.clinicalNotes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Clinical Notes
                  </h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                    {selectedRecord.clinicalNotes}
                  </p>
                </div>
              )}

              {/* Treatment Plan */}
              {selectedRecord.treatmentPlan && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Treatment Plan</h4>
                  <p className="text-sm text-gray-700 bg-green-50 p-3 rounded whitespace-pre-wrap">
                    {selectedRecord.treatmentPlan}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => downloadRecord(selectedRecord)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
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
    </div>
  );
};

export default PatientDashboard;
