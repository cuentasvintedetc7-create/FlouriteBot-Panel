const auth = require('../utils/auth');
const db = require('../utils/db');
const config = require('../../config.json');
const { buyMenu } = require('../keyboards/buyMenu');
const { productMenu } = require('../keyboards/productMenu');
const { keyTypeMenu } = require('../keyboards/keyTypeMenu');
const { mainMenuInline } = require('../keyboards/mainMenu');
const { formatBalance, formatDuration } = require('../utils/format');
const { generateKey } = require('../utils/generateKey');

function setupBuyHandler(bot) {
  // Buy command
  bot.command('buy', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    return ctx.reply('🛒 *Select a product category:*', {
      parse_mode: 'Markdown',
      ...buyMenu()
    });
  });
  
  // Buy button action
  bot.action('buy', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    return ctx.editMessageText('🛒 *Select a product category:*', {
      parse_mode: 'Markdown',
      ...buyMenu()
    });
  });
  
  // Handle "🛒 Buy" button from keyboard
  bot.hears('🛒 Buy', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    return ctx.reply('🛒 *Select a product category:*', {
      parse_mode: 'Markdown',
      ...buyMenu()
    });
  });
  
  // Product selection
  bot.action(/^product_(.+)$/, (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const product = ctx.match[1];
    
    return ctx.editMessageText(`📦 *${product}*\n\nSelect duration:`, {
      parse_mode: 'Markdown',
      ...productMenu(product)
    });
  });
  
  // Duration selection
  bot.action(/^duration_(.+)_(\d+days?)$/, (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const product = ctx.match[1];
    const duration = ctx.match[2];
    const price = config.prices[duration];
    
    return ctx.editMessageText(
      `📦 *${product}*\n` +
      `⏱️ Duration: *${formatDuration(duration)}*\n` +
      `💰 Price: *${formatBalance(price)}*\n\n` +
      `Select key format:`, 
      {
        parse_mode: 'Markdown',
        ...keyTypeMenu(product, duration)
      }
    );
  });
  
  // Confirm purchase
  bot.action(/^confirm_(.+)_(\d+days?)_(.+)$/, async (ctx) => {
    const telegramId = ctx.from.id;
    
    if (!auth.isLoggedIn(telegramId)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const product = ctx.match[1];
    const duration = ctx.match[2];
    const keyType = ctx.match[3];
    const price = config.prices[duration];
    
    const user = auth.getLoggedInUser(telegramId);
    
    // Check balance
    if (user.balance < price) {
      return ctx.answerCbQuery(`❌ Insufficient balance! You need ${formatBalance(price)}`, { show_alert: true });
    }
    
    // Try to get key from stock
    let key = db.takeFromStock(product, keyType, duration);
    
    // If no stock, generate new key
    if (!key) {
      key = generateKey(keyType);
    }
    
    // Deduct balance
    db.addBalance(user.username, -price);
    
    // Record purchase
    db.addPurchase(telegramId, user.username, product, keyType, duration, key, price);
    
    // Get updated balance
    const updatedUser = db.findUserByUsername(user.username);
    
    await ctx.answerCbQuery('✅ Purchase successful!');
    
    return ctx.editMessageText(
      `✅ *Purchase Successful!*\n\n` +
      `📦 Product: *${product}*\n` +
      `🔑 Type: *${keyType}*\n` +
      `⏱️ Duration: *${formatDuration(duration)}*\n` +
      `💰 Price: *${formatBalance(price)}*\n\n` +
      `🔐 Your Key:\n\`${key}\`\n\n` +
      `💵 New Balance: *${formatBalance(updatedUser.balance)}*`,
      {
        parse_mode: 'Markdown',
        ...mainMenuInline()
      }
    );
  });
  
  // Back to main menu
  bot.action('back_main', (ctx) => {
    const user = auth.getLoggedInUser(ctx.from.id);
    const balance = user ? formatBalance(user.balance) : '$0.00';
    
    return ctx.editMessageText(
      `🏠 *Main Menu*\n\n` +
      `💰 Your balance: *${balance}*\n\n` +
      `Select an option:`,
      {
        parse_mode: 'Markdown',
        ...mainMenuInline()
      }
    );
  });
}

module.exports = { setupBuyHandler };
