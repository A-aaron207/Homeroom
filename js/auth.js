window.Homeroom = window.Homeroom || {};

Homeroom.auth = {
  user: null,
  isLoggedIn: false,
  
  async init() {
    if (!Homeroom.API.token) {
        this.logout();
        return;
    }
    
    try {
        const res = await Homeroom.API.get('/auth/me');
        if (res.success && res.data.user) {
            this.user = res.data.user;
            this.isLoggedIn = true;
            document.body.dataset.theme = this.user.theme || 'dark';
        } else {
            this.logout();
        }
    } catch (err) {
        console.error('Failed to init auth', err);
        this.logout();
    }
  },
  
  logout() {
    this.user = null;
    this.isLoggedIn = false;
    Homeroom.API.clearToken();
    if (!window.location.pathname.endsWith('auth.html') && !window.location.pathname.endsWith('approve.html')) {
        window.location.href = 'auth.html';
    }
  },
  
  isAdmin() {
    return this.user && this.user.role === 'admin';
  }
};
