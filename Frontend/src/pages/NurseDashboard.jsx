import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { patientAPI, ehrAPI } from '../services/api';
import { 
  Heart, 
  Users, 
  ClipboardList, 
  AlertCircle,
  Search,
  Activity,
  Plus,
  X,
  Thermometer,
  Pill,
  FileWarning
} from 'lucide-react';
import { toast } from 'react-toastify';

const NurseDashboard = () => {
  const { user, logout } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showMedsModal, setShowMedsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
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
      toast.error(error.response?.data?.message || 'Failed to record vital signs');
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

        {/* Patient List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">My Patients</h2>
            
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
    </div>
  );
};

export default NurseDashboard;
