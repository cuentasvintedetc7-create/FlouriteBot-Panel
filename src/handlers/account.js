const auth = require('../utils/auth');
const db = require('../utils/db');
const { accountMenu } = require('../keyboards/accountMenu');
const { mainMenuInline, mainMenu } = require('../keyboards/mainMenu');
const { formatBalance, formatPurchase, formatTopup } = require('../utils/format');

function setupAccountHandler(bot) {
  // Account command
  bot.command('account', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    const user = auth.getLoggedInUser(ctx.from.id);
    
    return ctx.reply(
      `👤 *My Account*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📛 Username: *${user.username}*\n` +
      `💰 Balance: *${formatBalance(user.balance)}*\n` +
      `📱 Phone: ${user.phone || 'Not set'}\n` +
      `👤 Role: ${user.role || 'user'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Select an option:`,
      {
        parse_mode: 'Markdown',
        ...accountMenu()
      }
    );
  });
  
  // Account button action
  bot.action('account', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const user = auth.getLoggedInUser(ctx.from.id);
    
    return ctx.editMessageText(
      `👤 *My Account*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📛 Username: *${user.username}*\n` +
      `💰 Balance: *${formatBalance(user.balance)}*\n` +
      `📱 Phone: ${user.phone || 'Not set'}\n` +
      `👤 Role: ${user.role || 'user'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Select an option:`,
      {
        parse_mode: 'Markdown',
        ...accountMenu()
      }
    );
  });
  
  // Handle "👤 Account" and "👤 My Account" button from keyboard
  bot.hears(['👤 Account', '👤 My Account'], (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    const user = auth.getLoggedInUser(ctx.from.id);
    
    return ctx.reply(
      `👤 *My Account*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📛 Username: *${user.username}*\n` +
      `💰 Balance: *${formatBalance(user.balance)}*\n` +
      `📱 Phone: ${user.phone || 'Not set'}\n` +
      `👤 Role: ${user.role || 'user'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Select an option:`,
      {
        parse_mode: 'Markdown',
        ...accountMenu()
      }
    );
  });
  
  // Handle "🧾 My Purchases" from keyboard
  bot.hears('🧾 My Purchases', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    const user = auth.getLoggedInUser(ctx.from.id);
    const purchases = db.getUserPurchases(user.username);
    
    if (purchases.length === 0) {
      return ctx.reply(
        `🛍️ *Purchase History*\n\n` +
        `No purchases yet.`,
        { parse_mode: 'Markdown' }
      );
    }
    
    // Show last 5 purchases
    const recentPurchases = purchases.slice(-5).reverse();
    let message = `🛍️ *Purchase History*\n\n`;
    
    recentPurchases.forEach((purchase, index) => {
      message += `*#${index + 1}*\n${formatPurchase(purchase)}\n\n`;
    });
    
    if (purchases.length > 5) {
      message += `_Showing last 5 of ${purchases.length} purchases_`;
    }
    
    return ctx.reply(message, { parse_mode: 'Markdown' });
  });
  
  // Balance action
  bot.action('account_balance', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const user = auth.getLoggedInUser(ctx.from.id);
    
    return ctx.editMessageText(
      `💰 *Your Balance*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Current Balance: *${formatBalance(user.balance)}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Use "💰 Add Balance" to add funds.`,
      {
        parse_mode: 'Markdown',
        ...accountMenu()
      }
    );
  });
  
  // Purchase history action
  bot.action('account_purchases', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const user = auth.getLoggedInUser(ctx.from.id);
    const purchases = db.getUserPurchases(user.username);
    
    if (purchases.length === 0) {
      return ctx.editMessageText(
        `🛍️ *Purchase History*\n\n` +
        `No purchases yet.`,
        {
          parse_mode: 'Markdown',
          ...accountMenu()
        }
      );
    }
    
    // Show last 5 purchases
    const recentPurchases = purchases.slice(-5).reverse();
    let message = `🛍️ *Purchase History*\n\n`;
    
    recentPurchases.forEach((purchase, index) => {
      message += `*#${index + 1}*\n${formatPurchase(purchase)}\n\n`;
    });
    
    if (purchases.length > 5) {
      message += `_Showing last 5 of ${purchases.length} purchases_`;
    }
    
    return ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...accountMenu()
    });
  });
  
  // Top-up history action
  bot.action('account_topups', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const user = auth.getLoggedInUser(ctx.from.id);
    const topups = db.getUserTopups(user.username);
    
    if (topups.length === 0) {
      return ctx.editMessageText(
        `💵 *Top-up History*\n\n` +
        `No top-ups yet.`,
        {
          parse_mode: 'Markdown',
          ...accountMenu()
        }
      );
    }
    
    // Show last 5 topups
    const recentTopups = topups.slice(-5).reverse();
    let message = `💵 *Top-up History*\n\n`;
    
    recentTopups.forEach((topup, index) => {
      message += `*#${index + 1}*\n${formatTopup(topup)}\n\n`;
    });
    
    if (topups.length > 5) {
      message += `_Showing last 5 of ${topups.length} top-ups_`;
    }
    
    return ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...accountMenu()
    });
  });
  
  // Redeem promocode action
  bot.action('account_redeem', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    return ctx.editMessageText(
      `🎁 *Redeem Promocode*\n\n` +
      `To redeem a promocode, use:\n` +
      `/redeem CODE\n\n` +
      `Example: \`/redeem WELCOME100\`\n\n` +
      `_Or apply promo codes during purchase!_`,
      {
        parse_mode: 'Markdown',
        ...accountMenu()
      }
    );
  });
  
  // Redeem command
  bot.command('redeem', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length === 0) {
      return ctx.reply('❌ Please provide a promocode. Usage: /redeem CODE');
    }
    
    const code = args[0];
    const user = auth.getLoggedInUser(ctx.from.id);
    
    // Validate promo code
    const validation = db.validatePromoCode(code, user.username, 0);
    
    if (!validation.valid) {
      return ctx.reply(`❌ ${validation.error}`);
    }
    
    return ctx.reply(
      `✅ *Valid Promo Code!*\n\n` +
      `🎁 Code: \`${validation.promo.code}\`\n` +
      `💰 Discount: ${validation.promo.discountType === 'percentage' ? `${validation.promo.amount}%` : formatBalance(validation.promo.amount)}\n\n` +
      `_Use this code during your next purchase!_`,
      { parse_mode: 'Markdown' }
    );
  });
}

module.exports = { setupAccountHandler };
