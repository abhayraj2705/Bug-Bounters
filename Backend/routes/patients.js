const express = require('express');
const router = express.Router();
const {
  createPatient,
  getPatients,
  getPatient,
  updatePatient,
  assignProvider,
  updateConsent,
  deletePatient
} = require('../controllers/patientController');
const { protect, authorize, checkPatientAccess } = require('../middleware/auth');
const { logAccess, breakGlass, captureBeforeState } = require('../middleware/auditLog');
const Patient = require('../models/Patient');

// All routes require authentication
router.use(protect);

// Get all patients (filtered by role)
router.get('/',
  logAccess('VIEW_PATIENT', 'Patient'),
  getPatients
);

// Create new patient
router.post('/',
  authorize('admin', 'doctor', 'nurse'),
  logAccess('CREATE_PATIENT', 'Patient'),
  createPatient
);

// Get single patient
router.get('/:id',
  checkPatientAccess,
  breakGlass,
  logAccess('VIEW_PATIENT', 'Patient'),
  getPatient
);

// Update patient
router.put('/:id',
  authorize('admin', 'doctor', 'nurse'),
  checkPatientAccess,
  captureBeforeState(Patient),
  breakGlass,
  logAccess('UPDATE_PATIENT', 'Patient'),
  updatePatient
);

// Assign doctor/nurse to patient
router.post('/:id/assign',
  authorize('admin', 'doctor'),
  logAccess('UPDATE_PATIENT', 'Patient'),
  assignProvider
);

// Update patient consent
router.put('/:id/consent',
  authorize('admin', 'doctor', 'nurse'),
  checkPatientAccess,
  logAccess('UPDATE_PATIENT', 'Patient'),
  updateConsent
);

// Delete (deactivate) patient
router.delete('/:id',
  authorize('admin'),
  captureBeforeState(Patient),
  logAccess('DELETE_PATIENT', 'Patient'),
  deletePatient
);

module.exports = router;
