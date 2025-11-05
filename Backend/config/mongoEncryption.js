const crypto = require('crypto');

/**
 * MongoDB Client-Side Field Level Encryption (CSFLE) Configuration
 * Provides database-level encryption for PHI/PII data
 * 
 * This adds an additional layer of encryption beyond application-level encryption
 * Data is encrypted before being sent to MongoDB and decrypted when retrieved
 */

class MongoDBEncryption {
  constructor() {
    // Generate or retrieve master encryption key
    // In production, use AWS KMS, Azure Key Vault, or similar
    this.masterKey = this.getMasterKey();
    
    // Key vault configuration
    this.keyVaultNamespace = 'encryption.__keyVault';
    
    // Data encryption keys (DEKs) - one per data type
    this.dataKeys = {};
  }

  /**
   * Get or generate master key
   * In production, this should be retrieved from a secure key management service
   */
  getMasterKey() {
    if (process.env.MONGODB_MASTER_KEY) {
      return Buffer.from(process.env.MONGODB_MASTER_KEY, 'base64');
    }
    
    // Generate a 96-byte master key for development
    // IMPORTANT: In production, use AWS KMS or Azure Key Vault
    const masterKey = crypto.randomBytes(96);
    console.warn('\n⚠️  WARNING: Using generated master key for MongoDB encryption');
    console.warn('   For production, set MONGODB_MASTER_KEY environment variable');
    console.warn('   Or configure AWS KMS/Azure Key Vault\n');
    
    return masterKey;
  }

  /**
   * Get KMS provider configuration
   */
  getKmsProviders() {
    if (process.env.NODE_ENV === 'production' && process.env.AWS_KMS_ENABLED === 'true') {
      // AWS KMS configuration for production
      return {
        aws: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_SESSION_TOKEN // Optional
        }
      };
    }
    
    // Local key provider for development
    return {
      local: {
        key: this.masterKey
      }
    };
  }

  /**
   * Get auto encryption options for MongoDB client
   */
  getAutoEncryptionOptions() {
    return {
      keyVaultNamespace: this.keyVaultNamespace,
      kmsProviders: this.getKmsProviders(),
      schemaMap: this.getSchemaMap(),
      // Bypass auto encryption for queries (we handle encryption in application layer)
      // This prevents double encryption while still protecting data at rest
      bypassAutoEncryption: false,
      // Query analysis mode
      extraOptions: {
        mongocryptdBypassSpawn: true, // Disable automatic mongocryptd spawning
        mongocryptdSpawnPath: process.env.MONGOCRYPTD_PATH || undefined
      }
    };
  }

  /**
   * Define encryption schema for collections
   * Specifies which fields to encrypt and with what algorithm
   */
  getSchemaMap() {
    const encryptMetadata = {
      // Use AEAD_AES_256_CBC_HMAC_SHA_512-Random for most fields
      // Random: Non-deterministic, more secure, but can't query
      // Deterministic: Can query, but less secure
      algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
    };

    return {
      // Patient collection encryption
      'bugBounters.patients': {
        bsonType: 'object',
        encryptMetadata: {
          keyId: '/keyAltName',
          algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
        },
        properties: {
          firstName: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
            }
          },
          lastName: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
            }
          },
          dateOfBirth: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
            }
          },
          ssn: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
            }
          },
          email: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
            }
          },
          phone: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
            }
          },
          'address.street': {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
            }
          },
          'address.zipCode': {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
            }
          }
        }
      },
      
      // EHR collection encryption
      'bugBounters.ehrs': {
        bsonType: 'object',
        encryptMetadata: {
          keyId: '/keyAltName',
          algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
        },
        properties: {
          diagnosis: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
            }
          },
          symptoms: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
            }
          },
          treatmentPlan: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
            }
          },
          notes: {
            encrypt: {
              bsonType: 'string',
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
            }
          }
        }
      }
    };
  }

  /**
   * Check if MongoDB CSFLE is available
   * CSFLE requires MongoDB Enterprise or Atlas
   */
  isAvailable() {
    // Check if mongodb-client-encryption package is installed
    try {
      require.resolve('mongodb-client-encryption');
    } catch (e) {
      console.warn('\n⚠️  MongoDB CSFLE not available: mongodb-client-encryption package not installed');
      console.warn('   Install with: npm install mongodb-client-encryption');
      console.warn('   Using application-level encryption only\n');
      return false;
    }

    // Check if running on MongoDB Atlas or Enterprise
    const isAtlas = process.env.MONGO_URI && process.env.MONGO_URI.includes('mongodb.net');
    const isEnterprise = process.env.MONGODB_EDITION === 'enterprise';
    
    if (!isAtlas && !isEnterprise) {
      console.warn('\n⚠️  MongoDB CSFLE not available');
      console.warn('   CSFLE requires MongoDB Enterprise or Atlas');
      console.warn('   Using application-level encryption only\n');
      return false;
    }
    
    return true;
  }

  /**
   * Get connection options with auto encryption
   */
  getConnectionOptions() {
    if (!this.isAvailable()) {
      return {};
    }

    try {
      return {
        autoEncryption: this.getAutoEncryptionOptions()
      };
    } catch (error) {
      console.error('Error configuring MongoDB CSFLE:', error.message);
      console.warn('Falling back to application-level encryption only');
      return {};
    }
  }
}

// Export singleton instance
module.exports = new MongoDBEncryption();
