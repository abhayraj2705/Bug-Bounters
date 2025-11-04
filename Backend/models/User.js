const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false // Don't include password in queries by default
  },
  firstName: {
    type: String,
    required: false,
    trim: true
  },
  lastName: {
    type: String,
    required: false,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'doctor', 'nurse', 'staff'],
    default: 'staff',
    required: true
  },
  // ABAC Attributes
  attributes: {
    department: {
      type: String,
      enum: ['cardiology', 'neurology', 'pediatrics', 'emergency', 'general', 'surgery', 'oncology', 'icu', 'administration', 'reception'],
      required: false
    },
    hospitalId: {
      type: String,
      required: false,
      default: 'HOS-001'
    },
    licenseNumber: {
      type: String,
      required: false
    },
    specialization: {
      type: String,
      required: false
    },
    accessLevel: {
      type: Number,
      default: 1,
      min: 1,
      max: 5
    }
  },
  // MFA Configuration
  mfa: {
    enabled: {
      type: Boolean,
      default: false
    },
    secret: {
      type: String,
      select: false
    },
    backupCodes: {
      type: [String],
      select: false
    }
  },
  // Patient assignments (for doctors/nurses)
  assignedPatients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  passwordChangedAt: {
    type: Date
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Increment failed login attempts
userSchema.methods.incrementLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.accountLockedUntil && this.accountLockedUntil < Date.now()) {
    return await this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { accountLockedUntil: 1 }
    });
  }
  
  const updates = { $inc: { failedLoginAttempts: 1 } };
  
  // Lock the account after 5 failed attempts for 2 hours
  if (this.failedLoginAttempts + 1 >= 5 && !this.accountLockedUntil) {
    updates.$set = { accountLockedUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return await this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
  return await this.updateOne({
    $set: { failedLoginAttempts: 0 },
    $unset: { accountLockedUntil: 1 }
  });
};

module.exports = mongoose.model('User', userSchema);
