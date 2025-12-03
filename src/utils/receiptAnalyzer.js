/**
 * Receipt Analyzer Module for FlouriteBot
 * 
 * Features:
 * - OCR text extraction using tesseract.js
 * - Suspicious keyword detection
 * - SHA256 hash anti-duplicate detection
 * - Classification (NORMAL, SUSPICIOUS, FRAUD)
 * 
 * IMPORTANT: This module does NOT approve or reject receipts automatically.
 * All receipts go to manual verification. This only adds flags and messages.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Data paths
const dataDir = path.join(__dirname, '../../data');
const hashesPath = path.join(dataDir, 'receipts/hashes.json');
const pendingPath = path.join(dataDir, 'topups_pending.json');

// Suspicious keywords to detect in OCR text
const SUSPICIOUS_KEYWORDS = [
  'canceled', 'cancelled', 'failed', 'declined', 'refunded', 'reversal',
  'error', 'chargeback', 'invalid', 'review', 'cancelado', 'reembolsado',
  'rechazado', 'pendiente', 'pending', 'rejected', 'fraud', 'suspicious',
  'dispute', 'disputed', 'reversed', 'void', 'voided'
];

// Classification types
const CLASSIFICATION = {
  NORMAL: 'NORMAL',
  SUSPICIOUS: 'SUSPICIOUS',
  FRAUD: 'FRAUD'
};

// Messages for each classification
const MESSAGES = {
  NORMAL: '📥 Comprobante recibido. Enviado a verificación manual.',
  SUSPICIOUS: '⚠️ Recibimos tu comprobante pero presenta detalles inusuales. Será revisado manualmente.',
  FRAUD: '🚫 Tu comprobante presenta inconsistencias. Pasará a revisión obligatoria.'
};

/**
 * Read hashes file
 */
function readHashes() {
  try {
    const data = fs.readFileSync(hashesPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { hashes: [] };
  }
}

/**
 * Save hashes file
 */
function saveHashes(data) {
  try {
    fs.writeFileSync(hashesPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving hashes:', error);
    return false;
  }
}

/**
 * Read pending topups
 */
function readPendingTopups() {
  try {
    const data = fs.readFileSync(pendingPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { pendings: [] };
  }
}

/**
 * Save pending topups
 */
function savePendingTopups(data) {
  try {
    fs.writeFileSync(pendingPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving pending topups:', error);
    return false;
  }
}

/**
 * Generate SHA256 hash from buffer
 * @param {Buffer} buffer - File buffer
 * @returns {string} - SHA256 hash
 */
function generateHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Check if hash is duplicate
 * @param {string} hash - SHA256 hash
 * @returns {object} - { isDuplicate, originalEntry }
 */
function checkDuplicateHash(hash) {
  const data = readHashes();
  const existing = data.hashes.find(h => h.hash === hash);
  
  if (existing) {
    return { isDuplicate: true, originalEntry: existing };
  }
  
  return { isDuplicate: false, originalEntry: null };
}

/**
 * Register hash for anti-duplicate tracking
 * @param {string} hash - SHA256 hash
 * @param {number} userId - Telegram user ID
 * @param {string} topupId - Topup request ID
 */
function registerHash(hash, userId, topupId) {
  const data = readHashes();
  
  data.hashes.push({
    hash,
    userId,
    topupId,
    timestamp: new Date().toISOString()
  });
  
  // Keep only last 10000 hashes to prevent file from growing too large
  if (data.hashes.length > 10000) {
    data.hashes = data.hashes.slice(-10000);
  }
  
  saveHashes(data);
}

/**
 * Analyze OCR text for suspicious keywords
 * @param {string} text - OCR extracted text
 * @returns {object} - { hasSuspiciousKeywords, foundKeywords }
 */
function analyzeSuspiciousKeywords(text) {
  if (!text) {
    return { hasSuspiciousKeywords: false, foundKeywords: [] };
  }
  
  const lowerText = text.toLowerCase();
  const foundKeywords = SUSPICIOUS_KEYWORDS.filter(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
  
  return {
    hasSuspiciousKeywords: foundKeywords.length > 0,
    foundKeywords
  };
}

/**
 * Classify receipt based on analysis
 * @param {object} analysis - Analysis results
 * @returns {string} - Classification type
 */
function classifyReceipt(analysis) {
  const { isDuplicate, hasSuspiciousKeywords, foundKeywords } = analysis;
  
  // FRAUD: Duplicate hash OR multiple suspicious signals
  if (isDuplicate) {
    return CLASSIFICATION.FRAUD;
  }
  
  if (hasSuspiciousKeywords && foundKeywords.length >= 2) {
    return CLASSIFICATION.FRAUD;
  }
  
  // SUSPICIOUS: One suspicious keyword or anomaly
  if (hasSuspiciousKeywords) {
    return CLASSIFICATION.SUSPICIOUS;
  }
  
  // NORMAL: No issues detected
  return CLASSIFICATION.NORMAL;
}

/**
 * Get message for classification
 * @param {string} classification - Classification type
 * @returns {string} - Message to show user
 */
function getClassificationMessage(classification) {
  return MESSAGES[classification] || MESSAGES.NORMAL;
}

/**
 * Add receipt to pending review queue
 * @param {object} entry - Pending entry data
 */
function addToPendingQueue(entry) {
  const data = readPendingTopups();
  
  // Use crypto for secure random ID generation
  const randomPart = crypto.randomBytes(4).toString('hex');
  const pendingEntry = {
    id: `PR-${Date.now()}-${randomPart}`,
    ...entry,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  data.pendings.push(pendingEntry);
  savePendingTopups(data);
  
  return pendingEntry;
}

/**
 * Get pending reviews
 * @returns {Array} - Pending entries
 */
function getPendingReviews() {
  const data = readPendingTopups();
  return data.pendings.filter(p => p.status === 'pending');
}

/**
 * Update pending review status
 * @param {string} id - Pending entry ID
 * @param {string} status - New status (approved/rejected)
 * @param {object} metadata - Additional metadata
 */
function updatePendingStatus(id, status, metadata = {}) {
  const data = readPendingTopups();
  const index = data.pendings.findIndex(p => p.id === id);
  
  if (index !== -1) {
    data.pendings[index] = {
      ...data.pendings[index],
      status,
      processedAt: new Date().toISOString(),
      ...metadata
    };
    savePendingTopups(data);
    return data.pendings[index];
  }
  
  return null;
}

/**
 * Get pending entry by ID
 * @param {string} id - Pending entry ID
 */
function getPendingById(id) {
  const data = readPendingTopups();
  return data.pendings.find(p => p.id === id);
}

/**
 * Perform lightweight OCR on image buffer
 * NOTE: This is a simplified version. In production, you would use tesseract.js
 * For now, we'll create the structure and the OCR will work when tesseract is available
 * @param {Buffer} buffer - Image buffer
 * @returns {Promise<string>} - Extracted text
 */
async function performOCR(buffer) {
  try {
    // Dynamically import tesseract.js only when needed
    const Tesseract = require('tesseract.js');
    
    const result = await Tesseract.recognize(buffer, 'eng+spa', {
      logger: () => {} // Silent logger
    });
    
    return result.data.text || '';
  } catch (error) {
    console.error('OCR Error:', error.message);
    return '';
  }
}

/**
 * Main analysis function - analyzes a receipt image
 * @param {Buffer} buffer - Image buffer
 * @param {number} userId - Telegram user ID
 * @param {string} topupId - Topup request ID
 * @returns {Promise<object>} - Analysis result
 */
async function analyzeReceipt(buffer, userId, topupId) {
  // Generate hash
  const hash = generateHash(buffer);
  
  // Check for duplicate
  const { isDuplicate, originalEntry } = checkDuplicateHash(hash);
  
  // Perform OCR (async)
  let ocrText = '';
  try {
    ocrText = await performOCR(buffer);
  } catch (error) {
    console.error('OCR failed, continuing without text analysis:', error.message);
  }
  
  // Analyze suspicious keywords
  const { hasSuspiciousKeywords, foundKeywords } = analyzeSuspiciousKeywords(ocrText);
  
  // Build analysis result
  const analysis = {
    hash,
    isDuplicate,
    originalEntry,
    ocrText: ocrText.substring(0, 500), // Limit stored text
    hasSuspiciousKeywords,
    foundKeywords
  };
  
  // Classify
  const classification = classifyReceipt(analysis);
  const message = getClassificationMessage(classification);
  
  // Build flags
  const flags = {
    normal: classification === CLASSIFICATION.NORMAL,
    suspicious: classification === CLASSIFICATION.SUSPICIOUS || hasSuspiciousKeywords,
    duplicate: isDuplicate
  };
  
  // Register hash (even if duplicate, for tracking)
  if (!isDuplicate) {
    registerHash(hash, userId, topupId);
  }
  
  return {
    classification,
    message,
    flags,
    analysis
  };
}

module.exports = {
  analyzeReceipt,
  addToPendingQueue,
  getPendingReviews,
  updatePendingStatus,
  getPendingById,
  checkDuplicateHash,
  registerHash,
  analyzeSuspiciousKeywords,
  classifyReceipt,
  getClassificationMessage,
  performOCR,
  CLASSIFICATION,
  MESSAGES
};
