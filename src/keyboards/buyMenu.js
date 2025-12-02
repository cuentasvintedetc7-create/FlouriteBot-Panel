const { Markup } = require('telegraf');
const products = require('../../data/products.json');

function buyMenu() {
  // Create buttons for the three valid categories
  const buttons = [
    [Markup.button.callback('📱 Free Fire iOS', 'category_freefire')],
    [Markup.button.callback('📦 Gbox', 'category_gbox')],
    [Markup.button.callback('🎮 COD Mobile', 'category_cod')],
    [Markup.button.callback('⬅️ Back', 'back_main')]
  ];
  
  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  buyMenu
};
