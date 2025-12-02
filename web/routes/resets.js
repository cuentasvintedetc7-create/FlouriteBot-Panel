/**
 * Resets Routes
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const db = require('../../src/utils/db');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/resets
 * Get all reset logs
 */
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 50, username } = req.query;
    
    let resets = db.getResetLog();
    
    // Filter by username if provided
    if (username) {
      resets = resets.filter(r => 
        r.username && r.username.toLowerCase().includes(username.toLowerCase())
      );
    }
    
    // Sort by date (newest first)
    resets.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedResets = resets.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      resets: paginatedResets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: resets.length,
        pages: Math.ceil(resets.length / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching resets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resets'
    });
  }
});

/**
 * GET /api/resets/stats
 * Get reset statistics
 */
router.get('/stats', (req, res) => {
  try {
    const resets = db.getResetLog();
    
    // Group by product
    const byProduct = {};
    resets.forEach(r => {
      const product = r.product || 'Unknown';
      byProduct[product] = (byProduct[product] || 0) + 1;
    });
    
    // Recent resets (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentResets = resets.filter(r => new Date(r.date) > weekAgo);
    
    res.json({
      success: true,
      stats: {
        total: resets.length,
        byProduct,
        recentCount: recentResets.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching reset stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reset statistics'
    });
  }
});

module.exports = router;
