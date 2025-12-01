const { Markup } = require('telegraf');

function accountMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('💰 Balance', 'account_balance')],
    [Markup.button.callback('🛍️ Purchase History', 'account_purchases')],
    [Markup.button.callback('💵 Top-up History', 'account_topups')],
    [Markup.button.callback('🎁 Redeem Promocode', 'account_redeem')],
    [Markup.button.callback('⬅️ Go Back', 'back_main')]
  ]);
}

module.exports = {
  accountMenu
};
