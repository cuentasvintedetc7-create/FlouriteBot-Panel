/**
 * Statistics Routes
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const db = require('../../src/utils/db');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/stats
 * Get overall statistics
 */
router.get('/', (req, res) => {
  try {
    const users = db.getUsers();
    const purchases = db.getPurchases();
    const topups = db.getTopups();
    const stock = db.getStock();
    const promoCodes = db.getPromoCodes();
    const resets = db.getResetLog();
    
    // Calculate totals
    const totalRevenue = purchases.reduce((sum, p) => sum + (p.price || 0), 0);
    const totalTopups = topups
      .filter(t => t.status === 'APPROVED' || t.amount)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Calculate stock totals
    let totalStock = 0;
    for (const category of Object.values(stock)) {
      for (const productType of Object.values(category)) {
        for (const keys of Object.values(productType)) {
          totalStock += Array.isArray(keys) ? keys.length : 0;
        }
      }
    }
    
    // Active users (linked to Telegram)
    const linkedUsers = users.filter(u => u.telegramId).length;
    
    // Users by role
    const roleDistribution = {};
    users.forEach(u => {
      const role = u.role || 'user';
      roleDistribution[role] = (roleDistribution[role] || 0) + 1;
    });
    
    // Recent activity (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentPurchases = purchases.filter(p => new Date(p.date) > weekAgo);
    const recentTopups = topups.filter(t => new Date(t.date) > weekAgo);
    
    res.json({
      success: true,
      stats: {
        users: {
          total: users.length,
          linked: linkedUsers,
          byRole: roleDistribution
        },
        purchases: {
          total: purchases.length,
          revenue: totalRevenue.toFixed(2),
          recent: recentPurchases.length
        },
        topups: {
          total: topups.length,
          amount: totalTopups.toFixed(2),
          pending: db.getPendingTopups().length,
          recent: recentTopups.length
        },
        stock: {
          totalKeys: totalStock
        },
        promoCodes: {
          total: promoCodes.length,
          active: promoCodes.filter(p => p.active).length
        },
        resets: {
          total: resets.length
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

/**
 * GET /api/stats/chart/purchases
 * Get purchase data for charts (last 30 days)
 */
router.get('/chart/purchases', (req, res) => {
  try {
    const purchases = db.getPurchases();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Group by date
    const byDate = {};
    
    // Initialize all dates
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      byDate[dateStr] = { count: 0, revenue: 0 };
    }
    
    // Count purchases
    purchases.forEach(p => {
      const date = new Date(p.date);
      if (date > thirtyDaysAgo) {
        const dateStr = date.toISOString().split('T')[0];
        if (byDate[dateStr]) {
          byDate[dateStr].count++;
          byDate[dateStr].revenue += p.price || 0;
        }
      }
    });
    
    // Convert to array
    const chartData = Object.entries(byDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json({
      success: true,
      data: chartData
    });
    
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart data'
    });
  }
});

/**
 * GET /api/stats/chart/topups
 * Get topup data for charts (last 30 days)
 */
router.get('/chart/topups', (req, res) => {
  try {
    const topups = db.getTopups();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Group by date
    const byDate = {};
    
    // Initialize all dates
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      byDate[dateStr] = { count: 0, amount: 0 };
    }
    
    // Count topups
    topups.forEach(t => {
      const date = new Date(t.date);
      if (date > thirtyDaysAgo && (t.status === 'APPROVED' || t.amount)) {
        const dateStr = date.toISOString().split('T')[0];
        if (byDate[dateStr]) {
          byDate[dateStr].count++;
          byDate[dateStr].amount += t.amount || 0;
        }
      }
    });
    
    // Convert to array
    const chartData = Object.entries(byDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json({
      success: true,
      data: chartData
    });
    
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart data'
    });
  }
});

module.exports = router;
