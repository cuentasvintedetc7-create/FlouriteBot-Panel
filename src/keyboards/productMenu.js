const { Markup } = require('telegraf');
const products = require('../../data/products.json');
const { formatDuration, formatPrice, getCategoryName, getProductName } = require('../utils/format');
const db = require('../utils/db');

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
// Optional isReseller param to show stock counts
function durationMenu(categoryKey, isReseller = false) {
  const productConfig = products.products[categoryKey];
  
  if (!productConfig) {
    return Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Back', 'buy')]
    ]);
  }
  
  const buttons = [];
  
  // Get category and product names for stock lookup
  const categoryName = getCategoryName(categoryKey);
  const productName = getProductName(categoryKey);
  
  // Generate buttons for each duration with proper price formatting
  for (const [duration, price] of Object.entries(productConfig.durations)) {
    const durationText = formatDuration(duration);
    
    // Get stock count if user is reseller
    if (isReseller) {
      const stockCount = db.getStockCount(categoryName, productName, duration);
      
      if (stockCount === 0) {
        // Show disabled button with "Out of Stock" indicator
        buttons.push([
          Markup.button.callback(
            `❌ ${durationText} – ${formatPrice(price)} (Out of Stock)`,
            `no_stock_${categoryKey}_${duration}`
          )
        ]);
      } else {
        // Show button with stock count
        buttons.push([
          Markup.button.callback(
            `${durationText} – ${formatPrice(price)} (📦 ${stockCount})`,
            `duration_${categoryKey}_${duration}`
          )
        ]);
      }
    } else {
      // Regular user - no stock display
      buttons.push([
        Markup.button.callback(
          `${durationText} – ${formatPrice(price)}`,
          `duration_${categoryKey}_${duration}`
        )
      ]);
    }
  }
  
  buttons.push([Markup.button.callback('⬅️ Back', `category_${categoryKey}`)]);
  
  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  productMenu,
  durationMenu
};
