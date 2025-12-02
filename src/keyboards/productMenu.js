const { Markup } = require('telegraf');
const products = require('../../data/products.json');
const { formatDuration, formatPrice } = require('../utils/format');

// Product menu shows the single product for a category
function productMenu(categoryKey) {
  const productConfig = products.products[categoryKey];
  
  if (!productConfig) {
    return Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Back', 'buy')]
    ]);
  }
  
  // Single product button for this category
  const buttons = [
    [Markup.button.callback(`📦 ${productConfig.name}`, `product_${categoryKey}`)]
  ];
  
  buttons.push([Markup.button.callback('⬅️ Back', 'buy')]);
  
  return Markup.inlineKeyboard(buttons);
}

// Duration menu shows available durations for a product
function durationMenu(categoryKey) {
  const productConfig = products.products[categoryKey];
  
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
        `duration_${categoryKey}_${duration}`
      )
    ]);
  }
  
  buttons.push([Markup.button.callback('⬅️ Back', `category_${categoryKey}`)]);
  
  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  productMenu,
  durationMenu
};
