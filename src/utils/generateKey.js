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

// Generate BRMODS key: format 👤2v686wkl🔑e8ic
function generateBRMODSKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let part1 = '';
  let part2 = '';
  // Add timestamp for uniqueness
  const timestamp = Date.now().toString(36).slice(-3);
  
  for (let i = 0; i < 5; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  part1 += timestamp;
  
  for (let i = 0; i < 4; i++) {
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `👤${part1}🔑${part2}`;
}

// Generate DRIP MOBILE key: numbers like 4168090123
function generateDripMobileKey() {
  // Use timestamp as base for uniqueness
  const timestamp = Date.now().toString().slice(-6);
  let key = '';
  for (let i = 0; i < 4; i++) {
    key += Math.floor(Math.random() * 10).toString();
  }
  return key + timestamp;
}

// Generate key based on type
function generateKey(keyType) {
  switch (keyType) {
    case 'Flourite':
      return generateFlouriteKey();
    case 'BRMODS':
      return generateBRMODSKey();
    case 'DRIP MOBILE':
      return generateDripMobileKey();
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
  generateBRMODSKey,
  generateDripMobileKey,
  generateKey,
  generateKeys
};
