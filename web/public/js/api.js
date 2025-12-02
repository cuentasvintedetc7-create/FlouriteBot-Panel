/**
 * FlouriteBot Admin Panel - API Helper
 */

const API = {
  baseUrl: '/api',
  token: localStorage.getItem('admin_token'),

  // Set token
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
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      const data = await response.json();
      
      if (response.status === 401) {
        // Token expired or invalid
        this.setToken(null);
        window.location.reload();
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
      return API.post('/auth/login', { username, password });
    },
    async me() {
      return API.get('/auth/me');
    },
    async logout() {
      return API.post('/auth/logout', {});
    }
  },

  // Users endpoints
  users: {
    async getAll() {
      return API.get('/users');
    },
    async get(username) {
      return API.get(`/users/${username}`);
    },
    async create(data) {
      return API.post('/users', data);
    },
    async update(username, data) {
      return API.put(`/users/${username}`, data);
    },
    async delete(username) {
      return API.delete(`/users/${username}`);
    },
    async updateBalance(username, amount, action) {
      return API.post(`/users/${username}/balance`, { amount, action });
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
      return API.put(`/promo/${code}`, data);
    },
    async delete(code) {
      return API.delete(`/promo/${code}`);
    },
    async toggle(code) {
      return API.post(`/promo/${code}/toggle`, {});
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
      return API.get(`/logs/level/${level}?lines=${lines}`);
    },
    async getFiles() {
      return API.get('/logs/files');
    }
  }
};
