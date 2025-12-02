/**
 * Stock Management Routes
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const db = require('../../src/utils/db');
const { generateKeys } = require('../../src/utils/generateKey');
const { getProductName, getCategoryName } = require('../../src/utils/format');
const products = require('../../data/products.json');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/stock
 * Get all stock
 */
router.get('/', (req, res) => {
  try {
    const stock = db.getStock();
    
    // Calculate summary
    const summary = {};
    let totalKeys = 0;
    
    for (const [category, productTypes] of Object.entries(stock)) {
      summary[category] = {};
      
      for (const [productType, durations] of Object.entries(productTypes)) {
        summary[category][productType] = {};
        
        for (const [duration, keys] of Object.entries(durations)) {
          const count = Array.isArray(keys) ? keys.length : 0;
          summary[category][productType][duration] = count;
          totalKeys += count;
        }
      }
    }
    
    res.json({
      success: true,
      stock: summary,
      totalKeys
    });
    
  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock'
    });
  }
});

/**
 * GET /api/stock/products
 * Get available products configuration
 */
router.get('/products', (req, res) => {
  try {
    const productList = Object.entries(products.products).map(([key, config]) => ({
      key,
      name: config.name,
      categoryName: getCategoryName(key),
      productName: getProductName(key),
      durations: Object.entries(config.durations).map(([duration, price]) => ({
        key: duration,
        price
      }))
    }));
    
    res.json({
      success: true,
      products: productList
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

/**
 * POST /api/stock/add
 * Add stock
 */
router.post('/add', adminOnly, (req, res) => {
  try {
    const { category, duration, amount } = req.body;
    
    if (!category || !duration || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Category, duration, and amount are required'
      });
    }
    
    const categoryKey = category.toLowerCase();
    const numAmount = parseInt(amount);
    
    // Validate category
    if (!products.products[categoryKey]) {
      return res.status(400).json({
        success: false,
        message: `Invalid category: ${category}. Valid: ${Object.keys(products.products).join(', ')}`
      });
    }
    
    const productConfig = products.products[categoryKey];
    
    // Validate duration
    if (!productConfig.durations[duration]) {
      return res.status(400).json({
        success: false,
        message: `Invalid duration: ${duration}. Valid: ${Object.keys(productConfig.durations).join(', ')}`
      });
    }
    
    if (numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }
    
    // Get category and product names
    const categoryName = getCategoryName(categoryKey);
    const productName = getProductName(categoryKey);
    
    // Generate keys
    const keys = generateKeys(productName, numAmount);
    
    // Add to stock
    db.addToStock(categoryName, productName, duration, keys);
    
    // Get new stock count
    const newCount = db.getStockCount(categoryName, productName, duration);
    
    res.json({
      success: true,
      message: `Added ${keys.length} keys to ${categoryName} - ${productName} (${duration})`,
      added: keys.length,
      newTotal: newCount
    });
    
  } catch (error) {
    console.error('Error adding stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add stock'
    });
  }
});

/**
 * POST /api/stock/remove
 * Remove stock
 */
router.post('/remove', adminOnly, (req, res) => {
  try {
    const { category, duration, amount } = req.body;
    
    if (!category || !duration || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Category, duration, and amount are required'
      });
    }
    
    const categoryKey = category.toLowerCase();
    const numAmount = parseInt(amount);
    
    // Validate category
    if (!products.products[categoryKey]) {
      return res.status(400).json({
        success: false,
        message: `Invalid category: ${category}`
      });
    }
    
    // Get category and product names
    const categoryName = getCategoryName(categoryKey);
    const productName = getProductName(categoryKey);
    
    // Remove from stock
    const result = db.removeFromStock(categoryName, productName, duration, numAmount);
    
    res.json({
      success: true,
      message: `Removed ${result.removed} keys from ${categoryName} - ${productName} (${duration})`,
      removed: result.removed,
      remaining: result.remaining
    });
    
  } catch (error) {
    console.error('Error removing stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove stock'
    });
  }
});

/**
 * POST /api/stock/clear
 * Clear stock
 */
router.post('/clear', adminOnly, (req, res) => {
  try {
    const { category, duration } = req.body;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }
    
    const categoryKey = category.toLowerCase();
    
    // Validate category
    if (!products.products[categoryKey]) {
      return res.status(400).json({
        success: false,
        message: `Invalid category: ${category}`
      });
    }
    
    // Get category and product names
    const categoryName = getCategoryName(categoryKey);
    const productName = getProductName(categoryKey);
    
    // Clear stock
    const result = db.clearStock(categoryName, productName, duration || 'all');
    
    res.json({
      success: true,
      message: `Cleared ${result.cleared} keys from ${categoryName}`,
      cleared: result.cleared
    });
    
  } catch (error) {
    console.error('Error clearing stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear stock'
    });
  }
});

module.exports = router;
