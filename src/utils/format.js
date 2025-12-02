// Format balance with 2 decimal places
function formatBalance(balance) {
  return `$${balance.toFixed(2)}`;
}

// Format price - show whole number for integers, 2 decimals otherwise
function formatPrice(price) {
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

// Format date to readable string
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format duration text
function formatDuration(duration) {
  switch (duration) {
    case '1day':
      return '1 Day';
    case '7days':
      return '7 Days';
    case '30days':
      return '30 Days';
    case '1year':
      return '1 Year';
    default:
      return duration;
  }
}

// Product name mappings - ONLY these 3 products are valid
const productNames = {
  freefire: 'FLOURITE',
  gbox: 'Certificate',
  cod: 'Call Of Duty'
};

// Category name mappings - for stock.json
const categoryNames = {
  freefire: 'Free Fire iOS',
  gbox: 'GBOX',
  cod: 'COD Mobile'
};

// Get product name from category key
function getProductName(categoryKey) {
  return productNames[categoryKey] || categoryKey;
}

// Get category name from category key (for stock.json)
function getCategoryName(categoryKey) {
  return categoryNames[categoryKey] || categoryKey;
}

// Get display name for product (uppercase)
function getProductDisplayName(categoryKey) {
  const names = {
    freefire: 'FLOURITE',
    gbox: 'CERTIFICATE',
    cod: 'CALL OF DUTY'
  };
  return names[categoryKey] || categoryKey.toUpperCase();
}

// Format purchase for display
function formatPurchase(purchase) {
  return `📦 ${purchase.product}\n` +
         `🔑 Type: ${purchase.keyType}\n` +
         `⏱️ Duration: ${formatDuration(purchase.duration)}\n` +
         `🔐 Key: \`${purchase.key}\`\n` +
         `💰 Price: ${formatPrice(purchase.price)}\n` +
         `📅 Date: ${formatDate(purchase.date)}`;
}

// Format topup for display
function formatTopup(topup) {
  return `💵 Amount: ${formatBalance(topup.amount)}\n` +
         `📝 Method: ${topup.method || 'Admin'}\n` +
         `📅 Date: ${formatDate(topup.date)}`;
}

// Format stock summary
function formatStockSummary(stock) {
  let summary = '📊 *Stock Summary*\n\n';
  
  for (const product of Object.keys(stock)) {
    summary += `*${product}*\n`;
    
    for (const keyType of Object.keys(stock[product])) {
      let total = 0;
      const durations = [];
      
      for (const duration of Object.keys(stock[product][keyType])) {
        const count = stock[product][keyType][duration].length;
        total += count;
        durations.push(`${formatDuration(duration)}: ${count}`);
      }
      
      summary += `  ${keyType}: ${total} total\n`;
      summary += `    (${durations.join(', ')})\n`;
    }
    summary += '\n';
  }
  
  return summary;
}

module.exports = {
  formatBalance,
  formatPrice,
  formatDate,
  formatDuration,
  formatPurchase,
  formatTopup,
  formatStockSummary,
  getProductName,
  getCategoryName,
  getProductDisplayName,
  productNames,
  categoryNames
};
