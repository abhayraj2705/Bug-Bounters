const express = require('express');
const router = express.Router();
const {
  createEHR,
  getPatientEHRs,
  getEHR,
  updateEHR,
  amendEHR,
  signEHR,
  getMyPatientEHRs,
  deleteEHR
} = require('../controllers/ehrController');
const { protect, authorize, checkPatientAccess } = require('../middleware/auth');
const { logAccess, breakGlass, captureBeforeState } = require('../middleware/auditLog');
const EHR = require('../models/EHR');

// All routes require authentication
router.use(protect);

// Get EHRs for my assigned patients
router.get('/my-patients', 
  authorize('doctor', 'nurse'),
  logAccess('VIEW_EHR', 'EHR'),
  getMyPatientEHRs
);

// Create new EHR
router.post('/', 
  authorize('doctor', 'nurse'),
  logAccess('CREATE_EHR', 'EHR'),
  createEHR
);

// Get EHRs for specific patient
router.get('/patient/:patientId',
  checkPatientAccess,
  breakGlass,
  logAccess('VIEW_EHR', 'EHR'),
  getPatientEHRs
);

// Get single EHR
router.get('/:id',
  breakGlass,
  logAccess('VIEW_EHR', 'EHR'),
  getEHR
);

// Update EHR
router.put('/:id',
  authorize('doctor', 'nurse'),
  captureBeforeState(EHR),
  breakGlass,
  logAccess('UPDATE_EHR', 'EHR'),
  updateEHR
);

// Create amendment to EHR
router.post('/:id/amend',
  authorize('doctor'),
  captureBeforeState(EHR),
  logAccess('UPDATE_EHR', 'EHR'),
  amendEHR
);

// Sign EHR (finalize)
router.post('/:id/sign',
  authorize('doctor'),
  logAccess('UPDATE_EHR', 'EHR'),
  signEHR
);

// Delete (archive) EHR
router.delete('/:id',
  authorize('admin'),
  captureBeforeState(EHR),
  logAccess('DELETE_EHR', 'EHR'),
  deleteEHR
);

module.exports = router;
