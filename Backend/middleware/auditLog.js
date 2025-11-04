const AuditLog = require('../models/AuditLog');

/**
 * Middleware to log all EHR and Patient access
 */
exports.logAccess = (action, resourceType) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send function to capture response
    res.send = function (data) {
      // Determine status
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'SUCCESS' : 
                     res.statusCode >= 400 && res.statusCode < 500 ? 'DENIED' : 'FAILURE';

      // Create audit log
      const logData = {
        user: req.user?.id,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        action: action,
        resourceType: resourceType,
        resourceId: req.params.id || req.params.patientId || req.params.recordId,
        patient: req.params.patientId,
        timestamp: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
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

    // Create immediate audit log for break glass
    await AuditLog.createLog({
      user: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'BREAK_GLASS_ACCESS',
      resourceType: 'System',
      resourceId: req.params.id || req.params.patientId,
      patient: req.params.patientId,
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      accessMethod: 'emergency',
      status: 'SUCCESS',
      breakGlass: {
        isBreakGlass: true,
        justification: justification
      },
      details: {
        requestedPath: req.originalUrl
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
