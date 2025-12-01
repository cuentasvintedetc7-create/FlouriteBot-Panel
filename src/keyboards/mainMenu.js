const { Markup } = require('telegraf');

function mainMenu() {
  return Markup.keyboard([
    ['🛒 Buy', '👤 Account'],
    ['🔄 Reset Key', '❓ Help']
  ]).resize();
}

function mainMenuInline() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🛒 Buy', 'buy')],
    [Markup.button.callback('👤 Account', 'account')],
    [Markup.button.callback('🔄 Reset Key', 'reset_key')],
    [Markup.button.callback('❓ Help', 'help')]
  ]);
}

module.exports = {
  mainMenu,
  mainMenuInline
};
