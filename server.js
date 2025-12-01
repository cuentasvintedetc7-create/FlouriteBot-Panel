const bot = require('./src/bot');

console.log('🚀 FlouriteBot is starting...');

bot.launch()
  .then(() => {
    console.log('✅ FlouriteBot is running!');
  })
  .catch((err) => {
    console.error('❌ Error starting bot:', err);
    process.exit(1);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
