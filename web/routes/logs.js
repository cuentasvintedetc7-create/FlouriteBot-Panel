/**
 * Logs Routes
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const logger = require('../../src/utils/logger');
const { getUserActivities, getRecentActivities, getUserActivitySummary, searchActivities } = require('../../src/utils/userActivityLogger');
const { getSpamLogs } = require('../../src/utils/receiptSpamControl');

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

/**
 * GET /api/logs/user-activity
 * Get recent user activity logs
 */
router.get('/user-activity', (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const activities = getRecentActivities(parseInt(limit));
    
    res.json({
      success: true,
      activities,
      count: activities.length
    });
    
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity'
    });
  }
});

/**
 * GET /api/logs/user-activity/:username
 * Get activity for a specific user
 */
router.get('/user-activity/:username', (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const username = req.params.username;
    
    const activities = getUserActivities(null, username, parseInt(limit));
    const summary = getUserActivitySummary(null, username);
    
    res.json({
      success: true,
      activities,
      summary,
      count: activities.length
    });
    
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity'
    });
  }
});

/**
 * GET /api/logs/spam
 * Get spam logs
 */
router.get('/spam', (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const logs = getSpamLogs(parseInt(limit));
    
    res.json({
      success: true,
      logs,
      count: logs.length
    });
    
  } catch (error) {
    console.error('Error fetching spam logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch spam logs'
    });
  }
});

/**
 * POST /api/logs/user-activity/search
 * Search user activity logs
 */
router.post('/user-activity/search', (req, res) => {
  try {
    const { username, type, startDate, endDate, limit = 100 } = req.body;
    
    const activities = searchActivities({
      username,
      type,
      startDate,
      endDate
    }, parseInt(limit));
    
    res.json({
      success: true,
      activities,
      count: activities.length
    });
    
  } catch (error) {
    console.error('Error searching activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search activity logs'
    });
  }
});

module.exports = router;
