const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt');
const { generateMFASecret, generateQRCode, verifyMFAToken, generateBackupCodes } = require('../utils/mfa');
const { getClientIp } = require('../utils/ipHelper');
const bcrypt = require('bcryptjs');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public (Admin only in production)
 */
exports.register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      role,
      attributes
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      role,
      attributes
    });

    // Create audit log
    await AuditLog.createLog({
      user: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE_USER',
      resourceType: 'User',
      resourceId: user._id,
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      hospitalId: user.attributes.hospitalId,
      department: user.attributes.department
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password +mfa.secret');

    if (!user) {
      // Log failed attempt
      await AuditLog.createLog({
        userEmail: email,
        userRole: 'unknown',
        action: 'LOGIN_FAILED',
        resourceType: 'System',
        timestamp: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: 'FAILURE',
        details: {
          errorMessage: 'User not found'
        }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > Date.now()) {
      const lockTimeRemaining = Math.ceil((user.accountLockedUntil - Date.now()) / 60000);
      
      await AuditLog.createLog({
        user: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'LOGIN_FAILED',
        resourceType: 'System',
        timestamp: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: 'DENIED',
        details: {
          denialReason: 'Account locked due to multiple failed attempts'
        }
      });

      return res.status(423).json({
        success: false,
        message: `Account is locked. Please try again in ${lockTimeRemaining} minutes`
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment failed login attempts
      await user.incrementLoginAttempts();
      
      await AuditLog.createLog({
        user: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'LOGIN_FAILED',
        resourceType: 'System',
        timestamp: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: 'FAILURE',
        details: {
          errorMessage: 'Invalid password'
        }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset failed login attempts on successful password verification
    await user.resetLoginAttempts();

    // Check if MFA is enabled
    if (user.mfa.enabled) {
      console.log('[login] MFA is enabled for user:', user.email);
      console.log('[login] MFA has secret:', !!user.mfa.secret);
      console.log('[login] MFA secret length:', user.mfa.secret?.length);
      
      // Check if MFA secret exists
      if (!user.mfa.secret) {
        console.log('[login] ERROR: MFA enabled but no secret found! Disabling MFA for user.');
        // Auto-disable MFA if secret is missing (data integrity issue)
        user.mfa.enabled = false;
        await user.save();
        
        // Continue with normal login
        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id);
        
        user.lastLogin = new Date();
        await user.save();
        
        await AuditLog.createLog({
          user: user._id,
          userEmail: user.email,
          userRole: user.role,
          action: 'LOGIN',
          resourceType: 'System',
          timestamp: new Date(),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          status: 'SUCCESS',
          hospitalId: user.attributes.hospitalId,
          department: user.attributes.department,
          details: {
            warning: 'MFA was enabled but secret was missing - auto-disabled'
          }
        });
        
        return res.status(200).json({
          success: true,
          tokens: {
            accessToken,
            refreshToken
          },
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            attributes: user.attributes || {},
            patientId: user.patientId || null,
            mfaEnabled: false
          }
        });
      }
      
      // Generate temporary token for MFA verification
      const mfaToken = generateAccessToken(user._id, user.role);
      
      return res.status(200).json({
        success: true,
        requiresMFA: true,
        mfaToken,
        message: 'Please provide MFA code'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create audit log
    await AuditLog.createLog({
      user: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'LOGIN',
      resourceType: 'System',
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      hospitalId: user.attributes?.hospitalId || null,
      department: user.attributes?.department || null
    });

    res.status(200).json({
      success: true,
      tokens: {
        accessToken,
        refreshToken
      },
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        attributes: user.attributes || {},
        patientId: user.patientId || null,
        mfaEnabled: user.mfa.enabled
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

/**
 * @desc    Verify MFA code and complete login
 * @route   POST /api/auth/verify-mfa
 * @access  Private (requires mfaToken)
 */
exports.verifyMFA = async (req, res) => {
  try {
    const { mfaToken, code } = req.body;

    console.log('[verifyMFA] Received code:', code);
    console.log('[verifyMFA] Code type:', typeof code);
    console.log('[verifyMFA] Code length:', code?.length);

    if (!mfaToken || !code) {
      return res.status(400).json({
        success: false,
        message: 'MFA token and code are required'
      });
    }

    // Verify MFA token
    const decoded = verifyToken(mfaToken);
    console.log('[verifyMFA] Decoded user ID:', decoded.id);
    
    // Find user with MFA secret
    const user = await User.findById(decoded.id).select('+mfa.secret +mfa.backupCodes');

    if (!user || !user.mfa.enabled) {
      console.log('[verifyMFA] User not found or MFA not enabled');
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    console.log('[verifyMFA] User found:', user.email);
    console.log('[verifyMFA] MFA enabled:', user.mfa.enabled);
    console.log('[verifyMFA] Has MFA secret:', !!user.mfa.secret);

    // Verify the MFA code
    const isValid = verifyMFAToken(user.mfa.secret, code);
    console.log('[verifyMFA] Code validation result:', isValid);
    
    // Check if it's a backup code
    let isBackupCode = false;
    if (!isValid && user.mfa.backupCodes) {
      const hashedCode = await bcrypt.hash(code, 10);
      const backupCodeIndex = user.mfa.backupCodes.findIndex(
        async (bc) => await bcrypt.compare(code, bc)
      );
      
      if (backupCodeIndex !== -1) {
        isBackupCode = true;
        // Remove used backup code
        user.mfa.backupCodes.splice(backupCodeIndex, 1);
        await user.save();
      }
    }

    if (!isValid && !isBackupCode) {
      await AuditLog.createLog({
        user: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'LOGIN_FAILED',
        resourceType: 'System',
        timestamp: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: 'FAILURE',
        details: {
          errorMessage: 'Invalid MFA code'
        }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid MFA code'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create audit log
    await AuditLog.createLog({
      user: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'LOGIN',
      resourceType: 'System',
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      hospitalId: user.attributes?.hospitalId || null,
      department: user.attributes?.department || null,
      details: {
        mfaVerified: true,
        usedBackupCode: isBackupCode
      }
    });

    res.status(200).json({
      success: true,
      tokens: {
        accessToken,
        refreshToken
      },
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        attributes: user.attributes || {},
        patientId: user.patientId || null
      }
    });
  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying MFA',
      error: error.message
    });
  }
};

/**
 * @desc    Setup MFA for user
 * @route   POST /api/auth/setup-mfa
 * @access  Private
 */
exports.setupMFA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+mfa.secret +mfa.backupCodes');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.mfa?.enabled) {
      return res.status(400).json({
        success: false,
        message: 'MFA is already enabled'
      });
    }

    // Generate MFA secret
    const { secret, otpauthUrl } = await generateMFASecret(user.username);
    
    // Generate QR code
    const qrCode = await generateQRCode(otpauthUrl);

    // Generate backup codes
    const backupCodes = generateBackupCodes();
    
    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    // Use findByIdAndUpdate to avoid version conflicts
    await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          'mfa.secret': secret,
          'mfa.backupCodes': hashedBackupCodes
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'MFA setup initiated',
      data: {
        qrCode,
        secret,
        backupCodes // Send plain codes to user once
      }
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up MFA',
      error: error.message
    });
  }
};

/**
 * @desc    Enable MFA after setup
 * @route   POST /api/auth/enable-mfa
 * @access  Private
 */
exports.enableMFA = async (req, res) => {
  try {
    const { code } = req.body;

    const user = await User.findById(req.user.id).select('+mfa.secret');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.mfa.secret) {
      return res.status(400).json({
        success: false,
        message: 'Please setup MFA first'
      });
    }

    // Verify the code
    const isValid = verifyMFAToken(user.mfa.secret, code);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Enable MFA using findByIdAndUpdate to avoid version conflicts
    await User.findByIdAndUpdate(
      req.user.id,
      { $set: { 'mfa.enabled': true } },
      { new: true }
    );

    // Create audit log
    await AuditLog.createLog({
      user: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'MFA_ENABLED',
      resourceType: 'User',
      resourceId: user._id,
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    res.status(200).json({
      success: true,
      message: 'MFA enabled successfully'
    });
  } catch (error) {
    console.error('Enable MFA error:', error);
    res.status(500).json({
      success: false,
      message: 'Error enabling MFA',
      error: error.message
    });
  }
};

/**
 * @desc    Disable MFA
 * @route   POST /api/auth/disable-mfa
 * @access  Private
 */
exports.disableMFA = async (req, res) => {
  try {
    const { password, code } = req.body;

    const user = await User.findById(req.user.id).select('+password +mfa.secret');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Verify MFA code
    if (user.mfa.enabled) {
      const isValid = verifyMFAToken(user.mfa.secret, code);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid MFA code'
        });
      }
    }

    // Disable MFA using findByIdAndUpdate to avoid version conflicts
    await User.findByIdAndUpdate(
      req.user.id,
      { 
        $set: { 'mfa.enabled': false },
        $unset: { 'mfa.secret': '', 'mfa.backupCodes': '' }
      },
      { new: true }
    );

    // Create audit log
    await AuditLog.createLog({
      user: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'MFA_DISABLED',
      resourceType: 'User',
      resourceId: user._id,
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    res.status(200).json({
      success: true,
      message: 'MFA disabled successfully'
    });
  } catch (error) {
    console.error('Disable MFA error:', error);
    res.status(500).json({
      success: false,
      message: 'Error disabling MFA',
      error: error.message
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  try {
    // Create audit log
    await AuditLog.createLog({
      user: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'LOGOUT',
      resourceType: 'System',
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message
    });
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    let user;
    
    // Populate assignedPatients only for doctors and nurses
    if (req.user.role === 'doctor' || req.user.role === 'nurse') {
      user = await User.findById(req.user.id)
        .populate('assignedPatients', 'patientId firstName lastName');
    } else {
      user = await User.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        attributes: user.attributes || {},
        patientId: user.patientId || null,
        mfaEnabled: user.mfa?.enabled || false,
        assignedPatients: user.assignedPatients || []
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message
    });
  }
};
