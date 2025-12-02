/**
 * Authentication Routes
 * - Login with JWT cookie (7-day session)
 * - Automatic token renewal
 * - Session invalidation on new login
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { 
  generateToken, 
  authMiddleware, 
  setTokenCookie, 
  clearTokenCookie,
  invalidateUserSessions 
} = require('../middleware/auth');
const db = require('../../src/utils/db');

// Admin credentials configuration
// SECURITY: In production, always set WEB_ADMIN_USER and WEB_ADMIN_HASH environment variables
// Generate hash with: node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"
const ADMIN_USERNAME = process.env.WEB_ADMIN_USER || 'admin';

// Only use default hash in development. Production requires WEB_ADMIN_HASH env var.
const DEFAULT_HASH = process.env.NODE_ENV === 'production' ? null : bcrypt.hashSync('admin123', 10);
const ADMIN_PASSWORD_HASH = process.env.WEB_ADMIN_HASH || DEFAULT_HASH;

/**
 * POST /api/auth/login
 * Login to web admin panel
 * Sets HttpOnly cookie with JWT (7-day expiration)
 */
router.post('/login', (req, res) => {
  try {
    // Check if credentials are configured in production
    if (!ADMIN_PASSWORD_HASH) {
      console.error('Web admin authentication not configured. Set WEB_ADMIN_HASH environment variable.');
      return res.status(500).json({
        success: false,
        message: 'Server authentication not configured'
      });
    }
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    // Check if username matches admin
    if (username.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check password
    const isValid = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Invalidate any existing sessions for this user (single session enforcement)
    invalidateUserSessions(ADMIN_USERNAME);
    
    // Generate token with session ID
    const { token, sessionId } = generateToken({
      id: 1,
      username: ADMIN_USERNAME,
      role: 'admin'
    });
    
    // Set HTTP-only cookie
    setTokenCookie(res, token);
    
    res.json({
      success: true,
      message: 'Login successful',
      // Also return token for backward compatibility with localStorage approach
      token,
      user: {
        username: ADMIN_USERNAME,
        role: 'admin'
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 * Also serves to verify session is still valid
 */
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

/**
 * POST /api/auth/logout
 * Logout (clears cookie and invalidates session)
 */
router.post('/logout', authMiddleware, (req, res) => {
  // Invalidate session
  if (req.user?.username) {
    invalidateUserSessions(req.user.username);
  }
  
  // Clear the cookie
  clearTokenCookie(res);
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * POST /api/auth/refresh
 * Refresh token (optional endpoint for explicit refresh)
 */
router.post('/refresh', authMiddleware, (req, res) => {
  // Generate new token
  const { token } = generateToken({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role
  });
  
  // Set new cookie
  setTokenCookie(res, token);
  
  res.json({
    success: true,
    message: 'Token refreshed',
    token
  });
});

module.exports = router;
