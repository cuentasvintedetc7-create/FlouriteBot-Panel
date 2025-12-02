/**
 * FlouriteBot Admin Panel - API Helper
 * 
 * Updated to:
 * - Use credentials: 'include' for cookie-based auth
 * - Handle token renewal notifications
 * - Fallback to localStorage for backwards compatibility
 */

const API = {
  baseUrl: '/api',
  
  // For backwards compatibility, still store token in localStorage
  // but primary auth is via HttpOnly cookie
  token: localStorage.getItem('admin_token'),

  // Set token (for backwards compatibility)
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('admin_token', token);
    } else {
      localStorage.removeItem('admin_token');
    }
  },

  // Make API request
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Add Authorization header for backwards compatibility
    // Primary auth is via HttpOnly cookie
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include' // Important: Include cookies in requests
      });
      
      // Check if token was renewed (server sends this header)
      const tokenRenewed = response.headers.get('X-Token-Renewed');
      if (tokenRenewed === 'true') {
        console.log('Session token renewed automatically');
      }
      
      const data = await response.json();
      
      if (response.status === 401) {
        // Token expired or invalid - clear local storage
        this.setToken(null);
        // Dispatch session expired event for the UI to handle
        window.dispatchEvent(new Event('session-expired'));
        return { success: false, message: 'Session expired' };
      }
      
      return data;
      
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, message: 'Network error' };
    }
  },

  // GET request
  async get(endpoint) {
    return this.request(endpoint);
  },

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  },

  // Auth endpoints
  auth: {
    async login(username, password) {
      const result = await API.post('/auth/login', { username, password });
      if (result.success && result.token) {
        // Store token for backwards compatibility
        API.setToken(result.token);
      }
      return result;
    },
    async me() {
      return API.get('/auth/me');
    },
    async logout() {
      const result = await API.post('/auth/logout', {});
      API.setToken(null);
      return result;
    },
    async refresh() {
      const result = await API.post('/auth/refresh', {});
      if (result.success && result.token) {
        API.setToken(result.token);
      }
      return result;
    }
  },

  // Users endpoints
  users: {
    async getAll() {
      return API.get('/users');
    },
    async get(username) {
      return API.get(`/users/${encodeURIComponent(username)}`);
    },
    async create(data) {
      return API.post('/users', data);
    },
    async update(username, data) {
      return API.put(`/users/${encodeURIComponent(username)}`, data);
    },
    async delete(username) {
      return API.delete(`/users/${encodeURIComponent(username)}`);
    },
    async updateBalance(username, amount, action) {
      return API.post(`/users/${encodeURIComponent(username)}/balance`, { amount, action });
    }
  },

  // Stock endpoints
  stock: {
    async getAll() {
      return API.get('/stock');
    },
    async getProducts() {
      return API.get('/stock/products');
    },
    async add(data) {
      return API.post('/stock/add', data);
    },
    async remove(data) {
      return API.post('/stock/remove', data);
    },
    async clear(data) {
      return API.post('/stock/clear', data);
    }
  },

  // Purchases endpoints
  purchases: {
    async getAll(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.get(`/purchases${query ? '?' + query : ''}`);
    },
    async getStats() {
      return API.get('/purchases/stats');
    }
  },

  // Topups endpoints
  topups: {
    async getAll(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.get(`/topups${query ? '?' + query : ''}`);
    },
    async getPending() {
      return API.get('/topups/pending');
    },
    async approve(id, amount) {
      return API.post(`/topups/${id}/approve`, { amount });
    },
    async reject(id) {
      return API.post(`/topups/${id}/reject`, {});
    },
    async getStats() {
      return API.get('/topups/stats');
    }
  },

  // Resets endpoints
  resets: {
    async getAll(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.get(`/resets${query ? '?' + query : ''}`);
    },
    async getStats() {
      return API.get('/resets/stats');
    }
  },

  // Promo endpoints
  promo: {
    async getAll() {
      return API.get('/promo');
    },
    async create(data) {
      return API.post('/promo', data);
    },
    async update(code, data) {
      return API.put(`/promo/${encodeURIComponent(code)}`, data);
    },
    async delete(code) {
      return API.delete(`/promo/${encodeURIComponent(code)}`);
    },
    async toggle(code) {
      return API.post(`/promo/${encodeURIComponent(code)}/toggle`, {});
    }
  },

  // Stats endpoints
  stats: {
    async getAll() {
      return API.get('/stats');
    },
    async getChartPurchases() {
      return API.get('/stats/chart/purchases');
    },
    async getChartTopups() {
      return API.get('/stats/chart/topups');
    }
  },

  // Logs endpoints
  logs: {
    async getAll(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.get(`/logs${query ? '?' + query : ''}`);
    },
    async getByLevel(level, lines = 100) {
      return API.get(`/logs/level/${encodeURIComponent(level)}?lines=${lines}`);
    },
    async getFiles() {
      return API.get('/logs/files');
    }
  }
};

// Session refresh interval (every 30 minutes)
const SESSION_REFRESH_INTERVAL = 30 * 60 * 1000;

// Automatically refresh session periodically to keep it alive
let sessionRefreshTimer = null;

function startSessionRefresh() {
  if (sessionRefreshTimer) {
    clearInterval(sessionRefreshTimer);
  }
  sessionRefreshTimer = setInterval(async () => {
    const result = await API.auth.me();
    if (!result.success) {
      console.log('Session check failed, may need to re-login');
    }
  }, SESSION_REFRESH_INTERVAL);
}

function stopSessionRefresh() {
  if (sessionRefreshTimer) {
    clearInterval(sessionRefreshTimer);
    sessionRefreshTimer = null;
  }
}

// Export session management functions
window.startSessionRefresh = startSessionRefresh;
window.stopSessionRefresh = stopSessionRefresh;
