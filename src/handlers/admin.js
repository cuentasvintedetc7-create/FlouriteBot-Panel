const auth = require('../utils/auth');
const db = require('../utils/db');
const config = require('../../config.json');
const { formatBalance, formatStockSummary } = require('../utils/format');
const { generateKeys } = require('../utils/generateKey');

function setupAdminHandler(bot) {
  // Admin command
  bot.command('admin', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    return ctx.reply(
      `🔐 *Admin Panel*\n\n` +
      `Available commands:\n\n` +
      `👤 *User Management:*\n` +
      `/createuser USERNAME PASSWORD - Create new user\n` +
      `/deleteuser USERNAME - Delete user\n` +
      `/addbalance USERNAME AMOUNT - Add balance to user\n\n` +
      `📦 *Stock Management:*\n` +
      `/stock - View stock summary\n` +
      `/createstock PRODUCT KEYTYPE DURATION AMOUNT - Generate keys\n\n` +
      `📢 *Communication:*\n` +
      `/broadcast MESSAGE - Send message to all users\n\n` +
      `📊 *Info:*\n` +
      `/users - List all users`,
      { parse_mode: 'Markdown' }
    );
  });
  
  // Create user command
  bot.command('createuser', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 2) {
      return ctx.reply('❌ Usage: /createuser USERNAME PASSWORD');
    }
    
    const [username, password] = args;
    
    // Check if user already exists
    if (db.findUserByUsername(username)) {
      return ctx.reply('❌ User already exists.');
    }
    
    const user = db.createUser(username, password);
    
    return ctx.reply(
      `✅ *User Created*\n\n` +
      `📛 Username: \`${user.username}\`\n` +
      `🔐 Password: \`${password}\`\n` +
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
  bot.command('addbalance', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length < 2) {
      return ctx.reply('❌ Usage: /addbalance USERNAME AMOUNT');
    }
    
    const [username, amountStr] = args;
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount)) {
      return ctx.reply('❌ Invalid amount. Please provide a number.');
    }
    
    // Check if user exists
    const user = db.findUserByUsername(username);
    if (!user) {
      return ctx.reply('❌ User not found.');
    }
    
    const updatedUser = db.addBalance(username, amount);
    
    // Log the topup
    db.addTopup(username, amount, 'Admin');
    
    return ctx.reply(
      `✅ *Balance Updated*\n\n` +
      `📛 User: \`${username}\`\n` +
      `➕ Added: ${formatBalance(amount)}\n` +
      `💰 New Balance: ${formatBalance(updatedUser.balance)}`,
      { parse_mode: 'Markdown' }
    );
  });
  
  // Stock command
  bot.command('stock', (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
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
    
    if (args.length < 4) {
      return ctx.reply(
        '❌ Usage: /createstock PRODUCT KEYTYPE DURATION AMOUNT\n\n' +
        'Products: Free Fire (iOS), Gbox, COD (iOS)\n' +
        'Key Types: Flourite, BRMODS, DRIP MOBILE\n' +
        'Durations: 1day, 7days, 30days\n\n' +
        'Example: /createstock Gbox Flourite 7days 10'
      );
    }
    
    // Parse arguments - handle multi-word product names
    let product, keyType, duration, amount;
    
    // Try to match known products
    const productPatterns = ['Free Fire (iOS)', 'Gbox', 'COD (iOS)'];
    const messageText = ctx.message.text.replace('/createstock ', '');
    
    for (const p of productPatterns) {
      if (messageText.startsWith(p)) {
        product = p;
        const remaining = messageText.replace(p, '').trim().split(' ');
        
        // Check for key types
        const keyTypePatterns = ['Flourite', 'BRMODS', 'DRIP MOBILE'];
        for (const kt of keyTypePatterns) {
          const remainingText = remaining.join(' ');
          if (remainingText.startsWith(kt)) {
            keyType = kt;
            const final = remainingText.replace(kt, '').trim().split(' ');
            duration = final[0];
            amount = parseInt(final[1]);
            break;
          }
        }
        break;
      }
    }
    
    if (!product || !keyType || !duration || isNaN(amount)) {
      return ctx.reply(
        '❌ Could not parse command. Usage:\n' +
        '/createstock PRODUCT KEYTYPE DURATION AMOUNT\n\n' +
        'Example: /createstock Gbox Flourite 7days 10'
      );
    }
    
    // Validate duration
    if (!['1day', '7days', '30days'].includes(duration)) {
      return ctx.reply('❌ Invalid duration. Use: 1day, 7days, or 30days');
    }
    
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
  
  // Broadcast command
  bot.command('broadcast', async (ctx) => {
    if (!auth.isAdmin(ctx.from.id)) {
      return ctx.reply('❌ You are not authorized to use admin commands.');
    }
    
    const message = ctx.message.text.replace('/broadcast ', '');
    
    if (!message || message === '/broadcast') {
      return ctx.reply('❌ Usage: /broadcast MESSAGE');
    }
    
    const users = db.getUsers();
    let sent = 0;
    let failed = 0;
    
    for (const user of users) {
      if (user.telegramId) {
        try {
          await ctx.telegram.sendMessage(
            user.telegramId,
            `📢 *Broadcast Message*\n\n${message}`,
            { parse_mode: 'Markdown' }
          );
          sent++;
        } catch (error) {
          failed++;
        }
      }
    }
    
    return ctx.reply(
      `📢 *Broadcast Complete*\n\n` +
      `✅ Sent: ${sent}\n` +
      `❌ Failed: ${failed}`,
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
      message += `${index + 1}. \`${user.username}\` - ${formatBalance(user.balance)} ${linked}\n`;
    });
    
    message += `\n_✅ = Linked to Telegram, ❌ = Not linked_`;
    
    return ctx.reply(message, { parse_mode: 'Markdown' });
  });
}

module.exports = { setupAdminHandler };
