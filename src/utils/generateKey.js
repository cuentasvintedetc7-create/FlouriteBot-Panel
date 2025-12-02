// Set to track generated keys for uniqueness within session
const generatedKeys = new Set();

// Generate Flourite key: Alphanumeric uppercase (e.g., FIUNVTFQRR99845F)
function generateFlouriteKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  // Add timestamp component for uniqueness
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  
  for (let i = 0; i < 12; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return key + timestamp;
}

// Generate Certificate key for Gbox: EXACTLY 10 hex characters (e.g., 17E21A4A78)
function generateCertificateKey() {
  const hexChars = '0123456789ABCDEF';
  let key = '';
  
  for (let i = 0; i < 10; i++) {
    key += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
  }
  
  return key;
}

// Generate Call Of Duty key: format COD-XXXXXXXX-XXXX
function generateCallOfDutyKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let part1 = '';
  
  for (let i = 0; i < 8; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  
  return `COD-${part1}-${timestamp}`;
}

// Generate key based on product name
function generateKey(productName) {
  // Normalize product name for comparison
  const normalizedName = productName.toLowerCase().trim();
  
  if (normalizedName === 'flourite' || normalizedName === 'freefire' || normalizedName === 'free fire ios') {
    return generateFlouriteKey();
  }
  if (normalizedName === 'certificate' || normalizedName === 'gbox' || normalizedName === 'gbox certificate') {
    return generateCertificateKey();
  }
  if (normalizedName === 'call of duty' || normalizedName === 'cod' || normalizedName === 'cod mobile') {
    return generateCallOfDutyKey();
  }
  
  // Default to Flourite
  return generateFlouriteKey();
}

// Generate multiple keys with uniqueness check
function generateKeys(productName, count) {
  const keys = new Set();
  let attempts = 0;
  const maxAttempts = count * 10;
  
  while (keys.size < count && attempts < maxAttempts) {
    const key = generateKey(productName);
    if (!generatedKeys.has(key)) {
      keys.add(key);
      generatedKeys.add(key);
    }
    attempts++;
  }
  
  return Array.from(keys);
}

module.exports = {
  generateFlouriteKey,
  generateCertificateKey,
  generateCallOfDutyKey,
  generateKey,
  generateKeys
};
