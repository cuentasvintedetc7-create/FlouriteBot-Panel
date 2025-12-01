const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');

// Helper to read JSON file
function readJSON(filename) {
  const filePath = path.join(dataDir, filename);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return null;
  }
}

// Helper to write JSON file
function writeJSON(filename, data) {
  const filePath = path.join(dataDir, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    return false;
  }
}

// Users functions
function getUsers() {
  return readJSON('users.json') || [];
}

function saveUsers(users) {
  return writeJSON('users.json', users);
}

function findUserByUsername(username) {
  const users = getUsers();
  return users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
}

function findUserByTelegramId(telegramId) {
  const users = getUsers();
  return users.find(u => u.telegramId === telegramId);
}

function createUser(username, password) {
  const users = getUsers();
  const maxId = users.length > 0 ? Math.max(...users.map(u => u.id)) : 0;
  const newUser = {
    id: maxId + 1,
    username,
    password,
    balance: 0,
    telegramId: null,
    isAdmin: false,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
}

function updateUser(username, updates) {
  const users = getUsers();
  const index = users.findIndex(u => u.username && u.username.toLowerCase() === username.toLowerCase());
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    saveUsers(users);
    return users[index];
  }
  return null;
}

function deleteUser(username) {
  const users = getUsers();
  const index = users.findIndex(u => u.username && u.username.toLowerCase() === username.toLowerCase());
  if (index !== -1) {
    users.splice(index, 1);
    saveUsers(users);
    return true;
  }
  return false;
}

function addBalance(username, amount) {
  const user = findUserByUsername(username);
  if (user) {
    return updateUser(username, { balance: user.balance + amount });
  }
  return null;
}

// Stock functions
function getStock() {
  return readJSON('stock.json') || {};
}

function saveStock(stock) {
  return writeJSON('stock.json', stock);
}

function getStockCount(product, keyType, duration) {
  const stock = getStock();
  if (stock[product] && stock[product][keyType] && stock[product][keyType][duration]) {
    return stock[product][keyType][duration].length;
  }
  return 0;
}

function addToStock(product, keyType, duration, keys) {
  const stock = getStock();
  if (!stock[product]) stock[product] = {};
  if (!stock[product][keyType]) stock[product][keyType] = {};
  if (!stock[product][keyType][duration]) stock[product][keyType][duration] = [];
  
  if (Array.isArray(keys)) {
    stock[product][keyType][duration].push(...keys);
  } else {
    stock[product][keyType][duration].push(keys);
  }
  
  return saveStock(stock);
}

function takeFromStock(product, keyType, duration) {
  const stock = getStock();
  if (stock[product] && stock[product][keyType] && stock[product][keyType][duration]) {
    const keys = stock[product][keyType][duration];
    if (keys.length > 0) {
      const key = keys.shift();
      saveStock(stock);
      return key;
    }
  }
  return null;
}

// Purchases functions
function getPurchases() {
  return readJSON('purchases.json') || [];
}

function savePurchases(purchases) {
  return writeJSON('purchases.json', purchases);
}

function addPurchase(telegramId, username, product, keyType, duration, key, price) {
  const purchases = getPurchases();
  purchases.push({
    id: purchases.length + 1,
    telegramId,
    username,
    product,
    keyType,
    duration,
    key,
    price,
    date: new Date().toISOString()
  });
  return savePurchases(purchases);
}

function getUserPurchases(username) {
  const purchases = getPurchases();
  return purchases.filter(p => p.username && p.username.toLowerCase() === username.toLowerCase());
}

// Topups functions
function getTopups() {
  return readJSON('topups.json') || [];
}

function saveTopups(topups) {
  return writeJSON('topups.json', topups);
}

function addTopup(username, amount, method) {
  const topups = getTopups();
  topups.push({
    id: topups.length + 1,
    username,
    amount,
    method,
    date: new Date().toISOString()
  });
  return saveTopups(topups);
}

function getUserTopups(username) {
  const topups = getTopups();
  return topups.filter(t => t.username && t.username.toLowerCase() === username.toLowerCase());
}

// Reset log functions
function getResetLog() {
  return readJSON('reset_log.json') || [];
}

function saveResetLog(log) {
  return writeJSON('reset_log.json', log);
}

function addResetLog(telegramId, username, key) {
  const log = getResetLog();
  log.push({
    id: log.length + 1,
    telegramId,
    username,
    key,
    date: new Date().toISOString()
  });
  return saveResetLog(log);
}

module.exports = {
  // Users
  getUsers,
  saveUsers,
  findUserByUsername,
  findUserByTelegramId,
  createUser,
  updateUser,
  deleteUser,
  addBalance,
  // Stock
  getStock,
  saveStock,
  getStockCount,
  addToStock,
  takeFromStock,
  // Purchases
  getPurchases,
  savePurchases,
  addPurchase,
  getUserPurchases,
  // Topups
  getTopups,
  saveTopups,
  addTopup,
  getUserTopups,
  // Reset log
  getResetLog,
  saveResetLog,
  addResetLog
};
