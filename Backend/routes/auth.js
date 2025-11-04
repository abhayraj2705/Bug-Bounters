const express = require('express');
const router = express.Router();
const {
  register,
  login,
  verifyMFA,
  setupMFA,
  enableMFA,
  disableMFA,
  logout,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/verify-mfa', verifyMFA);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.post('/logout', logout);
router.post('/setup-mfa', setupMFA);
router.post('/enable-mfa', enableMFA);
router.post('/disable-mfa', disableMFA);

module.exports = router;
