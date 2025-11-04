const mongoose = require('mongoose');
const encryptionService = require('../config/encryption');

const ehrSchema = new mongoose.Schema({
  recordId: {
    type: String,
    required: true,
    unique: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  
  // Visit Information
  visitDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  visitType: {
    type: String,
    enum: ['emergency', 'outpatient', 'inpatient', 'follow-up', 'consultation'],
    required: true
  },
  department: {
    type: String,
    required: true
  },
  
  // Medical Data (Encrypted PHI)
  chiefComplaint: {
    type: String,
    required: true,
    set: (value) => encryptionService.encrypt(value),
    get: (value) => {
      try {
        return encryptionService.decrypt(value);
      } catch {
        return value;
      }
    }
  },
  diagnosis: {
    primary: {
      type: String,
      set: (value) => value ? encryptionService.encrypt(value) : value,
      get: (value) => {
        try {
          return value ? encryptionService.decrypt(value) : value;
        } catch {
          return value;
        }
      }
    },
    secondary: [{
      type: String,
      set: (value) => encryptionService.encrypt(value),
      get: (value) => {
        try {
          return encryptionService.decrypt(value);
        } catch {
          return value;
        }
      }
    }],
    icd10Codes: [String]
  },
  
  // Vital Signs
  vitals: {
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    heartRate: Number,
    temperature: Number,
    respiratoryRate: Number,
    oxygenSaturation: Number,
    weight: Number,
    height: Number
  },
  
  // Clinical Notes (Encrypted)
  clinicalNotes: {
    subjective: {
      type: String,
      set: (value) => value ? encryptionService.encrypt(value) : value,
      get: (value) => {
        try {
          return value ? encryptionService.decrypt(value) : value;
        } catch {
          return value;
        }
      }
    },
    objective: {
      type: String,
      set: (value) => value ? encryptionService.encrypt(value) : value,
      get: (value) => {
        try {
          return value ? encryptionService.decrypt(value) : value;
        } catch {
          return value;
        }
      }
    },
    assessment: {
      type: String,
      set: (value) => value ? encryptionService.encrypt(value) : value,
      get: (value) => {
        try {
          return value ? encryptionService.decrypt(value) : value;
        } catch {
          return value;
        }
      }
    },
    plan: {
      type: String,
      set: (value) => value ? encryptionService.encrypt(value) : value,
      get: (value) => {
        try {
          return value ? encryptionService.decrypt(value) : value;
        } catch {
          return value;
        }
      }
    }
  },
  
  // Medications (Encrypted)
  medications: [{
    name: {
      type: String,
      set: (value) => encryptionService.encrypt(value),
      get: (value) => {
        try {
          return encryptionService.decrypt(value);
        } catch {
          return value;
        }
      }
    },
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date,
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Lab Results (Encrypted)
  labResults: [{
    testName: String,
    result: {
      type: String,
      set: (value) => encryptionService.encrypt(value),
      get: (value) => {
        try {
          return encryptionService.decrypt(value);
        } catch {
          return value;
        }
      }
    },
    unit: String,
    referenceRange: String,
    date: Date,
    orderedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Treatment Plan
  treatmentPlan: {
    type: String,
    set: (value) => value ? encryptionService.encrypt(value) : value,
    get: (value) => {
      try {
        return value ? encryptionService.decrypt(value) : value;
      } catch {
        return value;
      }
    }
  },
  
  // Provider Information
  attendingPhysician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  consultingPhysicians: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  nurseInCharge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Status and Metadata
  status: {
    type: String,
    enum: ['draft', 'final', 'amended', 'archived'],
    default: 'draft'
  },
  hospitalId: {
    type: String,
    required: true
  },
  
  // Version control for amendments
  version: {
    type: Number,
    default: 1
  },
  amendmentHistory: [{
    version: Number,
    amendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amendedAt: Date,
    reason: String,
    changes: String
  }],
  
  // Digital Signature
  signedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  signedAt: Date
  
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Indexes for performance
ehrSchema.index({ patient: 1, visitDate: -1 });
ehrSchema.index({ attendingPhysician: 1 });
ehrSchema.index({ hospitalId: 1 });
// recordId already has unique index from schema definition

// Method to create amendment
ehrSchema.methods.createAmendment = async function(userId, reason, changes) {
  this.version += 1;
  this.amendmentHistory.push({
    version: this.version,
    amendedBy: userId,
    amendedAt: new Date(),
    reason: reason,
    changes: changes
  });
  return await this.save();
};

module.exports = mongoose.model('EHR', ehrSchema);
