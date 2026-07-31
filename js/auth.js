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
        if (res.success && res.data && res.data.user) {
            this.user = res.data.user;
            this.isLoggedIn = true;
            try { localStorage.setItem('homeroom_cached_user', JSON.stringify(this.user)); } catch(e) {}
            document.body.dataset.theme = this.user.theme || 'dark';
        } else {
            const cached = localStorage.getItem('homeroom_cached_user');
            if (cached) {
                try {
                    this.user = JSON.parse(cached);
                    this.isLoggedIn = true;
                    document.body.dataset.theme = this.user.theme || 'dark';
                    return;
                } catch(e) {}
            }
            this.logout();
        }
    } catch (err) {
        console.error('Failed to init auth', err);
        const cached = localStorage.getItem('homeroom_cached_user');
        if (cached) {
            try {
                this.user = JSON.parse(cached);
                this.isLoggedIn = true;
                document.body.dataset.theme = this.user.theme || 'dark';
                return;
            } catch(e) {}
        }
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
