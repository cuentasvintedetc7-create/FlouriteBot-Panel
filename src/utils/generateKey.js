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

// Generate Certificate key for Gbox: format CERT-XXXXXXXX-XXXX
function generateCertificateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let part1 = '';
  
  for (let i = 0; i < 8; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  
  return `CERT-${part1}-${timestamp}`;
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
  switch (productName) {
    case 'Flourite':
      return generateFlouriteKey();
    case 'Certificate':
      return generateCertificateKey();
    case 'Call Of Duty':
      return generateCallOfDutyKey();
    default:
      return generateFlouriteKey();
  }
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
