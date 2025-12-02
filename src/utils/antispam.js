/**
 * Anti-spam middleware for FlouriteBot
 * Prevents double-clicks and excessive requests
 */

// Store last action timestamps per user
const userLastAction = new Map();

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Default rate limit (500ms between actions)
const DEFAULT_RATE_LIMIT = 500;

/**
 * Clean up old entries from the rate limit map
 */
function cleanupOldEntries() {
  const now = Date.now();
  const maxAge = 60 * 1000; // 1 minute
  
  for (const [userId, timestamp] of userLastAction.entries()) {
    if (now - timestamp > maxAge) {
      userLastAction.delete(userId);
    }
  }
}

// Run cleanup periodically
setInterval(cleanupOldEntries, CLEANUP_INTERVAL);

/**
 * Check if user action is allowed (rate limiting)
 * @param {number} userId - Telegram user ID
 * @param {number} rateLimit - Minimum time between actions in ms
 * @returns {boolean} - True if action is allowed
 */
function isActionAllowed(userId, rateLimit = DEFAULT_RATE_LIMIT) {
  const now = Date.now();
  const lastAction = userLastAction.get(userId);
  
  if (lastAction && (now - lastAction) < rateLimit) {
    return false;
  }
  
  userLastAction.set(userId, now);
  return true;
}

/**
 * Anti-spam middleware for Telegraf
 * @param {number} rateLimit - Minimum time between actions in ms
 * @returns {Function} - Middleware function
 */
function antiSpamMiddleware(rateLimit = DEFAULT_RATE_LIMIT) {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    
    if (!userId) {
      return next();
    }
    
    // Check if action is allowed
    if (!isActionAllowed(userId, rateLimit)) {
      // For callback queries, show a brief notification
      if (ctx.callbackQuery) {
        try {
          await ctx.answerCbQuery('⏳ Please wait...', { show_alert: false });
        } catch (e) {
          // Ignore error if query already answered
        }
        return; // Don't process the action
      }
      
      // For regular messages, silently ignore
      return;
    }
    
    return next();
  };
}

/**
 * Create a debounced action handler
 * @param {Function} handler - The handler function
 * @param {number} delay - Debounce delay in ms
 * @returns {Function} - Debounced handler
 */
function debounceHandler(handler, delay = DEFAULT_RATE_LIMIT) {
  const pending = new Map();
  
  return async (ctx, ...args) => {
    const userId = ctx.from?.id;
    
    if (!userId) {
      return handler(ctx, ...args);
    }
    
    // Clear any pending timeout
    if (pending.has(userId)) {
      clearTimeout(pending.get(userId));
    }
    
    // Set new timeout
    return new Promise((resolve) => {
      pending.set(userId, setTimeout(async () => {
        pending.delete(userId);
        resolve(await handler(ctx, ...args));
      }, delay));
    });
  };
}

/**
 * Reset rate limit for a user (useful after successful operations)
 * @param {number} userId - Telegram user ID
 */
function resetRateLimit(userId) {
  userLastAction.delete(userId);
}

/**
 * Get rate limit stats (for debugging/monitoring)
 * @returns {object}
 */
function getRateLimitStats() {
  return {
    activeUsers: userLastAction.size,
    entries: Array.from(userLastAction.entries()).map(([userId, timestamp]) => ({
      userId,
      lastAction: new Date(timestamp).toISOString(),
      ageMs: Date.now() - timestamp
    }))
  };
}

module.exports = {
  antiSpamMiddleware,
  isActionAllowed,
  debounceHandler,
  resetRateLimit,
  getRateLimitStats,
  DEFAULT_RATE_LIMIT
};
