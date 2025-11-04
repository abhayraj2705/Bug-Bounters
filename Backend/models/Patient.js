const mongoose = require('mongoose');
const encryptionService = require('../config/encryption');

const patientSchema = new mongoose.Schema({
  // Basic Information (Encrypted PHI)
  patientId: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
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
  lastName: {
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
  dateOfBirth: {
    type: String, // Encrypted
    required: true,
    set: (value) => encryptionService.encrypt(value.toString()),
    get: (value) => {
      try {
        return encryptionService.decrypt(value);
      } catch {
        return value;
      }
    }
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    required: true
  },
  
  // Contact Information (Encrypted)
  email: {
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
  phone: {
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
  address: {
    street: {
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
    city: String,
    state: String,
    zipCode: {
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
  
  // Medical Information
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']
  },
  allergies: [{
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
  
  // Hospital and Assignment
  hospitalId: {
    type: String,
    required: true
  },
  assignedDoctors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  assignedNurses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Consent flags (ABAC attributes)
  consent: {
    dataSharing: {
      type: Boolean,
      default: false
    },
    research: {
      type: Boolean,
      default: false
    },
    emergencyAccess: {
      type: Boolean,
      default: true
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Create searchable hash for compliance (without revealing actual data)
patientSchema.methods.getSearchHash = function() {
  return encryptionService.hash(this.firstName + this.lastName + this.dateOfBirth);
};

module.exports = mongoose.model('Patient', patientSchema);
