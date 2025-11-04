const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Who accessed/modified
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true
  },
  
  // What action was performed
  action: {
    type: String,
    enum: [
      'LOGIN',
      'LOGOUT',
      'LOGIN_FAILED',
      'VIEW_EHR',
      'CREATE_EHR',
      'UPDATE_EHR',
      'DELETE_EHR',
      'VIEW_PATIENT',
      'CREATE_PATIENT',
      'UPDATE_PATIENT',
      'DELETE_PATIENT',
      'CREATE_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'UNLOCK_USER',
      'BREAK_GLASS_ACCESS',
      'EXPORT_DATA',
      'PASSWORD_CHANGE',
      'MFA_ENABLED',
      'MFA_DISABLED',
      'ROLE_CHANGE',
      'ACCESS_DENIED'
    ],
    required: true
  },
  
  // What resource was accessed
  resourceType: {
    type: String,
    enum: ['EHR', 'Patient', 'User', 'System', 'Report'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  
  // Patient context (if applicable)
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  patientId: String,
  
  // When it happened
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    immutable: true // Cannot be changed once set
  },
  
  // Where it happened
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  location: {
    country: String,
    region: String,
    city: String
  },
  
  // How it was accessed
  accessMethod: {
    type: String,
    enum: ['web', 'api', 'mobile', 'emergency'],
    default: 'web'
  },
  
  // Break glass specific
  breakGlass: {
    isBreakGlass: {
      type: Boolean,
      default: false
    },
    justification: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Result of the action
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'PARTIAL', 'DENIED'],
    required: true
  },
  
  // Additional details
  details: {
    beforeState: mongoose.Schema.Types.Mixed,
    afterState: mongoose.Schema.Types.Mixed,
    changes: [String],
    errorMessage: String,
    denialReason: String
  },
  
  // Session information
  sessionId: String,
  
  // Compliance flags
  hipaaCompliant: {
    type: Boolean,
    default: true
  },
  
  // Hospital context
  hospitalId: String,
  department: String
  
}, {
  timestamps: false, // We use custom timestamp field
  collection: 'audit_logs'
});

// Indexes for efficient querying and compliance reporting
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ patient: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ 'breakGlass.isBreakGlass': 1 });
auditLogSchema.index({ status: 1 });
auditLogSchema.index({ hospitalId: 1, timestamp: -1 });

// Make all fields immutable after creation
auditLogSchema.pre('save', function(next) {
  if (!this.isNew) {
    throw new Error('Audit logs cannot be modified after creation');
  }
  next();
});

// Prevent updates
auditLogSchema.pre('findOneAndUpdate', function(next) {
  next(new Error('Audit logs cannot be modified'));
});

auditLogSchema.pre('updateOne', function(next) {
  next(new Error('Audit logs cannot be modified'));
});

auditLogSchema.pre('updateMany', function(next) {
  next(new Error('Audit logs cannot be modified'));
});

// Static method to create audit log
auditLogSchema.statics.createLog = async function(logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to prevent audit log failures from breaking main operations
    return null;
  }
};

// Static method to query logs with filters
auditLogSchema.statics.queryLogs = async function(filters, options = {}) {
  const {
    page = 1,
    limit = 50,
    sortBy = 'timestamp',
    sortOrder = 'desc'
  } = options;
  
  const query = this.find(filters)
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .populate('user', 'firstName lastName email role')
    .populate('patient', 'patientId');
  
  const logs = await query;
  const total = await this.countDocuments(filters);
  
  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
