// Format balance with 2 decimal places
function formatBalance(balance) {
  return `$${balance.toFixed(2)}`;
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

// Format purchase for display
function formatPurchase(purchase) {
  return `📦 ${purchase.product}\n` +
         `🔑 Type: ${purchase.keyType}\n` +
         `⏱️ Duration: ${formatDuration(purchase.duration)}\n` +
         `🔐 Key: \`${purchase.key}\`\n` +
         `💰 Price: ${formatBalance(purchase.price)}\n` +
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
  formatDate,
  formatDuration,
  formatPurchase,
  formatTopup,
  formatStockSummary
};
