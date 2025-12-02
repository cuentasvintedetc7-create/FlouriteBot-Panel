const { Markup } = require('telegraf');
const config = require('../../config.json');

function buyMenu() {
  // Use categories array for ordered menu
  const buttons = config.categories.map(category => 
    [Markup.button.callback(category, `category_${category}`)]
  );
  buttons.push([Markup.button.callback('⬅️ Back', 'back_main')]);
  
  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  buyMenu
};
