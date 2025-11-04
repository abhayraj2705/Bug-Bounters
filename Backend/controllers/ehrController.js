const EHR = require('../models/EHR');
const Patient = require('../models/Patient');
const User = require('../models/User');
const crypto = require('crypto');

/**
 * @desc    Create new EHR record
 * @route   POST /api/ehr
 * @access  Private (Doctor, Nurse)
 */
exports.createEHR = async (req, res) => {
  try {
    const {
      patient,
      visitType,
      department,
      chiefComplaint,
      diagnosis,
      vitals,
      clinicalNotes,
      medications,
      labResults,
      treatmentPlan,
      consultingPhysicians,
      nurseInCharge
    } = req.body;

    // Verify patient exists
    const patientRecord = await Patient.findById(patient);
    if (!patientRecord) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Generate unique record ID
    const recordId = `EHR-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Create EHR record
    const ehr = await EHR.create({
      recordId,
      patient,
      visitDate: new Date(),
      visitType,
      department,
      chiefComplaint,
      diagnosis,
      vitals,
      clinicalNotes,
      medications,
      labResults,
      treatmentPlan,
      attendingPhysician: req.user.id,
      consultingPhysicians,
      nurseInCharge,
      hospitalId: req.user.attributes.hospitalId,
      status: 'draft'
    });

    res.status(201).json({
      success: true,
      message: 'EHR record created successfully',
      data: ehr
    });
  } catch (error) {
    console.error('Create EHR error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating EHR record',
      error: error.message
    });
  }
};

/**
 * @desc    Get EHR records for a patient
 * @route   GET /api/ehr/patient/:patientId
 * @access  Private
 */
exports.getPatientEHRs = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 10, sortBy = 'visitDate', order = 'desc' } = req.query;

    const ehrs = await EHR.find({ patient: patientId })
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('attendingPhysician', 'firstName lastName role attributes.specialization')
      .populate('consultingPhysicians', 'firstName lastName attributes.specialization')
      .populate('nurseInCharge', 'firstName lastName')
      .exec();

    const count = await EHR.countDocuments({ patient: patientId });

    res.status(200).json({
      success: true,
      data: ehrs,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get patient EHRs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching EHR records',
      error: error.message
    });
  }
};

/**
 * @desc    Get single EHR record
 * @route   GET /api/ehr/:id
 * @access  Private
 */
exports.getEHR = async (req, res) => {
  try {
    const ehr = await EHR.findById(req.params.id)
      .populate('patient')
      .populate('attendingPhysician', 'firstName lastName email role attributes')
      .populate('consultingPhysicians', 'firstName lastName attributes.specialization')
      .populate('nurseInCharge', 'firstName lastName')
      .populate('amendmentHistory.amendedBy', 'firstName lastName');

    if (!ehr) {
      return res.status(404).json({
        success: false,
        message: 'EHR record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: ehr
    });
  } catch (error) {
    console.error('Get EHR error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching EHR record',
      error: error.message
    });
  }
};

/**
 * @desc    Update EHR record
 * @route   PUT /api/ehr/:id
 * @access  Private (Doctor, Nurse)
 */
exports.updateEHR = async (req, res) => {
  try {
    let ehr = await EHR.findById(req.params.id);

    if (!ehr) {
      return res.status(404).json({
        success: false,
        message: 'EHR record not found'
      });
    }

    // Track changes for audit
    const changes = [];
    const updateFields = Object.keys(req.body);
    
    updateFields.forEach(field => {
      if (JSON.stringify(ehr[field]) !== JSON.stringify(req.body[field])) {
        changes.push(field);
      }
    });

    req.changes = changes;

    // Update EHR
    ehr = await EHR.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'EHR record updated successfully',
      data: ehr
    });
  } catch (error) {
    console.error('Update EHR error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating EHR record',
      error: error.message
    });
  }
};

/**
 * @desc    Create amendment to EHR record
 * @route   POST /api/ehr/:id/amend
 * @access  Private (Doctor)
 */
exports.amendEHR = async (req, res) => {
  try {
    const { reason, changes } = req.body;

    if (!reason || !changes) {
      return res.status(400).json({
        success: false,
        message: 'Amendment reason and changes are required'
      });
    }

    const ehr = await EHR.findById(req.params.id);

    if (!ehr) {
      return res.status(404).json({
        success: false,
        message: 'EHR record not found'
      });
    }

    await ehr.createAmendment(req.user.id, reason, changes);

    res.status(200).json({
      success: true,
      message: 'EHR record amended successfully',
      data: ehr
    });
  } catch (error) {
    console.error('Amend EHR error:', error);
    res.status(500).json({
      success: false,
      message: 'Error amending EHR record',
      error: error.message
    });
  }
};

/**
 * @desc    Sign EHR record (finalize)
 * @route   POST /api/ehr/:id/sign
 * @access  Private (Doctor)
 */
exports.signEHR = async (req, res) => {
  try {
    const ehr = await EHR.findById(req.params.id);

    if (!ehr) {
      return res.status(404).json({
        success: false,
        message: 'EHR record not found'
      });
    }

    if (ehr.status === 'final') {
      return res.status(400).json({
        success: false,
        message: 'EHR record is already signed'
      });
    }

    ehr.signedBy = req.user.id;
    ehr.signedAt = new Date();
    ehr.status = 'final';
    await ehr.save();

    res.status(200).json({
      success: true,
      message: 'EHR record signed successfully',
      data: ehr
    });
  } catch (error) {
    console.error('Sign EHR error:', error);
    res.status(500).json({
      success: false,
      message: 'Error signing EHR record',
      error: error.message
    });
  }
};

/**
 * @desc    Get EHRs assigned to current user
 * @route   GET /api/ehr/my-patients
 * @access  Private (Doctor, Nurse)
 */
exports.getMyPatientEHRs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const user = await User.findById(req.user.id);
    
    if (!user.assignedPatients || user.assignedPatients.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, pages: 0 }
      });
    }

    const query = { patient: { $in: user.assignedPatients } };
    
    if (status) {
      query.status = status;
    }

    const ehrs = await EHR.find(query)
      .sort({ visitDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('patient', 'patientId firstName lastName dateOfBirth')
      .populate('attendingPhysician', 'firstName lastName')
      .exec();

    const count = await EHR.countDocuments(query);

    res.status(200).json({
      success: true,
      data: ehrs,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get my patient EHRs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching EHR records',
      error: error.message
    });
  }
};

/**
 * @desc    Delete EHR record (archive)
 * @route   DELETE /api/ehr/:id
 * @access  Private (Admin only)
 */
exports.deleteEHR = async (req, res) => {
  try {
    const ehr = await EHR.findById(req.params.id);

    if (!ehr) {
      return res.status(404).json({
        success: false,
        message: 'EHR record not found'
      });
    }

    // Don't actually delete, just archive
    ehr.status = 'archived';
    await ehr.save();

    res.status(200).json({
      success: true,
      message: 'EHR record archived successfully'
    });
  } catch (error) {
    console.error('Delete EHR error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting EHR record',
      error: error.message
    });
  }
};
