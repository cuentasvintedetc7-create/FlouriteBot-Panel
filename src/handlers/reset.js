const auth = require('../utils/auth');
const db = require('../utils/db');
const products = require('../../data/products.json');
const { getProductName, getCategoryName } = require('../utils/format');

// Key format validators for each product type
const keyValidators = {
  // Flourite keys: 16 alphanumeric uppercase characters (e.g., FIUNVTFQRR99845F)
  flourite: (key) => /^[A-Z0-9]{16}$/.test(key),
  // COD keys: format COD-XXXXXXXX-XXXX
  cod: (key) => /^COD-[A-Z0-9]{8}-[A-Z0-9]{4}$/.test(key),
  // GBOX/Certificate keys: format CERT-XXXXXXXX-XXXX or 10 hex characters
  gbox: (key) => /^CERT-[A-Z0-9]{8}-[A-Z0-9]{4}$/.test(key) || /^[0-9A-Fa-f]{10}$/.test(key)
};

// Detect product type from key format
function detectProductFromKey(key) {
  if (!key || typeof key !== 'string') return null;
  const upperKey = key.toUpperCase().trim();
  
  if (keyValidators.cod(upperKey)) return 'cod';
  if (keyValidators.gbox(upperKey) || keyValidators.gbox(key.trim())) return 'gbox';
  if (keyValidators.flourite(upperKey)) return 'flourite';
  
  return null;
}

// Find a key in purchases database
function findKeyInPurchases(key) {
  const purchases = db.getPurchases();
  const normalizedKey = key.trim().toUpperCase();
  
  return purchases.find(p => {
    if (!p.key) return false;
    return p.key.toUpperCase() === normalizedKey;
  });
}

function setupResetHandler(bot) {
  // Reset command - now validates ACTUAL keys
  bot.command('reset', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length === 0) {
      return ctx.reply(
        `❌ Please provide a KEY to reset.\n\n` +
        `Usage: /reset YOUR_KEY\n\n` +
        `*Resettable Products:*\n` +
        `• FLOURITE (Free Fire iOS)\n` +
        `• Call Of Duty (COD Mobile)\n\n` +
        `⚠️ *Note:* GBOX keys cannot be reset.`,
        { parse_mode: 'Markdown' }
      );
    }
    
    const keyInput = args.join(' ').trim();
    
    // Detect product type from key format
    const productType = detectProductFromKey(keyInput);
    
    // If key format is not recognized
    if (!productType) {
      return ctx.reply(
        `❌ Invalid key format: \`${keyInput}\`\n\n` +
        `Please provide a valid key.\n\n` +
        `*Valid Key Formats:*\n` +
        `• FLOURITE: 16 alphanumeric chars (e.g., FIUNVTFQRR99845F)\n` +
        `• COD: COD-XXXXXXXX-XXXX format\n\n` +
        `⚠️ *Note:* GBOX keys cannot be reset.`,
        { parse_mode: 'Markdown' }
      );
    }
    
    // Block GBOX key resets
    if (productType === 'gbox') {
      return ctx.reply(
        `❌ GBOX/Certificate keys cannot be reset.\n\n` +
        `This is a permanent certificate and resets are not allowed.`,
        { parse_mode: 'Markdown' }
      );
    }
    
    // Find the key in purchases
    const purchase = findKeyInPurchases(keyInput);
    
    if (!purchase) {
      return ctx.reply(
        `❌ Key not found: \`${keyInput}\`\n\n` +
        `This key does not exist in our records.\n` +
        `Please verify you entered the correct key.`,
        { parse_mode: 'Markdown' }
      );
    }
    
    // Verify the key belongs to the logged in user
    const user = auth.getLoggedInUser(ctx.from.id);
    if (purchase.username.toLowerCase() !== user.username.toLowerCase()) {
      return ctx.reply(
        `❌ This key does not belong to your account.\n\n` +
        `You can only reset keys that you have purchased.`,
        { parse_mode: 'Markdown' }
      );
    }
    
    // Log the reset with the key and product info
    db.addResetLog(ctx.from.id, user.username, keyInput, {
      product: purchase.product,
      keyType: purchase.keyType,
      duration: purchase.duration,
      purchaseDate: purchase.date
    });
    
    const productName = productType === 'cod' ? 'Call Of Duty' : 'FLOURITE';
    
    return ctx.reply(
      `✅ *Key Reset Successful*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔑 Key: \`${keyInput}\`\n` +
      `📦 Product: ${productName}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Your key has been reset successfully.`,
      { parse_mode: 'Markdown' }
    );
  });
  
  // Handle "🔄 Reset Key" button from keyboard
  bot.hears('🔄 Reset Key', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    return ctx.reply(
      '🔄 *Reset Key*\n\n' +
      'To reset a key, use the command:\n' +
      '`/reset YOUR_KEY`\n\n' +
      '*Resettable Products:*\n' +
      '• FLOURITE (Free Fire iOS)\n' +
      '• Call Of Duty (COD Mobile)\n\n' +
      '⚠️ *Note:* GBOX keys cannot be reset.\n\n' +
      'Example: `/reset FIUNVTFQRR99845F`',
      { parse_mode: 'Markdown' }
    );
  });
  
  // Reset key action from inline keyboard
  bot.action('reset_key', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    return ctx.editMessageText(
      '🔄 *Reset Key*\n\n' +
      'To reset a key, use the command:\n' +
      '`/reset YOUR_KEY`\n\n' +
      '*Resettable Products:*\n' +
      '• FLOURITE (Free Fire iOS)\n' +
      '• Call Of Duty (COD Mobile)\n\n' +
      '⚠️ *Note:* GBOX keys cannot be reset.\n\n' +
      'Example: `/reset FIUNVTFQRR99845F`',
      { parse_mode: 'Markdown' }
    );
  });
}

module.exports = { setupResetHandler };
