window.Homeroom = window.Homeroom || {};

const App = {
    deferredInstallPrompt: null,

    async init() {
        await Homeroom.auth.init();
        
        if (!Homeroom.auth.isLoggedIn) {
            return;
        }
        
        Homeroom.store.currentUser = Homeroom.auth.user;
        
        this.bindEvents();
        this.initPWAFeatures();
        this.bindKeyboardShortcuts();
        this.handleShareAndFileTargets();
        this.updateHeaderAndSidebar();
        
        Homeroom.store.on('wallet_updated', () => this.updateCoins());
        Homeroom.store.on('daily_status_updated', (status) => this.handleDailyStatus(status));
        
        window.addEventListener('hashchange', () => this.navigate());
        this.navigate();
        
        Homeroom.store.loadWallet();
        this.checkinDaily();
        
        this.loadNotifications();
        setInterval(() => this.loadNotifications(), 6000);
    },
    
    initPWAFeatures() {
        // 1. Installability Listener (beforeinstallprompt)
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredInstallPrompt = e;

            const headerBtn = document.getElementById('btn-header-install');
            const sidebarBtn = document.getElementById('btn-sidebar-install');
            if (headerBtn) headerBtn.style.display = 'flex';
            if (sidebarBtn) sidebarBtn.style.display = 'flex';
        });

        const promptInstall = async () => {
            if (!this.deferredInstallPrompt) {
                // Check if iOS
                if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                    Homeroom.modal.open('📲 Install Homeroom on iOS', `
                        <div style="text-align: center; padding: 1rem;">
                            <div style="font-size: 3rem; margin-bottom: 0.5rem;">📲</div>
                            <p style="font-size: 0.95rem; color: var(--text-color); margin-bottom: 1rem;">To install Homeroom on your iPhone or iPad:</p>
                            <ol style="text-align: left; background: rgba(0,0,0,0.2); padding: 1rem 1rem 1rem 2rem; border-radius: 0.75rem; color: var(--text-muted); font-size: 0.9rem; line-height: 1.6;">
                                <li>Tap the <strong>Share</strong> icon in Safari (bottom toolbar)</li>
                                <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                                <li>Tap <strong>Add</strong> in the top right corner</li>
                            </ol>
                        </div>
                    `);
                } else {
                    Homeroom.toast('App installation is already active or unsupported in this browser.', 'info');
                }
                return;
            }

            this.deferredInstallPrompt.prompt();
            const choice = await this.deferredInstallPrompt.userChoice;
            if (choice.outcome === 'accepted') {
                Homeroom.toast('🎉 Thanks for installing Homeroom!', 'success');
            }
            this.deferredInstallPrompt = null;
            document.getElementById('btn-header-install')?.style.setProperty('display', 'none');
            document.getElementById('btn-sidebar-install')?.style.setProperty('display', 'none');
        };

        document.getElementById('btn-header-install')?.addEventListener('click', promptInstall);
        document.getElementById('btn-sidebar-install')?.addEventListener('click', promptInstall);

        window.addEventListener('appinstalled', () => {
            Homeroom.toast('✨ Homeroom installed successfully!', 'success');
            this.deferredInstallPrompt = null;
        });

        // 2. Offline / Online Status Sync
        const updateOnlineStatus = () => {
            const banner = document.getElementById('offline-banner');
            if (banner) {
                banner.style.display = navigator.onLine ? 'none' : 'block';
            }
            if (navigator.onLine) {
                Homeroom.OfflineDB.processQueue(async (actionType, payload) => {
                    if (actionType === 'send_message') {
                        await Homeroom.API.post(`/conversations/${payload.chatId}/messages`, { content: payload.content });
                    } else if (actionType === 'create_question') {
                        await Homeroom.API.post('/qna/questions', payload);
                    } else if (actionType === 'upload_note') {
                        await Homeroom.API.post('/notes', payload);
                    }
                });
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();

        // 3. Clipboard Support (Paste handler for images/files)
        window.addEventListener('paste', (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const blob = item.getAsFile();
                    if (blob) {
                        Homeroom.toast('📋 Image detected from clipboard! Opening Note Upload...', 'info');
                        location.hash = '#notes';
                        setTimeout(() => {
                            if (Homeroom.pages.notes && Homeroom.pages.notes.openUploadModalWithFile) {
                                Homeroom.pages.notes.openUploadModalWithFile(blob);
                            }
                        }, 400);
                    }
                }
            }
        });
    },

    bindKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            // Ctrl+K or Cmd+K -> Focus Search
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('global-search');
                if (searchInput) searchInput.focus();
            }

            // Ctrl+N or Cmd+N -> Quick Create Menu
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                const quickMenu = document.getElementById('quick-action-menu');
                if (quickMenu) {
                    quickMenu.style.display = quickMenu.style.display === 'flex' ? 'none' : 'flex';
                }
            }

            // Ctrl+/ or Cmd+/ -> Keyboard Shortcuts Help
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.showKeyboardShortcutsModal();
            }

            // Escape -> Close modals
            if (e.key === 'Escape') {
                Homeroom.modal.close();
                const quickMenu = document.getElementById('quick-action-menu');
                if (quickMenu) quickMenu.style.display = 'none';
            }
        });
    },

    showKeyboardShortcutsModal() {
        Homeroom.modal.open('⌨️ Keyboard Shortcuts', `
            <div style="display: flex; flex-direction: column; gap: 0.75rem; padding: 0.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem;">
                    <span>Global Search</span>
                    <kbd style="background: rgba(99,102,241,0.25); border: 1px solid rgba(99,102,241,0.4); padding: 0.2rem 0.6rem; border-radius: 0.3rem; font-family: monospace;">Ctrl + K</kbd>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem;">
                    <span>Quick Create Menu</span>
                    <kbd style="background: rgba(99,102,241,0.25); border: 1px solid rgba(99,102,241,0.4); padding: 0.2rem 0.6rem; border-radius: 0.3rem; font-family: monospace;">Ctrl + N</kbd>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem;">
                    <span>Keyboard Shortcuts Help</span>
                    <kbd style="background: rgba(99,102,241,0.25); border: 1px solid rgba(99,102,241,0.4); padding: 0.2rem 0.6rem; border-radius: 0.3rem; font-family: monospace;">Ctrl + /</kbd>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem;">
                    <span>Close Active Modal</span>
                    <kbd style="background: rgba(99,102,241,0.25); border: 1px solid rgba(99,102,241,0.4); padding: 0.2rem 0.6rem; border-radius: 0.3rem; font-family: monospace;">Esc</kbd>
                </div>
            </div>
        `);
    },

    handleShareAndFileTargets() {
        // Handle Web Share Target API params in URL
        const hash = window.location.hash;
        if (hash.includes('share-target')) {
            const urlParams = new URLSearchParams(window.location.search);
            const title = urlParams.get('title') || '';
            const text = urlParams.get('text') || '';
            const sharedUrl = urlParams.get('url') || '';

            location.hash = '#notes';
            setTimeout(() => {
                Homeroom.toast(`Received shared content: "${title || text}"`, 'info');
            }, 500);
        }

        // Handle File Handling API (Launch Queue)
        if ('launchQueue' in window && 'files' in LaunchParams.prototype) {
            window.launchQueue.setConsumer(async (launchParams) => {
                if (!launchParams.files.length) return;
                const fileHandle = launchParams.files[0];
                const file = await fileHandle.getFile();
                Homeroom.toast(`📂 Opened file: ${file.name}`, 'info');
                location.hash = '#notes';
                setTimeout(() => {
                    if (Homeroom.pages.notes && Homeroom.pages.notes.openUploadModalWithFile) {
                        Homeroom.pages.notes.openUploadModalWithFile(file);
                    }
                }, 400);
            });
        }
    },
    
    async loadNotifications() {
        try {
            const res = await Homeroom.API.get('/notifications');
            if (res.success && res.data) {
                const badge = document.getElementById('notif-badge');
                const unread = res.data.unread_count || 0;

                // Update App Badging API on Supported Operating Systems
                if ('setAppBadge' in navigator) {
                    if (unread > 0) {
                        navigator.setAppBadge(unread).catch(() => {});
                    } else {
                        navigator.clearAppBadge().catch(() => {});
                    }
                }

                if (badge) {
                    if (unread > 0) {
                        badge.textContent = unread > 99 ? '99+' : unread;
                        badge.style.display = 'inline-block';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }
        } catch(e) {}
    },

    async openNotificationsModal() {
        Homeroom.modal.open('Notifications', '<div style="text-align:center; padding:2rem;"><div class="spinner"></div></div>');
        try {
            const res = await Homeroom.API.get('/notifications');
            if (!res.success) throw new Error();
            
            const list = res.data.notifications || [];
            if (list.length === 0) {
                Homeroom.modal.open('Notifications', '<div style="text-align:center; padding:3rem; color:var(--text-muted);"><div style="font-size:3rem;">🔔</div><p>No notifications yet</p></div>');
                return;
            }
            
            const notifHTML = list.map(n => `
                <div style="padding: 1rem; border-radius: 0.5rem; background: ${n.is_read ? 'rgba(0,0,0,0.1)' : 'rgba(99,102,241,0.1)'}; border-left: 4px solid ${n.is_read ? 'transparent' : 'var(--accent-color)'}; margin-bottom: 0.75rem;">
                    <div style="font-weight: bold; font-size: 0.95rem; color: var(--text-color);">${n.title}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">${n.message}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); opacity: 0.7; margin-top: 0.5rem;">${new Date(n.created_at).toLocaleString()}</div>
                </div>
            `).join('');

            Homeroom.modal.open('Notifications', `
                <div style="max-height: 400px; overflow-y: auto;">${notifHTML}</div>
            `, `
                <button id="btn-mark-all-notifs" class="btn btn-premium" style="width: 100%; padding: 0.75rem;">Mark All as Read</button>
            `);

            document.getElementById('btn-mark-all-notifs')?.addEventListener('click', async () => {
                await Homeroom.API.post('/notifications/read-all');
                Homeroom.toast('All notifications marked as read', 'success');
                if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
                this.loadNotifications();
                Homeroom.modal.close();
            });

            await Homeroom.API.post('/notifications/read-all');
            if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
            this.loadNotifications();
        } catch(e) {
            Homeroom.toast('Failed to load notifications', 'error');
        }
    },

    bindGlobalSearch() {
        const input = document.getElementById('global-search');
        if (!input) return;
        
        let timeout;
        input.addEventListener('input', (e) => {
            clearTimeout(timeout);
            const query = e.target.value.trim();
            if (query.length < 2) return;

            timeout = setTimeout(async () => {
                const res = await Homeroom.API.get(`/search?q=${encodeURIComponent(query)}`);
                if (res.success && res.data) {
                    this.renderSearchResults(res.data);
                }
            }, 350);
        });
    },

    renderSearchResults(data) {
        const { query, notes, questions, users } = data;
        const total = (notes.length || 0) + (questions.length || 0) + (users.length || 0);

        if (total === 0) {
            Homeroom.modal.open(`Search: "${query}"`, `<div style="text-align:center; padding: 2rem; color: var(--text-muted);">No results found for "${query}"</div>`);
            return;
        }

        const notesHTML = (notes || []).map(n => `
            <div style="padding: 0.75rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem; margin-bottom: 0.5rem; cursor: pointer;" onclick="Homeroom.modal.close(); location.hash='#notes'; setTimeout(()=>Homeroom.pages.notes.openNote('${n.id}'), 300)">
                <div style="font-weight: bold; color: var(--accent-color);">📄 ${n.title}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${n.subject} • By ${n.author_name}</div>
            </div>
        `).join('');

        const questionsHTML = (questions || []).map(q => `
            <div style="padding: 0.75rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem; margin-bottom: 0.5rem; cursor: pointer;" onclick="Homeroom.modal.close(); location.hash='#qna'; setTimeout(()=>Homeroom.pages.qna.openQuestion('${q.id}'), 300)">
                <div style="font-weight: bold; color: #8b5cf6;">❓ ${q.title}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${q.subject} • ${q.answer_count} Answers</div>
            </div>
        `).join('');

        const usersHTML = (users || []).map(u => `
            <div style="padding: 0.75rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.75rem;">
                <div style="font-size: 1.5rem;">${u.avatar_emoji || '🎓'}</div>
                <div>
                    <div style="font-weight: bold; color: var(--text-color);">${u.display_name} (@${u.username})</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${u.bio || 'Classmate'}</div>
                </div>
            </div>
        `).join('');

        Homeroom.modal.open(`Search Results for "${query}"`, `
            <div style="max-height: 450px; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem;">
                ${notes && notes.length ? `<div><h4 style="margin: 0 0 0.5rem 0;">Notes (${notes.length})</h4>${notesHTML}</div>` : ''}
                ${questions && questions.length ? `<div><h4 style="margin: 0 0 0.5rem 0;">Q&A Questions (${questions.length})</h4>${questionsHTML}</div>` : ''}
                ${users && users.length ? `<div><h4 style="margin: 0 0 0.5rem 0;">Classmates (${users.length})</h4>${usersHTML}</div>` : ''}
            </div>
        `);
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
            Homeroom.toast('🎁 You have a daily reward spin ready!', 'info');
        }
    },
    
    updateHeaderAndSidebar() {
        const u = Homeroom.store.currentUser;
        if (!u) return;
        
        const sidebarUser = document.getElementById('sidebar-user');
        if (sidebarUser) {
            const colorClass = {
                'color_gold':    'username-color-gold',
                'color_rainbow': 'username-color-rainbow',
                'color_fire':    'username-color-fire'
            }[u.username_color] || '';

            sidebarUser.innerHTML = `
                <div class="avatar">${u.avatarEmoji || u.avatar_emoji || '🎓'}</div>
                <div class="user-info">
                    <div class="display-name ${colorClass}">${u.displayName || u.display_name}</div>
                    <div class="level">Lvl ${this.calculateLevel(u.xp)}</div>
                </div>
            `;
        }
        
        const headerAvatar = document.getElementById('header-avatar');
        if (headerAvatar) {
            headerAvatar.textContent = u.avatarEmoji || u.avatar_emoji || '🎓';
        }
        
        this.updateCoins();
    },
    
    updateCoins() {
        const u = Homeroom.store.currentUser;
        let coins = 0;
        if (u && u.coins !== undefined && u.coins !== null) {
            coins = u.coins;
        } else if (Homeroom.store.wallet) {
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

        const btnQuick = document.getElementById('btn-quick-create');
        const quickMenu = document.getElementById('quick-action-menu');
        if (btnQuick && quickMenu) {
            btnQuick.addEventListener('click', (e) => {
                e.stopPropagation();
                quickMenu.style.display = quickMenu.style.display === 'flex' ? 'none' : 'flex';
            });
            document.addEventListener('click', (e) => {
                if (quickMenu && !quickMenu.contains(e.target) && e.target !== btnQuick) {
                    quickMenu.style.display = 'none';
                }
            });
        }

        let touchStart = 0;
        const main = document.getElementById('main-content');
        if (main) {
            main.addEventListener('touchstart', (e) => {
                if (main.scrollTop === 0) touchStart = e.touches[0].clientY;
            }, { passive: true });
            main.addEventListener('touchend', (e) => {
                const touchEnd = e.changedTouches[0].clientY;
                if (main.scrollTop === 0 && touchEnd - touchStart > 120) {
                    Homeroom.toast('🔄 Refreshing...', 'info', 1500);
                    this.navigate();
                }
            }, { passive: true });
        }

        document.getElementById('btn-notifications')?.addEventListener('click', () => this.openNotificationsModal());
        this.bindGlobalSearch();
        
        document.getElementById('modal-close')?.addEventListener('click', () => Homeroom.modal.close());
        document.getElementById('modal-backdrop')?.addEventListener('click', (e) => {
            if (e.target.id === 'modal-backdrop') Homeroom.modal.close();
        });
    },
    
    async navigate() {
        let hash = window.location.hash.slice(1) || 'home';
        
        document.body.classList.remove('in-active-chat');
        
        if (this.currentPage && this.currentPage.destroy) {
            try { this.currentPage.destroy(); } catch(e) {}
        }
        
        document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(el => {
            el.classList.remove('active');
            if (el.dataset.page === hash) el.classList.add('active');
        });
        
        const main = document.getElementById('main-content');
        main.innerHTML = '<div class="text-center mt-5"><p>Loading...</p></div>';
        
        const page = Homeroom.pages[hash];
        this.currentPage = page;
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
    },

    async refreshUser() {
        try {
            const res = await Homeroom.API.get('/auth/me');
            if (res.success && res.data && res.data.user) {
                Homeroom.store.currentUser = res.data.user;
                Homeroom.auth.user = res.data.user;
                this.updateHeaderAndSidebar();
                if (Homeroom.store && Homeroom.store.emit) {
                    Homeroom.store.emit('user_updated', res.data.user);
                }
            }
        } catch(e) {}
    }
};

window.App = App;

Homeroom.ui = {
    skeletonGrid(count = 4) {
        return `<div class="skeleton-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem;">
            ${Array(count).fill(0).map(() => `
                <div class="glass-card skeleton-card" style="padding: 1.5rem; height: 180px; display: flex; flex-direction: column; gap: 0.75rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 1rem; position: relative; overflow: hidden;">
                    <div style="height: 20px; width: 60%; background: rgba(255,255,255,0.1); border-radius: 4px; animation: pulse 1.5s infinite;"></div>
                    <div style="height: 14px; width: 90%; background: rgba(255,255,255,0.05); border-radius: 4px; animation: pulse 1.5s infinite;"></div>
                    <div style="height: 14px; width: 75%; background: rgba(255,255,255,0.05); border-radius: 4px; animation: pulse 1.5s infinite;"></div>
                    <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center;">
                        <div style="height: 24px; width: 24px; border-radius: 50%; background: rgba(255,255,255,0.1);"></div>
                        <div style="height: 16px; width: 50px; background: rgba(255,255,255,0.1); border-radius: 4px;"></div>
                    </div>
                </div>
            `).join('')}
        </div>`;
    },

    errorState(message = 'Something went wrong', retryFnName = '') {
        return `<div style="text-align: center; padding: 3rem 2rem; background: rgba(239, 68, 68, 0.05); border-radius: 1rem; border: 1px solid rgba(239, 68, 68, 0.2); margin: 1rem 0;">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">⚠️</div>
            <h3 style="margin: 0 0 0.5rem 0; color: #ef4444; font-size: 1.3rem;">${message}</h3>
            <p style="color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.95rem;">Please check your connection and try again.</p>
            ${retryFnName ? `<button class="btn btn-premium" onclick="${retryFnName}" style="padding: 0.6rem 1.5rem; border-radius: 2rem;">🔄 Retry Now</button>` : ''}
        </div>`;
    },

    emptyState(icon = '📭', title = 'Nothing here yet', subtitle = '', actionBtn = '') {
        return `<div style="text-align: center; padding: 3.5rem 2rem; background: rgba(255,255,255,0.02); border-radius: 1rem; border: 1px dashed rgba(255,255,255,0.1); margin: 1rem 0;">
            <div style="font-size: 3.5rem; margin-bottom: 1rem; opacity: 0.9;">${icon}</div>
            <h3 style="margin: 0 0 0.5rem 0; color: var(--text-color); font-size: 1.4rem; font-weight: 700;">${title}</h3>
            ${subtitle ? `<p style="color: var(--text-muted); font-size: 0.95rem; max-width: 450px; margin: 0 auto 1.5rem auto; line-height: 1.5;">${subtitle}</p>` : ''}
            ${actionBtn}
        </div>`;
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
