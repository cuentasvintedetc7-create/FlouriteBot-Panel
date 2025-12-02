const auth = require('../utils/auth');
const db = require('../utils/db');
const config = require('../../config.json');
const { buyMenu } = require('../keyboards/buyMenu');
const { productMenu, durationMenu } = require('../keyboards/productMenu');
const { mainMenuInline } = require('../keyboards/mainMenu');
const { formatBalance, formatPrice, formatDuration } = require('../utils/format');
const { generateKey } = require('../utils/generateKey');

function setupBuyHandler(bot) {
  // Buy command
  bot.command('buy', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    return ctx.reply(
      '🛒 *SELECT CATEGORY*\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '📦 Choose a product category:',
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
      '🛒 *SELECT CATEGORY*\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '📦 Choose a product category:',
      {
        parse_mode: 'Markdown',
        ...buyMenu()
      }
    );
  });
  
  // Handle "🛒 Buy" button from keyboard
  bot.hears(['🛒 Buy', '🛒 Buy Product'], (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    return ctx.reply(
      '🛒 *SELECT CATEGORY*\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━\n' +
      '📦 Choose a product category:',
      {
        parse_mode: 'Markdown',
        ...buyMenu()
      }
    );
  });
  
  // Category selection - show product
  bot.action(/^category_(.+)$/, (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const category = ctx.match[1];
    const productConfig = config.products[category];
    
    if (!productConfig) {
      return ctx.answerCbQuery('❌ Category not found');
    }
    
    return ctx.editMessageText(
      `📂 *${category}*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Select product:`,
      {
        parse_mode: 'Markdown',
        ...productMenu(category)
      }
    );
  });
  
  // Product selection - show durations
  bot.action(/^product_(.+)$/, (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const category = ctx.match[1];
    const productConfig = config.products[category];
    
    if (!productConfig) {
      return ctx.answerCbQuery('❌ Product not found');
    }
    
    return ctx.editMessageText(
      `📦 *${productConfig.name}*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📂 Category: *${category}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Select duration:`,
      {
        parse_mode: 'Markdown',
        ...durationMenu(category)
      }
    );
  });
  
  // Duration selection - show confirmation
  bot.action(/^duration_(.+)_(\w+)$/, (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const category = ctx.match[1];
    const duration = ctx.match[2];
    const productConfig = config.products[category];
    
    if (!productConfig || !productConfig.durations[duration]) {
      return ctx.answerCbQuery('❌ Invalid selection');
    }
    
    const price = productConfig.durations[duration];
    const productName = productConfig.name;
    const user = auth.getLoggedInUser(ctx.from.id);
    const stock = db.getStockCount(category, productName, duration);
    
    // Store purchase info in session
    auth.setLoginSession(ctx.from.id, {
      pendingPurchase: {
        category,
        productName,
        duration,
        originalPrice: price
      }
    });
    
    return ctx.editMessageText(
      `🛒 *CONFIRM PURCHASE*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📂 Category: *${category}*\n` +
      `📦 Product: *${productName}*\n` +
      `⏱️ Duration: *${formatDuration(duration)}*\n` +
      `💰 Price: *${formatPrice(price)}*\n` +
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
            [{ text: '⬅️ Back', callback_data: `product_${category}` }]
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
      `⭐ *APPLY PROMO CODE*\n\n` +
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
    
    const { category, productName, duration, originalPrice } = session.pendingPurchase;
    const user = auth.getLoggedInUser(ctx.from.id);
    const stock = db.getStockCount(category, productName, duration);
    
    // Clear promo step
    auth.setLoginSession(ctx.from.id, { 
      pendingPurchase: session.pendingPurchase 
    });
    
    return ctx.editMessageText(
      `🛒 *CONFIRM PURCHASE*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📂 Category: *${category}*\n` +
      `📦 Product: *${productName}*\n` +
      `⏱️ Duration: *${formatDuration(duration)}*\n` +
      `💰 Price: *${formatPrice(originalPrice)}*\n` +
      `📊 Stock: *${stock} available*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💵 Your Balance: *${formatBalance(user.balance)}*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⭐ Apply Promo Code', callback_data: 'apply_promo' }],
            [{ text: '✅ Confirm Purchase', callback_data: 'finalize_purchase' }],
            [{ text: '⬅️ Back', callback_data: `product_${category}` }]
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
    
    const { category, productName, duration, originalPrice, discountedPrice, promoCode } = session.pendingPurchase;
    const finalPrice = discountedPrice !== undefined ? discountedPrice : originalPrice;
    
    const user = auth.getLoggedInUser(telegramId);
    
    // Check balance
    if (user.balance < finalPrice) {
      return ctx.answerCbQuery(`❌ Insufficient balance! You need ${formatBalance(finalPrice)}`, { show_alert: true });
    }
    
    // Try to get key from stock
    let key = db.takeFromStock(category, productName, duration);
    
    // If no stock, generate new key
    if (!key) {
      key = generateKey(productName);
    }
    
    // Deduct balance
    db.addBalance(user.username, -finalPrice);
    
    // Record purchase
    db.addPurchase(telegramId, user.username, category, productName, duration, key, finalPrice);
    
    // Mark promo code as used
    if (promoCode) {
      db.usePromoCode(promoCode, user.username);
    }
    
    // Clear session
    auth.clearLoginSession(telegramId);
    
    // Get updated balance
    const updatedUser = db.findUserByUsername(user.username);
    
    await ctx.answerCbQuery('✅ Purchase successful!');
    
    let successMessage = `✅ *PURCHASE SUCCESSFUL!*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📂 Category: *${category}*\n` +
      `📦 Product: *${productName}*\n` +
      `⏱️ Duration: *${formatDuration(duration)}*\n`;
    
    if (promoCode) {
      successMessage += `🎁 Promo: *${promoCode}*\n`;
      successMessage += `💰 Original: ~${formatPrice(originalPrice)}~\n`;
      successMessage += `💰 Final: *${formatPrice(finalPrice)}*\n`;
    } else {
      successMessage += `💰 Price: *${formatPrice(finalPrice)}*\n`;
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
    
    const { category, productName, duration, originalPrice } = session.pendingPurchase;
    
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
      `✅ *PROMO CODE APPLIED!*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🎁 Code: *${promo.code}*\n` +
      `💰 Original Price: ~${formatPrice(originalPrice)}~\n` +
      `🔥 Discount: *-${formatPrice(discount)}*\n` +
      `💵 Final Price: *${formatPrice(discountedPrice)}*\n` +
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
      `🏠 *MAIN MENU*\n\n` +
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
