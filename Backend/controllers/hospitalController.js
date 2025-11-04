const Hospital = require('../models/Hospital');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Patient = require('../models/Patient');
const EHR = require('../models/EHR');
const crypto = require('crypto');

/**
 * @desc    Get all hospitals in network
 * @route   GET /api/hospitals
 * @access  Private (Admin)
 */
exports.getAllHospitals = async (req, res) => {
  try {
    const { status, city, type } = req.query;
    
    let query = {};
    if (status) query.connectionStatus = status;
    if (city) query['address.city'] = new RegExp(city, 'i');
    if (type) query['metadata.type'] = type;

    const hospitals = await Hospital.find(query)
      .sort({ connectedAt: -1 });

    res.status(200).json({
      success: true,
      count: hospitals.length,
      data: hospitals
    });
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching hospitals',
      error: error.message
    });
  }
};

/**
 * @desc    Get single hospital
 * @route   GET /api/hospitals/:id
 * @access  Private (Admin)
 */
exports.getHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.status(200).json({
      success: true,
      data: hospital
    });
  } catch (error) {
    console.error('Get hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching hospital',
      error: error.message
    });
  }
};

/**
 * @desc    Add new hospital to network
 * @route   POST /api/hospitals
 * @access  Private (Admin)
 */
exports.createHospital = async (req, res) => {
  try {
    const {
      hospitalId,
      name,
      address,
      contactInfo,
      administrator,
      metadata
    } = req.body;

    // Check if hospital ID already exists
    const existingHospital = await Hospital.findOne({ hospitalId });
    if (existingHospital) {
      return res.status(400).json({
        success: false,
        message: 'Hospital ID already exists'
      });
    }

    // Generate API key for the hospital
    const apiKey = crypto.randomBytes(32).toString('hex');

    const hospital = await Hospital.create({
      hospitalId,
      name,
      address,
      contactInfo,
      administrator,
      metadata,
      networkConfig: {
        apiKey,
        encryptionEnabled: true,
        tlsVersion: 'TLS 1.3'
      },
      connectionStatus: 'pending',
      connectedAt: new Date()
    });

    // Create audit log
    await AuditLog.createLog({
      user: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'CREATE_HOSPITAL',
      resourceType: 'Hospital',
      resourceId: hospital._id,
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      details: {
        hospitalId: hospital.hospitalId,
        hospitalName: hospital.name
      }
    });

    res.status(201).json({
      success: true,
      message: 'Hospital added to network successfully',
      data: hospital
    });
  } catch (error) {
    console.error('Create hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating hospital',
      error: error.message
    });
  }
};

/**
 * @desc    Update hospital information
 * @route   PUT /api/hospitals/:id
 * @access  Private (Admin)
 */
exports.updateHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    const updatedHospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    // Create audit log
    await AuditLog.createLog({
      user: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'UPDATE_HOSPITAL',
      resourceType: 'Hospital',
      resourceId: hospital._id,
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      details: {
        hospitalId: hospital.hospitalId,
        hospitalName: hospital.name,
        changes: req.body
      }
    });

    res.status(200).json({
      success: true,
      message: 'Hospital updated successfully',
      data: updatedHospital
    });
  } catch (error) {
    console.error('Update hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating hospital',
      error: error.message
    });
  }
};

/**
 * @desc    Delete hospital from network
 * @route   DELETE /api/hospitals/:id
 * @access  Private (Admin)
 */
exports.deleteHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    await Hospital.findByIdAndDelete(req.params.id);

    // Create audit log
    await AuditLog.createLog({
      user: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'DELETE_HOSPITAL',
      resourceType: 'Hospital',
      resourceId: hospital._id,
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      details: {
        hospitalId: hospital.hospitalId,
        hospitalName: hospital.name
      }
    });

    res.status(200).json({
      success: true,
      message: 'Hospital removed from network'
    });
  } catch (error) {
    console.error('Delete hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting hospital',
      error: error.message
    });
  }
};

/**
 * @desc    Update hospital connection status
 * @route   PUT /api/hospitals/:id/status
 * @access  Private (Admin)
 */
exports.updateHospitalStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'pending', 'disconnected', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { 
        connectionStatus: status,
        lastSyncAt: new Date()
      },
      { new: true }
    );

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    // Create audit log
    await AuditLog.createLog({
      user: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'UPDATE_HOSPITAL_STATUS',
      resourceType: 'Hospital',
      resourceId: hospital._id,
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      details: {
        hospitalId: hospital.hospitalId,
        hospitalName: hospital.name,
        newStatus: status
      }
    });

    res.status(200).json({
      success: true,
      message: 'Hospital status updated',
      data: hospital
    });
  } catch (error) {
    console.error('Update hospital status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating hospital status',
      error: error.message
    });
  }
};

/**
 * @desc    Sync hospital statistics
 * @route   POST /api/hospitals/:id/sync
 * @access  Private (Admin)
 */
exports.syncHospitalStats = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    // Count users, patients, and EHRs for this hospital
    const totalUsers = await User.countDocuments({ 
      'attributes.hospitalId': hospital.hospitalId 
    });
    
    const totalPatients = await Patient.countDocuments({ 
      hospitalId: hospital.hospitalId 
    });
    
    const totalEHRs = await EHR.countDocuments({ 
      hospitalId: hospital.hospitalId 
    });

    // Update hospital statistics
    hospital.statistics.totalUsers = totalUsers;
    hospital.statistics.totalPatients = totalPatients;
    hospital.statistics.totalEHRs = totalEHRs;
    hospital.lastSyncAt = new Date();

    await hospital.save();

    res.status(200).json({
      success: true,
      message: 'Hospital statistics synced',
      data: {
        hospitalId: hospital.hospitalId,
        statistics: hospital.statistics,
        lastSyncAt: hospital.lastSyncAt
      }
    });
  } catch (error) {
    console.error('Sync hospital stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing hospital statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Get network statistics
 * @route   GET /api/hospitals/stats/network
 * @access  Private (Admin)
 */
exports.getNetworkStats = async (req, res) => {
  try {
    const totalHospitals = await Hospital.countDocuments();
    const activeHospitals = await Hospital.countDocuments({ connectionStatus: 'active' });
    const pendingHospitals = await Hospital.countDocuments({ connectionStatus: 'pending' });
    
    // Calculate total users across all hospitals
    const hospitals = await Hospital.find();
    const totalUsers = hospitals.reduce((sum, h) => sum + h.statistics.totalUsers, 0);
    const totalPatients = hospitals.reduce((sum, h) => sum + h.statistics.totalPatients, 0);

    // Calculate data transfers in last 24 hours (from audit logs)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTransfers = await AuditLog.countDocuments({
      action: { $in: ['CREATE_EHR', 'UPDATE_EHR', 'VIEW_EHR'] },
      timestamp: { $gte: last24Hours }
    });

    // Get recent activity
    const recentActivity = await AuditLog.find({
      resourceType: 'Hospital'
    })
    .sort({ timestamp: -1 })
    .limit(10)
    .select('action resourceId timestamp userEmail details');

    res.status(200).json({
      success: true,
      data: {
        totalHospitals,
        activeHospitals,
        pendingHospitals,
        disconnectedHospitals: totalHospitals - activeHospitals - pendingHospitals,
        totalUsers,
        totalPatients,
        dataTransfersLast24h: recentTransfers,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get network stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching network statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Test hospital connection
 * @route   POST /api/hospitals/:id/test-connection
 * @access  Private (Admin)
 */
exports.testConnection = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    // Simulate connection test
    const connectionTest = {
      ping: Math.floor(Math.random() * 50) + 10, // Random ping 10-60ms
      bandwidth: Math.floor(Math.random() * 500) + 100, // Random bandwidth 100-600 Mbps
      latency: Math.floor(Math.random() * 30) + 5, // Random latency 5-35ms
      status: 'success',
      timestamp: new Date()
    };

    // Update last sync
    hospital.lastSyncAt = new Date();
    await hospital.save();

    res.status(200).json({
      success: true,
      message: 'Connection test successful',
      data: connectionTest
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing connection',
      error: error.message
    });
  }
};
