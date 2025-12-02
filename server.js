const bot = require('./src/bot');
const webApp = require('./web/app');

// Web server port - default to 4100 for the admin panel
const WEB_PORT = process.env.PORT || process.env.WEB_PORT || 4100;

console.log('🚀 FlouriteBot is starting...');

// Start Telegram Bot
bot.launch()
  .then(() => {
    console.log('✅ FlouriteBot is running!');
  })
  .catch((err) => {
    console.error('❌ Error starting bot:', err);
    process.exit(1);
  });

// Start Web Admin Panel
webApp.listen(WEB_PORT, () => {
  console.log(`🌐 Web Admin Panel running at http://localhost:${WEB_PORT}`);
});

// Enable graceful stop
process.once('SIGINT', () => {
  bot.stop('SIGINT');
  process.exit(0);
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  process.exit(0);
});
