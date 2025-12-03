/**
 * Topups Routes
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const db = require('../../src/utils/db');
const { getPendingReviews, updatePendingStatus, getPendingById } = require('../../src/utils/receiptAnalyzer');

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

/**
 * GET /api/topups/pending-reviews
 * Get pending topups with receipt analysis data
 */
router.get('/pending-reviews', adminOnly, (req, res) => {
  try {
    const pendingReviews = getPendingReviews();
    
    // Sort by date (oldest first - FIFO)
    pendingReviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    res.json({
      success: true,
      reviews: pendingReviews,
      count: pendingReviews.length
    });
    
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending reviews'
    });
  }
});

/**
 * GET /api/topups/pending-reviews/:id
 * Get a specific pending review with analysis
 */
router.get('/pending-reviews/:id', adminOnly, (req, res) => {
  try {
    const review = getPendingById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Pending review not found'
      });
    }
    
    res.json({
      success: true,
      review
    });
    
  } catch (error) {
    console.error('Error fetching pending review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending review'
    });
  }
});

/**
 * POST /api/topups/pending-reviews/:id/approve
 * Approve a pending review and process topup
 */
router.post('/pending-reviews/:id/approve', adminOnly, (req, res) => {
  try {
    const { amount } = req.body;
    const reviewId = req.params.id;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }
    
    const review = getPendingById(reviewId);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Pending review not found'
      });
    }
    
    if (review.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Review already ${review.status}`
      });
    }
    
    // Update pending review status
    updatePendingStatus(reviewId, 'approved', { amount: parseFloat(amount) });
    
    // Update the original topup request if it exists
    if (review.topupId) {
      db.updateTopupStatus(review.topupId, 'APPROVED', parseFloat(amount));
      db.addBalance(review.username, parseFloat(amount));
      db.addTopup(review.username, parseFloat(amount), review.method);
    }
    
    res.json({
      success: true,
      message: `Review approved. $${amount} added to ${review.username}`
    });
    
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve review'
    });
  }
});

/**
 * POST /api/topups/pending-reviews/:id/reject
 * Reject a pending review
 */
router.post('/pending-reviews/:id/reject', adminOnly, (req, res) => {
  try {
    const reviewId = req.params.id;
    const { reason } = req.body;
    
    const review = getPendingById(reviewId);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Pending review not found'
      });
    }
    
    if (review.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Review already ${review.status}`
      });
    }
    
    // Update pending review status
    updatePendingStatus(reviewId, 'rejected', { reason: reason || 'Rejected by admin' });
    
    // Update the original topup request if it exists
    if (review.topupId) {
      db.updateTopupStatus(review.topupId, 'REJECTED');
    }
    
    res.json({
      success: true,
      message: `Review rejected`
    });
    
  } catch (error) {
    console.error('Error rejecting review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject review'
    });
  }
});

module.exports = router;
