/**
 * FlouriteBot Admin Panel - Main Application
 */

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');
const navItems = document.querySelectorAll('.nav-item');
const pageTitle = document.getElementById('page-title');
const headerUsername = document.getElementById('header-username');

// Toast notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Modal functions
function showModal(title, content) {
  const overlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  
  modalTitle.textContent = title;
  modalBody.innerHTML = content;
  overlay.style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) {
    closeModal();
  }
});

// Format currency
function formatCurrency(amount) {
  return '$' + parseFloat(amount || 0).toFixed(2);
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Check authentication
async function checkAuth() {
  if (!API.token) {
    showLogin();
    return false;
  }
  
  const result = await API.auth.me();
  
  if (result.success) {
    headerUsername.textContent = result.user.username;
    showDashboard();
    return true;
  } else {
    API.setToken(null);
    showLogin();
    return false;
  }
}

// Show login screen
function showLogin() {
  loginScreen.style.display = 'flex';
  dashboard.style.display = 'none';
}

// Show dashboard
function showDashboard() {
  loginScreen.style.display = 'none';
  dashboard.style.display = 'flex';
  loadPage('dashboard');
}

// Login handler
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  
  loginError.style.display = 'none';
  
  const result = await API.auth.login(username, password);
  
  if (result.success) {
    API.setToken(result.token);
    headerUsername.textContent = result.user.username;
    showToast('Login successful', 'success');
    showDashboard();
  } else {
    loginError.textContent = result.message || 'Login failed';
    loginError.style.display = 'block';
  }
});

// Logout handler
logoutBtn.addEventListener('click', async () => {
  await API.auth.logout();
  API.setToken(null);
  showToast('Logged out', 'info');
  showLogin();
});

// Navigation
navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const page = item.dataset.page;
    
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    loadPage(page);
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('open');
    }
  });
});

// Mobile menu toggle
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

// Load page content
function loadPage(page) {
  const pages = document.querySelectorAll('.page');
  pages.forEach(p => p.classList.remove('active'));
  
  const activePage = document.getElementById(`page-${page}`);
  if (activePage) {
    activePage.classList.add('active');
    pageTitle.textContent = page.charAt(0).toUpperCase() + page.slice(1);
  }
  
  // Load page data
  switch (page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'users':
      loadUsers();
      break;
    case 'stock':
      loadStock();
      break;
    case 'purchases':
      loadPurchases();
      break;
    case 'topups':
      loadTopups();
      break;
    case 'resets':
      loadResets();
      break;
    case 'promo':
      loadPromo();
      break;
    case 'logs':
      loadLogs();
      break;
  }
}

// Dashboard
async function loadDashboard() {
  const result = await API.stats.getAll();
  
  if (result.success) {
    const { stats } = result;
    
    document.getElementById('stat-users').textContent = stats.users.total;
    document.getElementById('stat-purchases').textContent = stats.purchases.total;
    document.getElementById('stat-revenue').textContent = formatCurrency(stats.purchases.revenue);
    document.getElementById('stat-stock').textContent = stats.stock.totalKeys;
    document.getElementById('pending-badge').textContent = stats.topups.pending;
  }
  
  // Load pending topups
  const pendingResult = await API.topups.getPending();
  const pendingList = document.getElementById('pending-topups-list');
  
  if (pendingResult.success && pendingResult.topups.length > 0) {
    pendingList.innerHTML = pendingResult.topups.slice(0, 5).map(t => `
      <div class="pending-card">
        <div class="pending-card-header">
          <h4>#${t.id} - ${t.username}</h4>
          <span class="badge badge-warning">Pending</span>
        </div>
        <div class="pending-card-body">
          <p><strong>Method:</strong> ${t.method}</p>
          <p><strong>Date:</strong> ${formatDate(t.date)}</p>
        </div>
        <div class="pending-card-actions">
          <button class="btn btn-primary btn-small" onclick="approveTopup(${t.id})">
            <i class="fas fa-check"></i> Approve
          </button>
          <button class="btn btn-danger btn-small" onclick="rejectTopup(${t.id})">
            <i class="fas fa-times"></i> Reject
          </button>
        </div>
      </div>
    `).join('');
  } else {
    pendingList.innerHTML = '<p class="empty-message">No pending top-ups</p>';
  }
  
  // Load recent activity
  const purchasesResult = await API.purchases.getAll({ limit: 5 });
  const activityDiv = document.getElementById('recent-activity');
  
  if (purchasesResult.success && purchasesResult.purchases.length > 0) {
    activityDiv.innerHTML = purchasesResult.purchases.map(p => `
      <div class="pending-card">
        <div class="pending-card-header">
          <h4>${p.username}</h4>
          <span class="badge badge-success">${formatCurrency(p.price)}</span>
        </div>
        <div class="pending-card-body">
          <p><strong>Product:</strong> ${p.product} - ${p.keyType}</p>
          <p><strong>Date:</strong> ${formatDate(p.date)}</p>
        </div>
      </div>
    `).join('');
  } else {
    activityDiv.innerHTML = '<p class="empty-message">No recent activity</p>';
  }
}

// Users
async function loadUsers() {
  const result = await API.users.getAll();
  const tbody = document.querySelector('#users-table tbody');
  
  if (result.success) {
    tbody.innerHTML = result.users.map(u => `
      <tr>
        <td>${u.username}</td>
        <td><span class="badge">${u.role || 'user'}</span></td>
        <td>${formatCurrency(u.balance)}</td>
        <td>${u.telegramId ? '<i class="fas fa-check" style="color: var(--success)"></i>' : '<i class="fas fa-times" style="color: var(--error)"></i>'}</td>
        <td>
          <button class="action-btn edit" onclick="editUser('${u.username}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn delete" onclick="deleteUser('${u.username}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }
}

document.getElementById('add-user-btn').addEventListener('click', () => {
  showModal('Add User', `
    <form id="add-user-form">
      <div class="form-group">
        <label>Username</label>
        <input type="text" id="new-username" required>
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="new-password" required>
      </div>
      <div class="form-group">
        <label>Role</label>
        <select id="new-role" class="select-input">
          <option value="user">User</option>
          <option value="reseller">Reseller</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div class="form-group">
        <label>Initial Balance</label>
        <input type="number" id="new-balance" value="0" step="0.01">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button>
      </div>
    </form>
  `);
  
  document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = await API.users.create({
      username: document.getElementById('new-username').value,
      password: document.getElementById('new-password').value,
      role: document.getElementById('new-role').value,
      balance: parseFloat(document.getElementById('new-balance').value) || 0
    });
    
    if (result.success) {
      showToast('User created successfully', 'success');
      closeModal();
      loadUsers();
    } else {
      showToast(result.message || 'Failed to create user', 'error');
    }
  });
});

async function editUser(username) {
  const result = await API.users.get(username);
  
  if (result.success) {
    const u = result.user;
    showModal(`Edit User: ${username}`, `
      <form id="edit-user-form">
        <div class="form-group">
          <label>Role</label>
          <select id="edit-role" class="select-input">
            <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
            <option value="reseller" ${u.role === 'reseller' ? 'selected' : ''}>Reseller</option>
            <option value="staff" ${u.role === 'staff' ? 'selected' : ''}>Staff</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </div>
        <div class="form-group">
          <label>Balance</label>
          <input type="number" id="edit-balance" value="${u.balance}" step="0.01">
        </div>
        <div class="form-group">
          <label>New Password (leave empty to keep current)</label>
          <input type="password" id="edit-password">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    `);
    
    document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        role: document.getElementById('edit-role').value,
        balance: parseFloat(document.getElementById('edit-balance').value)
      };
      
      const password = document.getElementById('edit-password').value;
      if (password) {
        data.password = password;
      }
      
      const updateResult = await API.users.update(username, data);
      
      if (updateResult.success) {
        showToast('User updated successfully', 'success');
        closeModal();
        loadUsers();
      } else {
        showToast(updateResult.message || 'Failed to update user', 'error');
      }
    });
  }
}

async function deleteUser(username) {
  if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
    return;
  }
  
  const result = await API.users.delete(username);
  
  if (result.success) {
    showToast('User deleted successfully', 'success');
    loadUsers();
  } else {
    showToast(result.message || 'Failed to delete user', 'error');
  }
}

// Stock
async function loadStock() {
  const result = await API.stock.getAll();
  const grid = document.getElementById('stock-grid');
  
  if (result.success) {
    let html = '';
    
    for (const [category, products] of Object.entries(result.stock)) {
      for (const [product, durations] of Object.entries(products)) {
        html += `
          <div class="stock-card">
            <h4><i class="fas fa-box"></i> ${category}</h4>
            <p style="color: var(--text-secondary); margin-bottom: 12px;">${product}</p>
            ${Object.entries(durations).map(([dur, count]) => `
              <div class="stock-item">
                <span>${dur}</span>
                <strong>${count}</strong>
              </div>
            `).join('')}
          </div>
        `;
      }
    }
    
    grid.innerHTML = html || '<p class="empty-message">No stock data</p>';
  }
}

document.getElementById('add-stock-btn').addEventListener('click', async () => {
  const productsResult = await API.stock.getProducts();
  
  if (productsResult.success) {
    let options = productsResult.products.map(p => `
      <option value="${p.key}" data-durations='${JSON.stringify(p.durations)}'>${p.categoryName}</option>
    `).join('');
    
    showModal('Add Stock', `
      <form id="add-stock-form">
        <div class="form-group">
          <label>Category</label>
          <select id="stock-category" class="select-input">
            ${options}
          </select>
        </div>
        <div class="form-group">
          <label>Duration</label>
          <select id="stock-duration" class="select-input">
          </select>
        </div>
        <div class="form-group">
          <label>Amount</label>
          <input type="number" id="stock-amount" min="1" value="10" required>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Stock</button>
        </div>
      </form>
    `);
    
    // Update durations when category changes
    const categorySelect = document.getElementById('stock-category');
    const durationSelect = document.getElementById('stock-duration');
    
    function updateDurations() {
      const selected = categorySelect.options[categorySelect.selectedIndex];
      const durations = JSON.parse(selected.dataset.durations || '[]');
      durationSelect.innerHTML = durations.map(d => `
        <option value="${d.key}">${d.key} - ${formatCurrency(d.price)}</option>
      `).join('');
    }
    
    categorySelect.addEventListener('change', updateDurations);
    updateDurations();
    
    document.getElementById('add-stock-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const result = await API.stock.add({
        category: document.getElementById('stock-category').value,
        duration: document.getElementById('stock-duration').value,
        amount: parseInt(document.getElementById('stock-amount').value)
      });
      
      if (result.success) {
        showToast(result.message, 'success');
        closeModal();
        loadStock();
      } else {
        showToast(result.message || 'Failed to add stock', 'error');
      }
    });
  }
});

// Purchases
async function loadPurchases(search = '') {
  const params = { limit: 50 };
  if (search) params.username = search;
  
  const result = await API.purchases.getAll(params);
  const tbody = document.querySelector('#purchases-table tbody');
  
  if (result.success) {
    tbody.innerHTML = result.purchases.map(p => `
      <tr>
        <td>#${p.id}</td>
        <td>${p.username}</td>
        <td>${p.product}</td>
        <td>${p.duration}</td>
        <td><code style="font-size: 11px;">${p.key}</code></td>
        <td>${formatCurrency(p.price)}</td>
        <td>${formatDate(p.date)}</td>
      </tr>
    `).join('');
  }
}

document.getElementById('purchase-search').addEventListener('input', (e) => {
  loadPurchases(e.target.value);
});

// Topups
let currentTopupTab = 'pending';

document.querySelectorAll('.topups-tabs .tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.topups-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTopupTab = btn.dataset.tab;
    loadTopups();
  });
});

async function loadTopups() {
  const content = document.getElementById('topups-content');
  
  if (currentTopupTab === 'pending') {
    const result = await API.topups.getPending();
    
    if (result.success && result.topups.length > 0) {
      content.innerHTML = result.topups.map(t => `
        <div class="pending-card">
          <div class="pending-card-header">
            <h4>#${t.id} - ${t.username}</h4>
            <span class="badge badge-warning">Pending</span>
          </div>
          <div class="pending-card-body">
            <p><strong>Method:</strong> ${t.method}</p>
            <p><strong>Phone:</strong> ${t.phone || 'N/A'}</p>
            <p><strong>Date:</strong> ${formatDate(t.date)}</p>
          </div>
          <div class="pending-card-actions">
            <button class="btn btn-primary btn-small" onclick="approveTopup(${t.id})">
              <i class="fas fa-check"></i> Approve
            </button>
            <button class="btn btn-danger btn-small" onclick="rejectTopup(${t.id})">
              <i class="fas fa-times"></i> Reject
            </button>
          </div>
        </div>
      `).join('');
    } else {
      content.innerHTML = '<p class="empty-message">No pending top-ups</p>';
    }
  } else {
    const result = await API.topups.getAll({ limit: 50 });
    
    if (result.success && result.topups.length > 0) {
      content.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${result.topups.map(t => `
                <tr>
                  <td>#${t.id}</td>
                  <td>${t.username}</td>
                  <td>${formatCurrency(t.amount)}</td>
                  <td>${t.method || 'N/A'}</td>
                  <td>
                    <span class="badge ${t.status === 'APPROVED' ? 'badge-success' : t.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}">
                      ${t.status || 'Completed'}
                    </span>
                  </td>
                  <td>${formatDate(t.date)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      content.innerHTML = '<p class="empty-message">No top-up history</p>';
    }
  }
}

async function approveTopup(id) {
  const amount = prompt('Enter amount to add:');
  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
    showToast('Please enter a valid amount', 'error');
    return;
  }
  
  const result = await API.topups.approve(id, parseFloat(amount));
  
  if (result.success) {
    showToast(result.message, 'success');
    loadTopups();
    loadDashboard();
  } else {
    showToast(result.message || 'Failed to approve top-up', 'error');
  }
}

async function rejectTopup(id) {
  if (!confirm('Are you sure you want to reject this top-up?')) {
    return;
  }
  
  const result = await API.topups.reject(id);
  
  if (result.success) {
    showToast(result.message, 'success');
    loadTopups();
    loadDashboard();
  } else {
    showToast(result.message || 'Failed to reject top-up', 'error');
  }
}

// Resets
async function loadResets(search = '') {
  const params = { limit: 50 };
  if (search) params.username = search;
  
  const result = await API.resets.getAll(params);
  const tbody = document.querySelector('#resets-table tbody');
  
  if (result.success) {
    if (result.resets.length > 0) {
      tbody.innerHTML = result.resets.map(r => `
        <tr>
          <td>#${r.id}</td>
          <td>${r.username}</td>
          <td><code style="font-size: 11px;">${r.key}</code></td>
          <td>${r.product || 'N/A'}</td>
          <td>${formatDate(r.date)}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-message">No resets found</td></tr>';
    }
  }
}

document.getElementById('reset-search').addEventListener('input', (e) => {
  loadResets(e.target.value);
});

// Promo Codes
async function loadPromo() {
  const result = await API.promo.getAll();
  const tbody = document.querySelector('#promo-table tbody');
  
  if (result.success) {
    if (result.codes.length > 0) {
      tbody.innerHTML = result.codes.map(c => `
        <tr>
          <td><code>${c.code}</code></td>
          <td>${c.discountType}</td>
          <td>${c.discountType === 'percentage' ? c.amount + '%' : formatCurrency(c.amount)}</td>
          <td>${c.usageCount}/${c.maxUses || '∞'}</td>
          <td>
            <span class="badge ${c.active ? 'badge-success' : 'badge-error'}">
              ${c.active ? 'Active' : 'Disabled'}
            </span>
          </td>
          <td>
            <button class="action-btn edit" onclick="togglePromo('${c.code}')">
              <i class="fas fa-power-off"></i>
            </button>
            <button class="action-btn delete" onclick="deletePromo('${c.code}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-message">No promo codes</td></tr>';
    }
  }
}

document.getElementById('add-promo-btn').addEventListener('click', () => {
  showModal('Create Promo Code', `
    <form id="add-promo-form">
      <div class="form-group">
        <label>Code</label>
        <input type="text" id="promo-code" required placeholder="e.g., SAVE10">
      </div>
      <div class="form-group">
        <label>Type</label>
        <select id="promo-type" class="select-input">
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed Amount</option>
        </select>
      </div>
      <div class="form-group">
        <label>Amount</label>
        <input type="number" id="promo-amount" required min="0.01" step="0.01" placeholder="e.g., 10">
      </div>
      <div class="form-group">
        <label>Max Uses (0 = unlimited)</label>
        <input type="number" id="promo-max-uses" value="0" min="0">
      </div>
      <div class="form-group">
        <label>Expires At (optional)</label>
        <input type="date" id="promo-expires">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button>
      </div>
    </form>
  `);
  
  document.getElementById('add-promo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const result = await API.promo.create({
      code: document.getElementById('promo-code').value,
      type: document.getElementById('promo-type').value,
      amount: parseFloat(document.getElementById('promo-amount').value),
      maxUses: parseInt(document.getElementById('promo-max-uses').value) || 0,
      expiresAt: document.getElementById('promo-expires').value || null
    });
    
    if (result.success) {
      showToast('Promo code created successfully', 'success');
      closeModal();
      loadPromo();
    } else {
      showToast(result.message || 'Failed to create promo code', 'error');
    }
  });
});

async function togglePromo(code) {
  const result = await API.promo.toggle(code);
  
  if (result.success) {
    showToast(result.message, 'success');
    loadPromo();
  } else {
    showToast(result.message || 'Failed to toggle promo code', 'error');
  }
}

async function deletePromo(code) {
  if (!confirm(`Are you sure you want to delete promo code "${code}"?`)) {
    return;
  }
  
  const result = await API.promo.delete(code);
  
  if (result.success) {
    showToast('Promo code deleted successfully', 'success');
    loadPromo();
  } else {
    showToast(result.message || 'Failed to delete promo code', 'error');
  }
}

// Logs
async function loadLogs(level = '') {
  const params = { lines: 100 };
  if (level) params.level = level;
  
  const result = await API.logs.getAll(params);
  const viewer = document.getElementById('logs-viewer');
  
  if (result.success && result.logs.length > 0) {
    viewer.innerHTML = result.logs.map(log => `
      <div class="log-entry">
        <span class="log-time">${formatDate(log.timestamp)}</span>
        <span class="log-level ${log.level}">${log.level}</span>
        <span class="log-message">${log.message}</span>
      </div>
    `).join('');
  } else {
    viewer.innerHTML = '<p class="empty-message">No logs available</p>';
  }
}

document.getElementById('log-filter').addEventListener('change', (e) => {
  loadLogs(e.target.value);
});

document.getElementById('refresh-logs-btn').addEventListener('click', () => {
  loadLogs(document.getElementById('log-filter').value);
  showToast('Logs refreshed', 'info');
});

// User search
document.getElementById('user-search').addEventListener('input', (e) => {
  const search = e.target.value.toLowerCase();
  const rows = document.querySelectorAll('#users-table tbody tr');
  
  rows.forEach(row => {
    const username = row.cells[0].textContent.toLowerCase();
    row.style.display = username.includes(search) ? '' : 'none';
  });
});

// Initialize
checkAuth();
