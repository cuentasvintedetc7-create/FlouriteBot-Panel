const { Markup } = require('telegraf');
const config = require('../../config.json');

function productMenu(product) {
  const buttons = [
    [Markup.button.callback(`1 Day - $${config.prices['1day']}`, `duration_${product}_1day`)],
    [Markup.button.callback(`7 Days - $${config.prices['7days']}`, `duration_${product}_7days`)],
    [Markup.button.callback(`30 Days - $${config.prices['30days']}`, `duration_${product}_30days`)],
    [Markup.button.callback('⬅️ Back', 'buy')]
  ];
  
  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  productMenu
};
