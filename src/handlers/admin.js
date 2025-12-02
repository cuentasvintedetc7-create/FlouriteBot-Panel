const { Markup } = require('telegraf');
const auth = require('../utils/auth');
const db = require('../utils/db');
const config = require('../../config.json');
const { formatBalance, formatStockSummary, formatDate } = require('../utils/format');
const { generateKeys } = require('../utils/generateKey');
const { adminPanelMenu } = require('../keyboards/mainMenu');

function setupAdminHandler(bot) {
  // Admin command - show panel with inline buttons
  bot.command('admin', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    return ctx.reply(
      `👑 *ADMIN PANEL*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Welcome to the administration panel.\n` +
      `Select an option below:`,
      {
        parse_mode: 'Markdown',
        ...adminPanelMenu()
      }
    );
  });
  
  // Admin panel actions
  bot.action('admin_users', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.answerCbQuery('❌ Not authorized');
    }
    
    return ctx.editMessageText(
      `👥 *MANAGE USERS*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Commands:\n` +
      `/createuser USERNAME PASSWORD - Create user\n` +
      `/createuser USERNAME PASSWORD ROLE - Create with role\n` +
      `/deleteuser USERNAME - Delete user\n` +
      `/users - List all users\n\n` +
      `Roles: admin, staff, reseller, support, user`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback('⬅️ Back to Admin', 'back_admin')]
          ]
        }
      }
    );
  });
  
  bot.action('admin_stock', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.answerCbQuery('❌ Not authorized');
    }
    
    const stock = db.getStock();
    const summary = formatStockSummary(stock);
    
    return ctx.editMessageText(
      `📦 *MANAGE STOCK*\n\n` +
      summary + `\n` +
      `Commands:\n` +
      `/createstock PRODUCT KEYTYPE DURATION AMOUNT`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback('⬅️ Back to Admin', 'back_admin')]
          ]
        }
      }
    );
  });
  
  bot.action('admin_add_balance', (ctx) => {
    if (!auth.isAdmin(ctx.from.id) && !auth.isStaff(ctx.from.id)) {
      return ctx.answerCbQuery('❌ Not authorized');
    }
    
    return ctx.editMessageText(
      `➕ *ADD BALANCE*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Use: /addbalance USERNAME AMOUNT\n\n` +
      `Example: /addbalance demo 50`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback('⬅️ Back to Admin', 'back_admin')]
          ]
        }
      }
    );
  });
  
  bot.action('admin_remove_balance', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.answerCbQuery('❌ Not authorized');
    }
    
    return ctx.editMessageText(
      `➖ *REMOVE BALANCE*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Use: /removebalance USERNAME AMOUNT\n\n` +
      `Example: /removebalance demo 20`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback('⬅️ Back to Admin', 'back_admin')]
          ]
        }
      }
    );
  });
  
  bot.action('admin_purchases', (ctx) => {
    if (!auth.isAdmin(ctx.from.id) && !auth.isStaff(ctx.from.id)) {
      return ctx.answerCbQuery('❌ Not authorized');
    }
    
    const purchases = db.getPurchases();
    const recent = purchases.slice(-10).reverse();
    
    let message = `🛍️ *RECENT PURCHASES*\n\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (recent.length === 0) {
      message += `No purchases yet.`;
    } else {
      recent.forEach((p, i) => {
        message += `*#${p.id}* - ${p.username}\n`;
        message += `📦 ${p.product} | ${p.duration}\n`;
        message += `💰 ${formatBalance(p.price)}\n\n`;
      });
      message += `_Total: ${purchases.length} purchases_`;
    }
    
    return ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [Markup.button.callback('⬅️ Back to Admin', 'back_admin')]
        ]
      }
    });
  });
  
  bot.action('admin_topups', (ctx) => {
    if (!auth.isAdmin(ctx.from.id) && !auth.isStaff(ctx.from.id)) {
      return ctx.answerCbQuery('❌ Not authorized');
    }
    
    const pending = db.getPendingTopups();
    
    let message = `💰 *PENDING TOP-UPS*\n\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (pending.length === 0) {
      message += `No pending top-up requests.`;
    } else {
      pending.forEach((t, i) => {
        message += `*#${t.id}* - ${t.username}\n`;
        message += `💳 ${t.method}\n`;
        message += `📅 ${formatDate(t.date)}\n\n`;
      });
    }
    
    return ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [Markup.button.callback('🔄 Refresh', 'admin_topups')],
          [Markup.button.callback('⬅️ Back to Admin', 'back_admin')]
        ]
      }
    });
  });
  
  bot.action('admin_promo', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.answerCbQuery('❌ Not authorized');
    }
    
    const codes = db.getPromoCodes();
    
    let message = `🎁 *PROMO CODES*\n\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (codes.length === 0) {
      message += `No promo codes created yet.\n\n`;
    } else {
      codes.forEach(c => {
        const status = c.active ? '✅' : '❌';
        const discount = c.discountType === 'percentage' ? `${c.amount}%` : formatBalance(c.amount);
        message += `${status} \`${c.code}\` - ${discount}\n`;
        message += `   Uses: ${c.usedBy.length}/${c.maxUses || '∞'}\n`;
      });
      message += `\n`;
    }
    
    message += `*Commands:*\n` +
      `/createpromo CODE TYPE AMOUNT [MAX_USES] [EXPIRES]\n` +
      `/deletepromo CODE\n` +
      `/disablepromo CODE\n` +
      `/enablepromo CODE\n\n` +
      `Types: percentage, fixed\n` +
      `Example: /createpromo SAVE10 percentage 10 100`;
    
    return ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [Markup.button.callback('⬅️ Back to Admin', 'back_admin')]
        ]
      }
    });
  });
  
  bot.action('admin_broadcast', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.answerCbQuery('❌ Not authorized');
    }
    
    return ctx.editMessageText(
      `📢 *BROADCAST*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Send a message to all users:\n\n` +
      `/broadcast Your message here\n\n` +
      `_The message will be sent clean (without /broadcast prefix)_`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback('⬅️ Back to Admin', 'back_admin')]
          ]
        }
      }
    );
  });
  
  bot.action('admin_stats', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.answerCbQuery('❌ Not authorized');
    }
    
    const users = db.getUsers();
    const purchases = db.getPurchases();
    const topups = db.getTopups();
    const pending = db.getPendingTopups();
    
    const totalRevenue = purchases.reduce((sum, p) => sum + (p.price || 0), 0);
    const linkedUsers = users.filter(u => u.telegramId).length;
    
    return ctx.editMessageText(
      `📊 *STATISTICS*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👥 *Users:*\n` +
      `   Total: ${users.length}\n` +
      `   Linked: ${linkedUsers}\n\n` +
      `🛍️ *Purchases:*\n` +
      `   Total: ${purchases.length}\n` +
      `   Revenue: ${formatBalance(totalRevenue)}\n\n` +
      `💰 *Top-ups:*\n` +
      `   Completed: ${topups.length}\n` +
      `   Pending: ${pending.length}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback('⬅️ Back to Admin', 'back_admin')]
          ]
        }
      }
    );
  });
  
  bot.action('admin_settings', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.answerCbQuery('❌ Not authorized');
    }
    
    const productList = Object.keys(config.products).join(', ');
    let priceInfo = '';
    
    for (const [productName, productConfig] of Object.entries(config.products)) {
      priceInfo += `\n*${productName}* (${productConfig.keyType}):\n`;
      for (const [duration, price] of Object.entries(productConfig.durations)) {
        priceInfo += `   ${duration}: $${price.toFixed(2)}\n`;
      }
    }
    
    return ctx.editMessageText(
      `🔧 *SETTINGS*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Current Configuration:\n\n` +
      `Products: ${productList}\n` +
      `${priceInfo}\n` +
      `_Edit config.json to change settings_`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback('⬅️ Back to Admin', 'back_admin')]
          ]
        }
      }
    );
  });
  
  bot.action('admin_roles', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.answerCbQuery('❌ Not authorized');
    }
    
    const users = db.getUsers();
    const admins = users.filter(u => u.role === 'admin');
    const staff = users.filter(u => u.role === 'staff');
    const resellers = users.filter(u => u.role === 'reseller');
    const support = users.filter(u => u.role === 'support');
    
    let message = `👥 *MANAGE ROLES*\n\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `*Admins (${admins.length}):*\n`;
    admins.forEach(u => message += `   • ${u.username}\n`);
    
    message += `\n*Staff (${staff.length}):*\n`;
    staff.forEach(u => message += `   • ${u.username}\n`);
    
    message += `\n*Resellers (${resellers.length}):*\n`;
    resellers.forEach(u => message += `   • ${u.username}\n`);
    
    message += `\n*Support (${support.length}):*\n`;
    support.forEach(u => message += `   • ${u.username}\n`);
    
    message += `\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*Commands:*\n` +
      `/setrole USERNAME ROLE\n` +
      `/listroles\n\n` +
      `Roles: admin, staff, reseller, support, user`;
    
    return ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [Markup.button.callback('⬅️ Back to Admin', 'back_admin')]
        ]
      }
    });
  });
  
  bot.action('back_admin', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.answerCbQuery('❌ Not authorized');
    }
    
    return ctx.editMessageText(
      `👑 *ADMIN PANEL*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Welcome to the administration panel.\n` +
      `Select an option below:`,
      {
        parse_mode: 'Markdown',
        ...adminPanelMenu()
      }
    );
  });
  
  // Create user command - now supports role
  bot.command('createuser', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 2) {
      return ctx.reply('❌ Usage: /createuser USERNAME PASSWORD [ROLE]\n\nRoles: admin, staff, reseller, support, user');
    }
    
    const [username, password, role = 'user'] = args;
    
    // Validate role
    const validRoles = ['admin', 'staff', 'reseller', 'support', 'user'];
    if (!validRoles.includes(role.toLowerCase())) {
      return ctx.reply(`❌ Invalid role. Valid roles: ${validRoles.join(', ')}`);
    }
    
    // Check if user already exists
    if (db.findUserByUsername(username)) {
      return ctx.reply('❌ User already exists.');
    }
    
    const user = db.createUser(username, password);
    db.updateUser(username, { role: role.toLowerCase() });
    
    return ctx.reply(
      `✅ *User Created*\n\n` +
      `📛 Username: \`${user.username}\`\n` +
      `🔐 Password: \`${password}\`\n` +
      `👤 Role: ${role.toLowerCase()}\n` +
      `💰 Balance: ${formatBalance(user.balance)}`,
      { parse_mode: 'Markdown' }
    );
  });
  
  // Delete user command
  bot.command('deleteuser', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 1) {
      return ctx.reply('❌ Usage: /deleteuser USERNAME');
    }
    
    const username = args[0];
    
    // Check if user exists
    if (!db.findUserByUsername(username)) {
      return ctx.reply('❌ User not found.');
    }
    
    db.deleteUser(username);
    
    return ctx.reply(`✅ User \`${username}\` has been deleted.`, { parse_mode: 'Markdown' });
  });
  
  // Add balance command
  bot.command('addbalance', async (ctx) => {
    if (!auth.isAdmin(ctx.from.id) && !auth.isStaff(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 2) {
      return ctx.reply('❌ Usage: /addbalance USERNAME AMOUNT');
    }
    
    const [username, amountStr] = args;
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('❌ Invalid amount. Please provide a positive number.');
    }
    
    // Check if user exists
    const user = db.findUserByUsername(username);
    if (!user) {
      return ctx.reply('❌ User not found.');
    }
    
    const updatedUser = db.addBalance(username, amount);
    
    // Log the topup
    db.addTopup(username, amount, 'Admin');
    
    // Notify user if they have telegram linked
    if (user.telegramId) {
      try {
        await ctx.telegram.sendMessage(
          user.telegramId,
          `💰 *Balance Added!*\n\n` +
          `➕ Amount: ${formatBalance(amount)}\n` +
          `💵 New Balance: ${formatBalance(updatedUser.balance)}\n\n` +
          `Added by Admin.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        // User may have blocked the bot
      }
    }
    
    return ctx.reply(
      `✅ *Balance Updated*\n\n` +
      `📛 User: \`${username}\`\n` +
      `➕ Added: ${formatBalance(amount)}\n` +
      `💰 New Balance: ${formatBalance(updatedUser.balance)}`,
      { parse_mode: 'Markdown' }
    );
  });
  
  // Remove balance command (NEW)
  bot.command('removebalance', async (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 2) {
      return ctx.reply('❌ Usage: /removebalance USERNAME AMOUNT');
    }
    
    const [username, amountStr] = args;
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('❌ Invalid amount. Please provide a positive number.');
    }
    
    // Check if user exists
    const user = db.findUserByUsername(username);
    if (!user) {
      return ctx.reply('❌ User not found.');
    }
    
    const updatedUser = db.removeBalance(username, amount);
    const actualRemoved = user.balance - updatedUser.balance;
    
    // Notify user if they have telegram linked
    if (user.telegramId) {
      try {
        await ctx.telegram.sendMessage(
          user.telegramId,
          `💰 *Balance Removed*\n\n` +
          `➖ Amount: ${formatBalance(actualRemoved)}\n` +
          `💵 New Balance: ${formatBalance(updatedUser.balance)}\n\n` +
          `Removed by Admin.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        // User may have blocked the bot
      }
    }
    
    return ctx.reply(
      `✅ *Balance Updated*\n\n` +
      `📛 User: \`${username}\`\n` +
      `➖ Removed: ${formatBalance(actualRemoved)}\n` +
      `💰 New Balance: ${formatBalance(updatedUser.balance)}`,
      { parse_mode: 'Markdown' }
    );
  });
  
  // Set role command (NEW)
  bot.command('setrole', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 2) {
      return ctx.reply('❌ Usage: /setrole USERNAME ROLE\n\nRoles: admin, staff, reseller, support, user');
    }
    
    const [username, role] = args;
    
    // Validate role
    const validRoles = ['admin', 'staff', 'reseller', 'support', 'user'];
    if (!validRoles.includes(role.toLowerCase())) {
      return ctx.reply(`❌ Invalid role. Valid roles: ${validRoles.join(', ')}`);
    }
    
    // Check if user exists
    const user = db.findUserByUsername(username);
    if (!user) {
      return ctx.reply('❌ User not found.');
    }
    
    db.updateUser(username, { role: role.toLowerCase() });
    
    return ctx.reply(
      `✅ *Role Updated*\n\n` +
      `📛 User: \`${username}\`\n` +
      `👤 New Role: ${role.toLowerCase()}`,
      { parse_mode: 'Markdown' }
    );
  });
  
  // List roles command
  bot.command('listroles', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const users = db.getUsers();
    
    let message = `👥 *Users by Role*\n\n`;
    
    const roles = ['admin', 'staff', 'reseller', 'support', 'user'];
    
    roles.forEach(role => {
      const roleUsers = users.filter(u => (u.role || 'user') === role);
      if (roleUsers.length > 0) {
        message += `*${role.toUpperCase()} (${roleUsers.length}):*\n`;
        roleUsers.forEach(u => {
          message += `   • ${u.username} - ${formatBalance(u.balance)}\n`;
        });
        message += `\n`;
      }
    });
    
    return ctx.reply(message, { parse_mode: 'Markdown' });
  });
  
  // Promo code commands
  bot.command('createpromo', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 3) {
      return ctx.reply(
        '❌ Usage: /createpromo CODE TYPE AMOUNT [MAX_USES] [EXPIRES]\n\n' +
        'Types: percentage, fixed\n' +
        'Example: /createpromo SAVE10 percentage 10 100\n' +
        'Example: /createpromo GIFT5 fixed 5 50 2025-12-31'
      );
    }
    
    const [code, type, amountStr, maxUsesStr, expiresAt] = args;
    const amount = parseFloat(amountStr);
    const maxUses = maxUsesStr ? parseInt(maxUsesStr) : 0;
    
    if (!['percentage', 'fixed'].includes(type.toLowerCase())) {
      return ctx.reply('❌ Invalid type. Use: percentage or fixed');
    }
    
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('❌ Invalid amount.');
    }
    
    // Check if code already exists
    if (db.findPromoCode(code)) {
      return ctx.reply('❌ Promo code already exists.');
    }
    
    const promo = db.createPromoCode(
      code.toUpperCase(),
      type.toLowerCase(),
      amount,
      0, // minPurchase
      maxUses,
      expiresAt || null
    );
    
    const discount = promo.discountType === 'percentage' ? `${promo.amount}%` : formatBalance(promo.amount);
    
    return ctx.reply(
      `✅ *Promo Code Created*\n\n` +
      `🎁 Code: \`${promo.code}\`\n` +
      `💰 Discount: ${discount}\n` +
      `📊 Max Uses: ${promo.maxUses || 'Unlimited'}\n` +
      `📅 Expires: ${promo.expiresAt || 'Never'}`,
      { parse_mode: 'Markdown' }
    );
  });
  
  bot.command('deletepromo', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 1) {
      return ctx.reply('❌ Usage: /deletepromo CODE');
    }
    
    const code = args[0];
    
    if (!db.findPromoCode(code)) {
      return ctx.reply('❌ Promo code not found.');
    }
    
    db.deletePromoCode(code);
    
    return ctx.reply(`✅ Promo code \`${code.toUpperCase()}\` deleted.`, { parse_mode: 'Markdown' });
  });
  
  bot.command('disablepromo', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 1) {
      return ctx.reply('❌ Usage: /disablepromo CODE');
    }
    
    const code = args[0];
    
    if (!db.findPromoCode(code)) {
      return ctx.reply('❌ Promo code not found.');
    }
    
    db.updatePromoCode(code, { active: false });
    
    return ctx.reply(`✅ Promo code \`${code.toUpperCase()}\` disabled.`, { parse_mode: 'Markdown' });
  });
  
  bot.command('enablepromo', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 1) {
      return ctx.reply('❌ Usage: /enablepromo CODE');
    }
    
    const code = args[0];
    
    if (!db.findPromoCode(code)) {
      return ctx.reply('❌ Promo code not found.');
    }
    
    db.updatePromoCode(code, { active: true });
    
    return ctx.reply(`✅ Promo code \`${code.toUpperCase()}\` enabled.`, { parse_mode: 'Markdown' });
  });
  
  // Stock command
  bot.command('stock', (ctx) => {
    if (!auth.isAdmin(ctx.from.id) && !auth.isReseller(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const stock = db.getStock();
    const summary = formatStockSummary(stock);
    
    return ctx.reply(summary, { parse_mode: 'Markdown' });
  });
  
  // Create stock command
  bot.command('createstock', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 3) {
      // Build help message with valid products and durations
      let helpMsg = '❌ Usage: /createstock PRODUCT DURATION AMOUNT\n\n';
      helpMsg += '*Available Products:*\n';
      
      for (const [productName, productConfig] of Object.entries(config.products)) {
        const durations = Object.keys(productConfig.durations).join(', ');
        helpMsg += `• ${productName}\n   Key Type: ${productConfig.keyType}\n   Durations: ${durations}\n`;
      }
      
      helpMsg += '\n*Examples:*\n';
      helpMsg += '`/createstock Free Fire (iOS) 1day 10`\n';
      helpMsg += '`/createstock Gbox 365days 5`\n';
      helpMsg += '`/createstock COD (iOS) 31days 10`';
      
      return ctx.reply(helpMsg, { parse_mode: 'Markdown' });
    }
    
    // Parse arguments - handle multi-word product names
    let product, duration, amount;
    const messageText = ctx.message.text.replace('/createstock ', '');
    
    // Try to match known products
    const productNames = Object.keys(config.products);
    
    for (const p of productNames) {
      if (messageText.startsWith(p)) {
        product = p;
        const remaining = messageText.replace(p, '').trim().split(' ');
        duration = remaining[0];
        amount = parseInt(remaining[1]);
        break;
      }
    }
    
    if (!product) {
      return ctx.reply('❌ Invalid product. Use /createstock to see available products.');
    }
    
    const productConfig = config.products[product];
    
    // Validate duration
    if (!productConfig.durations[duration]) {
      const validDurations = Object.keys(productConfig.durations).join(', ');
      return ctx.reply(`❌ Invalid duration for ${product}. Valid durations: ${validDurations}`);
    }
    
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('❌ Invalid amount. Please provide a positive number.');
    }
    
    const keyType = productConfig.keyType;
    
    // Generate keys
    const keys = generateKeys(keyType, amount);
    
    // Add to stock
    db.addToStock(product, keyType, duration, keys);
    
    return ctx.reply(
      `✅ *Stock Created*\n\n` +
      `📦 Product: ${product}\n` +
      `🔑 Type: ${keyType}\n` +
      `⏱️ Duration: ${duration}\n` +
      `📊 Amount: ${amount} keys\n\n` +
      `Keys generated and added to stock.`,
      { parse_mode: 'Markdown' }
    );
  });
  
  // Broadcast command - improved to send clean messages
  bot.command('broadcast', async (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const message = ctx.message.text.replace('/broadcast ', '').trim();
    
    if (!message || message === '/broadcast') {
      return ctx.reply('❌ Usage: /broadcast MESSAGE');
    }
    
    const users = db.getUsers();
    let sent = 0;
    let failed = 0;
    
    for (const user of users) {
      if (user.telegramId) {
        try {
          // Send ONLY the clean message without any prefix
          await ctx.telegram.sendMessage(
            user.telegramId,
            message,
            { parse_mode: 'Markdown' }
          );
          sent++;
        } catch (error) {
          failed++;
        }
      }
    }
    
    // Log the broadcast
    db.addBroadcast(message, sent);
    
    return ctx.reply(
      `📢 *Broadcast Complete*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ Sent: ${sent}\n` +
      `❌ Failed: ${failed}\n` +
      `📊 Total Users: ${users.length}`,
      { parse_mode: 'Markdown' }
    );
  });
  
  // List users command
  bot.command('users', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const users = db.getUsers();
    
    let message = `👥 *User List* (${users.length} total)\n\n`;
    
    users.forEach((user, index) => {
      const linked = user.telegramId ? '✅' : '❌';
      const role = user.role ? `[${user.role}]` : '';
      message += `${index + 1}. \`${user.username}\` ${role} - ${formatBalance(user.balance)} ${linked}\n`;
    });
    
    message += `\n_✅ = Linked to Telegram, ❌ = Not linked_`;
    
    return ctx.reply(message, { parse_mode: 'Markdown' });
  });
}

module.exports = { setupAdminHandler };
