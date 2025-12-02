/**
 * Logs Routes
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const logger = require('../../src/utils/logger');

// All routes require authentication
router.use(authMiddleware);
router.use(adminOnly);

/**
 * GET /api/logs
 * Get recent logs
 */
router.get('/', (req, res) => {
  try {
    const { lines = 100, level } = req.query;
    
    const logs = logger.readRecentLogs(parseInt(lines), level);
    
    res.json({
      success: true,
      logs,
      count: logs.length
    });
    
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch logs'
    });
  }
});

/**
 * GET /api/logs/files
 * Get list of log files
 */
router.get('/files', (req, res) => {
  try {
    const files = logger.getLogFiles();
    
    res.json({
      success: true,
      files
    });
    
  } catch (error) {
    console.error('Error fetching log files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch log files'
    });
  }
});

/**
 * GET /api/logs/level/:level
 * Get logs filtered by level
 */
router.get('/level/:level', (req, res) => {
  try {
    const { lines = 100 } = req.query;
    const level = req.params.level.toUpperCase();
    
    if (!logger.LOG_LEVELS[level]) {
      return res.status(400).json({
        success: false,
        message: `Invalid log level. Valid: ${Object.keys(logger.LOG_LEVELS).join(', ')}`
      });
    }
    
    const logs = logger.readRecentLogs(parseInt(lines), level);
    
    res.json({
      success: true,
      logs,
      count: logs.length
    });
    
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch logs'
    });
  }
});

module.exports = router;
