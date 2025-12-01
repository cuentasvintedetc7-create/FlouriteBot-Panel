const db = require('./db');
const config = require('../../config.json');

// Session storage for login process
const sessions = new Map();

// Check if user is logged in
function isLoggedIn(telegramId) {
  const user = db.findUserByTelegramId(telegramId);
  return user !== null && user !== undefined;
}

// Get logged in user
function getLoggedInUser(telegramId) {
  return db.findUserByTelegramId(telegramId);
}

// Check if user is admin
function isAdmin(telegramId) {
  return telegramId === config.adminId;
}

// Login user (link telegram account)
function loginUser(telegramId, login) {
  return db.updateUser(login, { telegramId });
}

// Logout user
function logoutUser(telegramId) {
  const user = db.findUserByTelegramId(telegramId);
  if (user) {
    return db.updateUser(user.login, { telegramId: null });
  }
  return null;
}

// Validate credentials
function validateCredentials(login, password) {
  const user = db.findUserByLogin(login);
  if (user && user.password === password) {
    return user;
  }
  return null;
}

// Session management for login process
function setLoginSession(telegramId, data) {
  sessions.set(telegramId, { ...sessions.get(telegramId), ...data });
}

function getLoginSession(telegramId) {
  return sessions.get(telegramId) || {};
}

function clearLoginSession(telegramId) {
  sessions.delete(telegramId);
}

// Middleware to check if user is logged in
function authMiddleware(ctx, next) {
  const telegramId = ctx.from?.id;
  
  // Allow /start, /login commands without login
  const allowedCommands = ['/start', '/login'];
  const messageText = ctx.message?.text || '';
  
  if (allowedCommands.some(cmd => messageText.startsWith(cmd))) {
    return next();
  }
  
  // Check for login session (user is in login process)
  const session = getLoginSession(telegramId);
  if (session.step === 'awaiting_login' || session.step === 'awaiting_password') {
    return next();
  }
  
  // Check if logged in
  if (!isLoggedIn(telegramId)) {
    return ctx.reply('❌ You are not logged in. Use /login');
  }
  
  return next();
}

module.exports = {
  isLoggedIn,
  getLoggedInUser,
  isAdmin,
  loginUser,
  logoutUser,
  validateCredentials,
  setLoginSession,
  getLoginSession,
  clearLoginSession,
  authMiddleware
};
