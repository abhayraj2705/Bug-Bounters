const express = require('express');
const router = express.Router();
const {
  getAllHospitals,
  getHospital,
  createHospital,
  updateHospital,
  deleteHospital,
  updateHospitalStatus,
  syncHospitalStats,
  getNetworkStats,
  testConnection
} = require('../controllers/hospitalController');
const { protect, authorize } = require('../middleware/auth');
const { logAccess } = require('../middleware/auditLog');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Network statistics
router.get('/stats/network', 
  logAccess('VIEW_NETWORK_STATS', 'Hospital'),
  getNetworkStats
);

// Hospital CRUD routes
router.route('/')
  .get(
    logAccess('VIEW_HOSPITALS', 'Hospital'),
    getAllHospitals
  )
  .post(
    logAccess('CREATE_HOSPITAL', 'Hospital'),
    createHospital
  );

router.route('/:id')
  .get(
    logAccess('VIEW_HOSPITAL', 'Hospital'),
    getHospital
  )
  .put(
    logAccess('UPDATE_HOSPITAL', 'Hospital'),
    updateHospital
  )
  .delete(
    logAccess('DELETE_HOSPITAL', 'Hospital'),
    deleteHospital
  );

// Hospital status and sync
router.put('/:id/status',
  logAccess('UPDATE_HOSPITAL_STATUS', 'Hospital'),
  updateHospitalStatus
);

router.post('/:id/sync',
  logAccess('SYNC_HOSPITAL', 'Hospital'),
  syncHospitalStats
);

router.post('/:id/test-connection',
  logAccess('TEST_HOSPITAL_CONNECTION', 'Hospital'),
  testConnection
);

module.exports = router;
