/**
 * JWT Authentication Middleware
 * - 7-day session duration
 * - HttpOnly cookie support with SameSite=None for cross-origin
 * - Automatic token renewal
 * - Session ID for simultaneous session detection
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'flouritebot-admin-secret-key-change-in-production';
const JWT_EXPIRATION = '7d';
const JWT_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const TOKEN_RENEWAL_THRESHOLD_MS = 24 * 60 * 60 * 1000; // Renew if less than 1 day remaining

// Store for active sessions (in production, use Redis)
const activeSessions = new Map();

/**
 * Generate a unique session ID
 */
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate JWT token for admin user
 * @param {object} user - User object
 * @returns {object} Token and session info
 */
function generateToken(user) {
  const sessionId = generateSessionId();
  const now = Date.now();
  
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role || 'admin',
    sessionId,
    iat: Math.floor(now / 1000)
  };
  
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
  
  // Store active session
  activeSessions.set(user.username, {
    sessionId,
    createdAt: now,
    lastActivity: now
  });
  
  return { token, sessionId };
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
 * Check if session is valid (not invalidated by another login)
 * @param {string} username - Username
 * @param {string} sessionId - Session ID from token
 * @returns {boolean}
 */
function isSessionValid(username, sessionId) {
  const activeSession = activeSessions.get(username);
  if (!activeSession) return true; // No session tracking, allow
  return activeSession.sessionId === sessionId;
}

/**
 * Invalidate all sessions for a user (called on new login)
 * @param {string} username
 */
function invalidateUserSessions(username) {
  activeSessions.delete(username);
}

/**
 * Check if token needs renewal
 * @param {object} decoded - Decoded JWT
 * @returns {boolean}
 */
function tokenNeedsRenewal(decoded) {
  if (!decoded.exp) return false;
  const expiresAt = decoded.exp * 1000;
  const timeRemaining = expiresAt - Date.now();
  return timeRemaining < TOKEN_RENEWAL_THRESHOLD_MS;
}

/**
 * Set JWT cookie
 * @param {object} res - Express response object
 * @param {string} token - JWT token
 */
function setTokenCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: isProduction, // Only send over HTTPS in production
    sameSite: isProduction ? 'None' : 'Lax', // None for cross-origin in production
    maxAge: JWT_EXPIRATION_MS,
    path: '/'
  });
}

/**
 * Clear JWT cookie
 * @param {object} res - Express response object
 */
function clearTokenCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('auth_token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
    maxAge: 0,
    path: '/'
  });
}

/**
 * Authentication middleware
 * Reads JWT from cookie or Authorization header
 */
function authMiddleware(req, res, next) {
  // Get token from cookie first, then fallback to Authorization header
  let token = req.cookies?.auth_token;
  
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    clearTokenCookie(res);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
  
  // Check if session is still valid (not invalidated by another login)
  if (!isSessionValid(decoded.username, decoded.sessionId)) {
    clearTokenCookie(res);
    return res.status(401).json({
      success: false,
      message: 'Session invalidated. Please login again.'
    });
  }
  
  // Auto-renew token if close to expiration
  if (tokenNeedsRenewal(decoded)) {
    const { token: newToken } = generateToken({
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    });
    setTokenCookie(res, newToken);
    
    // Set header to inform client of renewal
    res.setHeader('X-Token-Renewed', 'true');
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
  setTokenCookie,
  clearTokenCookie,
  invalidateUserSessions,
  isSessionValid,
  JWT_SECRET,
  JWT_EXPIRATION_MS
};
