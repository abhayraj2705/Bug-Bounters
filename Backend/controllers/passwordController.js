const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { getClientIp } = require('../utils/ipHelper');
const bcrypt = require('bcryptjs');

/**
 * @desc    Change user password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      // Log failed password change attempt
      await AuditLog.createLog({
        user: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'PASSWORD_CHANGE_FAILED',
        resourceType: 'User',
        resourceId: user._id,
        timestamp: new Date(),
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        status: 'FAILURE',
        details: {
          reason: 'Invalid current password'
        },
        hospitalId: user.attributes?.hospitalId,
        department: user.attributes?.department
      });

      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log successful password change
    await AuditLog.createLog({
      user: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'PASSWORD_CHANGED',
      resourceType: 'User',
      resourceId: user._id,
      timestamp: new Date(),
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      details: {
        message: 'User successfully changed their password'
      },
      hospitalId: user.attributes?.hospitalId,
      department: user.attributes?.department
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};
