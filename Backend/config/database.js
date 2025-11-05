const mongoose = require('mongoose');
const mongoEncryption = require('./mongoEncryption');

const connectDB = async () => {
  try {
    // Get MongoDB CSFLE options if available
    const encryptionOptions = mongoEncryption.getConnectionOptions();
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      ...encryptionOptions // Add encryption options if CSFLE is available
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    if (encryptionOptions.autoEncryption) {
      console.log('✓ MongoDB Client-Side Field Level Encryption (CSFLE) enabled');
    } else {
      console.log('✓ Using application-level encryption (AES-256-GCM)');
    }
    
    // Enable strict mode for security
    mongoose.set('strictQuery', true);
    
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error('\n⚠️  MongoDB Connection Failed. Please check:');
    console.error('   1. MongoDB Atlas IP Whitelist (add 0.0.0.0/0 for testing)');
    console.error('   2. Database username and password are correct');
    console.error('   3. Network connection is stable');
    console.error('   4. Or install local MongoDB: https://www.mongodb.com/try/download/community\n');
    process.exit(1);
  }
};

module.exports = connectDB;
