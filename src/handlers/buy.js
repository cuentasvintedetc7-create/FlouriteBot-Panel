const auth = require('../utils/auth');
const db = require('../utils/db');
const products = require('../../data/products.json');
const { buyMenu } = require('../keyboards/buyMenu');
const { productMenu, durationMenu } = require('../keyboards/productMenu');
const { mainMenuInline } = require('../keyboards/mainMenu');
const { formatBalance, formatPrice, formatDuration, getProductName, getCategoryName, getProductDisplayName } = require('../utils/format');

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
  
  // Category selection - show product (freefire, gbox, cod)
  bot.action(/^category_(freefire|gbox|cod)$/, (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const categoryKey = ctx.match[1];
    const productConfig = products.products[categoryKey];
    
    if (!productConfig) {
      return ctx.answerCbQuery('❌ Category not found');
    }
    
    return ctx.editMessageText(
      `📂 *${productConfig.name}*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Select product:`,
      {
        parse_mode: 'Markdown',
        ...productMenu(categoryKey)
      }
    );
  });
  
  // Product selection - show durations (freefire, gbox, cod)
  bot.action(/^product_(freefire|gbox|cod)$/, (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const categoryKey = ctx.match[1];
    const productConfig = products.products[categoryKey];
    
    if (!productConfig) {
      return ctx.answerCbQuery('❌ Product not found');
    }
    
    // Get display name using shared mapping
    const displayName = getProductDisplayName(categoryKey);
    
    // Check if user is reseller to show stock info
    const isReseller = auth.isReseller(ctx.from.id);
    
    // Get duration menu - returns null if all durations are out of stock
    const menu = durationMenu(categoryKey, isReseller);
    
    if (!menu) {
      // All durations are out of stock
      return ctx.editMessageText(
        `📦 *${displayName}*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `📂 Category: *${productConfig.name}*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `⚠️ Out of stock for this product. Please contact support.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Back', callback_data: `category_${categoryKey}` }]
            ]
          }
        }
      );
    }
    
    return ctx.editMessageText(
      `📦 *${displayName}*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📂 Category: *${productConfig.name}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Select duration:`,
      {
        parse_mode: 'Markdown',
        ...menu
      }
    );
  });
  
  // Handle out of stock selection
  bot.action(/^no_stock_(freefire|gbox|cod)_(.+)$/, (ctx) => {
    return ctx.answerCbQuery('❌ This duration is out of stock', { show_alert: true });
  });
  
  // Duration selection - show confirmation
  bot.action(/^duration_(freefire|gbox|cod)_(1day|7days|30days|1year)$/, (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const categoryKey = ctx.match[1];
    const duration = ctx.match[2];
    const productConfig = products.products[categoryKey];
    
    if (!productConfig || !productConfig.durations[duration]) {
      return ctx.answerCbQuery('❌ Invalid selection');
    }
    
    const price = productConfig.durations[duration];
    const user = auth.getLoggedInUser(ctx.from.id);
    
    // Get category and product names using shared mappings
    const categoryName = getCategoryName(categoryKey);
    const productName = getProductName(categoryKey);
    
    // Validate stock before showing confirmation (prevent race conditions)
    const stock = db.getStockCount(categoryName, productName, duration);
    
    if (stock === 0) {
      return ctx.answerCbQuery('❌ Out of stock. Try again later.', { show_alert: true });
    }
    
    // Store purchase info in session
    auth.setLoginSession(ctx.from.id, {
      pendingPurchase: {
        categoryKey,
        categoryName,
        productName,
        duration,
        originalPrice: price
      }
    });
    
    return ctx.editMessageText(
      `🛒 *CONFIRM PURCHASE*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📂 Category: *${categoryName}*\n` +
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
            [{ text: '⬅️ Back', callback_data: `product_${categoryKey}` }]
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
    
    const { categoryName, productName, duration } = session.pendingPurchase;
    
    // Re-validate stock before proceeding
    const stock = db.getStockCount(categoryName, productName, duration);
    if (stock === 0) {
      return ctx.answerCbQuery('❌ Out of stock. Try again later.', { show_alert: true });
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
    
    const { categoryKey, categoryName, productName, duration, originalPrice } = session.pendingPurchase;
    const user = auth.getLoggedInUser(ctx.from.id);
    const stock = db.getStockCount(categoryName, productName, duration);
    
    // Re-validate stock before showing confirmation
    if (stock === 0) {
      // Clear session and notify user
      auth.clearLoginSession(ctx.from.id);
      return ctx.editMessageText(
        `❌ *Out of stock*\n\n` +
        `This product is no longer available. Please try again later.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Back to Products', callback_data: 'buy' }]
            ]
          }
        }
      );
    }
    
    // Clear promo step
    auth.setLoginSession(ctx.from.id, { 
      pendingPurchase: session.pendingPurchase 
    });
    
    return ctx.editMessageText(
      `🛒 *CONFIRM PURCHASE*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📂 Category: *${categoryName}*\n` +
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
            [{ text: '⬅️ Back', callback_data: `product_${categoryKey}` }]
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
    
    const { categoryKey, categoryName, productName, duration, originalPrice, discountedPrice, promoCode } = session.pendingPurchase;
    const finalPrice = discountedPrice !== undefined ? discountedPrice : originalPrice;
    
    const user = auth.getLoggedInUser(telegramId);
    
    // Re-validate stock before purchase (prevent race conditions)
    const currentStock = db.getStockCount(categoryName, productName, duration);
    if (currentStock === 0) {
      return ctx.answerCbQuery('❌ Out of stock. Try again later.', { show_alert: true });
    }
    
    // Check balance
    if (user.balance < finalPrice) {
      return ctx.answerCbQuery(`❌ Insufficient balance! You need ${formatBalance(finalPrice)}`, { show_alert: true });
    }
    
    // Try to get key from stock - this is the ONLY place that removes a key
    const key = db.takeFromStock(categoryName, productName, duration);
    
    // Block purchase if no key available (stock exhausted between check and take)
    if (!key) {
      return ctx.answerCbQuery('❌ Out of stock. Try again later.', { show_alert: true });
    }
    
    // Deduct balance
    db.addBalance(user.username, -finalPrice);
    
    // Record purchase
    db.addPurchase(telegramId, user.username, categoryName, productName, duration, key, finalPrice);
    
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
      `📂 Category: *${categoryName}*\n` +
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
    
    const { categoryKey, categoryName, productName, duration, originalPrice } = session.pendingPurchase;
    
    // Re-validate stock before processing promo code
    const stock = db.getStockCount(categoryName, productName, duration);
    if (stock === 0) {
      auth.clearLoginSession(telegramId);
      return ctx.reply(
        `❌ *Out of stock*\n\n` +
        `This product is no longer available. Please try again later.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Back to Products', callback_data: 'buy' }]
            ]
          }
        }
      );
    }
    
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
