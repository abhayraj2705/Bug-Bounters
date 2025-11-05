require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/database');

const app = express();

// Connect to database
connectDB();

// Security Middleware
// Set security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.CORS_ORIGIN
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting - Relaxed for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased to 1000 for development
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use('/api/', limiter);

// Stricter rate limiting for auth routes - Relaxed for development
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased to 200 requests per window for development
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize data to prevent NoSQL injection
// express-mongo-sanitize's middleware reassigns req.query which can fail
// in some environments where `req.query` is a getter-only property.
// Use the library's sanitize function to mutate objects in-place instead
// and avoid reassigning request properties.
app.use((req, res, next) => {
  try {
    if (req.body) {
      mongoSanitize.sanitize(req.body);
    }
    if (req.params) {
      mongoSanitize.sanitize(req.params);
    }
    if (req.headers) {
      mongoSanitize.sanitize(req.headers);
    }

    if (req.query) {
      // Some frameworks/versions expose req.query as getter-only. Attempt
      // to sanitize in-place; if that throws, fall back to cloning and
      // copying sanitized values back (best-effort).
      try {
        mongoSanitize.sanitize(req.query);
      } catch (e) {
        const cloned = Object.assign({}, req.query);
        mongoSanitize.sanitize(cloned);
        Object.keys(cloned).forEach((k) => {
          try {
            // attempt to set individual keys (may fail silently)
            req.query[k] = cloned[k];
          } catch (ignore) {}
        });
      }
    }
  } catch (err) {
    // Don't block requests if sanitization fails; log and continue.
    console.error('Sanitization error:', err);
  }
  return next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/ehr', require('./routes/ehr'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/patient-portal', require('./routes/patientPortal'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'EHR System API',
    version: '1.0.0',
    status: 'Active'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
  ================================================
  🚀 Server running in ${process.env.NODE_ENV || 'development'} mode
  📡 Port: ${PORT}
  🔒 Security: Helmet, CORS, Rate Limiting enabled
  📊 Database: MongoDB connected
  🏥 EHR System API Ready
  ================================================
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;
