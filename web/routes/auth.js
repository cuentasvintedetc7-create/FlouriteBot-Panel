/**
 * Authentication Routes
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { generateToken, authMiddleware } = require('../middleware/auth');
const db = require('../../src/utils/db');

// Admin credentials - should be stored securely in production
const ADMIN_USERNAME = process.env.WEB_ADMIN_USER || 'admin';
const ADMIN_PASSWORD_HASH = process.env.WEB_ADMIN_HASH || bcrypt.hashSync('admin123', 10);

/**
 * POST /api/auth/login
 * Login to web admin panel
 */
router.post('/login', (req, res) => {
  try {
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
    
    // Generate token
    const token = generateToken({
      id: 1,
      username: ADMIN_USERNAME,
      role: 'admin'
    });
    
    res.json({
      success: true,
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
 */
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * POST /api/auth/logout
 * Logout (client should discard token)
 */
router.post('/logout', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
