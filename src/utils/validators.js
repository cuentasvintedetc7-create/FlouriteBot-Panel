/**
 * Centralized validators for FlouriteBot
 */

// Key format validators for each product type
const keyValidators = {
  // Flourite keys: 16 alphanumeric uppercase characters (e.g., FIUNVTFQRR99845F)
  flourite: (key) => /^[A-Z0-9]{16}$/.test(key),
  // COD keys: format COD-XXXXXXXX-XXXX
  cod: (key) => /^COD-[A-Z0-9]{8}-[A-Z0-9]{4}$/.test(key),
  // GBOX/Certificate keys: 10 hex characters (e.g., 17E21A4A78)
  gbox: (key) => /^[0-9A-Fa-f]{10}$/.test(key)
};

/**
 * Validate key format based on product type
 * @param {string} key - The key to validate
 * @param {string} productType - Product type: 'flourite', 'cod', or 'gbox'
 * @returns {boolean}
 */
function isValidKeyFormat(key, productType) {
  if (!key || typeof key !== 'string') return false;
  const upperKey = key.toUpperCase().trim();
  const validator = keyValidators[productType.toLowerCase()];
  return validator ? validator(upperKey) : false;
}

/**
 * Detect product type from key format
 * @param {string} key - The key to analyze
 * @returns {string|null} - Product type or null if not recognized
 */
function detectProductFromKey(key) {
  if (!key || typeof key !== 'string') return null;
  const upperKey = key.toUpperCase().trim();
  
  if (keyValidators.cod(upperKey)) return 'cod';
  if (keyValidators.gbox(upperKey)) return 'gbox';
  if (keyValidators.flourite(upperKey)) return 'flourite';
  
  return null;
}

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {{valid: boolean, error: string|null}}
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (trimmed.length > 32) {
    return { valid: false, error: 'Username must be at most 32 characters' };
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, error: string|null}}
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 4) {
    return { valid: false, error: 'Password must be at least 4 characters' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Password must be at most 128 characters' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate amount (for balance operations)
 * @param {number|string} amount - Amount to validate
 * @param {object} options - Validation options
 * @returns {{valid: boolean, value: number, error: string|null}}
 */
function validateAmount(amount, options = {}) {
  const { min = 0, max = 1000000, allowZero = false } = options;
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return { valid: false, value: 0, error: 'Invalid amount format' };
  }
  
  if (!allowZero && numAmount <= 0) {
    return { valid: false, value: 0, error: 'Amount must be greater than 0' };
  }
  
  if (allowZero && numAmount < 0) {
    return { valid: false, value: 0, error: 'Amount cannot be negative' };
  }
  
  if (numAmount < min) {
    return { valid: false, value: 0, error: `Amount must be at least ${min}` };
  }
  
  if (numAmount > max) {
    return { valid: false, value: 0, error: `Amount cannot exceed ${max}` };
  }
  
  return { valid: true, value: numAmount, error: null };
}

/**
 * Validate promo code format
 * @param {string} code - Promo code to validate
 * @returns {{valid: boolean, error: string|null}}
 */
function validatePromoCodeFormat(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Promo code is required' };
  }
  
  const trimmed = code.trim().toUpperCase();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Promo code must be at least 3 characters' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: 'Promo code must be at most 20 characters' };
  }
  
  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    return { valid: false, error: 'Promo code can only contain letters and numbers' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate category key
 * @param {string} categoryKey - Category key to validate
 * @param {object} products - Products configuration
 * @returns {{valid: boolean, error: string|null}}
 */
function validateCategoryKey(categoryKey, products) {
  if (!categoryKey || typeof categoryKey !== 'string') {
    return { valid: false, error: 'Category is required' };
  }
  
  const key = categoryKey.toLowerCase().trim();
  const validCategories = Object.keys(products.products || {});
  
  if (!validCategories.includes(key)) {
    return { 
      valid: false, 
      error: `Invalid category. Valid: ${validCategories.join(', ')}` 
    };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate duration for a category
 * @param {string} duration - Duration to validate
 * @param {string} categoryKey - Category key
 * @param {object} products - Products configuration
 * @returns {{valid: boolean, error: string|null}}
 */
function validateDuration(duration, categoryKey, products) {
  if (!duration || typeof duration !== 'string') {
    return { valid: false, error: 'Duration is required' };
  }
  
  const productConfig = products.products?.[categoryKey.toLowerCase()];
  
  if (!productConfig) {
    return { valid: false, error: 'Invalid category' };
  }
  
  const validDurations = Object.keys(productConfig.durations);
  
  if (!validDurations.includes(duration)) {
    return { 
      valid: false, 
      error: `Invalid duration. Valid: ${validDurations.join(', ')}` 
    };
  }
  
  return { valid: true, error: null };
}

/**
 * Sanitize user input for display (prevent injection)
 * @param {string} input - Input to sanitize
 * @param {number} maxLength - Maximum length
 * @returns {string}
 */
function sanitizeInput(input, maxLength = 100) {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/[\x00-\x1F]/g, '') // Remove control characters
    .trim();
}

/**
 * Sanitize text for Telegram Markdown
 * @param {string} text - Text to sanitize
 * @returns {string}
 */
function sanitizeForMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

module.exports = {
  keyValidators,
  isValidKeyFormat,
  detectProductFromKey,
  validateUsername,
  validatePassword,
  validateAmount,
  validatePromoCodeFormat,
  validateCategoryKey,
  validateDuration,
  sanitizeInput,
  sanitizeForMarkdown
};
