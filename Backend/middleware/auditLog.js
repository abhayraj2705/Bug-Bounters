const AuditLog = require('../models/AuditLog');
const { getClientIp } = require('../utils/ipHelper');

/**
 * Middleware to log all EHR and Patient access
 */
exports.logAccess = (action, resourceType) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send function to capture response
    res.send = async function (data) {
      // Determine status
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'SUCCESS' : 
                     res.statusCode >= 400 && res.statusCode < 500 ? 'DENIED' : 'FAILURE';

      // Find patient to get MongoDB _id if patientId is in P-xxx format
      let resourceId = req.params.id || req.params.patientId || req.params.recordId;
      let patientMongoId = null;
      let patientIdString = null;
      
      if (resourceType === 'Patient' && resourceId) {
        const Patient = require('../models/Patient');
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(resourceId);
        
        if (isValidObjectId) {
          patientMongoId = resourceId;
        } else {
          try {
            const patient = await Patient.findOne({ patientId: resourceId });
            if (patient) {
              patientMongoId = patient._id;
              patientIdString = patient.patientId;
            }
          } catch (err) {
            console.log('[logAccess] Could not find patient:', err.message);
          }
        }
        resourceId = patientMongoId || resourceId;
      }

      // Create audit log
      const logData = {
        user: req.user?.id,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        action: action,
        resourceType: resourceType,
        resourceId: resourceId,
        patient: patientMongoId || req.params.patientId,
        patientId: patientIdString,
        timestamp: new Date(),
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        accessMethod: 'web',
        status: status,
        hospitalId: req.user?.attributes?.hospitalId,
        department: req.user?.attributes?.department
      };

      // Add break glass info if present
      if (req.breakGlass) {
        logData.breakGlass = {
          isBreakGlass: true,
          justification: req.breakGlass.justification
        };
        logData.accessMethod = 'emergency';
      }

      // Add details for UPDATE/DELETE actions
      if (action.includes('UPDATE') || action.includes('DELETE')) {
        logData.details = {
          beforeState: req.resourceBeforeUpdate,
          changes: req.changes || []
        };
      }

      AuditLog.createLog(logData);

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware for break glass emergency access
 */
exports.breakGlass = async (req, res, next) => {
  try {
    // Handle GET requests that don't have a body
    if (!req.body) {
      return next();
    }
    
    const { emergencyAccess, justification } = req.body;

    if (!emergencyAccess) {
      return next();
    }

    if (!justification || justification.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Emergency access requires detailed justification (minimum 20 characters)'
      });
    }

    // Log break glass access
    req.breakGlass = {
      justification: justification,
      timestamp: new Date()
    };

    // Find the patient to get MongoDB _id if patientId is provided
    const Patient = require('../models/Patient');
    const searchId = req.params.id || req.params.patientId;
    let patientMongoId = null;
    let patientIdString = null;
    
    // Check if it's a MongoDB ObjectId or patientId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(searchId);
    
    if (isValidObjectId) {
      patientMongoId = searchId;
    } else {
      // Find patient by patientId to get MongoDB _id
      const patient = await Patient.findOne({ patientId: searchId });
      if (patient) {
        patientMongoId = patient._id;
        patientIdString = patient.patientId;
      }
    }

    // Create immediate audit log for break glass
    await AuditLog.createLog({
      user: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'BREAK_GLASS_ACCESS',
      resourceType: 'Patient',
      resourceId: patientMongoId,
      patient: patientMongoId,
      patientId: patientIdString || searchId,
      timestamp: new Date(),
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      accessMethod: 'emergency',
      status: 'SUCCESS',
      breakGlass: {
        isBreakGlass: true,
        justification: justification
      },
      details: {
        requestedPath: req.originalUrl,
        searchId: searchId
      },
      hospitalId: req.user.attributes?.hospitalId,
      department: req.user.attributes?.department
    });

    next();
  } catch (error) {
    console.error('Break glass middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing emergency access',
      error: error.message
    });
  }
};

/**
 * Middleware to capture resource state before update
 */
exports.captureBeforeState = (Model) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id || req.params.recordId;
      
      if (resourceId) {
        const resource = await Model.findById(resourceId).lean();
        req.resourceBeforeUpdate = resource;
      }
      
      next();
    } catch (error) {
      next();
    }
  };
};
