const { Markup } = require('telegraf');
const config = require('../../config.json');

function buyMenu() {
  const buttons = config.products.map(product => 
    [Markup.button.callback(product, `product_${product}`)]
  );
  buttons.push([Markup.button.callback('⬅️ Back', 'back_main')]);
  
  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  buyMenu
};
