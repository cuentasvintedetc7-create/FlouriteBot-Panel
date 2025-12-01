// Generate Flourite key: Alphanumeric uppercase (e.g., FIUNVTFQRR99845F)
function generateFlouriteKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 16; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Generate BRMODS key: format 👤2v686wkl🔑e8ic
function generateBRMODSKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let part1 = '';
  let part2 = '';
  
  for (let i = 0; i < 8; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  for (let i = 0; i < 4; i++) {
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `👤${part1}🔑${part2}`;
}

// Generate DRIP MOBILE key: numbers like 4168090123
function generateDripMobileKey() {
  let key = '';
  for (let i = 0; i < 10; i++) {
    key += Math.floor(Math.random() * 10).toString();
  }
  return key;
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

// Generate multiple keys
function generateKeys(keyType, count) {
  const keys = [];
  for (let i = 0; i < count; i++) {
    keys.push(generateKey(keyType));
  }
  return keys;
}

module.exports = {
  generateFlouriteKey,
  generateBRMODSKey,
  generateDripMobileKey,
  generateKey,
  generateKeys
};
