const db = require('./db');
const config = require('../../config.json');

// Session storage for login process
const sessions = new Map();

// Get admin ID - prefer environment variable over config file
const adminId = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID) : config.adminId;

// Check if user is logged in
function isLoggedIn(telegramId) {
  const user = db.findUserByTelegramId(telegramId);
  return user !== null && user !== undefined;
}

// Get logged in user
function getLoggedInUser(telegramId) {
  return db.findUserByTelegramId(telegramId);
}

// Check if user is admin (ADMIN_ID from env)
function isAdmin(telegramId) {
  return telegramId === adminId;
}

// Get admin ID
function getAdminId() {
  return adminId;
}

// Check if user has specific role
function hasRole(telegramId, roles) {
  if (isAdmin(telegramId)) return true;
  const user = db.findUserByTelegramId(telegramId);
  if (!user) return false;
  const userRole = user.role || 'user';
  if (Array.isArray(roles)) {
    return roles.includes(userRole);
  }
  return userRole === roles;
}

// Check if user is staff (admin or staff role)
function isStaff(telegramId) {
  return isAdmin(telegramId) || hasRole(telegramId, ['admin', 'staff']);
}

// Check if user is reseller
function isReseller(telegramId) {
  return hasRole(telegramId, ['admin', 'reseller']);
}

// Check if user is support
function isSupport(telegramId) {
  return hasRole(telegramId, ['admin', 'staff', 'support']);
}

// Login user (link telegram account)
function loginUser(telegramId, username) {
  return db.updateUser(username, { telegramId });
}

// Logout user
function logoutUser(telegramId) {
  const user = db.findUserByTelegramId(telegramId);
  if (user) {
    return db.updateUser(user.username, { telegramId: null });
  }
  return null;
}

// Validate credentials
function validateCredentials(username, password) {
  const user = db.findUserByUsername(username);
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
  getAdminId,
  hasRole,
  isStaff,
  isReseller,
  isSupport,
  loginUser,
  logoutUser,
  validateCredentials,
  setLoginSession,
  getLoginSession,
  clearLoginSession,
  authMiddleware
};
