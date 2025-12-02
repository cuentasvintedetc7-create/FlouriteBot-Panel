/**
 * Promo Codes Routes
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const db = require('../../src/utils/db');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/promo
 * Get all promo codes
 */
router.get('/', (req, res) => {
  try {
    const codes = db.getPromoCodes();
    
    res.json({
      success: true,
      codes: codes.map(c => ({
        ...c,
        usageCount: c.usedBy ? c.usedBy.length : 0
      })),
      total: codes.length
    });
    
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promo codes'
    });
  }
});

/**
 * POST /api/promo
 * Create new promo code
 */
router.post('/', adminOnly, (req, res) => {
  try {
    const { code, type, amount, maxUses, expiresAt } = req.body;
    
    if (!code || !type || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Code, type, and amount are required'
      });
    }
    
    // Validate type
    if (!['percentage', 'fixed'].includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Type must be "percentage" or "fixed"'
      });
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }
    
    // Check if code exists
    if (db.findPromoCode(code)) {
      return res.status(400).json({
        success: false,
        message: 'Promo code already exists'
      });
    }
    
    // Create promo code
    const promo = db.createPromoCode(
      code.toUpperCase(),
      type.toLowerCase(),
      numAmount,
      0, // minPurchase
      maxUses ? parseInt(maxUses) : 0,
      expiresAt || null
    );
    
    res.status(201).json({
      success: true,
      message: 'Promo code created successfully',
      promo
    });
    
  } catch (error) {
    console.error('Error creating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create promo code'
    });
  }
});

/**
 * PUT /api/promo/:code
 * Update promo code
 */
router.put('/:code', adminOnly, (req, res) => {
  try {
    const code = req.params.code;
    const { active, maxUses, expiresAt } = req.body;
    
    // Check if code exists
    if (!db.findPromoCode(code)) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }
    
    const updates = {};
    
    if (active !== undefined) updates.active = Boolean(active);
    if (maxUses !== undefined) updates.maxUses = parseInt(maxUses);
    if (expiresAt !== undefined) updates.expiresAt = expiresAt;
    
    db.updatePromoCode(code, updates);
    
    res.json({
      success: true,
      message: 'Promo code updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update promo code'
    });
  }
});

/**
 * DELETE /api/promo/:code
 * Delete promo code
 */
router.delete('/:code', adminOnly, (req, res) => {
  try {
    const code = req.params.code;
    
    // Check if code exists
    if (!db.findPromoCode(code)) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }
    
    db.deletePromoCode(code);
    
    res.json({
      success: true,
      message: 'Promo code deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete promo code'
    });
  }
});

/**
 * POST /api/promo/:code/toggle
 * Enable/disable promo code
 */
router.post('/:code/toggle', adminOnly, (req, res) => {
  try {
    const code = req.params.code;
    
    // Check if code exists
    const promo = db.findPromoCode(code);
    if (!promo) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }
    
    // Toggle active status
    db.updatePromoCode(code, { active: !promo.active });
    
    res.json({
      success: true,
      message: `Promo code ${promo.active ? 'disabled' : 'enabled'}`,
      active: !promo.active
    });
    
  } catch (error) {
    console.error('Error toggling promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle promo code'
    });
  }
});

module.exports = router;
