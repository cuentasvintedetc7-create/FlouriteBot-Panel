const { Markup } = require('telegraf');
const config = require('../../config.json');
const { formatDuration } = require('../utils/format');

function productMenu(product) {
  const productConfig = config.products[product];
  
  if (!productConfig) {
    return Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Back', 'buy')]
    ]);
  }
  
  const buttons = [];
  
  // Generate buttons for each duration with proper price formatting
  for (const [duration, price] of Object.entries(productConfig.durations)) {
    const durationText = formatDuration(duration);
    buttons.push([
      Markup.button.callback(
        `${durationText} – $${price.toFixed(2)}`,
        `duration_${product}_${duration}`
      )
    ]);
  }
  
  buttons.push([Markup.button.callback('⬅️ Back', 'buy')]);
  
  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  productMenu
};
