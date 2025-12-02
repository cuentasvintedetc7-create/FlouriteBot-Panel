/**
 * Logging utility for FlouriteBot
 * Provides structured logging with file rotation
 */

const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../data/logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Current log level (can be set via environment)
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;

// Maximum log file size (5MB)
const MAX_LOG_SIZE = 5 * 1024 * 1024;

// Maximum number of rotated files to keep
const MAX_ROTATED_FILES = 5;

/**
 * Get current date string for log file name
 * @returns {string}
 */
function getDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Get timestamp for log entries
 * @returns {string}
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Rotate log files if needed
 * @param {string} logFile - Path to log file
 */
function rotateLogIfNeeded(logFile) {
  try {
    if (!fs.existsSync(logFile)) return;
    
    const stats = fs.statSync(logFile);
    
    if (stats.size < MAX_LOG_SIZE) return;
    
    // Rotate files
    const dir = path.dirname(logFile);
    const basename = path.basename(logFile, '.log');
    
    // Remove oldest rotated file
    const oldestFile = path.join(dir, `${basename}.${MAX_ROTATED_FILES}.log`);
    if (fs.existsSync(oldestFile)) {
      fs.unlinkSync(oldestFile);
    }
    
    // Shift rotated files
    for (let i = MAX_ROTATED_FILES - 1; i >= 1; i--) {
      const oldFile = path.join(dir, `${basename}.${i}.log`);
      const newFile = path.join(dir, `${basename}.${i + 1}.log`);
      if (fs.existsSync(oldFile)) {
        fs.renameSync(oldFile, newFile);
      }
    }
    
    // Rotate current file
    const rotatedFile = path.join(dir, `${basename}.1.log`);
    fs.renameSync(logFile, rotatedFile);
    
  } catch (error) {
    console.error('Error rotating log file:', error.message);
  }
}

/**
 * Write log entry to file
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} data - Additional data
 */
function writeLog(level, message, data = null) {
  const levelValue = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  
  // Skip if below current log level
  if (levelValue < currentLogLevel) return;
  
  const logFile = path.join(logsDir, `bot-${getDateString()}.log`);
  
  const logEntry = {
    timestamp: getTimestamp(),
    level,
    message,
    ...(data && { data })
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    rotateLogIfNeeded(logFile);
    fs.appendFileSync(logFile, logLine);
  } catch (error) {
    console.error('Error writing to log file:', error.message);
  }
  
  // Also log to console in development
  if (process.env.NODE_ENV !== 'production') {
    const consoleMethod = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log';
    console[consoleMethod](`[${level}] ${message}`, data || '');
  }
}

/**
 * Log debug message
 * @param {string} message - Log message
 * @param {object} data - Additional data
 */
function debug(message, data = null) {
  writeLog('DEBUG', message, data);
}

/**
 * Log info message
 * @param {string} message - Log message
 * @param {object} data - Additional data
 */
function info(message, data = null) {
  writeLog('INFO', message, data);
}

/**
 * Log warning message
 * @param {string} message - Log message
 * @param {object} data - Additional data
 */
function warn(message, data = null) {
  writeLog('WARN', message, data);
}

/**
 * Log error message
 * @param {string} message - Log message
 * @param {object|Error} data - Additional data or Error object
 */
function error(message, data = null) {
  if (data instanceof Error) {
    data = {
      name: data.name,
      message: data.message,
      stack: data.stack
    };
  }
  writeLog('ERROR', message, data);
}

/**
 * Log user action
 * @param {number} telegramId - User's Telegram ID
 * @param {string} action - Action performed
 * @param {object} details - Action details
 */
function logUserAction(telegramId, action, details = null) {
  info(`User action: ${action}`, {
    telegramId,
    action,
    ...details
  });
}

/**
 * Log purchase
 * @param {object} purchase - Purchase details
 */
function logPurchase(purchase) {
  info('Purchase completed', {
    type: 'purchase',
    ...purchase
  });
}

/**
 * Log reset
 * @param {object} reset - Reset details
 */
function logReset(reset) {
  info('Key reset', {
    type: 'reset',
    ...reset
  });
}

/**
 * Log security event
 * @param {string} event - Security event type
 * @param {object} details - Event details
 */
function logSecurity(event, details = null) {
  warn(`Security event: ${event}`, {
    type: 'security',
    event,
    ...details
  });
}

/**
 * Read recent logs
 * @param {number} lines - Number of lines to read
 * @param {string} level - Filter by log level (optional)
 * @returns {Array}
 */
function readRecentLogs(lines = 100, level = null) {
  try {
    const logFile = path.join(logsDir, `bot-${getDateString()}.log`);
    
    if (!fs.existsSync(logFile)) {
      return [];
    }
    
    const content = fs.readFileSync(logFile, 'utf8');
    const logLines = content.trim().split('\n').filter(Boolean);
    
    let logs = logLines.slice(-lines).map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return { raw: line };
      }
    });
    
    if (level) {
      logs = logs.filter(log => log.level === level.toUpperCase());
    }
    
    return logs.reverse(); // Most recent first
    
  } catch (err) {
    error('Error reading logs', err);
    return [];
  }
}

/**
 * Get available log files
 * @returns {Array}
 */
function getLogFiles() {
  try {
    return fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.log'))
      .map(file => ({
        name: file,
        path: path.join(logsDir, file),
        size: fs.statSync(path.join(logsDir, file)).size,
        modified: fs.statSync(path.join(logsDir, file)).mtime
      }))
      .sort((a, b) => b.modified - a.modified);
  } catch (err) {
    return [];
  }
}

module.exports = {
  debug,
  info,
  warn,
  error,
  logUserAction,
  logPurchase,
  logReset,
  logSecurity,
  readRecentLogs,
  getLogFiles,
  LOG_LEVELS
};
