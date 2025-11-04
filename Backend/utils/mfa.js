const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

/**
 * Generate MFA secret for user
 */
const generateMFASecret = async (username, issuer = process.env.MFA_ISSUER || 'EHR-System') => {
  const secret = speakeasy.generateSecret({
    name: `${issuer} (${username})`,
    issuer: issuer,
    length: 32
  });
  
  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url
  };
};

/**
 * Generate QR code for MFA setup
 */
const generateQRCode = async (otpauthUrl) => {
  try {
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Verify MFA token
 */
const verifyMFAToken = (secret, token) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow 2 time steps before/after for clock skew
  });
};

/**
 * Generate backup codes for MFA
 */
const generateBackupCodes = (count = 10) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
};

module.exports = {
  generateMFASecret,
  generateQRCode,
  verifyMFAToken,
  generateBackupCodes
};
