/**
 * JWT Authentication Middleware
 */

const jwt = require('jsonwebtoken');

// JWT secret - use environment variable or default
const JWT_SECRET = process.env.JWT_SECRET || 'flouritebot-admin-secret-key-change-in-production';

/**
 * Generate JWT token for admin user
 * @param {object} user - User object
 * @returns {string} JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id,
      username: user.username,
      role: user.role || 'admin'
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object|null} Decoded token or null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware
 * Requires valid JWT token in Authorization header
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
  
  // Attach user info to request
  req.user = decoded;
  next();
}

/**
 * Admin-only middleware
 * Requires authenticated user with admin role
 */
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
  adminOnly,
  JWT_SECRET
};
