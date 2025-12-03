/**
 * Receipt Spam Control Module for FlouriteBot
 * 
 * Features:
 * - Max 1 receipt per 15 seconds per user
 * - Max 3 receipts per 2 minutes - then block for 2 minutes
 * - Spam logging to /data/logs/spam.log
 * 
 * IMPORTANT: This does NOT interfere with existing bot logic.
 * Only controls receipt/proof upload frequency.
 */

const fs = require('fs');
const path = require('path');

// Data paths
const spamLogPath = path.join(__dirname, '../../data/logs/spam.log');

// Rate limit settings (in milliseconds)
const SINGLE_RECEIPT_COOLDOWN = 15 * 1000; // 15 seconds
const BURST_WINDOW = 2 * 60 * 1000; // 2 minutes
const BURST_MAX_RECEIPTS = 3;
const BURST_BLOCK_DURATION = 2 * 60 * 1000; // 2 minutes block

// In-memory tracking
const userReceiptTimestamps = new Map(); // userId -> Array of timestamps
const userBlockedUntil = new Map(); // userId -> timestamp when block ends

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Message to show when rate limited
const RATE_LIMIT_MESSAGE = '⏳ Por favor espera un momento antes de enviar más comprobantes.';

/**
 * Clean up old entries from tracking maps
 */
function cleanupOldEntries() {
  const now = Date.now();
  
  // Clean up receipt timestamps older than burst window
  for (const [userId, timestamps] of userReceiptTimestamps.entries()) {
    const filtered = timestamps.filter(t => now - t < BURST_WINDOW);
    if (filtered.length === 0) {
      userReceiptTimestamps.delete(userId);
    } else {
      userReceiptTimestamps.set(userId, filtered);
    }
  }
  
  // Clean up expired blocks
  for (const [userId, blockedUntil] of userBlockedUntil.entries()) {
    if (now >= blockedUntil) {
      userBlockedUntil.delete(userId);
    }
  }
}

// Run cleanup periodically
setInterval(cleanupOldEntries, CLEANUP_INTERVAL);

/**
 * Log spam event to file
 * @param {number} userId - User ID
 * @param {string} username - Username
 * @param {string} eventType - Type of spam event
 * @param {object} details - Additional details
 */
function logSpamEvent(userId, username, eventType, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId,
    username,
    eventType,
    ...details
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    fs.appendFileSync(spamLogPath, logLine, 'utf8');
  } catch (error) {
    console.error('Error writing spam log:', error);
  }
}

/**
 * Check if user is currently blocked
 * @param {number} userId - User ID
 * @returns {object} - { isBlocked, remainingTime }
 */
function isUserBlocked(userId) {
  const blockedUntil = userBlockedUntil.get(userId);
  
  if (!blockedUntil) {
    return { isBlocked: false, remainingTime: 0 };
  }
  
  const now = Date.now();
  if (now >= blockedUntil) {
    userBlockedUntil.delete(userId);
    return { isBlocked: false, remainingTime: 0 };
  }
  
  return {
    isBlocked: true,
    remainingTime: Math.ceil((blockedUntil - now) / 1000)
  };
}

/**
 * Check if user can send a receipt (rate limiting)
 * @param {number} userId - User ID
 * @returns {object} - { allowed, reason, remainingTime }
 */
function checkReceiptRateLimit(userId) {
  const now = Date.now();
  
  // Check if user is blocked
  const blockStatus = isUserBlocked(userId);
  if (blockStatus.isBlocked) {
    return {
      allowed: false,
      reason: 'blocked',
      remainingTime: blockStatus.remainingTime
    };
  }
  
  // Get user's receipt timestamps
  const timestamps = userReceiptTimestamps.get(userId) || [];
  
  // Filter to only include timestamps within burst window
  const recentTimestamps = timestamps.filter(t => now - t < BURST_WINDOW);
  
  // Check single receipt cooldown (15 seconds)
  if (recentTimestamps.length > 0) {
    const lastReceipt = Math.max(...recentTimestamps);
    const timeSinceLast = now - lastReceipt;
    
    if (timeSinceLast < SINGLE_RECEIPT_COOLDOWN) {
      const remainingTime = Math.ceil((SINGLE_RECEIPT_COOLDOWN - timeSinceLast) / 1000);
      return {
        allowed: false,
        reason: 'cooldown',
        remainingTime
      };
    }
  }
  
  // Check burst limit (3 per 2 minutes)
  if (recentTimestamps.length >= BURST_MAX_RECEIPTS) {
    // Block user for 2 minutes
    userBlockedUntil.set(userId, now + BURST_BLOCK_DURATION);
    
    return {
      allowed: false,
      reason: 'burst_limit',
      remainingTime: BURST_BLOCK_DURATION / 1000
    };
  }
  
  return {
    allowed: true,
    reason: null,
    remainingTime: 0
  };
}

/**
 * Record a receipt submission
 * @param {number} userId - User ID
 */
function recordReceiptSubmission(userId) {
  const now = Date.now();
  const timestamps = userReceiptTimestamps.get(userId) || [];
  
  // Add new timestamp
  timestamps.push(now);
  
  // Keep only recent timestamps
  const recentTimestamps = timestamps.filter(t => now - t < BURST_WINDOW);
  userReceiptTimestamps.set(userId, recentTimestamps);
}

/**
 * Main function to check and handle receipt spam
 * @param {number} userId - User ID
 * @param {string} username - Username
 * @returns {object} - { allowed, message }
 */
function handleReceiptSpamCheck(userId, username) {
  const result = checkReceiptRateLimit(userId);
  
  if (!result.allowed) {
    // Log the spam attempt
    logSpamEvent(userId, username, result.reason, {
      remainingTime: result.remainingTime
    });
    
    return {
      allowed: false,
      message: RATE_LIMIT_MESSAGE
    };
  }
  
  // Record this submission
  recordReceiptSubmission(userId);
  
  return {
    allowed: true,
    message: null
  };
}

/**
 * Get spam statistics for a user
 * @param {number} userId - User ID
 * @returns {object} - Stats
 */
function getUserSpamStats(userId) {
  const timestamps = userReceiptTimestamps.get(userId) || [];
  const blockStatus = isUserBlocked(userId);
  
  const now = Date.now();
  const recentCount = timestamps.filter(t => now - t < BURST_WINDOW).length;
  
  return {
    recentReceipts: recentCount,
    maxAllowed: BURST_MAX_RECEIPTS,
    isBlocked: blockStatus.isBlocked,
    blockedRemaining: blockStatus.remainingTime
  };
}

/**
 * Get all spam logs (for admin)
 * @param {number} limit - Max entries to return
 * @returns {Array} - Log entries
 */
function getSpamLogs(limit = 100) {
  try {
    const data = fs.readFileSync(spamLogPath, 'utf8');
    const lines = data.trim().split('\n').filter(l => l);
    const entries = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(e => e);
    
    // Return most recent entries
    return entries.slice(-limit).reverse();
  } catch (error) {
    return [];
  }
}

module.exports = {
  handleReceiptSpamCheck,
  checkReceiptRateLimit,
  recordReceiptSubmission,
  isUserBlocked,
  logSpamEvent,
  getUserSpamStats,
  getSpamLogs,
  RATE_LIMIT_MESSAGE,
  SINGLE_RECEIPT_COOLDOWN,
  BURST_WINDOW,
  BURST_MAX_RECEIPTS,
  BURST_BLOCK_DURATION
};
