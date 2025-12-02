/**
 * Purchases Routes
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const db = require('../../src/utils/db');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/purchases
 * Get all purchases
 */
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 50, username } = req.query;
    
    let purchases = db.getPurchases();
    
    // Filter by username if provided
    if (username) {
      purchases = purchases.filter(p => 
        p.username && p.username.toLowerCase().includes(username.toLowerCase())
      );
    }
    
    // Sort by date (newest first)
    purchases.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedPurchases = purchases.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      purchases: paginatedPurchases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: purchases.length,
        pages: Math.ceil(purchases.length / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchases'
    });
  }
});

/**
 * GET /api/purchases/stats
 * Get purchase statistics
 */
router.get('/stats', (req, res) => {
  try {
    const purchases = db.getPurchases();
    
    // Calculate stats
    const totalRevenue = purchases.reduce((sum, p) => sum + (p.price || 0), 0);
    const totalPurchases = purchases.length;
    
    // Group by product
    const byProduct = {};
    purchases.forEach(p => {
      const key = p.product || 'Unknown';
      if (!byProduct[key]) {
        byProduct[key] = { count: 0, revenue: 0 };
      }
      byProduct[key].count++;
      byProduct[key].revenue += p.price || 0;
    });
    
    // Recent purchases (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentPurchases = purchases.filter(p => new Date(p.date) > weekAgo);
    
    res.json({
      success: true,
      stats: {
        totalPurchases,
        totalRevenue: totalRevenue.toFixed(2),
        byProduct,
        recentCount: recentPurchases.length,
        recentRevenue: recentPurchases.reduce((sum, p) => sum + (p.price || 0), 0).toFixed(2)
      }
    });
    
  } catch (error) {
    console.error('Error fetching purchase stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase statistics'
    });
  }
});

module.exports = router;
