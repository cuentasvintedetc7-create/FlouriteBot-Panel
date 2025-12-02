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
// Returns null if all durations are out of stock
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
  
  // Track if any duration has stock
  let hasAnyStock = false;
  
  // Generate buttons for each duration with proper price formatting
  for (const [duration, price] of Object.entries(productConfig.durations)) {
    const durationText = formatDuration(duration);
    const stockCount = db.getStockCount(categoryName, productName, duration);
    
    if (stockCount === 0) {
      // Skip duration with 0 stock - don't show button
      continue;
    }
    
    hasAnyStock = true;
    
    if (isReseller) {
      // Show button with stock count for resellers
      buttons.push([
        Markup.button.callback(
          `${durationText} – ${formatPrice(price)} (📦 ${stockCount})`,
          `duration_${categoryKey}_${duration}`
        )
      ]);
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
  
  // If no durations have stock, return null to signal out of stock
  if (!hasAnyStock) {
    return null;
  }
  
  buttons.push([Markup.button.callback('⬅️ Back', `category_${categoryKey}`)]);
  
  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  productMenu,
  durationMenu
};
