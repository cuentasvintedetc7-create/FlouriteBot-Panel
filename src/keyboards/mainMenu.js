const { Markup } = require('telegraf');

function mainMenu() {
  return Markup.keyboard([
    ['🛒 Buy Product', '👤 My Account'],
    ['💰 Add Balance', '🧾 My Purchases'],
    ['🔄 Reset Key', '🔓 Logout']
  ]).resize();
}

function mainMenuInline() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🛒 Buy Product', 'buy')],
    [Markup.button.callback('👤 My Account', 'account')],
    [Markup.button.callback('💰 Add Balance', 'add_balance')],
    [Markup.button.callback('🧾 My Purchases', 'account_purchases')],
    [Markup.button.callback('🔄 Reset Key', 'reset_key')],
    [Markup.button.callback('🔓 Logout', 'logout')]
  ]);
}

function adminPanelMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('1️⃣ Manage Users', 'admin_users')],
    [Markup.button.callback('2️⃣ Manage Stock', 'admin_stock')],
    [Markup.button.callback('3️⃣ Add Balance', 'admin_add_balance')],
    [Markup.button.callback('4️⃣ Remove Balance', 'admin_remove_balance')],
    [Markup.button.callback('5️⃣ Purchases', 'admin_purchases')],
    [Markup.button.callback('6️⃣ Topups', 'admin_topups')],
    [Markup.button.callback('📤 Pending Topups', 'admin_pending_topups')],
    [Markup.button.callback('7️⃣ Promo Codes', 'admin_promo')],
    [Markup.button.callback('8️⃣ Broadcast', 'admin_broadcast')],
    [Markup.button.callback('9️⃣ Stats', 'admin_stats')],
    [Markup.button.callback('📑 User Activity Log', 'admin_user_activity')],
    [Markup.button.callback('🔧 Settings', 'admin_settings')],
    [Markup.button.callback('👥 Manage Roles', 'admin_roles')]
  ]);
}

// Stock management menu for admin panel
function stockManagementMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('👁️ View Stock', 'admin_view_stock')],
    [Markup.button.callback('➕ Add Stock', 'admin_add_stock')],
    [Markup.button.callback('➖ Remove Stock', 'admin_remove_stock')],
    [Markup.button.callback('🗑️ Clear Stock', 'admin_clear_stock')],
    [Markup.button.callback('⬅️ Back to Admin', 'back_admin')]
  ]);
}

module.exports = {
  mainMenu,
  mainMenuInline,
  adminPanelMenu,
  stockManagementMenu
};
