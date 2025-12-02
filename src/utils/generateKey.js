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

// Generate Certificado key for Gbox: format CERT-XXXXXXXX-XXXX
function generateCertificadoKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let part1 = '';
  let part2 = '';
  
  for (let i = 0; i < 8; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  
  return `CERT-${part1}-${timestamp}`;
}

// Generate COD key: format COD-XXXXXXXX-XXXX
function generateCODKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let part1 = '';
  
  for (let i = 0; i < 8; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  
  return `COD-${part1}-${timestamp}`;
}

// Generate key based on type
function generateKey(keyType) {
  switch (keyType) {
    case 'Flourite':
      return generateFlouriteKey();
    case 'Certificado':
      return generateCertificadoKey();
    case 'COD':
      return generateCODKey();
    default:
      return generateFlouriteKey();
  }
}

// Generate multiple keys with uniqueness check
function generateKeys(keyType, count) {
  const keys = new Set();
  let attempts = 0;
  const maxAttempts = count * 10;
  
  while (keys.size < count && attempts < maxAttempts) {
    const key = generateKey(keyType);
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
  generateCertificadoKey,
  generateCODKey,
  generateKey,
  generateKeys
};
