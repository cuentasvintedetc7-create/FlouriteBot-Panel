const { Markup } = require('telegraf');

// This file is kept for backward compatibility but is no longer used
// Each category now has a single product defined in config.json
// The buy flow is: Category → Product → Duration → Confirm

function keyTypeMenu(category, duration, customPrice = null) {
  // Return a simple back button since key type selection is no longer needed
  return Markup.inlineKeyboard([
    [Markup.button.callback('⬅️ Back', `category_${category}`)]
  ]);
}

module.exports = {
  keyTypeMenu
};
