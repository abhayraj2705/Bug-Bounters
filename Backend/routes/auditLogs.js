const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin/authorized role
router.use(protect);

/**
 * @desc    Get audit logs with filters
 * @route   GET /api/audit-logs
 * @access  Private (Admin)
 */
router.get('/', authorize('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      patientId,
      action,
      resourceType,
      status,
      startDate,
      endDate,
      breakGlass
    } = req.query;

    const filters = {};

    if (userId) filters.user = userId;
    if (patientId) filters.patient = patientId;
    if (action) filters.action = action;
    if (resourceType) filters.resourceType = resourceType;
    if (status) filters.status = status;
    if (breakGlass === 'true') filters['breakGlass.isBreakGlass'] = true;

    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate);
      if (endDate) filters.timestamp.$lte = new Date(endDate);
    }

    const result = await AuditLog.queryLogs(filters, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs',
      error: error.message
    });
  }
});

/**
 * @desc    Get break glass access logs
 * @route   GET /api/audit-logs/break-glass
 * @access  Private (Admin)
 */
router.get('/break-glass', authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const result = await AuditLog.queryLogs(
      { 'breakGlass.isBreakGlass': true },
      {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: 'timestamp',
        sortOrder: 'desc'
      }
    );

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get break glass logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching break glass logs',
      error: error.message
    });
  }
});

/**
 * @desc    Get user's activity logs
 * @route   GET /api/audit-logs/user/:userId
 * @access  Private (Admin or self)
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Allow users to see their own logs, admins can see all
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these logs'
      });
    }

    const { page = 1, limit = 50 } = req.query;

    const result = await AuditLog.queryLogs(
      { user: userId },
      {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: 'timestamp',
        sortOrder: 'desc'
      }
    );

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get user logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user logs',
      error: error.message
    });
  }
});

/**
 * @desc    Get patient access logs
 * @route   GET /api/audit-logs/patient/:patientId
 * @access  Private (Admin, assigned providers)
 */
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await AuditLog.queryLogs(
      { patient: patientId },
      {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: 'timestamp',
        sortOrder: 'desc'
      }
    );

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get patient logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient logs',
      error: error.message
    });
  }
});

/**
 * @desc    Get audit statistics
 * @route   GET /api/audit-logs/stats
 * @access  Private (Admin)
 */
router.get('/stats/summary', authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
      if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
    }

    const [
      totalLogs,
      breakGlassCount,
      deniedAccessCount,
      actionStats,
      userStats
    ] = await Promise.all([
      AuditLog.countDocuments(dateFilter),
      AuditLog.countDocuments({ ...dateFilter, 'breakGlass.isBreakGlass': true }),
      AuditLog.countDocuments({ ...dateFilter, status: 'DENIED' }),
      AuditLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      AuditLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$user', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo'
          }
        }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalLogs,
        breakGlassCount,
        deniedAccessCount,
        actionStats,
        topUsers: userStats
      }
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit statistics',
      error: error.message
    });
  }
});

module.exports = router;
