/**
 * User Activity Logger Module for FlouriteBot
 * 
 * Features:
 * - Log purchases, resets, topups, spam attempts, suspicious receipts
 * - Store in /data/logs/user_activity.json
 * - Admin-only access - does NOT affect normal users
 * 
 * IMPORTANT: This is purely for admin auditing.
 * Users are never notified about this logging.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Data path
const activityPath = path.join(__dirname, '../../data/logs/user_activity.json');

// Activity types
const ACTIVITY_TYPES = {
  PURCHASE: 'purchase',
  RESET_ATTEMPT: 'reset_attempt',
  RESET_SUCCESS: 'reset_success',
  TOPUP_SUBMITTED: 'topup_submitted',
  TOPUP_APPROVED: 'topup_approved',
  TOPUP_REJECTED: 'topup_rejected',
  SPAM_ATTEMPT: 'spam_attempt',
  SUSPICIOUS_RECEIPT: 'suspicious_receipt',
  FRAUD_RECEIPT: 'fraud_receipt',
  LOGIN: 'login',
  LOGOUT: 'logout',
  MESSAGE: 'message',
  PROMO_USED: 'promo_used'
};

/**
 * Read activity log file
 */
function readActivityLog() {
  try {
    const data = fs.readFileSync(activityPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { activities: [] };
  }
}

/**
 * Save activity log file
 */
function saveActivityLog(data) {
  try {
    fs.writeFileSync(activityPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving activity log:', error);
    return false;
  }
}

/**
 * Log user activity
 * @param {number} userId - Telegram user ID
 * @param {string} username - Username
 * @param {string} activityType - Type of activity (from ACTIVITY_TYPES)
 * @param {object} details - Additional details
 */
function logActivity(userId, username, activityType, details = {}) {
  const data = readActivityLog();
  
  // Use crypto for secure random ID generation
  const randomPart = crypto.randomBytes(4).toString('hex');
  const entry = {
    id: `ACT-${Date.now()}-${randomPart}`,
    userId,
    username,
    type: activityType,
    details,
    timestamp: new Date().toISOString()
  };
  
  data.activities.push(entry);
  
  // Keep only last 50000 entries to prevent file from growing too large
  if (data.activities.length > 50000) {
    data.activities = data.activities.slice(-50000);
  }
  
  saveActivityLog(data);
  return entry;
}

/**
 * Get activities for a specific user
 * @param {number} userId - Telegram user ID (optional, can be null to get by username)
 * @param {string} username - Username (optional)
 * @param {number} limit - Max entries to return
 * @returns {Array} - Activity entries
 */
function getUserActivities(userId = null, username = null, limit = 100) {
  const data = readActivityLog();
  
  let filtered = data.activities;
  
  if (userId) {
    filtered = filtered.filter(a => a.userId === userId);
  }
  
  if (username) {
    filtered = filtered.filter(a => 
      a.username && a.username.toLowerCase() === username.toLowerCase()
    );
  }
  
  // Return most recent first
  return filtered.slice(-limit).reverse();
}

/**
 * Get activities by type
 * @param {string} activityType - Type of activity
 * @param {number} limit - Max entries to return
 * @returns {Array} - Activity entries
 */
function getActivitiesByType(activityType, limit = 100) {
  const data = readActivityLog();
  
  const filtered = data.activities.filter(a => a.type === activityType);
  
  return filtered.slice(-limit).reverse();
}

/**
 * Get recent activities (all users)
 * @param {number} limit - Max entries to return
 * @returns {Array} - Activity entries
 */
function getRecentActivities(limit = 100) {
  const data = readActivityLog();
  
  return data.activities.slice(-limit).reverse();
}

/**
 * Get activity summary for a user
 * @param {number} userId - Telegram user ID
 * @param {string} username - Username (optional)
 * @returns {object} - Summary stats
 */
function getUserActivitySummary(userId = null, username = null) {
  const activities = getUserActivities(userId, username, 10000);
  
  const summary = {
    totalActivities: activities.length,
    purchases: 0,
    resetAttempts: 0,
    resetSuccesses: 0,
    topupsSubmitted: 0,
    topupsApproved: 0,
    topupsRejected: 0,
    spamAttempts: 0,
    suspiciousReceipts: 0,
    fraudReceipts: 0,
    promoUsed: 0,
    firstActivity: null,
    lastActivity: null
  };
  
  activities.forEach(a => {
    switch (a.type) {
      case ACTIVITY_TYPES.PURCHASE:
        summary.purchases++;
        break;
      case ACTIVITY_TYPES.RESET_ATTEMPT:
        summary.resetAttempts++;
        break;
      case ACTIVITY_TYPES.RESET_SUCCESS:
        summary.resetSuccesses++;
        break;
      case ACTIVITY_TYPES.TOPUP_SUBMITTED:
        summary.topupsSubmitted++;
        break;
      case ACTIVITY_TYPES.TOPUP_APPROVED:
        summary.topupsApproved++;
        break;
      case ACTIVITY_TYPES.TOPUP_REJECTED:
        summary.topupsRejected++;
        break;
      case ACTIVITY_TYPES.SPAM_ATTEMPT:
        summary.spamAttempts++;
        break;
      case ACTIVITY_TYPES.SUSPICIOUS_RECEIPT:
        summary.suspiciousReceipts++;
        break;
      case ACTIVITY_TYPES.FRAUD_RECEIPT:
        summary.fraudReceipts++;
        break;
      case ACTIVITY_TYPES.PROMO_USED:
        summary.promoUsed++;
        break;
    }
  });
  
  if (activities.length > 0) {
    // Activities are sorted newest first
    summary.lastActivity = activities[0].timestamp;
    summary.firstActivity = activities[activities.length - 1].timestamp;
  }
  
  return summary;
}

/**
 * Search activities
 * @param {object} criteria - Search criteria
 * @param {number} limit - Max entries to return
 * @returns {Array} - Matching activities
 */
function searchActivities(criteria = {}, limit = 100) {
  const data = readActivityLog();
  
  let filtered = data.activities;
  
  if (criteria.userId) {
    filtered = filtered.filter(a => a.userId === criteria.userId);
  }
  
  if (criteria.username) {
    filtered = filtered.filter(a => 
      a.username && a.username.toLowerCase().includes(criteria.username.toLowerCase())
    );
  }
  
  if (criteria.type) {
    filtered = filtered.filter(a => a.type === criteria.type);
  }
  
  if (criteria.startDate) {
    filtered = filtered.filter(a => new Date(a.timestamp) >= new Date(criteria.startDate));
  }
  
  if (criteria.endDate) {
    filtered = filtered.filter(a => new Date(a.timestamp) <= new Date(criteria.endDate));
  }
  
  return filtered.slice(-limit).reverse();
}

/**
 * Convenience methods for logging specific activities
 */

function logPurchase(userId, username, product, duration, key, price) {
  return logActivity(userId, username, ACTIVITY_TYPES.PURCHASE, {
    product, duration, key, price
  });
}

function logResetAttempt(userId, username, key) {
  return logActivity(userId, username, ACTIVITY_TYPES.RESET_ATTEMPT, { key });
}

function logResetSuccess(userId, username, key, product) {
  return logActivity(userId, username, ACTIVITY_TYPES.RESET_SUCCESS, { key, product });
}

function logTopupSubmitted(userId, username, method, topupId) {
  return logActivity(userId, username, ACTIVITY_TYPES.TOPUP_SUBMITTED, { method, topupId });
}

function logTopupApproved(userId, username, amount, topupId) {
  return logActivity(userId, username, ACTIVITY_TYPES.TOPUP_APPROVED, { amount, topupId });
}

function logTopupRejected(userId, username, topupId) {
  return logActivity(userId, username, ACTIVITY_TYPES.TOPUP_REJECTED, { topupId });
}

function logSpamAttempt(userId, username, reason) {
  return logActivity(userId, username, ACTIVITY_TYPES.SPAM_ATTEMPT, { reason });
}

function logSuspiciousReceipt(userId, username, topupId, keywords) {
  return logActivity(userId, username, ACTIVITY_TYPES.SUSPICIOUS_RECEIPT, { topupId, keywords });
}

function logFraudReceipt(userId, username, topupId, reason) {
  return logActivity(userId, username, ACTIVITY_TYPES.FRAUD_RECEIPT, { topupId, reason });
}

function logLogin(userId, username) {
  return logActivity(userId, username, ACTIVITY_TYPES.LOGIN, {});
}

function logLogout(userId, username) {
  return logActivity(userId, username, ACTIVITY_TYPES.LOGOUT, {});
}

function logPromoUsed(userId, username, promoCode, discount) {
  return logActivity(userId, username, ACTIVITY_TYPES.PROMO_USED, { promoCode, discount });
}

module.exports = {
  logActivity,
  getUserActivities,
  getActivitiesByType,
  getRecentActivities,
  getUserActivitySummary,
  searchActivities,
  // Convenience methods
  logPurchase,
  logResetAttempt,
  logResetSuccess,
  logTopupSubmitted,
  logTopupApproved,
  logTopupRejected,
  logSpamAttempt,
  logSuspiciousReceipt,
  logFraudReceipt,
  logLogin,
  logLogout,
  logPromoUsed,
  // Constants
  ACTIVITY_TYPES
};
