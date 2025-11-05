const Patient = require('../models/Patient');
const EHR = require('../models/EHR');
const User = require('../models/User');

/**
 * Get patient's own profile
 */
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -mfaSecret');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get patient record
    const patient = await Patient.findById(user.patientId);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found'
      });
    }

    res.json({
      success: true,
      data: {
        user,
        patient
      }
    });
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get patient's own EHR records
 */
exports.getMyEHRRecords = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || !user.patientId) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found'
      });
    }

    // Get all EHR records for this patient
    const ehrRecords = await EHR.find({ patient: user.patientId })
      .sort({ createdAt: -1 })
      .limit(100); // Limit to last 100 records

    res.json({
      success: true,
      data: ehrRecords,
      count: ehrRecords.length
    });
  } catch (error) {
    console.error('Error fetching patient EHR records:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get a specific EHR record (patient's own)
 */
exports.getMyEHRRecord = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || !user.patientId) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found'
      });
    }

    const ehrRecord = await EHR.findOne({
      _id: req.params.id,
      patient: user.patientId
    });

    if (!ehrRecord) {
      return res.status(404).json({
        success: false,
        message: 'EHR record not found or access denied'
      });
    }

    res.json({
      success: true,
      data: ehrRecord
    });
  } catch (error) {
    console.error('Error fetching EHR record:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Update patient's own contact information
 */
exports.updateMyContact = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || !user.patientId) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found'
      });
    }

    const { contactNumber, email, address } = req.body;
    
    const updateData = {};
    if (contactNumber) updateData.contactNumber = contactNumber;
    if (email) updateData.email = email;
    if (address) updateData.address = address;

    const patient = await Patient.findByIdAndUpdate(
      user.patientId,
      updateData,
      { new: true, runValidators: true }
    );

    // Also update user email if provided
    if (email) {
      await User.findByIdAndUpdate(req.user.id, { email });
    }

    res.json({
      success: true,
      message: 'Contact information updated successfully',
      data: patient
    });
  } catch (error) {
    console.error('Error updating contact info:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Export patient's medical records
 * This is a sensitive operation that should be logged
 */
exports.exportMyRecords = async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    const { getClientIp } = require('../utils/ipHelper');
    
    const user = await User.findById(req.user.id);
    
    if (!user || !user.patientId) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found'
      });
    }

    // Get patient info
    const patient = await Patient.findById(user.patientId);
    
    // Get all EHR records
    const ehrRecords = await EHR.find({ patient: user.patientId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'firstName lastName email');

    // Log data export event (critical for compliance)
    await AuditLog.createLog({
      user: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'DATA_EXPORT',
      resourceType: 'Patient',
      resourceId: user.patientId,
      patient: user.patientId,
      timestamp: new Date(),
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      details: {
        exportType: 'medical_records',
        recordCount: ehrRecords.length,
        patientName: `${patient.firstName} ${patient.lastName}`,
        message: 'Patient exported their own medical records'
      },
      hospitalId: patient.hospitalId
    });

    res.json({
      success: true,
      data: {
        patient: {
          patientId: patient.patientId,
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          bloodType: patient.bloodType,
          allergies: patient.allergies,
          email: patient.email,
          phone: patient.phone
        },
        ehrRecords: ehrRecords.map(record => ({
          date: record.visitDate,
          type: record.visitType,
          diagnosis: record.diagnosis,
          symptoms: record.symptoms,
          vitalSigns: record.vitalSigns,
          medications: record.medications,
          labResults: record.labResults,
          treatmentPlan: record.treatmentPlan,
          notes: record.notes,
          createdBy: record.createdBy
        })),
        exportDate: new Date(),
        recordCount: ehrRecords.length
      }
    });
  } catch (error) {
    console.error('Error exporting patient records:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = exports;
