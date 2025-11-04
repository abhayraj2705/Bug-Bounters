import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { patientAPI, ehrAPI } from '../services/api';
import { 
  Heart, 
  Users, 
  ClipboardList, 
  AlertCircle,
  AlertTriangle,
  Search,
  Activity,
  Plus,
  X,
  Thermometer,
  Pill,
  FileWarning,
  Shield
} from 'lucide-react';
import { toast } from 'react-toastify';
import BreakGlassAccess from '../components/BreakGlassAccess';

const NurseDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showMedsModal, setShowMedsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientEHRs, setPatientEHRs] = useState([]);
  const [ehrLoading, setEhrLoading] = useState(false);
  const [showBreakGlass, setShowBreakGlass] = useState(false);
  const [breakGlassPatientId, setBreakGlassPatientId] = useState(null);
  const [showEmergencyLookup, setShowEmergencyLookup] = useState(false);
  const [emergencySearchTerm, setEmergencySearchTerm] = useState('');
  const [searchType, setSearchType] = useState('name'); // 'name' or 'id'
  const [emergencySearchLoading, setEmergencySearchLoading] = useState(false);
  const [stats, setStats] = useState({
    assignedPatients: 0,
    vitalsDue: 0,
    medsAdmin: 0,
    alerts: 0
  });

  const [vitalsForm, setVitalsForm] = useState({
    temperature: '',
    bloodPressure: '',
    heartRate: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    painLevel: '',
    notes: ''
  });

  const [medsForm, setMedsForm] = useState({
    medicationName: '',
    dosage: '',
    route: 'oral',
    notes: ''
  });

  const [notesForm, setNotesForm] = useState({
    type: 'nursing_notes',
    notes: '',
    observations: ''
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await patientAPI.getAll();
      
      // Backend returns: { success: true, data: [...patients], pagination: {...} }
      const patientsList = response.data?.data || [];
      console.log('Nurse Dashboard - Patients fetched:', patientsList.length);
      
      setPatients(Array.isArray(patientsList) ? patientsList : []);
      
      // Calculate stats
      const total = Array.isArray(patientsList) ? patientsList.length : 0;
      setStats({
        assignedPatients: total,
        vitalsDue: Math.floor(total * 0.6),
        medsAdmin: Math.floor(total * 0.4),
        alerts: Math.floor(total * 0.15)
      });
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to fetch patients');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientEHRs = async (patient) => {
    try {
      setEhrLoading(true);
      console.log('[Nurse] Fetching EHRs for patient:', patient.patientId);
      
      // Use patient._id for the API call
      const response = await ehrAPI.getPatientEHRs(patient._id, {
        emergencyAccess: !!patient.emergencyAccess,
        justification: patient.breakGlassJustification
      });
      
      const ehrs = response.data?.data || [];
      console.log('[Nurse] Fetched', ehrs.length, 'EHR records');
      setPatientEHRs(ehrs);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('[Nurse] Error fetching EHRs:', error);
      
      if (error.response?.status === 403) {
        toast.error('Access denied. You may need Break Glass access to view this patient\'s records.');
      } else {
        toast.error('Failed to fetch patient history');
      }
    } finally {
      setEhrLoading(false);
    }
  };

  const handleRecordVitals = async (e) => {
    e.preventDefault();
    try {
      // Parse blood pressure if provided (format: "120/80")
      let bpSystolic, bpDiastolic;
      if (vitalsForm.bloodPressure) {
        const bpParts = vitalsForm.bloodPressure.split('/');
        bpSystolic = parseInt(bpParts[0]) || undefined;
        bpDiastolic = parseInt(bpParts[1]) || undefined;
      }

      const ehrData = {
        patient: selectedPatient._id,
        visitType: 'outpatient',
        department: user?.attributes?.department || 'Nursing',
        chiefComplaint: 'Vital Signs Assessment',
        diagnosis: {
          primary: `Vital Signs Recorded - BP: ${vitalsForm.bloodPressure}, HR: ${vitalsForm.heartRate}, Temp: ${vitalsForm.temperature}`
        },
        vitals: {
          temperature: vitalsForm.temperature ? parseFloat(vitalsForm.temperature) : undefined,
          bloodPressure: bpSystolic && bpDiastolic ? {
            systolic: bpSystolic,
            diastolic: bpDiastolic
          } : undefined,
          heartRate: vitalsForm.heartRate ? parseInt(vitalsForm.heartRate) : undefined,
          respiratoryRate: vitalsForm.respiratoryRate ? parseInt(vitalsForm.respiratoryRate) : undefined,
          oxygenSaturation: vitalsForm.oxygenSaturation ? parseInt(vitalsForm.oxygenSaturation) : undefined
        },
        clinicalNotes: `Pain Level: ${vitalsForm.painLevel}/10. ${vitalsForm.notes}`
      };

      console.log('Nurse Recording Vitals:', ehrData);
      await ehrAPI.create(ehrData);
      toast.success('Vital signs recorded successfully!');
      setShowVitalsModal(false);
      setVitalsForm({
        temperature: '',
        bloodPressure: '',
        heartRate: '',
        respiratoryRate: '',
        oxygenSaturation: '',
        painLevel: '',
        notes: ''
      });
      setSelectedPatient(null);
    } catch (error) {
      console.error('Error recording vitals:', error);
      
      // Check if this is a permission error (403) that requires break glass
      if (error.response?.status === 403) {
        toast.warning('Access denied. Use Break Glass for emergency access.');
        setBreakGlassPatientId(selectedPatient._id);
        setShowBreakGlass(true);
        setShowVitalsModal(false);
      } else {
        toast.error(error.response?.data?.message || 'Failed to record vital signs');
      }
    }
  };

  const handleBreakGlassAccess = async (justification) => {
    try {
      console.log('[Break Glass] Requesting emergency access for patient:', breakGlassPatientId);
      console.log('[Break Glass] Justification:', justification);
      
      // Fetch patient data with break glass access
      const patientResponse = await patientAPI.getById(breakGlassPatientId, { 
        emergencyAccess: true,
        justification 
      });
      const patient = patientResponse.data?.data || patientResponse.data;
      
      console.log('[Break Glass] Access granted, patient data received:', patient);
      
      // Mark the patient with emergency access metadata
      const patientWithEmergencyAccess = {
        ...patient,
        emergencyAccess: true,
        breakGlassJustification: justification
      };
      
      setSelectedPatient(patientWithEmergencyAccess);
      setShowBreakGlass(false);
      setBreakGlassPatientId(null);
      
      toast.success('Emergency access granted. This action has been logged and will be reviewed.');
    } catch (error) {
      console.error('[Break Glass] Access error:', error);
      console.error('[Break Glass] Error response:', error.response);
      throw error; // Let the BreakGlassAccess component handle the error
    }
  };

  const handleEmergencyPatientLookup = async (e) => {
    e.preventDefault();
    
    if (!emergencySearchTerm.trim()) {
      toast.error(`Please enter a ${searchType === 'name' ? 'patient name' : 'patient ID'}`);
      return;
    }

    try {
      setEmergencySearchLoading(true);
      console.log('[Emergency Lookup] Searching for patient:', emergencySearchTerm, 'Type:', searchType);
      
      if (searchType === 'name') {
        // Search by name in accessible patients
        const response = await patientAPI.getAll({ search: emergencySearchTerm });
        const allPatients = response.data?.data || [];
        
        // Search for the patient by name (first name, last name, or full name)
        const searchLower = emergencySearchTerm.toLowerCase();
        const foundPatient = allPatients.find(p => {
          const firstName = (p.firstName || '').toLowerCase();
          const lastName = (p.lastName || '').toLowerCase();
          const fullName = `${firstName} ${lastName}`.trim();
          
          return firstName.includes(searchLower) || 
                 lastName.includes(searchLower) || 
                 fullName.includes(searchLower);
        });

        if (foundPatient) {
          // Patient found in accessible records - show normally
          console.log('[Emergency Lookup] Patient found:', foundPatient);
          toast.success(`Patient found: ${foundPatient.firstName} ${foundPatient.lastName}`);
          setSelectedPatient(foundPatient);
          setShowEmergencyLookup(false);
          setEmergencySearchTerm('');
        } else {
          toast.warning('Patient not found in your hospital. Try searching by Patient ID for cross-hospital access.');
        }
      } else {
        // Search by ID - could be MongoDB _id or patientId (P-xxx)
        try {
          // First, try to search all patients to find by patientId
          const response = await patientAPI.getAll({ search: emergencySearchTerm });
          const allPatients = response.data?.data || [];
          
          // Check if it's a patientId (P-xxx format) or MongoDB _id
          const foundPatient = allPatients.find(p => 
            p.patientId === emergencySearchTerm || 
            p._id === emergencySearchTerm
          );

          if (foundPatient) {
            // Patient found in accessible records
            console.log('[Emergency Lookup] Patient found by ID:', foundPatient);
            toast.success(`Patient found: ${foundPatient.firstName} ${foundPatient.lastName}`);
            setSelectedPatient(foundPatient);
            setShowEmergencyLookup(false);
            setEmergencySearchTerm('');
          } else {
            // Not found in accessible records - try direct access with MongoDB ID
            try {
              const patientResponse = await patientAPI.getById(emergencySearchTerm);
              const patient = patientResponse.data?.data || patientResponse.data;
              
              if (patient) {
                console.log('[Emergency Lookup] Patient found by direct access:', patient);
                toast.success(`Patient found: ${patient.firstName} ${patient.lastName}`);
                setSelectedPatient(patient);
                setShowEmergencyLookup(false);
                setEmergencySearchTerm('');
              }
            } catch (idError) {
              if (idError.response?.status === 403) {
                // Access denied - trigger Break Glass with MongoDB ID
                console.log('[Emergency Lookup] Access denied, initiating Break Glass');
                toast.warning('Patient in another hospital. Initiating Break Glass for emergency access...');
                setBreakGlassPatientId(emergencySearchTerm);
                setShowBreakGlass(true);
                setShowEmergencyLookup(false);
                setEmergencySearchTerm('');
              } else {
                toast.error('Patient not found. If using Patient ID (P-xxx), the patient may not be in the system or you need the MongoDB ID for cross-hospital access.');
              }
            }
          }
        } catch (error) {
          console.error('[Emergency Lookup] Search error:', error);
          toast.error('Error searching for patient. Please try again.');
        }
      }
    } catch (error) {
      console.error('[Emergency Lookup] Error:', error);
      toast.error('An error occurred while searching. Please try again.');
    } finally {
      setEmergencySearchLoading(false);
    }
  };

  const handleAdministerMeds = async (e) => {
    e.preventDefault();
    try {
      const ehrData = {
        patient: selectedPatient._id,
        visitType: 'outpatient',
        department: user?.attributes?.department || 'Nursing',
        chiefComplaint: 'Medication Administration',
        diagnosis: {
          primary: `Medication Administered: ${medsForm.medicationName}`
        },
        medications: [{
          name: medsForm.medicationName,
          dosage: medsForm.dosage,
          route: medsForm.route,
          frequency: 'As prescribed'
        }],
        treatmentPlan: `${medsForm.dosage} administered via ${medsForm.route}`,
        clinicalNotes: medsForm.notes
      };

      console.log('Nurse Administering Medication:', ehrData);
      await ehrAPI.create(ehrData);
      toast.success('Medication administered successfully!');
      setShowMedsModal(false);
      setMedsForm({
        medicationName: '',
        dosage: '',
        route: 'oral',
        notes: ''
      });
      setSelectedPatient(null);
    } catch (error) {
      console.error('Error administering medication:', error);
      toast.error(error.response?.data?.message || 'Failed to record medication administration');
    }
  };

  const handleAddNotes = async (e) => {
    e.preventDefault();
    try {
      // Map note types to visit types
      const visitTypeMap = {
        'nursing_notes': 'outpatient',
        'care_plan': 'inpatient',
        'incident_report': 'emergency',
        'progress_note': 'follow-up'
      };

      const ehrData = {
        patient: selectedPatient._id,
        visitType: visitTypeMap[notesForm.type] || 'outpatient',
        department: user?.attributes?.department || 'Nursing',
        chiefComplaint: notesForm.type === 'incident_report' ? 'Incident Report' : 'Nursing Documentation',
        diagnosis: {
          primary: 'Nursing Documentation'
        },
        clinicalNotes: `${notesForm.type.toUpperCase()}\n\nObservations: ${notesForm.observations}\n\n${notesForm.notes}`
      };

      console.log('Nurse Adding Notes:', ehrData);
      await ehrAPI.create(ehrData);
      toast.success('Notes added successfully!');
      setShowNotesModal(false);
      setNotesForm({
        type: 'nursing_notes',
        notes: '',
        observations: ''
      });
      setSelectedPatient(null);
    } catch (error) {
      console.error('Error adding notes:', error);
      toast.error(error.response?.data?.message || 'Failed to add notes');
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
              <Heart className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Nurse Dashboard</h1>
                <p className="text-sm text-gray-500">Patient Care & Documentation</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500">{user?.role} • {user?.attributes?.department}</p>
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
                <p className="text-sm text-gray-500">Assigned Patients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.assignedPatients}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Vitals Due</p>
                <p className="text-2xl font-bold text-gray-900">{stats.vitalsDue}</p>
              </div>
              <Activity className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Med Admin</p>
                <p className="text-2xl font-bold text-gray-900">{stats.medsAdmin}</p>
              </div>
              <Pill className="h-10 w-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.alerts}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setShowVitalsModal(true)}
              className="flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition"
            >
              <Thermometer className="h-6 w-6" />
              <span className="font-medium">Record Vitals</span>
            </button>
            <button
              onClick={() => setShowMedsModal(true)}
              className="flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition"
            >
              <Pill className="h-6 w-6" />
              <span className="font-medium">Administer Meds</span>
            </button>
            <button
              onClick={() => setShowNotesModal(true)}
              className="flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition"
            >
              <ClipboardList className="h-6 w-6" />
              <span className="font-medium">Add Notes</span>
            </button>
          </div>
        </div>

        {/* Emergency Patient Lookup */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg shadow p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Emergency Patient Lookup (Cross-Hospital)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Access patient records from other hospitals in emergency situations. Requires Break Glass justification.
              </p>
              <button
                onClick={() => setShowEmergencyLookup(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-semibold"
              >
                <Search className="h-5 w-5" />
                <span>Emergency Patient Search</span>
              </button>
            </div>
          </div>
        </div>

        {/* Emergency Patient Access Display */}
        {selectedPatient?.emergencyAccess && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Emergency Access Active</h3>
                  <p className="text-sm text-gray-600">Cross-Hospital Break Glass Access Granted</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Patient Name</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Patient ID</p>
                  <p className="text-sm font-mono text-gray-900">{selectedPatient.patientId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Age / Gender</p>
                  <p className="text-sm text-gray-900">
                    {selectedPatient.dateOfBirth ? new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear() : 'N/A'} / {selectedPatient.gender}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Blood Type</p>
                  <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    {selectedPatient.bloodType || 'N/A'}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Allergies</p>
                  <p className="text-sm text-gray-900">{selectedPatient.allergies || 'None recorded'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Hospital</p>
                  <p className="text-sm text-gray-900">{selectedPatient.hospital || 'Not specified'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-100 rounded-lg mb-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-amber-700" />
                <span className="text-sm font-semibold text-amber-900">Break Glass Justification:</span>
              </div>
              <p className="text-sm text-amber-800 italic">"{selectedPatient.breakGlassJustification}"</p>
            </div>

            <div className="flex justify-center space-x-3">
              <button
                onClick={() => fetchPatientEHRs(selectedPatient)}
                className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold shadow-md"
              >
                <FileWarning className="h-5 w-5" />
                <span>View Patient History</span>
              </button>
              <button
                onClick={() => {
                  setShowVitalsModal(true);
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-md"
              >
                <Thermometer className="h-5 w-5" />
                <span>Record Vitals</span>
              </button>
              <button
                onClick={() => {
                  setShowMedsModal(true);
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold shadow-md"
              >
                <Pill className="h-5 w-5" />
                <span>Administer Medication</span>
              </button>
              <button
                onClick={() => {
                  setShowNotesModal(true);
                }}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold shadow-md"
              >
                <ClipboardList className="h-5 w-5" />
                <span>Add Notes</span>
              </button>
            </div>
          </div>
        )}

        {/* Patient List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">My Patients</h2>
              <span className="text-sm text-gray-500">From your hospital only</span>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    Age/Gender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Blood Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allergies
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
                      No patients assigned yet.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {patient.firstName?.[0]}{patient.lastName?.[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {patient.firstName} {patient.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {patient.patientId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : 'N/A'} / {patient.gender}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {patient.bloodType || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {patient.allergies || 'None'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => {
                            setSelectedPatient(patient);
                            fetchPatientEHRs(patient);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View History"
                        >
                          <FileWarning className="h-4 w-4 inline" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowVitalsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Record Vitals"
                        >
                          <Thermometer className="h-4 w-4 inline" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowMedsModal(true);
                          }}
                          className="text-purple-600 hover:text-purple-900"
                          title="Administer Medication"
                        >
                          <Pill className="h-4 w-4 inline" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowNotesModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="Add Notes"
                        >
                          <ClipboardList className="h-4 w-4 inline" />
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

      {/* Record Vitals Modal */}
      {showVitalsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-semibold text-gray-900">
                Record Vital Signs
                {selectedPatient && ` - ${selectedPatient.firstName} ${selectedPatient.lastName}`}
              </h3>
              <button onClick={() => {
                setShowVitalsModal(false);
                setSelectedPatient(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleRecordVitals} className="p-6 space-y-4">
              {!selectedPatient && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Patient *</label>
                  <select
                    required
                    onChange={(e) => {
                      const patient = patients.find(p => p._id === e.target.value);
                      setSelectedPatient(patient);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a patient</option>
                    {patients.map((patient) => (
                      <option key={patient._id} value={patient._id}>
                        {patient.firstName} {patient.lastName} - {patient.patientId}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Temperature (°F) *</label>
                  <input
                    type="text"
                    required
                    value={vitalsForm.temperature}
                    onChange={(e) => setVitalsForm({...vitalsForm, temperature: e.target.value})}
                    placeholder="98.6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Blood Pressure (mmHg) *</label>
                  <input
                    type="text"
                    required
                    value={vitalsForm.bloodPressure}
                    onChange={(e) => setVitalsForm({...vitalsForm, bloodPressure: e.target.value})}
                    placeholder="120/80"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heart Rate (bpm) *</label>
                  <input
                    type="text"
                    required
                    value={vitalsForm.heartRate}
                    onChange={(e) => setVitalsForm({...vitalsForm, heartRate: e.target.value})}
                    placeholder="72"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Respiratory Rate (rpm)</label>
                  <input
                    type="text"
                    value={vitalsForm.respiratoryRate}
                    onChange={(e) => setVitalsForm({...vitalsForm, respiratoryRate: e.target.value})}
                    placeholder="16"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Oxygen Saturation (%)</label>
                  <input
                    type="text"
                    value={vitalsForm.oxygenSaturation}
                    onChange={(e) => setVitalsForm({...vitalsForm, oxygenSaturation: e.target.value})}
                    placeholder="98"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pain Level (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={vitalsForm.painLevel}
                    onChange={(e) => setVitalsForm({...vitalsForm, painLevel: e.target.value})}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={vitalsForm.notes}
                  onChange={(e) => setVitalsForm({...vitalsForm, notes: e.target.value})}
                  rows="3"
                  placeholder="Additional observations..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowVitalsModal(false);
                    setSelectedPatient(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedPatient}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Record Vitals
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Administer Medication Modal */}
      {showMedsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-semibold text-gray-900">
                Administer Medication
                {selectedPatient && ` - ${selectedPatient.firstName} ${selectedPatient.lastName}`}
              </h3>
              <button onClick={() => {
                setShowMedsModal(false);
                setSelectedPatient(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAdministerMeds} className="p-6 space-y-4">
              {!selectedPatient && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Patient *</label>
                  <select
                    required
                    onChange={(e) => {
                      const patient = patients.find(p => p._id === e.target.value);
                      setSelectedPatient(patient);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a patient</option>
                    {patients.map((patient) => (
                      <option key={patient._id} value={patient._id}>
                        {patient.firstName} {patient.lastName} - {patient.patientId}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medication Name *</label>
                <input
                  type="text"
                  required
                  value={medsForm.medicationName}
                  onChange={(e) => setMedsForm({...medsForm, medicationName: e.target.value})}
                  placeholder="e.g., Aspirin"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dosage *</label>
                <input
                  type="text"
                  required
                  value={medsForm.dosage}
                  onChange={(e) => setMedsForm({...medsForm, dosage: e.target.value})}
                  placeholder="e.g., 100mg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Route *</label>
                <select
                  required
                  value={medsForm.route}
                  onChange={(e) => setMedsForm({...medsForm, route: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="oral">Oral</option>
                  <option value="IV">IV (Intravenous)</option>
                  <option value="IM">IM (Intramuscular)</option>
                  <option value="subcutaneous">Subcutaneous</option>
                  <option value="topical">Topical</option>
                  <option value="inhalation">Inhalation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={medsForm.notes}
                  onChange={(e) => setMedsForm({...medsForm, notes: e.target.value})}
                  rows="3"
                  placeholder="Additional notes about administration..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMedsModal(false);
                    setSelectedPatient(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedPatient}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  Administer Medication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-semibold text-gray-900">
                Add Nursing Notes
                {selectedPatient && ` - ${selectedPatient.firstName} ${selectedPatient.lastName}`}
              </h3>
              <button onClick={() => {
                setShowNotesModal(false);
                setSelectedPatient(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddNotes} className="p-6 space-y-4">
              {!selectedPatient && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Patient *</label>
                  <select
                    required
                    onChange={(e) => {
                      const patient = patients.find(p => p._id === e.target.value);
                      setSelectedPatient(patient);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select a patient</option>
                    {patients.map((patient) => (
                      <option key={patient._id} value={patient._id}>
                        {patient.firstName} {patient.lastName} - {patient.patientId}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Note Type *</label>
                <select
                  required
                  value={notesForm.type}
                  onChange={(e) => setNotesForm({...notesForm, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="nursing_notes">Nursing Notes</option>
                  <option value="care_plan">Care Plan</option>
                  <option value="incident_report">Incident Report</option>
                  <option value="progress_note">Progress Note</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observations</label>
                <textarea
                  value={notesForm.observations}
                  onChange={(e) => setNotesForm({...notesForm, observations: e.target.value})}
                  rows="3"
                  placeholder="Patient observations..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes *</label>
                <textarea
                  required
                  value={notesForm.notes}
                  onChange={(e) => setNotesForm({...notesForm, notes: e.target.value})}
                  rows="5"
                  placeholder="Detailed notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotesModal(false);
                    setSelectedPatient(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedPatient}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Add Notes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emergency Patient Lookup Modal */}
      {showEmergencyLookup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Search className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Emergency Patient Lookup
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowEmergencyLookup(false);
                  setEmergencySearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This search will look for patients across hospitals. 
                  Access to patients from other hospitals requires Break Glass justification.
                </div>
              </div>
            </div>

            <form onSubmit={handleEmergencyPatientLookup}>
              {/* Search Type Toggle */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search By
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setSearchType('name')}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                      searchType === 'name'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Patient Name
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchType('id')}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                      searchType === 'id'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Patient ID
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {searchType === 'name' ? 'Patient Name *' : 'Patient ID *'}
                </label>
                <input
                  type="text"
                  value={emergencySearchTerm}
                  onChange={(e) => setEmergencySearchTerm(e.target.value)}
                  placeholder={
                    searchType === 'name'
                      ? 'Enter patient name (e.g., John Doe)'
                      : 'Enter Patient ID (e.g., P-1762248716137-470D9CA6 or MongoDB ID)'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {searchType === 'name'
                    ? 'Search by first name, last name, or full name within your hospital'
                    : 'Enter the Patient ID (e.g., P-1762248716137-470D9CA6) for cross-hospital emergency access'}
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={emergencySearchLoading || !emergencySearchTerm.trim()}
                  className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {emergencySearchLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Searching...
                    </span>
                  ) : (
                    'Search Patient'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmergencyLookup(false);
                    setEmergencySearchTerm('');
                  }}
                  disabled={emergencySearchLoading}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient History Modal */}
      {showHistoryModal && selectedPatient && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Patient History - {selectedPatient.firstName} {selectedPatient.lastName}
              </h3>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setPatientEHRs([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {ehrLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading patient history...</p>
              </div>
            ) : patientEHRs.length === 0 ? (
              <div className="text-center py-8">
                <FileWarning className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No EHR records found for this patient</p>
              </div>
            ) : (
              <div className="overflow-auto max-h-96">
                {patientEHRs.map((ehr) => (
                  <div key={ehr._id} className="border rounded-lg p-4 mb-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {ehr.visitType === 'inpatient' ? '🏥 Inpatient' : '🚶 Outpatient'} Visit
                        </h4>
                        <p className="text-sm text-gray-600">
                          {new Date(ehr.visitDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        ehr.status === 'active' ? 'bg-green-100 text-green-800' :
                        ehr.status === 'signed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ehr.status}
                      </span>
                    </div>

                    {ehr.chiefComplaint && (
                      <p className="text-sm mb-2">
                        <strong>Chief Complaint:</strong> {ehr.chiefComplaint}
                      </p>
                    )}

                    {ehr.diagnosis && (
                      <p className="text-sm mb-2">
                        <strong>Diagnosis:</strong> {ehr.diagnosis}
                      </p>
                    )}

                    {ehr.vitals && (
                      <div className="text-sm mb-2">
                        <strong>Vitals:</strong>
                        <div className="grid grid-cols-2 gap-2 mt-1 ml-4">
                          {ehr.vitals.temperature && <span>🌡️ Temp: {ehr.vitals.temperature}°F</span>}
                          {ehr.vitals.bloodPressure && (
                            <span>💗 BP: {ehr.vitals.bloodPressure.systolic}/{ehr.vitals.bloodPressure.diastolic}</span>
                          )}
                          {ehr.vitals.heartRate && <span>💓 HR: {ehr.vitals.heartRate} bpm</span>}
                          {ehr.vitals.oxygenSaturation && <span>🫁 O2: {ehr.vitals.oxygenSaturation}%</span>}
                        </div>
                      </div>
                    )}

                    {ehr.medications && ehr.medications.length > 0 && (
                      <div className="text-sm mb-2">
                        <strong>Medications:</strong>
                        <ul className="ml-4 mt-1">
                          {ehr.medications.map((med, idx) => (
                            <li key={idx}>💊 {med.name} - {med.dosage} ({med.route})</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {ehr.nursingNotes && (
                      <div className="text-sm mb-2">
                        <strong>Nursing Notes:</strong>
                        <p className="ml-4 mt-1 text-gray-700">{ehr.nursingNotes}</p>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                      {ehr.attendingPhysician && (
                        <span>👨‍⚕️ Dr. {ehr.attendingPhysician.firstName} {ehr.attendingPhysician.lastName}</span>
                      )}
                      {ehr.nurseInCharge && (
                        <span className="ml-4">👩‍⚕️ Nurse: {ehr.nurseInCharge.firstName} {ehr.nurseInCharge.lastName}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setPatientEHRs([]);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
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

export default NurseDashboard;
