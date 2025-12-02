/**
 * Rate Limiting Middleware for Web API
 */

// Store for rate limit tracking
const requestCounts = new Map();

// Cleanup interval (every minute)
const CLEANUP_INTERVAL = 60 * 1000;

// Default settings
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 100; // 100 requests per minute

/**
 * Clean up old entries
 */
function cleanup() {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.timestamp > DEFAULT_WINDOW_MS) {
      requestCounts.delete(key);
    }
  }
}

// Run cleanup periodically
setInterval(cleanup, CLEANUP_INTERVAL);

/**
 * Rate limiting middleware
 * @param {object} options - Options
 * @param {number} options.windowMs - Time window in ms
 * @param {number} options.max - Max requests per window
 * @param {string} options.message - Error message
 */
function rateLimit(options = {}) {
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const maxRequests = options.max || DEFAULT_MAX_REQUESTS;
  const message = options.message || 'Too many requests, please try again later';
  
  return (req, res, next) => {
    // Get client identifier (IP or authenticated user)
    const clientId = req.user?.id || req.ip || 'unknown';
    const now = Date.now();
    
    // Get or create rate limit data
    let data = requestCounts.get(clientId);
    
    if (!data || (now - data.timestamp) > windowMs) {
      // Reset if window has passed
      data = { count: 0, timestamp: now };
    }
    
    data.count++;
    requestCounts.set(clientId, data);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - data.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((data.timestamp + windowMs) / 1000));
    
    if (data.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message
      });
    }
    
    next();
  };
}

/**
 * Strict rate limit for sensitive operations (login, etc.)
 * Increased to 10 attempts per minute to avoid blocking valid users
 */
function strictRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 attempts per minute (more lenient)
    message: 'Too many attempts. Please wait before trying again.'
  });
}

/**
 * API rate limit for general operations
 */
function apiRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Rate limit exceeded. Please slow down.'
  });
}

module.exports = {
  rateLimit,
  strictRateLimit,
  apiRateLimit
};
