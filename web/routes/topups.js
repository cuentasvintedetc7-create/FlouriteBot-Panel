/**
 * Topups Routes
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const db = require('../../src/utils/db');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/topups
 * Get all topups (completed)
 */
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    
    let topups = db.getTopups();
    
    // Filter by status if provided
    if (status) {
      topups = topups.filter(t => t.status === status.toUpperCase());
    }
    
    // Sort by date (newest first)
    topups.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTopups = topups.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      topups: paginatedTopups,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: topups.length,
        pages: Math.ceil(topups.length / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching topups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch topups'
    });
  }
});

/**
 * GET /api/topups/pending
 * Get pending topups
 */
router.get('/pending', (req, res) => {
  try {
    const pending = db.getPendingTopups();
    
    // Sort by date (oldest first - FIFO)
    pending.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json({
      success: true,
      topups: pending,
      count: pending.length
    });
    
  } catch (error) {
    console.error('Error fetching pending topups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending topups'
    });
  }
});

/**
 * POST /api/topups/:id/approve
 * Approve a topup request
 */
router.post('/:id/approve', adminOnly, (req, res) => {
  try {
    const topupId = parseInt(req.params.id);
    const { amount } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }
    
    const topup = db.getTopupById(topupId);
    
    if (!topup) {
      return res.status(404).json({
        success: false,
        message: 'Topup request not found'
      });
    }
    
    if (topup.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Topup already ${topup.status.toLowerCase()}`
      });
    }
    
    // Update status and add balance
    db.updateTopupStatus(topupId, 'APPROVED', parseFloat(amount));
    db.addBalance(topup.username, parseFloat(amount));
    db.addTopup(topup.username, parseFloat(amount), topup.method);
    
    res.json({
      success: true,
      message: `Topup #${topupId} approved. $${amount} added to ${topup.username}`
    });
    
  } catch (error) {
    console.error('Error approving topup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve topup'
    });
  }
});

/**
 * POST /api/topups/:id/reject
 * Reject a topup request
 */
router.post('/:id/reject', adminOnly, (req, res) => {
  try {
    const topupId = parseInt(req.params.id);
    
    const topup = db.getTopupById(topupId);
    
    if (!topup) {
      return res.status(404).json({
        success: false,
        message: 'Topup request not found'
      });
    }
    
    if (topup.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Topup already ${topup.status.toLowerCase()}`
      });
    }
    
    // Update status
    db.updateTopupStatus(topupId, 'REJECTED');
    
    res.json({
      success: true,
      message: `Topup #${topupId} rejected`
    });
    
  } catch (error) {
    console.error('Error rejecting topup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject topup'
    });
  }
});

/**
 * GET /api/topups/stats
 * Get topup statistics
 */
router.get('/stats', (req, res) => {
  try {
    const topups = db.getTopups();
    
    const completed = topups.filter(t => t.status === 'APPROVED' || t.amount);
    const pending = topups.filter(t => t.status === 'PENDING');
    
    const totalAmount = completed.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Group by method
    const byMethod = {};
    completed.forEach(t => {
      const method = t.method || 'Unknown';
      if (!byMethod[method]) {
        byMethod[method] = { count: 0, amount: 0 };
      }
      byMethod[method].count++;
      byMethod[method].amount += t.amount || 0;
    });
    
    res.json({
      success: true,
      stats: {
        totalTopups: completed.length,
        totalAmount: totalAmount.toFixed(2),
        pendingCount: pending.length,
        byMethod
      }
    });
    
  } catch (error) {
    console.error('Error fetching topup stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch topup statistics'
    });
  }
});

module.exports = router;
