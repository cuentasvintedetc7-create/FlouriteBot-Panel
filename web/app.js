/**
 * FlouriteBot Web Admin Panel
 * Express server configuration
 * 
 * Fixed:
 * - Proper cookie handling for JWT
 * - CORS with credentials for cross-origin cookies
 * - Helmet CSP allowing required resources
 * - Ordered middleware chain
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import middleware
const { apiRateLimit, strictRateLimit } = require('./middleware/rateLimit');

// Import routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const stockRoutes = require('./routes/stock');
const purchasesRoutes = require('./routes/purchases');
const topupsRoutes = require('./routes/topups');
const promoRoutes = require('./routes/promo');
const statsRoutes = require('./routes/stats');
const logsRoutes = require('./routes/logs');
const resetsRoutes = require('./routes/resets');

const app = express();

// Trust proxy (required for secure cookies behind nginx/reverse proxy)
app.set('trust proxy', 1);

// CORS configuration - must be before other middleware
const corsOptions = {
  origin: function(origin, callback) {
    // Allowed origins list
    const allowedOrigins = [
      'https://flouritebot.store',
      'https://www.flouritebot.store',
      'http://localhost:4100',
      'http://127.0.0.1:4100'
    ];
    
    // Allow requests with no origin (same-origin requests, mobile apps, curl)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }
    
    // In production, reject unknown origins
    console.warn('CORS blocked request from:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Required for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Token-Renewed'],
  maxAge: 86400 // Cache preflight for 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Cookie parser - required for JWT cookies
app.use(cookieParser());

// Security middleware with relaxed CSP for admin panel
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com",
        "data:"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "http:" // Allow http images (for logos etc)
      ],
      connectSrc: [
        "'self'",
        "https://flouritebot.store",
        "https://www.flouritebot.store"
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    },
  },
  crossOriginEmbedderPolicy: false, // Required for external resources
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Stricter rate limit for authentication endpoints - apply BEFORE routes
app.use('/api/auth/login', strictRateLimit());
app.use('/api/auth/refresh', strictRateLimit());

// Apply rate limiting to all API routes
app.use('/api/', apiRateLimit());

// Static files (no rate limit needed) - serve before API routes
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d', // Cache static assets for 1 day
  etag: true
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/topups', topupsRoutes);
app.use('/api/promo', promoRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/resets', resetsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 4100
  });
});

// Serve main page for all non-API routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message || 'Internal server error'
  });
});

module.exports = app;
