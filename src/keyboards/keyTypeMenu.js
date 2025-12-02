const { Markup } = require('telegraf');

// This file is kept for backward compatibility but is no longer used
// Each product now has a single key type defined in config.json

function keyTypeMenu(product, duration, customPrice = null) {
  // Return a simple back button since key type selection is no longer needed
  return Markup.inlineKeyboard([
    [Markup.button.callback('⬅️ Back', `product_${product}`)]
  ]);
}

module.exports = {
  keyTypeMenu
};
