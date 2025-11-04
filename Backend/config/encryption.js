// Encryption utility for PHI (Protected Health Information) fields
const crypto = require('crypto');

// Algorithm for encryption
const algorithm = 'aes-256-gcm';
const keyLength = 32; // 256 bits

class EncryptionService {
  constructor() {
    // In production, use MongoDB Client-Side Field Level Encryption (CSFLE)
    // This is a simplified version for demonstration
    const masterKey = process.env.MASTER_KEY || 'default-key-please-change';
    this.key = crypto.scryptSync(masterKey, 'salt', keyLength);
  }

  /**
   * Encrypt sensitive data
   * @param {string} text - Plain text to encrypt
   * @returns {string} - Encrypted text with IV and auth tag
   */
  encrypt(text) {
    if (!text) return text;
    
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Return IV + authTag + encrypted data
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedData - Encrypted text with IV and auth tag
   * @returns {string} - Decrypted plain text
   */
  decrypt(encryptedData) {
    if (!encryptedData) return encryptedData;
    
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipheriv(algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash data (one-way, for identifiers)
   * @param {string} data - Data to hash
   * @returns {string} - Hashed data
   */
  hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

module.exports = new EncryptionService();
