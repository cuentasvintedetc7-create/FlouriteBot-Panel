const auth = require('../utils/auth');
const db = require('../utils/db');
const products = require('../../data/products.json');
const { getProductName, getCategoryName } = require('../utils/format');

// Get valid product names for reset validation
function getValidProductNames() {
  const validNames = new Set();
  
  // Add configured products from products.json
  for (const categoryKey of Object.keys(products.products)) {
    const productName = getProductName(categoryKey);
    const categoryName = getCategoryName(categoryKey);
    validNames.add(productName.toLowerCase());
    validNames.add(categoryName.toLowerCase());
    validNames.add(categoryKey.toLowerCase());
  }
  
  return validNames;
}

function setupResetHandler(bot) {
  // Reset command
  bot.command('reset', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length === 0) {
      // Show available products for reset
      const productList = Object.keys(products.products).map(key => {
        const productName = getProductName(key);
        return `• ${productName}`;
      }).join('\n');
      
      return ctx.reply(
        `❌ Please provide a product name to reset.\n\n` +
        `Usage: /reset PRODUCT_NAME\n\n` +
        `*Available Products:*\n${productList}`,
        { parse_mode: 'Markdown' }
      );
    }
    
    const productInput = args.join(' ').toLowerCase();
    const validProducts = getValidProductNames();
    
    // Check if the product is valid
    if (!validProducts.has(productInput)) {
      const productList = Object.keys(products.products).map(key => {
        const productName = getProductName(key);
        return `• ${productName}`;
      }).join('\n');
      
      return ctx.reply(
        `❌ Invalid product: "${args.join(' ')}"\n\n` +
        `*Available Products for Reset:*\n${productList}\n\n` +
        `Usage: /reset PRODUCT_NAME`,
        { parse_mode: 'Markdown' }
      );
    }
    
    const user = auth.getLoggedInUser(ctx.from.id);
    
    // Log the reset with validated product
    db.addResetLog(ctx.from.id, user.username, productInput);
    
    return ctx.reply(`♻️ Product "${args.join(' ')}" has been reset.`);
  });
  
  // Handle "🔄 Reset Key" button from keyboard
  bot.hears('🔄 Reset Key', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.reply('❌ You are not logged in. Use /login');
    }
    
    const productList = Object.keys(products.products).map(key => {
      const productName = getProductName(key);
      return `• ${productName}`;
    }).join('\n');
    
    return ctx.reply(
      '🔄 *Reset Product*\n\n' +
      'To reset a product, use the command:\n' +
      '`/reset PRODUCT_NAME`\n\n' +
      '*Available Products:*\n' + productList + '\n\n' +
      'Example: `/reset Flourite`',
      { parse_mode: 'Markdown' }
    );
  });
  
  // Reset key action from inline keyboard
  bot.action('reset_key', (ctx) => {
    if (!auth.isLoggedIn(ctx.from.id)) {
      return ctx.answerCbQuery('❌ You are not logged in. Use /login');
    }
    
    const productList = Object.keys(products.products).map(key => {
      const productName = getProductName(key);
      return `• ${productName}`;
    }).join('\n');
    
    return ctx.editMessageText(
      '🔄 *Reset Product*\n\n' +
      'To reset a product, use the command:\n' +
      '`/reset PRODUCT_NAME`\n\n' +
      '*Available Products:*\n' + productList + '\n\n' +
      'Example: `/reset Flourite`',
      { parse_mode: 'Markdown' }
    );
  });
}

module.exports = { setupResetHandler };
