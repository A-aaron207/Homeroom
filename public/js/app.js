window.Homeroom = window.Homeroom || {};

const App = {
    async init() {
        await Homeroom.auth.init();
        
        if (!Homeroom.auth.isLoggedIn) {
            return;
        }
        
        Homeroom.store.currentUser = Homeroom.auth.user;
        
        this.bindEvents();
        this.updateHeaderAndSidebar();
        
        Homeroom.store.on('wallet_updated', () => this.updateCoins());
        Homeroom.store.on('daily_status_updated', (status) => this.handleDailyStatus(status));
        
        window.addEventListener('hashchange', () => this.navigate());
        this.navigate();
        
        Homeroom.store.loadWallet();
        this.checkinDaily();
    },
    
    async checkinDaily() {
        try {
            const res = await Homeroom.API.post('/daily/checkin');
            if (res.success && res.message.includes('Checked in')) {
                Homeroom.toast(res.message, 'success');
                Homeroom.store.loadWallet();
            }
            Homeroom.store.loadDailyStatus();
        } catch(e) {}
    },
    
    handleDailyStatus(status) {
        if (status && status.canSpin) {
            Homeroom.toast('You have a daily spin available!', 'info');
        }
    },
    
    updateHeaderAndSidebar() {
        const u = Homeroom.store.currentUser;
        if (!u) return;
        
        const sidebarUser = document.getElementById('sidebar-user');
        if (sidebarUser) {
            sidebarUser.innerHTML = `
                <div class="avatar">${u.avatarEmoji || '🎓'}</div>
                <div class="user-info">
                    <div class="display-name ${u.username_color || ''}">${u.displayName}</div>
                    <div class="level">Lvl ${this.calculateLevel(u.xp)}</div>
                </div>
            `;
        }
        
        const headerAvatar = document.getElementById('header-avatar');
        if (headerAvatar) {
            headerAvatar.textContent = u.avatarEmoji || '🎓';
        }
        
        this.updateCoins();
    },
    
    updateCoins() {
        let coins = Homeroom.store.currentUser?.coins || 0;
        if (Homeroom.store.wallet) {
            coins = Homeroom.store.wallet.balance;
        }
        const coinDisplay = document.getElementById('header-coins');
        if (coinDisplay) {
            coinDisplay.textContent = Homeroom.store.formatCoins(coins);
        }
    },
    
    calculateLevel(xp) {
        const levels = [0, 500, 1500, 3000, 5000, 8000, 12000, 18000];
        let level = 1;
        for(let i=0; i<levels.length; i++) {
            if (xp >= levels[i]) level = i + 1;
        }
        return level;
    },
    
    bindEvents() {
        const toggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }
        
        document.getElementById('modal-close')?.addEventListener('click', () => Homeroom.modal.close());
        document.getElementById('modal-backdrop')?.addEventListener('click', (e) => {
            if (e.target.id === 'modal-backdrop') Homeroom.modal.close();
        });
    },
    
    async navigate() {
        let hash = window.location.hash.slice(1) || 'home';
        
        document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(el => {
            el.classList.remove('active');
            if (el.dataset.page === hash) el.classList.add('active');
        });
        
        const main = document.getElementById('main-content');
        main.innerHTML = '<div class="text-center mt-5"><p>Loading...</p></div>';
        
        const page = Homeroom.pages[hash];
        if (page) {
            try {
                main.innerHTML = await page.render();
                if (page.init) page.init();
            } catch (err) {
                console.error(err);
                main.innerHTML = `<div class="message error">Failed to load ${hash}</div>`;
            }
        } else {
            main.innerHTML = `<div class="empty-state">
                <h2>Coming Soon</h2>
                <p>The ${hash} page is under construction.</p>
            </div>`;
        }
        
        document.getElementById('sidebar')?.classList.remove('active');
    }
};

Homeroom.toast = function(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

Homeroom.modal = {
    open(title, bodyHTML, footerHTML = '') {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHTML;
        document.getElementById('modal-footer').innerHTML = footerHTML;
        document.getElementById('modal-backdrop').style.display = 'flex';
    },
    close() {
        document.getElementById('modal-backdrop').style.display = 'none';
        document.getElementById('modal-body').innerHTML = '';
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
