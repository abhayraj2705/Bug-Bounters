const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  hospitalId: {
    type: String,
    required: [true, 'Hospital ID is required'],
    unique: true,
    uppercase: true,
    match: /^HOSP\d{3}$/
  },
  name: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true
  },
  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      default: 'India'
    }
  },
  contactInfo: {
    email: {
      type: String,
      required: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      required: true
    },
    website: {
      type: String
    }
  },
  administrator: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String
    }
  },
  connectionStatus: {
    type: String,
    enum: ['active', 'pending', 'disconnected', 'suspended'],
    default: 'pending'
  },
  networkConfig: {
    apiEndpoint: {
      type: String
    },
    apiKey: {
      type: String,
      select: false // Don't include in queries by default
    },
    encryptionEnabled: {
      type: Boolean,
      default: true
    },
    tlsVersion: {
      type: String,
      default: 'TLS 1.3'
    }
  },
  statistics: {
    totalUsers: {
      type: Number,
      default: 0
    },
    totalPatients: {
      type: Number,
      default: 0
    },
    totalEHRs: {
      type: Number,
      default: 0
    }
  },
  lastSyncAt: {
    type: Date,
    default: Date.now
  },
  connectedAt: {
    type: Date
  },
  capabilities: {
    dataSharing: {
      type: Boolean,
      default: true
    },
    patientTransfer: {
      type: Boolean,
      default: true
    },
    ehrSync: {
      type: Boolean,
      default: true
    },
    auditSharing: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: {
      type: String,
      enum: ['primary', 'secondary', 'specialty', 'clinic'],
      default: 'primary'
    },
    bedCapacity: {
      type: Number
    },
    specializations: [{
      type: String
    }],
    certifications: [{
      type: String
    }]
  }
}, {
  timestamps: true
});

// Index for faster queries (hospitalId already has unique index from schema)
hospitalSchema.index({ connectionStatus: 1 });
hospitalSchema.index({ 'address.city': 1 });

// Method to update last sync time
hospitalSchema.methods.updateLastSync = async function() {
  this.lastSyncAt = new Date();
  return await this.save();
};

// Method to update statistics
hospitalSchema.methods.updateStatistics = async function(stats) {
  if (stats.totalUsers !== undefined) this.statistics.totalUsers = stats.totalUsers;
  if (stats.totalPatients !== undefined) this.statistics.totalPatients = stats.totalPatients;
  if (stats.totalEHRs !== undefined) this.statistics.totalEHRs = stats.totalEHRs;
  return await this.save();
};

module.exports = mongoose.model('Hospital', hospitalSchema);
