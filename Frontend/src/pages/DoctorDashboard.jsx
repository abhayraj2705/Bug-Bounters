import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { patientAPI, ehrAPI } from '../services/api';
import { 
  Users, 
  Calendar, 
  FileText, 
  AlertCircle, 
  Plus,
  Search,
  Eye,
  X,
  Stethoscope,
  ClipboardList,
  Shield
} from 'lucide-react';
import { toast } from 'react-toastify';
import BreakGlassAccess from '../components/BreakGlassAccess';

const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddEHR, setShowAddEHR] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientEHRs, setPatientEHRs] = useState([]);
  const [showBreakGlass, setShowBreakGlass] = useState(false);
  const [breakGlassPatientId, setBreakGlassPatientId] = useState(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingReviews: 0,
    criticalCases: 0
  });

  const [patientForm, setPatientForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    email: '',
    phone: '',
    bloodType: '',
    allergies: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  const [ehrForm, setEhrForm] = useState({
    patientId: '',
    type: 'consultation',
    diagnosis: '',
    symptoms: '',
    treatment: '',
    medications: '',
    vitalSigns: {
      temperature: '',
      bloodPressure: '',
      heartRate: '',
      respiratoryRate: ''
    },
    notes: ''
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await patientAPI.getAll();
      console.log('Full API Response:', response);
      console.log('Response data:', response.data);
      
      // Backend returns: { success: true, data: [...patients], pagination: {...} }
      let patientsList = response.data?.data || [];
      
      // Ensure it's an array
      if (!Array.isArray(patientsList)) {
        console.warn('Patients data is not an array:', patientsList);
        patientsList = [];
      }
      
      console.log('Patients list:', patientsList);
      console.log('Number of patients:', patientsList.length);
      
      setPatients(patientsList);
      
      // Calculate stats
      const total = patientsList.length;
      setStats({
        totalPatients: total,
        todayAppointments: Math.floor(total * 0.3),
        pendingReviews: Math.floor(total * 0.2),
        criticalCases: Math.floor(total * 0.1)
      });
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to fetch patients');
      setPatients([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    try {
      await patientAPI.create(patientForm);
      toast.success('Patient created successfully!');
      setShowAddPatient(false);
      setPatientForm({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'male',
        email: '',
        phone: '',
        bloodType: '',
        allergies: '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: ''
        }
      });
      fetchPatients();
    } catch (error) {
      console.error('Error creating patient:', error);
      toast.error(error.response?.data?.message || 'Failed to create patient');
    }
  };

  const handleAddEHR = async (e) => {
    e.preventDefault();
    try {
      // Parse blood pressure if provided (format: "120/80")
      let bpSystolic, bpDiastolic;
      if (ehrForm.vitalSigns.bloodPressure) {
        const bpParts = ehrForm.vitalSigns.bloodPressure.split('/');
        bpSystolic = parseInt(bpParts[0]) || undefined;
        bpDiastolic = parseInt(bpParts[1]) || undefined;
      }

      const ehrData = {
        patient: ehrForm.patientId,
        visitType: ehrForm.type,
        department: user?.attributes?.department || 'General',
        chiefComplaint: ehrForm.symptoms || 'General consultation',
        diagnosis: {
          primary: ehrForm.diagnosis
        },
        vitals: {
          temperature: ehrForm.vitalSigns.temperature ? parseFloat(ehrForm.vitalSigns.temperature) : undefined,
          bloodPressure: bpSystolic && bpDiastolic ? {
            systolic: bpSystolic,
            diastolic: bpDiastolic
          } : undefined,
          heartRate: ehrForm.vitalSigns.heartRate ? parseInt(ehrForm.vitalSigns.heartRate) : undefined,
          respiratoryRate: ehrForm.vitalSigns.respiratoryRate ? parseInt(ehrForm.vitalSigns.respiratoryRate) : undefined
        },
        clinicalNotes: ehrForm.notes,
        medications: ehrForm.medications ? ehrForm.medications.split(',').map(m => ({
          name: m.trim(),
          dosage: '',
          frequency: '',
          route: 'oral'
        })).filter(m => m.name) : [],
        treatmentPlan: ehrForm.treatment
      };
      
      console.log('Sending EHR Data:', ehrData);
      
      await ehrAPI.create(ehrData);
      toast.success('EHR record created successfully!');
      setShowAddEHR(false);
      setEhrForm({
        patientId: '',
        type: 'consultation',
        diagnosis: '',
        symptoms: '',
        treatment: '',
        medications: '',
        vitalSigns: {
          temperature: '',
          bloodPressure: '',
          heartRate: '',
          respiratoryRate: ''
        },
        notes: ''
      });
    } catch (error) {
      console.error('Error creating EHR:', error);
      toast.error(error.response?.data?.message || 'Failed to create EHR record');
    }
  };

  const handleViewPatientEHRs = async (patient) => {
    try {
      console.log('Viewing EHRs for patient:', patient._id, patient.firstName, patient.lastName);
      setSelectedPatient(patient);
      const response = await ehrAPI.getPatientEHRs(patient._id);
      console.log('EHR Response:', response.data);
      
      // Backend returns: { success: true, data: [...ehrs], pagination: {...} }
      const ehrsList = response.data?.data || [];
      console.log('Patient EHRs:', ehrsList);
      console.log('Number of EHRs found:', ehrsList.length);
      
      setPatientEHRs(Array.isArray(ehrsList) ? ehrsList : []);
      
      if (ehrsList.length === 0) {
        toast.info('No EHR records found for this patient');
      }
    } catch (error) {
      console.error('Error fetching patient EHRs:', error);
      console.error('Error response:', error.response);
      
      // Check if this is a permission error (403) that requires break glass
      if (error.response?.status === 403) {
        toast.warning('Access denied. Use Break Glass for emergency access.');
        setBreakGlassPatientId(patient._id);
        setShowBreakGlass(true);
      } else {
        const errorMsg = error.response?.data?.message || 'Failed to fetch patient records';
        toast.error(errorMsg);
      }
      setPatientEHRs([]);
    }
  };

  const handleBreakGlassAccess = async (justification) => {
    try {
      // Fetch patient data with break glass access
      const patientResponse = await patientAPI.getById(breakGlassPatientId, { justification });
      const patient = patientResponse.data?.data || patientResponse.data;
      
      setSelectedPatient(patient);
      
      // Fetch EHR records with break glass access
      const ehrResponse = await ehrAPI.getPatientEHRs(breakGlassPatientId);
      const ehrsList = ehrResponse.data?.data || [];
      
      setPatientEHRs(Array.isArray(ehrsList) ? ehrsList : []);
      setShowBreakGlass(false);
      setBreakGlassPatientId(null);
      
      toast.success('Emergency access granted. This action has been logged.');
    } catch (error) {
      console.error('Break glass access error:', error);
      throw error; // Let the BreakGlassAccess component handle the error
    }
  };

  const filteredPatients = Array.isArray(patients) ? patients.filter(p =>
    p.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patientId?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Stethoscope className="h-8 w-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
                <p className="text-sm text-gray-500">Electronic Health Record System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Dr. {user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500">{user?.attributes?.specialization || 'Doctor'}</p>
                {user?.mfaEnabled && <p className="text-xs text-green-600 flex items-center justify-end"><Shield className="h-3 w-3 mr-1" />MFA Enabled</p>}
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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">My Patients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Appointments Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayAppointments}</p>
              </div>
              <Calendar className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Reviews</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingReviews}</p>
              </div>
              <FileText className="h-10 w-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Critical Cases</p>
                <p className="text-2xl font-bold text-gray-900">{stats.criticalCases}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
          </div>
        </div>

        {/* Patient Management */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">My Patients</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEhrForm({ ...ehrForm, patientId: '' });
                    setShowAddEHR(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <ClipboardList className="h-5 w-5" />
                  <span>Add EHR</span>
                </button>
                <button
                  onClick={() => setShowAddPatient(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Patient</span>
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Patients Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Blood Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      Loading patients...
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      No patients found. Click "Add Patient" to register a new patient.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold">
                              {patient.firstName?.[0]}{patient.lastName?.[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {patient.firstName} {patient.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{patient.gender}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {patient.patientId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {patient.bloodType || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{patient.phone}</div>
                        <div className="text-xs text-gray-400">{patient.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewPatientEHRs(patient)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          title="View EHR Records"
                        >
                          <Eye className="h-4 w-4 inline" /> View EHR
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Patient Modal */}
      {showAddPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-semibold text-gray-900">Add New Patient</h3>
              <button onClick={() => setShowAddPatient(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddPatient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                  <input
                    type="text"
                    required
                    value={patientForm.firstName}
                    onChange={(e) => setPatientForm({...patientForm, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={patientForm.lastName}
                    onChange={(e) => setPatientForm({...patientForm, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={patientForm.dateOfBirth}
                    onChange={(e) => setPatientForm({...patientForm, dateOfBirth: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                  <select
                    required
                    value={patientForm.gender}
                    onChange={(e) => setPatientForm({...patientForm, gender: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={patientForm.email}
                    onChange={(e) => setPatientForm({...patientForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({...patientForm, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Blood Type</label>
                  <select
                    value={patientForm.bloodType}
                    onChange={(e) => setPatientForm({...patientForm, bloodType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Blood Type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
                  <input
                    type="text"
                    value={patientForm.allergies}
                    onChange={(e) => setPatientForm({...patientForm, allergies: e.target.value})}
                    placeholder="Comma separated"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={patientForm.address.street}
                  onChange={(e) => setPatientForm({...patientForm, address: {...patientForm.address, street: e.target.value}})}
                  placeholder="Street"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={patientForm.address.city}
                    onChange={(e) => setPatientForm({...patientForm, address: {...patientForm.address, city: e.target.value}})}
                    placeholder="City"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={patientForm.address.state}
                    onChange={(e) => setPatientForm({...patientForm, address: {...patientForm.address, state: e.target.value}})}
                    placeholder="State"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={patientForm.address.zipCode}
                    onChange={(e) => setPatientForm({...patientForm, address: {...patientForm.address, zipCode: e.target.value}})}
                    placeholder="ZIP Code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddPatient(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add EHR Modal */}
      {showAddEHR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-semibold text-gray-900">Add EHR Record</h3>
              <button onClick={() => setShowAddEHR(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddEHR} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Patient *</label>
                <select
                  required
                  value={ehrForm.patientId}
                  onChange={(e) => setEhrForm({...ehrForm, patientId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a patient</option>
                  {patients.map((patient) => (
                    <option key={patient._id} value={patient._id}>
                      {patient.firstName} {patient.lastName} - {patient.patientId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visit Type *</label>
                <select
                  required
                  value={ehrForm.type}
                  onChange={(e) => setEhrForm({...ehrForm, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="consultation">Consultation</option>
                  <option value="emergency">Emergency</option>
                  <option value="outpatient">Outpatient</option>
                  <option value="inpatient">Inpatient</option>
                  <option value="follow-up">Follow-up</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis *</label>
                <textarea
                  required
                  value={ehrForm.diagnosis}
                  onChange={(e) => setEhrForm({...ehrForm, diagnosis: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Symptoms</label>
                <textarea
                  value={ehrForm.symptoms}
                  onChange={(e) => setEhrForm({...ehrForm, symptoms: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan</label>
                <textarea
                  value={ehrForm.treatment}
                  onChange={(e) => setEhrForm({...ehrForm, treatment: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medications (comma separated)</label>
                <input
                  type="text"
                  value={ehrForm.medications}
                  onChange={(e) => setEhrForm({...ehrForm, medications: e.target.value})}
                  placeholder="e.g., Aspirin 100mg, Metformin 500mg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vital Signs</label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={ehrForm.vitalSigns.temperature}
                    onChange={(e) => setEhrForm({...ehrForm, vitalSigns: {...ehrForm.vitalSigns, temperature: e.target.value}})}
                    placeholder="Temperature (°F)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={ehrForm.vitalSigns.bloodPressure}
                    onChange={(e) => setEhrForm({...ehrForm, vitalSigns: {...ehrForm.vitalSigns, bloodPressure: e.target.value}})}
                    placeholder="Blood Pressure (mmHg)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={ehrForm.vitalSigns.heartRate}
                    onChange={(e) => setEhrForm({...ehrForm, vitalSigns: {...ehrForm.vitalSigns, heartRate: e.target.value}})}
                    placeholder="Heart Rate (bpm)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={ehrForm.vitalSigns.respiratoryRate}
                    onChange={(e) => setEhrForm({...ehrForm, vitalSigns: {...ehrForm.vitalSigns, respiratoryRate: e.target.value}})}
                    placeholder="Respiratory Rate"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  value={ehrForm.notes}
                  onChange={(e) => setEhrForm({...ehrForm, notes: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddEHR(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Create EHR Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Patient EHRs Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  EHR Records - {selectedPatient.firstName} {selectedPatient.lastName}
                </h3>
                <p className="text-sm text-gray-500">{selectedPatient.patientId}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedPatient(null);
                  setPatientEHRs([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {patientEHRs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No EHR records found for this patient.</p>
              ) : (
                <div className="space-y-4">
                  {patientEHRs.map((ehr) => (
                    <div key={ehr._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                            {ehr.visitType || 'Consultation'}
                          </span>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(ehr.visitDate || ehr.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600">
                          By: {ehr.attendingPhysician?.firstName} {ehr.attendingPhysician?.lastName}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {ehr.chiefComplaint && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Chief Complaint:</p>
                            <p className="text-sm text-gray-900">{ehr.chiefComplaint}</p>
                          </div>
                        )}
                        {ehr.diagnosis?.primary && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Diagnosis:</p>
                            <p className="text-sm text-gray-900">{ehr.diagnosis.primary}</p>
                            {ehr.diagnosis.secondary && ehr.diagnosis.secondary.length > 0 && (
                              <p className="text-sm text-gray-600 mt-1">
                                Secondary: {ehr.diagnosis.secondary.join(', ')}
                              </p>
                            )}
                          </div>
                        )}
                        {ehr.treatmentPlan && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Treatment Plan:</p>
                            <p className="text-sm text-gray-900">{ehr.treatmentPlan}</p>
                          </div>
                        )}
                        {ehr.medications && ehr.medications.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Medications:</p>
                            <div className="text-sm text-gray-900">
                              {ehr.medications.map((med, idx) => (
                                <div key={idx} className="ml-2">
                                  • {typeof med === 'string' ? med : `${med.name} - ${med.dosage} (${med.route})`}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {ehr.vitals && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Vital Signs:</p>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-900 mt-1">
                              {ehr.vitals.temperature && (
                                <p>Temp: {ehr.vitals.temperature}°F</p>
                              )}
                              {ehr.vitals.bloodPressure && (
                                <p>BP: {ehr.vitals.bloodPressure.systolic}/{ehr.vitals.bloodPressure.diastolic}</p>
                              )}
                              {ehr.vitals.heartRate && (
                                <p>HR: {ehr.vitals.heartRate} bpm</p>
                              )}
                              {ehr.vitals.respiratoryRate && (
                                <p>RR: {ehr.vitals.respiratoryRate} rpm</p>
                              )}
                            </div>
                          </div>
                        )}
                        {ehr.clinicalNotes && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Clinical Notes:</p>
                            <p className="text-sm text-gray-900">{ehr.clinicalNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Break Glass Access Modal */}
      {showBreakGlass && (
        <BreakGlassAccess
          patientId={breakGlassPatientId}
          onAccessGranted={handleBreakGlassAccess}
          onCancel={() => {
            setShowBreakGlass(false);
            setBreakGlassPatientId(null);
          }}
        />
      )}
    </div>
  );
};

export default DoctorDashboard;
