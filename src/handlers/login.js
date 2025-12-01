const auth = require('../utils/auth');
const db = require('../utils/db');
const { mainMenu } = require('../keyboards/mainMenu');

function setupLoginHandler(bot) {
  // Login command
  bot.command('login', (ctx) => {
    const telegramId = ctx.from.id;
    
    // Check if already logged in
    if (auth.isLoggedIn(telegramId)) {
      return ctx.reply('✅ You are already logged in!', mainMenu());
    }
    
    // Start login process
    auth.setLoginSession(telegramId, { step: 'awaiting_login' });
    return ctx.reply('📝 Please enter your LOGIN:');
  });
  
  // Handle text messages for login process
  bot.on('text', (ctx, next) => {
    const telegramId = ctx.from.id;
    const session = auth.getLoginSession(telegramId);
    const text = ctx.message.text;
    
    // Skip if no login session or is a command
    if (!session.step || text.startsWith('/')) {
      return next();
    }
    
    // Handle login step
    if (session.step === 'awaiting_login') {
      // Check if user exists
      const user = db.findUserByLogin(text);
      if (!user) {
        auth.clearLoginSession(telegramId);
        return ctx.reply('❌ User not found. Please try again with /login');
      }
      
      // Check if user is already linked to another telegram account
      if (user.telegramId && user.telegramId !== telegramId) {
        auth.clearLoginSession(telegramId);
        return ctx.reply('❌ This account is already linked to another Telegram account.');
      }
      
      auth.setLoginSession(telegramId, { step: 'awaiting_password', login: text });
      return ctx.reply('🔐 Please enter your PASSWORD:');
    }
    
    // Handle password step
    if (session.step === 'awaiting_password') {
      const user = auth.validateCredentials(session.login, text);
      
      if (user) {
        // Link telegram account
        auth.loginUser(telegramId, session.login);
        auth.clearLoginSession(telegramId);
        
        return ctx.reply(
          `✅ Welcome, ${session.login}!\n\n` +
          `💰 Your balance: $${user.balance.toFixed(2)}\n\n` +
          `Use the menu below to navigate.`,
          mainMenu()
        );
      } else {
        auth.clearLoginSession(telegramId);
        return ctx.reply('❌ Invalid password. Please try again with /login');
      }
    }
    
    return next();
  });
  
  // Logout command
  bot.command('logout', (ctx) => {
    const telegramId = ctx.from.id;
    
    if (!auth.isLoggedIn(telegramId)) {
      return ctx.reply('❌ You are not logged in.');
    }
    
    auth.logoutUser(telegramId);
    return ctx.reply('👋 You have been logged out. Use /login to login again.');
  });
}

module.exports = { setupLoginHandler };
