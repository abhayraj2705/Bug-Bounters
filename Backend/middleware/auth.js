const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { verifyToken } = require('../utils/jwt');

/**
 * Protect routes - Verify JWT token
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = verifyToken(token);

      // Get user from token
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User no longer exists'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      // Check if user changed password after token was issued
      if (user.changedPasswordAfter(decoded.iat)) {
        return res.status(401).json({
          success: false,
          message: 'Password recently changed. Please log in again'
        });
      }

      // Grant access to protected route
      req.user = {
        id: user._id,
        email: user.email,
        role: user.role,
        attributes: user.attributes,
        assignedPatients: user.assignedPatients
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in authentication',
      error: error.message
    });
  }
};

/**
 * Role-Based Access Control (RBAC)
 * Grant access to specific roles
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!roles.includes(req.user.role)) {
      // Log unauthorized access attempt
      AuditLog.createLog({
        user: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'ACCESS_DENIED',
        resourceType: 'System',
        timestamp: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: 'DENIED',
        details: {
          denialReason: `Role ${req.user.role} not authorized. Required: ${roles.join(', ')}`,
          requestedPath: req.originalUrl
        }
      });

      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }

    next();
  };
};

/**
 * Attribute-Based Access Control (ABAC)
 * Check specific attributes for fine-grained access
 */
exports.checkAttribute = (attributeChecks) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized'
        });
      }

      // Get full user with attributes
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check each attribute
      for (const [attribute, expectedValue] of Object.entries(attributeChecks)) {
        const actualValue = user.attributes[attribute];

        // If expectedValue is an array, check if actualValue is in it
        if (Array.isArray(expectedValue)) {
          if (!expectedValue.includes(actualValue)) {
            await AuditLog.createLog({
              user: user._id,
              userEmail: user.email,
              userRole: user.role,
              action: 'ACCESS_DENIED',
              resourceType: 'System',
              timestamp: new Date(),
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.headers['user-agent'],
              status: 'DENIED',
              details: {
                denialReason: `Attribute ${attribute} mismatch. Expected: ${expectedValue.join(' or ')}, Got: ${actualValue}`,
                requestedPath: req.originalUrl
              }
            });

            return res.status(403).json({
              success: false,
              message: `Insufficient attributes to access this resource`
            });
          }
        } else if (actualValue !== expectedValue) {
          // Direct comparison
          await AuditLog.createLog({
            user: user._id,
            userEmail: user.email,
            userRole: user.role,
            action: 'ACCESS_DENIED',
            resourceType: 'System',
            timestamp: new Date(),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            status: 'DENIED',
            details: {
              denialReason: `Attribute ${attribute} mismatch. Expected: ${expectedValue}, Got: ${actualValue}`,
              requestedPath: req.originalUrl
            }
          });

          return res.status(403).json({
            success: false,
            message: `Insufficient attributes to access this resource`
          });
        }
      }

      next();
    } catch (error) {
      console.error('Attribute check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking attributes',
        error: error.message
      });
    }
  };
};

/**
 * Check if user has access to specific patient
 * For doctors/nurses assigned to specific patients
 */
exports.checkPatientAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { patientId } = req.params;

    // Admin has access to all patients
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if patient is in user's assigned patients
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const hasAccess = user.assignedPatients.some(
      (assignedPatientId) => assignedPatientId.toString() === patientId
    );

    if (!hasAccess) {
      await AuditLog.createLog({
        user: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'ACCESS_DENIED',
        resourceType: 'Patient',
        resourceId: patientId,
        timestamp: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: 'DENIED',
        details: {
          denialReason: 'User not assigned to this patient',
          requestedPath: req.originalUrl
        }
      });

      return res.status(403).json({
        success: false,
        message: 'You do not have access to this patient'
      });
    }

    next();
  } catch (error) {
    console.error('Patient access check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking patient access',
      error: error.message
    });
  }
};

/**
 * Check patient consent for data access
 */
exports.checkPatientConsent = (consentType) => {
  return async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const Patient = require('../models/Patient');

      const patient = await Patient.findById(patientId);

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }

      // Check if patient has given consent
      if (!patient.consent[consentType]) {
        await AuditLog.createLog({
          user: req.user.id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: 'ACCESS_DENIED',
          resourceType: 'Patient',
          resourceId: patientId,
          patient: patientId,
          timestamp: new Date(),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          status: 'DENIED',
          details: {
            denialReason: `Patient has not consented to ${consentType}`,
            requestedPath: req.originalUrl
          }
        });

        return res.status(403).json({
          success: false,
          message: `Patient has not provided consent for ${consentType}`
        });
      }

      next();
    } catch (error) {
      console.error('Consent check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking patient consent',
        error: error.message
      });
    }
  };
};

/**
 * Check if user's access level is sufficient
 */
exports.requireAccessLevel = (minLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!req.user.attributes || req.user.attributes.accessLevel < minLevel) {
      AuditLog.createLog({
        user: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'ACCESS_DENIED',
        resourceType: 'System',
        timestamp: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: 'DENIED',
        details: {
          denialReason: `Insufficient access level. Required: ${minLevel}, Got: ${req.user.attributes?.accessLevel || 0}`,
          requestedPath: req.originalUrl
        }
      });

      return res.status(403).json({
        success: false,
        message: 'Insufficient access level'
      });
    }

    next();
  };
};
