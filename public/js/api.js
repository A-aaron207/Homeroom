window.Homeroom = window.Homeroom || {};

Homeroom.API = {
  baseURL: '/api',
  token: localStorage.getItem('homeroom_token'),
  
  setToken(token) { 
      this.token = token; 
      localStorage.setItem('homeroom_token', token); 
  },
  
  clearToken() { 
      this.token = null; 
      localStorage.removeItem('homeroom_token'); 
  },
  
  async request(method, path, body, isFormData = false) {
    const headers = {};
    if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
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
        
        if (res.status === 401) {
            this.clearToken();
            if (!window.location.pathname.endsWith('auth.html') && !window.location.pathname.endsWith('approve.html')) {
                window.location.href = 'auth.html';
            }
            return { success: false, message: 'Session expired. Please login again.' };
        }
        
        return await res.json();
    } catch (err) {
        console.error('API Error:', err);
        return { success: false, message: 'Network request failed' };
    }
  },
  
  get(path) { return this.request('GET', path); },
  post(path, body, isFormData) { return this.request('POST', path, body, isFormData); },
  put(path, body) { return this.request('PUT', path, body); },
  delete(path) { return this.request('DELETE', path); },
  upload(path, formData) { return this.request('POST', path, formData, true); }
};
