/**
 * Admin Alerts Module for FlouriteBot
 * 
 * Features:
 * - Send alerts to admin in private for suspicious/fraud receipts
 * - No alerts for normal receipts
 * 
 * IMPORTANT: Alerts are only sent to admin's private chat, not to public channels.
 */

const auth = require('./auth');

// Alert types
const ALERT_TYPES = {
  SUSPICIOUS: 'suspicious',
  FRAUD: 'fraud'
};

// Alert messages templates
const ALERT_MESSAGES = {
  SUSPICIOUS: (username, userId, details) => 
    `⚠️ *COMPROBANTE SOSPECHOSO*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 Usuario: @${username || 'N/A'}\n` +
    `🆔 Telegram ID: ${userId}\n` +
    `📋 Request ID: #${details.topupId || 'N/A'}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🔍 *Señales detectadas:*\n` +
    `${details.keywords ? `• Palabras sospechosas: ${details.keywords.join(', ')}` : '• Estructura anómala detectada'}\n\n` +
    `📎 El comprobante está pendiente de revisión manual.`,

  FRAUD: (username, userId, details) => 
    `🚫 *POSIBLE FRAUDE DETECTADO*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 Usuario: @${username || 'N/A'}\n` +
    `🆔 Telegram ID: ${userId}\n` +
    `📋 Request ID: #${details.topupId || 'N/A'}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `⚠️ *Razón:*\n` +
    `${details.isDuplicate ? '• Comprobante duplicado (hash ya existente)' : ''}\n` +
    `${details.keywords && details.keywords.length >= 2 ? `• Múltiples señales de alerta: ${details.keywords.join(', ')}` : ''}\n\n` +
    `🛑 Requiere revisión obligatoria antes de aprobar.`
};

/**
 * Send alert to admin
 * @param {object} bot - Telegraf bot instance or telegram context
 * @param {string} alertType - Type of alert (suspicious/fraud)
 * @param {string} username - Username of the user
 * @param {number} userId - Telegram ID of the user
 * @param {object} details - Additional details
 */
async function sendAdminAlert(bot, alertType, username, userId, details = {}) {
  const adminId = auth.getAdminId();
  
  if (!adminId) {
    console.error('Admin ID not configured, cannot send alert');
    return false;
  }
  
  let message = '';
  
  switch (alertType) {
    case ALERT_TYPES.SUSPICIOUS:
      message = ALERT_MESSAGES.SUSPICIOUS(username, userId, details);
      break;
    case ALERT_TYPES.FRAUD:
      message = ALERT_MESSAGES.FRAUD(username, userId, details);
      break;
    default:
      console.error('Unknown alert type:', alertType);
      return false;
  }
  
  try {
    // bot can be either a Telegraf bot instance or ctx.telegram
    const telegram = bot.telegram || bot;
    
    await telegram.sendMessage(adminId, message, {
      parse_mode: 'Markdown'
    });
    
    return true;
  } catch (error) {
    console.error('Error sending admin alert:', error);
    return false;
  }
}

/**
 * Send suspicious receipt alert
 * @param {object} bot - Bot instance or telegram context
 * @param {string} username - Username
 * @param {number} userId - Telegram ID
 * @param {object} details - { topupId, keywords }
 */
async function alertSuspiciousReceipt(bot, username, userId, details) {
  return sendAdminAlert(bot, ALERT_TYPES.SUSPICIOUS, username, userId, details);
}

/**
 * Send fraud receipt alert
 * @param {object} bot - Bot instance or telegram context
 * @param {string} username - Username
 * @param {number} userId - Telegram ID
 * @param {object} details - { topupId, keywords, isDuplicate }
 */
async function alertFraudReceipt(bot, username, userId, details) {
  return sendAdminAlert(bot, ALERT_TYPES.FRAUD, username, userId, details);
}

/**
 * Send generic admin notification
 * @param {object} bot - Bot instance or telegram context
 * @param {string} message - Message to send
 */
async function notifyAdmin(bot, message) {
  const adminId = auth.getAdminId();
  
  if (!adminId) {
    console.error('Admin ID not configured');
    return false;
  }
  
  try {
    const telegram = bot.telegram || bot;
    await telegram.sendMessage(adminId, message, { parse_mode: 'Markdown' });
    return true;
  } catch (error) {
    console.error('Error notifying admin:', error);
    return false;
  }
}

module.exports = {
  sendAdminAlert,
  alertSuspiciousReceipt,
  alertFraudReceipt,
  notifyAdmin,
  ALERT_TYPES
};
