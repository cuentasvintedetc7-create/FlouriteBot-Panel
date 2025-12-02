const { Markup } = require('telegraf');
const auth = require('../utils/auth');
const db = require('../utils/db');
const { mainMenu, mainMenuInline } = require('../keyboards/mainMenu');
const { processLoginSecurityCheck } = require('../utils/ipCheck');

function setupLoginHandler(bot) {
  // Login command
  bot.command('login', (ctx) => {
    const telegramId = ctx.from.id;
    
    // Check if already logged in
    if (auth.isLoggedIn(telegramId)) {
      return ctx.reply('✅ You are already logged in!', mainMenu());
    }
    
    // Start login process - ask for phone first (MANDATORY)
    auth.setLoginSession(telegramId, { step: 'awaiting_phone' });
    
    return ctx.reply(
      `📱 *Phone Number Verification*\n\n` +
      `Please share your phone number to continue.\n` +
      `This is *required* to verify your identity.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '📱 Send Phone Number', request_contact: true }]
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      }
    );
  });
  
  // Handle contact sharing (phone number)
  bot.on('contact', (ctx, next) => {
    const telegramId = ctx.from.id;
    const session = auth.getLoginSession(telegramId);
    
    if (session.step !== 'awaiting_phone') {
      return next();
    }
    
    const contact = ctx.message.contact;
    
    // Verify the contact belongs to the user
    if (contact.user_id !== telegramId) {
      return ctx.reply(
        '❌ Please share your own phone number.\n\n' +
        'Use the button below to send your number:',
        {
          reply_markup: {
            keyboard: [
              [{ text: '📱 Send Phone Number', request_contact: true }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        }
      );
    }
    
    // Store phone and continue to login
    auth.setLoginSession(telegramId, { 
      step: 'awaiting_login', 
      phone: contact.phone_number 
    });
    
    return ctx.reply(
      `✅ Phone number received!\n\n` +
      `📝 Now please enter your *USERNAME*:`,
      { 
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true }
      }
    );
  });
  
  // Handle text messages for login process
  bot.on('text', async (ctx, next) => {
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
      const user = db.findUserByUsername(text);
      if (!user) {
        auth.clearLoginSession(telegramId);
        return ctx.reply('❌ User not found. Please try again with /login');
      }
      
      // Note: We allow login even if user is already linked to another telegram account
      // This allows users to re-login from a different device
      
      auth.setLoginSession(telegramId, { 
        ...session, 
        step: 'awaiting_password', 
        username: text 
      });
      return ctx.reply('🔐 Please enter your *PASSWORD*:', { parse_mode: 'Markdown' });
    }
    
    // Handle password step
    if (session.step === 'awaiting_password') {
      const user = auth.validateCredentials(session.username, text);
      
      if (user) {
        // Check if user is admin - admins can have multiple sessions
        const isUserAdmin = auth.isAdmin(telegramId) || user.role === 'admin';
        
        // Invalidate previous session if user is not admin (Task 6: Session management)
        if (!isUserAdmin && user.telegramId && user.telegramId !== telegramId) {
          // Notify previous session about invalidation
          try {
            await ctx.telegram.sendMessage(
              user.telegramId,
              '⚠️ *Session Invalidated*\n\n' +
              'Your session has been terminated because you logged in from another device.\n\n' +
              'If this wasn\'t you, please change your password immediately.',
              { parse_mode: 'Markdown' }
            );
          } catch (e) {
            // Previous session may have blocked the bot
          }
        }
        
        // Link telegram account and save phone
        const updates = { telegramId };
        if (session.phone) {
          updates.phone = session.phone;
        }
        db.updateUser(session.username, updates);
        
        // Process IP security check (Task 5)
        const securityResult = await processLoginSecurityCheck(ctx, user, db, auth);
        
        auth.clearLoginSession(telegramId);
        
        // Refresh user data
        const updatedUser = db.findUserByUsername(session.username);
        
        return ctx.reply(
          `✅ *Welcome, ${session.username}!*\n\n` +
          `💰 Your balance: *$${updatedUser.balance.toFixed(2)}*\n\n` +
          `Use the menu below to navigate.`,
          { parse_mode: 'Markdown', ...mainMenu() }
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
  
  // Logout action from inline button
  bot.action('logout', (ctx) => {
    const telegramId = ctx.from.id;
    
    if (!auth.isLoggedIn(telegramId)) {
      return ctx.answerCbQuery('❌ You are not logged in.');
    }
    
    auth.logoutUser(telegramId);
    
    return ctx.editMessageText(
      '👋 You have been logged out.\n\nUse /login to login again.',
      { parse_mode: 'Markdown' }
    );
  });
  
  // Handle "🔓 Logout" from keyboard
  bot.hears('🔓 Logout', (ctx) => {
    const telegramId = ctx.from.id;
    
    if (!auth.isLoggedIn(telegramId)) {
      return ctx.reply('❌ You are not logged in.');
    }
    
    auth.logoutUser(telegramId);
    return ctx.reply('👋 You have been logged out. Use /login to login again.');
  });
}

module.exports = { setupLoginHandler };
