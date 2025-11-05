const Patient = require('../models/Patient');
const User = require('../models/User');
const crypto = require('crypto');

/**
 * @desc    Create new patient
 * @route   POST /api/patients
 * @access  Private (Admin, Doctor, Nurse)
 */
exports.createPatient = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      bloodType,
      allergies,
      consent,
      createPortalAccount = true // New option to create patient portal account
    } = req.body;

    // Generate unique patient ID
    const patientId = `P-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Create patient
    const patient = await Patient.create({
      patientId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      bloodType,
      allergies,
      hospitalId: req.user.attributes.hospitalId,
      assignedDoctors: [req.user.id],
      consent
    });

    // Add patient to user's assigned patients
    await User.findByIdAndUpdate(req.user.id, {
      $push: { assignedPatients: patient._id }
    });

    // Automatically create patient portal account if email is provided
    let portalAccount = null;
    let tempPassword = null;
    
    if (createPortalAccount && email) {
      try {
        // Generate a temporary password (patient should change this)
        tempPassword = `Patient@${Date.now().toString().slice(-6)}`;
        
        // Check if user with this email already exists
        const existingUser = await User.findOne({ email });
        
        if (!existingUser) {
          portalAccount = await User.create({
            email,
            password: tempPassword,
            firstName,
            lastName,
            role: 'patient',
            patientId: patient._id,
            attributes: {
              hospitalId: req.user.attributes.hospitalId
            }
          });

          console.log(`[Patient Portal] Account created for ${email} with temp password: ${tempPassword}`);
        } else {
          console.log(`[Patient Portal] User with email ${email} already exists`);
        }
      } catch (portalError) {
        console.error('[Patient Portal] Error creating portal account:', portalError);
        // Don't fail the whole request if portal account creation fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: patient,
      portalAccount: portalAccount ? {
        email: portalAccount.email,
        temporaryPassword: tempPassword,
        patientId: patient.patientId,
        message: 'Patient can login to the portal using these credentials. Please ask them to change their password immediately.'
      } : null
    });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating patient',
      error: error.message
    });
  }
};

/**
 * @desc    Get all patients
 * @route   GET /api/patients
 * @access  Private
 */
exports.getPatients = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, department } = req.query;

    let query = { isActive: true };

    // Filter by hospital
    if (req.user.role !== 'admin') {
      query.hospitalId = req.user.attributes.hospitalId;
    }

    // Filter by department
    if (department) {
      query['assignedDoctors.attributes.department'] = department;
    }

    // Only show assigned patients for doctors
    // Nurses see all patients in their hospital (for general care)
    if (req.user.role === 'doctor') {
      query._id = { $in: req.user.assignedPatients };
    }
    // Note: Nurses can see all patients in their hospital for vital signs and medication administration

    const patients = await Patient.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('assignedDoctors', 'firstName lastName attributes.specialization')
      .populate('assignedNurses', 'firstName lastName')
      .select('-__v')
      .exec();

    const count = await Patient.countDocuments(query);

    res.status(200).json({
      success: true,
      data: patients,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patients',
      error: error.message
    });
  }
};

/**
 * @desc    Get single patient
 * @route   GET /api/patients/:id
 * @access  Private
 */
exports.getPatient = async (req, res) => {
  try {
    let patient;
    const searchId = req.params.id;
    
    console.log('[getPatient] Searching for patient with ID:', searchId);
    
    // Check if it's a valid MongoDB ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(searchId);
    
    if (isValidObjectId) {
      // Valid MongoDB ObjectId format
      console.log('[getPatient] Using MongoDB _id search');
      patient = await Patient.findById(searchId)
        .populate('assignedDoctors', 'firstName lastName email attributes')
        .populate('assignedNurses', 'firstName lastName email');
    } else {
      // Try to find by patientId (P-xxx format) or other string identifier
      console.log('[getPatient] Using patientId search');
      patient = await Patient.findOne({ patientId: searchId })
        .populate('assignedDoctors', 'firstName lastName email attributes')
        .populate('assignedNurses', 'firstName lastName email');
    }

    if (!patient) {
      console.log('[getPatient] Patient not found');
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    console.log('[getPatient] Patient found:', patient.patientId);
    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('[getPatient] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient',
      error: error.message
    });
  }
};

/**
 * @desc    Update patient
 * @route   PUT /api/patients/:id
 * @access  Private
 */
exports.updatePatient = async (req, res) => {
  try {
    let patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Track changes
    const changes = [];
    const updateFields = Object.keys(req.body);
    
    updateFields.forEach(field => {
      if (JSON.stringify(patient[field]) !== JSON.stringify(req.body[field])) {
        changes.push(field);
      }
    });

    req.changes = changes;

    patient = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      data: patient
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating patient',
      error: error.message
    });
  }
};

/**
 * @desc    Assign doctor/nurse to patient
 * @route   POST /api/patients/:id/assign
 * @access  Private (Admin, Doctor)
 */
exports.assignProvider = async (req, res) => {
  try {
    const { providerId, providerType } = req.body; // providerType: 'doctor' or 'nurse'

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const provider = await User.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    // Add to patient's assigned providers
    if (providerType === 'doctor') {
      if (!patient.assignedDoctors.includes(providerId)) {
        patient.assignedDoctors.push(providerId);
      }
    } else if (providerType === 'nurse') {
      if (!patient.assignedNurses.includes(providerId)) {
        patient.assignedNurses.push(providerId);
      }
    }

    await patient.save();

    // Add to provider's assigned patients
    if (!provider.assignedPatients.includes(patient._id)) {
      provider.assignedPatients.push(patient._id);
      await provider.save();
    }

    res.status(200).json({
      success: true,
      message: `${providerType} assigned successfully`,
      data: patient
    });
  } catch (error) {
    console.error('Assign provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning provider',
      error: error.message
    });
  }
};

/**
 * @desc    Update patient consent
 * @route   PUT /api/patients/:id/consent
 * @access  Private (Admin, assigned providers)
 */
exports.updateConsent = async (req, res) => {
  try {
    const { consent } = req.body;

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    patient.consent = { ...patient.consent, ...consent };
    await patient.save();

    res.status(200).json({
      success: true,
      message: 'Patient consent updated successfully',
      data: patient
    });
  } catch (error) {
    console.error('Update consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating consent',
      error: error.message
    });
  }
};

/**
 * @desc    Deactivate patient (soft delete)
 * @route   DELETE /api/patients/:id
 * @access  Private (Admin only)
 */
exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    patient.isActive = false;
    await patient.save();

    res.status(200).json({
      success: true,
      message: 'Patient deactivated successfully'
    });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting patient',
      error: error.message
    });
  }
};

/**
 * @desc    Create patient portal account
 * @route   POST /api/patients/:id/create-portal-account
 * @access  Private (Admin, Doctor)
 */
exports.createPortalAccount = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    if (!patient.email) {
      return res.status(400).json({
        success: false,
        message: 'Patient must have an email address to create portal account'
      });
    }

    // Check if portal account already exists
    const existingUser = await User.findOne({ patientId: patient._id });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Portal account already exists for this patient',
        data: {
          email: existingUser.email,
          userId: existingUser._id
        }
      });
    }

    // Generate temporary password
    const tempPassword = `Patient@${Date.now().toString().slice(-6)}`;

    // Create user account
    const portalAccount = await User.create({
      email: patient.email,
      password: tempPassword,
      firstName: patient.firstName,
      lastName: patient.lastName,
      role: 'patient',
      patientId: patient._id,
      attributes: {
        hospitalId: patient.hospitalId
      }
    });

    res.status(201).json({
      success: true,
      message: 'Patient portal account created successfully',
      data: {
        email: portalAccount.email,
        temporaryPassword: tempPassword,
        patientId: patient.patientId,
        instructions: 'Please provide these credentials to the patient and ask them to change their password immediately after first login.'
      }
    });
  } catch (error) {
    console.error('Create portal account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating portal account',
      error: error.message
    });
  }
};

/**
 * @desc    Reset patient portal password
 * @route   POST /api/patients/:id/reset-portal-password
 * @access  Private (Admin only)
 */
exports.resetPortalPassword = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Find portal account
    const portalAccount = await User.findOne({ patientId: patient._id });
    
    if (!portalAccount) {
      return res.status(404).json({
        success: false,
        message: 'No portal account found for this patient. Please create one first.'
      });
    }

    // Generate new temporary password
    const tempPassword = `Patient@${Date.now().toString().slice(-6)}`;

    // Update password
    portalAccount.password = tempPassword;
    await portalAccount.save();

    res.status(200).json({
      success: true,
      message: 'Patient portal password reset successfully',
      data: {
        email: portalAccount.email,
        temporaryPassword: tempPassword,
        patientId: patient.patientId,
        instructions: 'Please provide this new password to the patient.'
      }
    });
  } catch (error) {
    console.error('Reset portal password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting portal password',
      error: error.message
    });
  }
};
