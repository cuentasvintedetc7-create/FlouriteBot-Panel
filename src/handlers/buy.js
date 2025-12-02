const auth = require('../utils/auth');
const db = require('../utils/db');
const config = require('../../config.json');
const { buyMenu } = require('../keyboards/buyMenu');
const { productMenu } = require('../keyboards/productMenu');
const { mainMenuInline } = require('../keyboards/mainMenu');
const { formatBalance, formatDuration } = require('../utils/format');
const { generateKey } = require('../utils/generateKey');

function setupBuyHandler(bot) {
  // Buy command
  bot.command('buy', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    return ctx.reply(
      '🛒 *Select a product category:*\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '📦 Choose the product you want to purchase.',
      {
        parse_mode: 'Markdown',
        ...buyMenu()
      }
    );
  });
  
  // Buy button action
  bot.action('buy', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    return ctx.editMessageText(
      '🛒 *Select a product category:*\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '📦 Choose the product you want to purchase.',
      {
        parse_mode: 'Markdown',
        ...buyMenu()
      }
    );
  });
  
  // Handle "🛒 Buy" button from keyboard (both old and new)
  bot.hears(['🛒 Buy', '🛒 Buy Product'], (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    return ctx.reply(
      '🛒 *Select a product category:*\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '📦 Choose the product you want to purchase.',
      {
        parse_mode: 'Markdown',
        ...buyMenu()
      }
    );
  });
  
  // Product selection - show durations
  bot.action(/^product_(.+)$/, (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const product = ctx.match[1];
    const productConfig = config.products[product];
    
    if (!productConfig) {
      return ctx.answerCbQuery('❌ Product not found');
    }
    
    return ctx.editMessageText(
      `📦 *${product}*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔑 Key Type: *${productConfig.keyType}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Select duration:`,
      {
        parse_mode: 'Markdown',
        ...productMenu(product)
      }
    );
  });
  
  // Duration selection - go directly to confirm (no key type selection needed)
  bot.action(/^duration_(.+)_(\d+days?)$/, (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const product = ctx.match[1];
    const duration = ctx.match[2];
    const productConfig = config.products[product];
    
    if (!productConfig || !productConfig.durations[duration]) {
      return ctx.answerCbQuery('❌ Invalid selection');
    }
    
    const price = productConfig.durations[duration];
    const keyType = productConfig.keyType;
    const user = auth.getLoggedInUser(ctx.from.id);
    const stock = db.getStockCount(product, keyType, duration);
    
    // Store purchase info in session
    auth.setLoginSession(ctx.from.id, {
      pendingPurchase: {
        product,
        duration,
        keyType,
        originalPrice: price
      }
    });
    
    return ctx.editMessageText(
      `🛒 *Confirm Purchase*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 Product: *${product}*\n` +
      `🔑 Type: *${keyType}*\n` +
      `⏱️ Duration: *${formatDuration(duration)}*\n` +
      `💰 Price: *${formatBalance(price)}*\n` +
      `📊 Stock: *${stock} available*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💵 Your Balance: *${formatBalance(user.balance)}*\n\n` +
      `Do you have a promo code?`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⭐ Apply Promo Code', callback_data: 'apply_promo' }],
            [{ text: '✅ Confirm Purchase', callback_data: 'finalize_purchase' }],
            [{ text: '⬅️ Back', callback_data: `product_${product}` }]
          ]
        }
      }
    );
  });
  
  // Apply promo code
  bot.action('apply_promo', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const session = auth.getLoginSession(ctx.from.id);
    if (!session.pendingPurchase) {
      return ctx.answerCbQuery('❌ No pending purchase');
    }
    
    auth.setLoginSession(ctx.from.id, { 
      ...session, 
      step: 'awaiting_promo_code' 
    });
    
    return ctx.editMessageText(
      `⭐ *Apply Promo Code*\n\n` +
      `Please type your promo code now:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Cancel', callback_data: 'cancel_promo' }]
          ]
        }
      }
    );
  });
  
  // Cancel promo and go back to confirm
  bot.action('cancel_promo', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const session = auth.getLoginSession(ctx.from.id);
    if (!session.pendingPurchase) {
      return ctx.answerCbQuery('❌ No pending purchase');
    }
    
    const { product, duration, keyType, originalPrice } = session.pendingPurchase;
    const user = auth.getLoggedInUser(ctx.from.id);
    const stock = db.getStockCount(product, keyType, duration);
    
    // Clear promo step
    auth.setLoginSession(ctx.from.id, { 
      pendingPurchase: session.pendingPurchase 
    });
    
    return ctx.editMessageText(
      `🛒 *Confirm Purchase*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 Product: *${product}*\n` +
      `🔑 Type: *${keyType}*\n` +
      `⏱️ Duration: *${formatDuration(duration)}*\n` +
      `💰 Price: *${formatBalance(originalPrice)}*\n` +
      `📊 Stock: *${stock} available*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💵 Your Balance: *${formatBalance(user.balance)}*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⭐ Apply Promo Code', callback_data: 'apply_promo' }],
            [{ text: '✅ Confirm Purchase', callback_data: 'finalize_purchase' }],
            [{ text: '⬅️ Back', callback_data: `product_${product}` }]
          ]
        }
      }
    );
  });
  
  // Finalize purchase
  bot.action('finalize_purchase', async (ctx) => {
    const telegramId = ctx.from.id;
    
    if (!auth.isLoggedIn(telegramId)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const session = auth.getLoginSession(telegramId);
    if (!session.pendingPurchase) {
      return ctx.answerCbQuery('❌ No pending purchase');
    }
    
    const { product, duration, keyType, originalPrice, discountedPrice, promoCode } = session.pendingPurchase;
    const finalPrice = discountedPrice !== undefined ? discountedPrice : originalPrice;
    
    const user = auth.getLoggedInUser(telegramId);
    
    // Check balance
    if (user.balance < finalPrice) {
      return ctx.answerCbQuery(`❌ Insufficient balance! You need ${formatBalance(finalPrice)}`, { show_alert: true });
    }
    
    // Try to get key from stock
    let key = db.takeFromStock(product, keyType, duration);
    
    // If no stock, generate new key
    if (!key) {
      key = generateKey(keyType);
    }
    
    // Deduct balance
    db.addBalance(user.username, -finalPrice);
    
    // Record purchase with promo code info
    db.addPurchase(telegramId, user.username, product, keyType, duration, key, finalPrice);
    
    // Mark promo code as used
    if (promoCode) {
      db.usePromoCode(promoCode, user.username);
    }
    
    // Clear session
    auth.clearLoginSession(telegramId);
    
    // Get updated balance
    const updatedUser = db.findUserByUsername(user.username);
    
    await ctx.answerCbQuery('✅ Purchase successful!');
    
    let successMessage = `✅ *Purchase Successful!*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 Product: *${product}*\n` +
      `🔑 Type: *${keyType}*\n` +
      `⏱️ Duration: *${formatDuration(duration)}*\n`;
    
    if (promoCode) {
      successMessage += `🎁 Promo: *${promoCode}*\n`;
      successMessage += `💰 Original: ~${formatBalance(originalPrice)}~\n`;
      successMessage += `💰 Final: *${formatBalance(finalPrice)}*\n`;
    } else {
      successMessage += `💰 Price: *${formatBalance(finalPrice)}*\n`;
    }
    
    successMessage += `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🔐 *Your Key:*\n\`${key}\`\n\n` +
      `💵 New Balance: *${formatBalance(updatedUser.balance)}*`;
    
    return ctx.editMessageText(successMessage, {
      parse_mode: 'Markdown',
      ...mainMenuInline()
    });
  });
  
  // Handle promo code text input
  bot.on('text', (ctx, next) => {
    const telegramId = ctx.from.id;
    const session = auth.getLoginSession(telegramId);
    const text = ctx.message.text;
    
    // Check if user is in promo code entry mode
    if (session.step !== 'awaiting_promo_code' || text.startsWith('/')) {
      return next();
    }
    
    if (!session.pendingPurchase) {
      auth.clearLoginSession(telegramId);
      return next();
    }
    
    const user = auth.getLoggedInUser(telegramId);
    if (!user) {
      return next();
    }
    
    const { product, duration, keyType, originalPrice } = session.pendingPurchase;
    
    // Validate promo code
    const validation = db.validatePromoCode(text, user.username, originalPrice);
    
    if (!validation.valid) {
      return ctx.reply(
        `❌ *Invalid Promo Code*\n\n${validation.error}\n\nPlease try another code or cancel.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Cancel', callback_data: 'cancel_promo' }]
            ]
          }
        }
      );
    }
    
    // Calculate discount
    const promo = validation.promo;
    let discount = 0;
    if (promo.discountType === 'percentage') {
      discount = originalPrice * (promo.amount / 100);
    } else {
      discount = promo.amount;
    }
    
    const discountedPrice = Math.max(0, originalPrice - discount);
    
    // Update session with discounted price
    auth.setLoginSession(telegramId, {
      pendingPurchase: {
        ...session.pendingPurchase,
        discountedPrice,
        promoCode: promo.code
      }
    });
    
    return ctx.reply(
      `✅ *Promo Code Applied!*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🎁 Code: *${promo.code}*\n` +
      `💰 Original Price: ~${formatBalance(originalPrice)}~\n` +
      `🔥 Discount: *-${formatBalance(discount)}*\n` +
      `💵 Final Price: *${formatBalance(discountedPrice)}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Confirm Purchase', callback_data: 'finalize_purchase' }],
            [{ text: '🔄 Use Different Code', callback_data: 'apply_promo' }],
            [{ text: '⬅️ Cancel', callback_data: 'cancel_promo' }]
          ]
        }
      }
    );
  });
  
  // Back to main menu
  bot.action('back_main', (ctx) => {
    const user = auth.getLoggedInUser(ctx.from.id);
    const balance = user ? formatBalance(user.balance) : '$0.00';
    
    // Clear any pending purchase
    auth.clearLoginSession(ctx.from.id);
    
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
