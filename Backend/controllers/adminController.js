const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -mfa.secret -refreshTokens')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

/**
 * @desc    Get user by ID (Admin only)
 * @route   GET /api/admin/users/:id
 * @access  Private (Admin)
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -mfa.secret -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

/**
 * @desc    Update user (Admin only)
 * @route   PUT /api/admin/users/:id
 * @access  Private (Admin)
 */
exports.updateUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      role,
      attributes,
      accountLocked,
      accountActive
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (role) user.role = role;
    if (attributes) user.attributes = { ...user.attributes, ...attributes };
    if (typeof accountLocked !== 'undefined') user.accountLocked = accountLocked;
    if (typeof accountActive !== 'undefined') user.isActive = accountActive;

    await user.save();

    // Create audit log
    await AuditLog.createLog({
      user: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'UPDATE_USER',
      resourceType: 'User',
      resourceId: user._id,
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      details: `Updated user: ${user.username}`,
      hospitalId: req.user.attributes?.hospitalId,
      department: req.user.attributes?.department
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        attributes: user.attributes,
        accountLocked: user.accountLocked,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

/**
 * @desc    Delete user (Admin only)
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin)
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Soft delete - mark as inactive
    user.isActive = false;
    await user.save();

    // Create audit log
    await AuditLog.createLog({
      user: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'DELETE_USER',
      resourceType: 'User',
      resourceId: user._id,
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      details: `Deleted user: ${user.username}`,
      hospitalId: req.user.attributes?.hospitalId,
      department: req.user.attributes?.department
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

/**
 * @desc    Get system statistics (Admin only)
 * @route   GET /api/admin/stats
 * @access  Private (Admin)
 */
exports.getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole: usersByRole.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Unlock user account (Admin only)
 * @route   POST /api/admin/users/:id/unlock
 * @access  Private (Admin)
 */
exports.unlockUserAccount = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Reset failed login attempts and unlock account
    await user.resetLoginAttempts();

    // Create audit log
    await AuditLog.createLog({
      user: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'UNLOCK_USER',
      resourceType: 'User',
      resourceId: user._id,
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      details: `Unlocked user account: ${user.username}`,
      hospitalId: req.user.attributes?.hospitalId,
      department: req.user.attributes?.department
    });

    res.status(200).json({
      success: true,
      message: 'User account unlocked successfully'
    });
  } catch (error) {
    console.error('Unlock user account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlocking user account',
      error: error.message
    });
  }
};
