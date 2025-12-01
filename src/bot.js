const { Telegraf } = require('telegraf');
const config = require('../config.json');
const auth = require('./utils/auth');
const { mainMenu, mainMenuInline } = require('./keyboards/mainMenu');

// Import handlers
const { setupLoginHandler } = require('./handlers/login');
const { setupBuyHandler } = require('./handlers/buy');
const { setupAccountHandler } = require('./handlers/account');
const { setupResetHandler } = require('./handlers/reset');
const { setupAdminHandler } = require('./handlers/admin');
const { setupTopupHandler } = require('./handlers/topup');

// Create bot instance - prefer environment variable over config file
const botToken = process.env.BOT_TOKEN || config.botToken;
const bot = new Telegraf(botToken);

// Auth middleware - check if user is logged in
bot.use((ctx, next) => {
  const telegramId = ctx.from?.id;
  
  if (!telegramId) {
    return next();
  }
  
  // Allow /start, /login commands and login process without authentication
  const messageText = ctx.message?.text || '';
  const callbackData = ctx.callbackQuery?.data || '';
  
  const allowedCommands = ['/start', '/login'];
  
  if (allowedCommands.some(cmd => messageText.startsWith(cmd))) {
    return next();
  }
  
  // Check for login session (user is in login process) - includes phone step
  const session = auth.getLoginSession(telegramId);
  if (session.step === 'awaiting_login' || session.step === 'awaiting_password' || session.step === 'awaiting_phone') {
    return next();
  }
  
  // Allow contact messages during phone step
  if (ctx.message?.contact) {
    return next();
  }
  
  // Allow "Skip" button during phone step
  if (messageText === '⏭️ Skip (Continue without phone)') {
    return next();
  }
  
  // Check if logged in for other commands/actions
  if (messageText && !messageText.startsWith('/') && !auth.isLoggedIn(telegramId)) {
    // Skip non-command messages from non-logged-in users
    return;
  }
  
  if (callbackData && !auth.isLoggedIn(telegramId)) {
    return ctx.answerCbQuery('❌ You are not logged in. Use /login');
  }
  
  return next();
});

// Start command
bot.start((ctx) => {
  const telegramId = ctx.from.id;
  
  if (auth.isLoggedIn(telegramId)) {
    const user = auth.getLoggedInUser(telegramId);
    return ctx.reply(
      `👋 *Welcome back, ${user.username}!*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Balance: *$${user.balance.toFixed(2)}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Use the menu below to navigate.`,
      {
        parse_mode: 'Markdown',
        ...mainMenu()
      }
    );
  }
  
  return ctx.reply(
    `👋 *Welcome to FlouriteBot!*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `Your premium key management solution.\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `❌ You are not logged in.\n` +
    `Use /login to access your account.`,
    { parse_mode: 'Markdown' }
  );
});

// Help command
bot.command('help', (ctx) => {
  return ctx.reply(
    `❓ *Help*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*Available Commands:*\n\n` +
    `/start - Start the bot\n` +
    `/login - Login to your account\n` +
    `/logout - Logout from your account\n` +
    `/buy - Buy keys\n` +
    `/account - View account info\n` +
    `/reset KEY - Reset a key\n` +
    `/redeem CODE - Redeem a promocode\n\n` +
    `*Admin Commands:*\n` +
    `/admin - View admin panel`,
    { parse_mode: 'Markdown' }
  );
});

// Help action from inline keyboard
bot.action('help', (ctx) => {
  return ctx.editMessageText(
    `❓ *Help*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*Available Commands:*\n\n` +
    `/start - Start the bot\n` +
    `/login - Login to your account\n` +
    `/logout - Logout from your account\n` +
    `/buy - Buy keys\n` +
    `/account - View account info\n` +
    `/reset KEY - Reset a key\n` +
    `/redeem CODE - Redeem a promocode\n\n` +
    `*Admin Commands:*\n` +
    `/admin - View admin panel`,
    {
      parse_mode: 'Markdown',
      ...mainMenuInline()
    }
  );
});

// Handle "❓ Help" button from keyboard
bot.hears('❓ Help', (ctx) => {
  return ctx.reply(
    `❓ *Help*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*Available Commands:*\n\n` +
    `/start - Start the bot\n` +
    `/login - Login to your account\n` +
    `/logout - Logout from your account\n` +
    `/buy - Buy keys\n` +
    `/account - View account info\n` +
    `/reset KEY - Reset a key\n` +
    `/redeem CODE - Redeem a promocode\n\n` +
    `*Admin Commands:*\n` +
    `/admin - View admin panel`,
    { parse_mode: 'Markdown' }
  );
});

// Setup handlers
setupLoginHandler(bot);
setupBuyHandler(bot);
setupAccountHandler(bot);
setupResetHandler(bot);
setupAdminHandler(bot);
setupTopupHandler(bot);

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('❌ An error occurred. Please try again.');
});

module.exports = bot;
