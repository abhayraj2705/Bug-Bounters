const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const { logAccess } = require('../middleware/auditLog');
const {
  getMyProfile,
  getMyEHRRecords,
  getMyEHRRecord,
  updateMyContact,
  exportMyRecords
} = require('../controllers/patientPortalController');

// All routes require patient authentication
router.use(authorize('patient'));

// Get patient's own profile
router.get('/profile', logAccess('VIEW_PATIENT', 'Patient'), getMyProfile);

// Get all EHR records for patient
router.get('/ehr', logAccess('VIEW_EHR', 'EHR'), getMyEHRRecords);

// Get specific EHR record
router.get('/ehr/:id', logAccess('VIEW_EHR', 'EHR'), getMyEHRRecord);

// Export all medical records (logged for compliance)
router.get('/export', exportMyRecords);

// Update contact information
router.put('/contact', logAccess('UPDATE_PATIENT', 'Patient'), updateMyContact);

module.exports = router;
