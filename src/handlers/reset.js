const auth = require('../utils/auth');
const db = require('../utils/db');

function setupResetHandler(bot) {
  // Reset command
  bot.command('reset', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length === 0) {
      return ctx.reply('❌ Please provide a key to reset. Usage: /reset KEY');
    }
    
    const key = args.join(' ');
    const user = auth.getLoggedInUser(ctx.from.id);
    
    // Log the reset
    db.addResetLog(ctx.from.id, user.username, key);
    
    // Always respond with reset successful
    return ctx.reply('♻️ Key has been reset.');
  });
  
  // Handle "🔄 Reset Key" button from keyboard
  bot.hears('🔄 Reset Key', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    return ctx.reply(
      '🔄 *Reset Key*\n\n' +
      'To reset a key, use the command:\n' +
      '`/reset YOUR_KEY`\n\n' +
      'Example: `/reset FIUNVTFQRR99845F`',
      { parse_mode: 'Markdown' }
    );
  });
  
  // Reset key action from inline keyboard
  bot.action('reset_key', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    return ctx.editMessageText(
      '🔄 *Reset Key*\n\n' +
      'To reset a key, use the command:\n' +
      '`/reset YOUR_KEY`\n\n' +
      'Example: `/reset FIUNVTFQRR99845F`',
      { parse_mode: 'Markdown' }
    );
  });
}

module.exports = { setupResetHandler };
