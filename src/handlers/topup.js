const { Markup } = require('telegraf');
const auth = require('../utils/auth');
const db = require('../utils/db');
const config = require('../../config.json');
const { formatBalance } = require('../utils/format');
const { mainMenuInline } = require('../keyboards/mainMenu');

// Support WhatsApp URL from config
const SUPPORT_WHATSAPP = config.supportWhatsApp || 'https://wa.me/447832618273';

// Payment methods configuration
const PAYMENT_METHODS = {
  'ZELLE': {
    title: '🇺🇸 ZELLE (USA)',
    instructions: '+1 712 267 3773\nNombre: Dairy Hernandez'
  },
  'PAYPAL': {
    title: '🌍 PAYPAL GLOBAL (Amigos y Familiares)',
    instructions: 'https://www.paypal.me/DenilsonHernandez954'
  },
  'MEXICO_TRANSFER': {
    title: '🇲🇽 MÉXICO – Transferencias',
    instructions: 'Banco: Albo\nTarjeta: 721180100042683432\nNombre: Radi Lopez'
  },
  'MEXICO_OXXO': {
    title: '🇲🇽 MÉXICO – Depósitos OXXO',
    instructions: 'Banco: Nu\nTarjeta: 5101 2506 8691 9389'
  },
  'REVOLUT': {
    title: '🌍 GLOBAL REVOLUT PAYMENT LINK',
    instructions: 'https://revolut.me/angeeell89?currency=EUR&amount=1300'
  },
  'ECUADOR': {
    title: '🇪🇨 ECUADOR – Banco Pichincha',
    instructions: 'Cuenta Ahorro Pichincha\nN° Cuenta: 2207195565'
  },
  'ARGENTINA': {
    title: '🇦🇷 ARGENTINA – Uala',
    instructions: 'CVU: 0000007900203350273548\nAlias: C.CORREA1315.UALA'
  },
  'BINANCE': {
    title: '🌍 GLOBAL BINANCE',
    instructions: '310957469\nCorreo: ezegwar@gmail.com'
  }
};

// Helper function to generate payment method buttons
function getPaymentButtons() {
  return [
    [Markup.button.callback('🇺🇸 ZELLE (USA)', 'topup_method_ZELLE')],
    [Markup.button.callback('🌍 PAYPAL GLOBAL', 'topup_method_PAYPAL')],
    [Markup.button.callback('🇲🇽 MÉXICO – Transferencias', 'topup_method_MEXICO_TRANSFER')],
    [Markup.button.callback('🇲🇽 MÉXICO – OXXO', 'topup_method_MEXICO_OXXO')],
    [Markup.button.callback('🌍 REVOLUT', 'topup_method_REVOLUT')],
    [Markup.button.callback('🇪🇨 ECUADOR – Pichincha', 'topup_method_ECUADOR')],
    [Markup.button.callback('🇦🇷 ARGENTINA – Uala', 'topup_method_ARGENTINA')],
    [Markup.button.callback('🌍 BINANCE', 'topup_method_BINANCE')],
    [Markup.button.url('🟦 OTHER METHODS - Contact Admin', SUPPORT_WHATSAPP)],
    [Markup.button.callback('⬅️ Back', 'back_main')]
  ];
}

function setupTopupHandler(bot) {
  // Add Balance action
  bot.action('add_balance', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const buttons = getPaymentButtons();
    
    return ctx.editMessageText(
      `💰 *ADD BALANCE*\n\n` +
      `Select your preferred payment method:\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `After selecting a method, you will receive payment instructions and can upload your proof of payment.`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      }
    );
  });
  
  // Handle "💰 Add Balance" from keyboard
  bot.hears('💰 Add Balance', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    const buttons = getPaymentButtons();
    
    return ctx.reply(
      `💰 *ADD BALANCE*\n\n` +
      `Select your preferred payment method:\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `After selecting a method, you will receive payment instructions and can upload your proof of payment.`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      }
    );
  });
  
  // Handle payment method selection
  bot.action(/^topup_method_(.+)$/, (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const methodKey = ctx.match[1];
    const method = PAYMENT_METHODS[methodKey];
    
    if (!method) {
      return ctx.answerCbQuery('❌ Invalid payment method');
    }
    
    // Store selected method in session (preserve existing data)
    const existingSession = auth.getLoginSession(ctx.from.id);
    auth.setLoginSession(ctx.from.id, { ...existingSession, topupMethod: methodKey, step: 'awaiting_proof' });
    
    return ctx.editMessageText(
      `💰 *${method.title}*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `${method.instructions}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📋 *Instructions:*\n` +
      `1. Make your payment using the details above\n` +
      `2. Take a screenshot/photo of your payment proof\n` +
      `3. Click the button below to upload your proof\n\n` +
      `⚠️ *Important:* Your balance will be added after admin approval.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback('📤 Upload Payment Proof', 'upload_proof')],
            [Markup.button.callback('⬅️ Back to Methods', 'add_balance')]
          ]
        }
      }
    );
  });
  
  // Handle upload proof button
  bot.action('upload_proof', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const session = auth.getLoginSession(ctx.from.id);
    if (!session.topupMethod) {
      return ctx.answerCbQuery('❌ Please select a payment method first');
    }
    
    auth.setLoginSession(ctx.from.id, { ...session, step: 'awaiting_proof_image' });
    
    return ctx.editMessageText(
      `📤 *Upload Payment Proof*\n\n` +
      `Please send a *photo* or *document* of your payment proof now.\n\n` +
      `The admin will review your request and approve your balance.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback('❌ Cancel', 'add_balance')]
          ]
        }
      }
    );
  });
  
  // Handle photo proof upload
  bot.on('photo', async (ctx, next) => {
    const telegramId = ctx.from.id;
    const session = auth.getLoginSession(telegramId);
    
    if (session.step !== 'awaiting_proof_image') {
      return next();
    }
    
    if (!auth.isLoggedIn(telegramId)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    const user = auth.getLoggedInUser(telegramId);
    const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Get highest resolution
    const methodKey = session.topupMethod;
    const method = PAYMENT_METHODS[methodKey];
    
    // Create topup request
    const topup = db.addTopupRequest(
      user.username,
      telegramId,
      user.phone || null,
      method.title,
      photo.file_id
    );
    
    // Clear session
    auth.clearLoginSession(telegramId);
    
    // Notify user
    await ctx.reply(
      `✅ *Payment Proof Submitted!*\n\n` +
      `📋 Request ID: #${topup.id}\n` +
      `💳 Method: ${method.title}\n` +
      `📅 Date: ${new Date().toLocaleString()}\n\n` +
      `⏳ Your request is pending admin approval.\n` +
      `You will be notified once it's processed.`,
      { parse_mode: 'Markdown', ...mainMenuInline() }
    );
    
    // Notify admin
    const adminId = auth.getAdminId();
    
    try {
      await ctx.telegram.sendPhoto(adminId, photo.file_id, {
        caption: `💸 *NEW TOP-UP REQUEST*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 Request ID: #${topup.id}\n` +
          `👤 Login: ${user.username}\n` +
          `📱 Phone: ${user.phone || 'Not provided'}\n` +
          `🆔 Telegram ID: ${telegramId}\n` +
          `💳 Method: ${method.title}\n` +
          `📅 Date: ${new Date().toLocaleString()}\n` +
          `━━━━━━━━━━━━━━━━━━━━━`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback('✅ Approve', `approve_topup_${topup.id}`),
              Markup.button.callback('❌ Reject', `reject_topup_${topup.id}`)
            ]
          ]
        }
      });
    } catch (error) {
      console.error('Error notifying admin:', error);
    }
  });
  
  // Handle document proof upload
  bot.on('document', async (ctx, next) => {
    const telegramId = ctx.from.id;
    const session = auth.getLoginSession(telegramId);
    
    if (session.step !== 'awaiting_proof_image') {
      return next();
    }
    
    if (!auth.isLoggedIn(telegramId)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    const user = auth.getLoggedInUser(telegramId);
    const document = ctx.message.document;
    const methodKey = session.topupMethod;
    const method = PAYMENT_METHODS[methodKey];
    
    // Create topup request
    const topup = db.addTopupRequest(
      user.username,
      telegramId,
      user.phone || null,
      method.title,
      document.file_id
    );
    
    // Clear session
    auth.clearLoginSession(telegramId);
    
    // Notify user
    await ctx.reply(
      `✅ *Payment Proof Submitted!*\n\n` +
      `📋 Request ID: #${topup.id}\n` +
      `💳 Method: ${method.title}\n` +
      `📅 Date: ${new Date().toLocaleString()}\n\n` +
      `⏳ Your request is pending admin approval.\n` +
      `You will be notified once it's processed.`,
      { parse_mode: 'Markdown', ...mainMenuInline() }
    );
    
    // Notify admin
    const adminId = auth.getAdminId();
    
    try {
      await ctx.telegram.sendDocument(adminId, document.file_id, {
        caption: `💸 *NEW TOP-UP REQUEST*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 Request ID: #${topup.id}\n` +
          `👤 Login: ${user.username}\n` +
          `📱 Phone: ${user.phone || 'Not provided'}\n` +
          `🆔 Telegram ID: ${telegramId}\n` +
          `💳 Method: ${method.title}\n` +
          `📅 Date: ${new Date().toLocaleString()}\n` +
          `━━━━━━━━━━━━━━━━━━━━━`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback('✅ Approve', `approve_topup_${topup.id}`),
              Markup.button.callback('❌ Reject', `reject_topup_${topup.id}`)
            ]
          ]
        }
      });
    } catch (error) {
      console.error('Error notifying admin:', error);
    }
  });
  
  // Admin approve topup
  bot.action(/^approve_topup_(\d+)$/, async (ctx) => {
    if (!auth.isAdmin(ctx.from.id) && !auth.isStaff(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not authorized');
    }
    
    const topupId = parseInt(ctx.match[1]);
    const topup = db.getTopupById(topupId);
    
    if (!topup) {
      return ctx.answerCbQuery('❌ Topup request not found');
    }
    
    if (topup.status !== 'PENDING') {
      return ctx.answerCbQuery(`❌ This request has already been ${topup.status.toLowerCase()}`);
    }
    
    // Set session to await amount
    auth.setLoginSession(ctx.from.id, { 
      step: 'awaiting_topup_amount', 
      topupId: topupId 
    });
    
    await ctx.answerCbQuery('✅ Enter the amount to add');
    
    return ctx.reply(
      `💰 *Approve Top-up #${topupId}*\n\n` +
      `👤 User: ${topup.login}\n` +
      `💳 Method: ${topup.method}\n\n` +
      `Please enter the amount to add (numbers only):`,
      { parse_mode: 'Markdown' }
    );
  });
  
  // Admin reject topup
  bot.action(/^reject_topup_(\d+)$/, async (ctx) => {
    if (!auth.isAdmin(ctx.from.id) && !auth.isStaff(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not authorized');
    }
    
    const topupId = parseInt(ctx.match[1]);
    const topup = db.getTopupById(topupId);
    
    if (!topup) {
      return ctx.answerCbQuery('❌ Topup request not found');
    }
    
    if (topup.status !== 'PENDING') {
      return ctx.answerCbQuery(`❌ This request has already been ${topup.status.toLowerCase()}`);
    }
    
    // Update topup status
    db.updateTopupStatus(topupId, 'REJECTED');
    
    await ctx.answerCbQuery('❌ Topup rejected');
    
    // Update admin message
    await ctx.editMessageCaption(
      ctx.callbackQuery.message.caption + `\n\n❌ *REJECTED*`,
      { parse_mode: 'Markdown' }
    );
    
    // Notify user
    try {
      await ctx.telegram.sendMessage(
        topup.telegramId,
        `❌ *Your top-up was rejected.*\n\n` +
        `📋 Request ID: #${topupId}\n` +
        `💳 Method: ${topup.method}\n\n` +
        `If you believe this is an error, please contact admin.`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Error notifying user:', error);
    }
  });
  
  // Handle topup amount input from admin
  bot.on('text', async (ctx, next) => {
    const telegramId = ctx.from.id;
    const session = auth.getLoginSession(telegramId);
    
    if (session.step !== 'awaiting_topup_amount') {
      return next();
    }
    
    if (!auth.isAdmin(telegramId) && !auth.isStaff(telegramId)) {
      auth.clearLoginSession(telegramId);
      return next();
    }
    
    const amount = parseFloat(ctx.message.text);
    
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('❌ Invalid amount. Please enter a positive number.');
    }
    
    const topupId = session.topupId;
    const topup = db.getTopupById(topupId);
    
    if (!topup) {
      auth.clearLoginSession(telegramId);
      return ctx.reply('❌ Topup request not found.');
    }
    
    // Update topup status and add balance
    db.updateTopupStatus(topupId, 'APPROVED', amount);
    db.addBalance(topup.login, amount);
    
    // Also record in topups for history
    db.addTopup(topup.login, amount, topup.method);
    
    auth.clearLoginSession(telegramId);
    
    await ctx.reply(
      `✅ *Top-up Approved!*\n\n` +
      `📋 Request ID: #${topupId}\n` +
      `👤 User: ${topup.login}\n` +
      `💰 Amount: ${formatBalance(amount)}\n` +
      `💳 Method: ${topup.method}`,
      { parse_mode: 'Markdown' }
    );
    
    // Notify user
    try {
      await ctx.telegram.sendMessage(
        topup.telegramId,
        `✅ *Your top-up was approved!*\n\n` +
        `📋 Request ID: #${topupId}\n` +
        `💰 Balance added: ${formatBalance(amount)}\n` +
        `💳 Method: ${topup.method}\n\n` +
        `Thank you for your payment! 🎉`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Error notifying user:', error);
    }
  });
}

module.exports = { setupTopupHandler };
