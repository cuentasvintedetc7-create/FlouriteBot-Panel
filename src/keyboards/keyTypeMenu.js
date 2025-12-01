const { Markup } = require('telegraf');
const config = require('../../config.json');

function keyTypeMenu(product, duration) {
  const buttons = config.keyFormats.map(keyType => 
    [Markup.button.callback(keyType, `confirm_${product}_${duration}_${keyType}`)]
  );
  buttons.push([Markup.button.callback('⬅️ Back', `product_${product}`)]);
  
  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  keyTypeMenu
};
