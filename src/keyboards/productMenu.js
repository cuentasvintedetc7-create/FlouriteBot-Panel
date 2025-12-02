const { Markup } = require('telegraf');
const config = require('../../config.json');

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
    const durationText = formatDurationText(duration);
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

// Helper to format duration text for buttons
function formatDurationText(duration) {
  switch (duration) {
    case '1day':
      return '1 Day';
    case '7days':
      return '7 Days';
    case '30days':
      return '30 Days';
    case '31days':
      return '31 Days';
    case '365days':
      return '365 Days (1 Year)';
    case '1year':
      return '1 Year';
    default:
      return duration;
  }
}

module.exports = {
  productMenu
};
