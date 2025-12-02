const { Markup } = require('telegraf');
const config = require('../../config.json');
const { formatDuration, formatPrice } = require('../utils/format');

// Product menu shows the single product for a category
function productMenu(category) {
  const productConfig = config.products[category];
  
  if (!productConfig) {
    return Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Back', 'buy')]
    ]);
  }
  
  // Single product button for this category
  const buttons = [
    [Markup.button.callback(`📦 ${productConfig.name}`, `product_${category}`)]
  ];
  
  buttons.push([Markup.button.callback('⬅️ Back', 'buy')]);
  
  return Markup.inlineKeyboard(buttons);
}

// Duration menu shows available durations for a product
function durationMenu(category) {
  const productConfig = config.products[category];
  
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
        `${durationText} – ${formatPrice(price)}`,
        `duration_${category}_${duration}`
      )
    ]);
  }
  
  buttons.push([Markup.button.callback('⬅️ Back', `category_${category}`)]);
  
  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  productMenu,
  durationMenu
};
