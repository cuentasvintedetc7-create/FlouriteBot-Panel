/**
 * Users Management Routes
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const db = require('../../src/utils/db');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/users
 * Get all users
 */
router.get('/', (req, res) => {
  try {
    const users = db.getUsers();
    
    // Remove sensitive data
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      balance: user.balance,
      role: user.role || 'user',
      telegramId: user.telegramId,
      phone: user.phone,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }));
    
    res.json({
      success: true,
      users: sanitizedUsers,
      total: sanitizedUsers.length
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

/**
 * GET /api/users/:username
 * Get single user by username
 */
router.get('/:username', (req, res) => {
  try {
    const user = db.findUserByUsername(req.params.username);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get user purchases and topups
    const purchases = db.getUserPurchases(user.username);
    const topups = db.getUserTopups(user.username);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        balance: user.balance,
        role: user.role || 'user',
        telegramId: user.telegramId,
        phone: user.phone,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      purchases: purchases.length,
      topups: topups.length
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

/**
 * POST /api/users
 * Create new user
 */
router.post('/', adminOnly, (req, res) => {
  try {
    const { username, password, role, balance } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    // Check if user exists
    if (db.findUserByUsername(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }
    
    // Create user
    const user = db.createUser(username, password);
    
    // Update role and balance if provided
    if (role) {
      db.updateUser(username, { role });
    }
    
    if (balance && balance > 0) {
      db.addBalance(username, balance);
    }
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        role: role || 'user',
        balance: balance || 0
      }
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

/**
 * PUT /api/users/:username
 * Update user
 */
router.put('/:username', adminOnly, (req, res) => {
  try {
    const { role, balance, password } = req.body;
    const username = req.params.username;
    
    // Check if user exists
    const user = db.findUserByUsername(username);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const updates = {};
    
    if (role) updates.role = role;
    if (password) updates.password = password;
    if (balance !== undefined) updates.balance = parseFloat(balance);
    
    if (Object.keys(updates).length > 0) {
      db.updateUser(username, updates);
    }
    
    res.json({
      success: true,
      message: 'User updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

/**
 * DELETE /api/users/:username
 * Delete user
 */
router.delete('/:username', adminOnly, (req, res) => {
  try {
    const username = req.params.username;
    
    // Check if user exists
    if (!db.findUserByUsername(username)) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent deleting admin
    const user = db.findUserByUsername(username);
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin user'
      });
    }
    
    db.deleteUser(username);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

/**
 * POST /api/users/:username/balance
 * Add or remove balance
 */
router.post('/:username/balance', adminOnly, (req, res) => {
  try {
    const { amount, action } = req.body;
    const username = req.params.username;
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }
    
    // Check if user exists
    const user = db.findUserByUsername(username);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const numAmount = parseFloat(amount);
    
    if (action === 'remove') {
      db.removeBalance(username, numAmount);
    } else {
      db.addBalance(username, numAmount);
    }
    
    // Get updated user
    const updatedUser = db.findUserByUsername(username);
    
    res.json({
      success: true,
      message: `Balance ${action === 'remove' ? 'removed' : 'added'} successfully`,
      balance: updatedUser.balance
    });
    
  } catch (error) {
    console.error('Error updating balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update balance'
    });
  }
});

module.exports = router;
