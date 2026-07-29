window.Homeroom = window.Homeroom || {};

Homeroom.API = {
  baseURL: '/api',
  token: localStorage.getItem('homeroom_token'),
  
  getToken() {
      if (!this.token) {
          this.token = localStorage.getItem('homeroom_token');
      }
      return this.token;
  },

  setToken(token) { 
      this.token = token; 
      localStorage.setItem('homeroom_token', token); 
  },
  
  clearToken() { 
      this.token = null; 
      localStorage.removeItem('homeroom_token'); 
  },

  async refreshToken() {
      if (!this.getToken()) return false;
      try {
          const res = await fetch(this.baseURL + '/auth/refresh', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${this.getToken()}`,
                  'Content-Type': 'application/json'
              }
          });
          const data = await res.json();
          if (res.ok && data.success && data.data && data.data.token) {
              this.setToken(data.data.token);
              return true;
          }
      } catch (e) {}
      return false;
  },
  
  async request(method, path, body, isFormData = false) {
    const headers = {};
    const curToken = this.getToken();
    if (curToken) {
        headers['Authorization'] = `Bearer ${curToken}`;
    }
    
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    
    const options = {
      method,
      headers
    };
    
    if (body) {
        options.body = isFormData ? body : JSON.stringify(body);
    }
    
    try {
        const res = await fetch(this.baseURL + path, options);
        
        if (res.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/signup') && !path.includes('/auth/refresh')) {
            // Attempt a single token refresh before logging out
            const refreshed = await this.refreshToken();
            if (refreshed) {
                headers['Authorization'] = `Bearer ${this.getToken()}`;
                const retryRes = await fetch(this.baseURL + path, options);
                return await retryRes.json();
            }
            
            this.clearToken();
            if (!window.location.pathname.endsWith('auth.html') && !window.location.pathname.endsWith('approve.html')) {
                window.location.href = 'auth.html';
            }
            return { success: false, message: 'Session expired. Please login again.' };
        }

        const data = await res.json();
        return data;
    } catch (err) {
        console.error('API Error:', err);
        return { success: false, message: 'Network request failed' };
    }
  },
  
  get(path) { return this.request('GET', path); },
  post(path, body, isFormData = false) { return this.request('POST', path, body, isFormData); },
  put(path, body, isFormData = false) { return this.request('PUT', path, body, isFormData); },
  delete(path) { return this.request('DELETE', path); },
  upload(path, formData) { return this.request('POST', path, formData, true); }
};

