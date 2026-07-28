window.Homeroom = window.Homeroom || {};
Homeroom.pages = Homeroom.pages || {};

Homeroom.pages.settings = {
  async render() {
    return `
      <div class="page-container page-settings fade-in" style="max-width: 800px; margin: 0 auto;">
        <div class="header-section" style="margin-bottom: 2rem;">
          <h1 class="page-title" style="font-size: 2.5rem; font-weight: 800; background: linear-gradient(to right, #64748b, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Settings</h1>
          <p style="color: var(--text-muted); font-size: 1.1rem; margin-top: 0.5rem;">Preferences and account management.</p>
        </div>

        <div class="settings-section glass-card" style="margin-bottom: 2rem; padding: 2rem;">
            <h2 style="margin-top: 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; margin-bottom: 1.5rem;">
                🎨 Appearance
            </h2>
            <div style="margin-bottom: 1rem; color: var(--text-muted);">Choose a theme for your interface. Some themes can be unlocked in the Marketplace.</div>
            
            <div id="theme-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem;">
                <div class="spinner"></div>
            </div>
        </div>

        <div class="settings-section glass-card" style="margin-bottom: 2rem; padding: 2rem;">
            <h2 style="margin-top: 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; margin-bottom: 1.5rem;">
                🔔 Notifications
            </h2>
            
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; color: var(--text-color);">Email Notifications</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Receive updates about your account via email.</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; color: var(--text-color);">Push Notifications</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Get browser notifications for messages and mentions.</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; color: var(--text-color);">Daily Reminders</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Reminders to maintain your streak and check in.</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <div class="settings-section glass-card" style="margin-bottom: 2rem; padding: 2rem;">
            <h2 style="margin-top: 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 1rem; margin-bottom: 1.5rem;">
                🛡️ Account & Data
            </h2>
            
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <button class="btn" style="padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; text-align: left; display: flex; justify-content: space-between; align-items: center;">
                    Export My Data <span>📥</span>
                </button>
                <button class="btn" style="padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); color: #ef4444; text-align: left; display: flex; justify-content: space-between; align-items: center;" onclick="Homeroom.pages.settings.logout()">
                    Log Out <span>🚪</span>
                </button>
            </div>
        </div>
        
        <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; margin-bottom: 2rem;">
            Homeroom v1.0.0<br>
            Made with ❤️ for students.
        </div>

      </div>
      <style>
        .toggle-switch { position: relative; display: inline-block; width: 50px; height: 26px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); transition: .4s; border-radius: 34px; }
        .toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        input:checked + .toggle-slider { background-color: var(--accent-color); border-color: var(--accent-color); }
        input:checked + .toggle-slider:before { transform: translateX(24px); }
        
        .theme-card { cursor: pointer; border-radius: 1rem; border: 2px solid transparent; overflow: hidden; transition: all 0.2s; position: relative; }
        .theme-card:hover { transform: scale(1.05); }
        .theme-card.active { border-color: var(--accent-color); box-shadow: 0 0 15px rgba(var(--accent-color-rgb, 99, 102, 241), 0.5); }
        .theme-card.locked { opacity: 0.5; filter: grayscale(1); cursor: not-allowed; }
        .theme-card.locked:hover { transform: none; }
        .theme-color-preview { height: 60px; display: flex; }
      </style>
    `;
  },
  async init() {
    this.renderThemes();
  },

  async renderThemes() {
      // Define the 7 themes
      const themesDef = [
          { id: 'dark', name: 'Dark Mode', bg: '#08081a', acc: '#6366f1' },
          { id: 'light', name: 'Light Mode', bg: '#f8f9fa', acc: '#4f46e5' },
          { id: 'cyber', name: 'Cyberpunk', bg: '#0a0f1a', acc: '#00f5ff', req: 'theme_cyber' },
          { id: 'matrix', name: 'Matrix', bg: '#000000', acc: '#00ff41', req: 'theme_matrix' },
          { id: 'solo-leveling', name: 'Solo Leveling', bg: '#0d0a1a', acc: '#7c3aed', req: 'theme_solo' },
          { id: 'neon', name: 'Neon Lights', bg: '#0a0a0a', acc: '#ff006e', req: 'theme_neon' },
          { id: 'glass', name: 'Glassmorphism', bg: 'linear-gradient(135deg, #1e1e2f, #2a2a40)', acc: '#38bdf8' }
      ];

      try {
          const userRes = await Homeroom.API.get('/auth/me');
          if(!userRes.success) throw new Error();
          
          const user = userRes.data.user;
          const purchased = JSON.parse(user.purchased_items || '[]');
          const currentTheme = user.theme || 'dark';
          
          const grid = document.getElementById('theme-grid');
          grid.innerHTML = themesDef.map(t => {
              const isLocked = t.req && !purchased.includes(t.req);
              const isActive = currentTheme === t.id;
              
              return `
                  <div class="theme-card ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}" 
                       data-id="${t.id}" data-locked="${isLocked}"
                       style="background: rgba(255,255,255,0.05); text-align: center;">
                      <div class="theme-color-preview" style="background: ${t.bg};">
                          <div style="width: 50%; height: 100%; background: transparent;"></div>
                          <div style="width: 50%; height: 100%; background: ${t.acc};"></div>
                      </div>
                      <div style="padding: 0.75rem 0.5rem; font-size: 0.85rem; font-weight: bold; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
                          ${t.name}
                          ${isLocked ? '<span style="font-size: 0.7rem; color: #f59e0b;">🔒 Locked</span>' : (isActive ? '<span style="font-size: 0.7rem; color: var(--accent-color);">✓ Active</span>' : '')}
                      </div>
                  </div>
              `;
          }).join('');

          document.querySelectorAll('.theme-card').forEach(card => {
              card.addEventListener('click', async (e) => {
                  const el = e.currentTarget;
                  if(el.dataset.locked === 'true') {
                      Homeroom.toast('Unlock this theme in the Marketplace!', 'info');
                      window.location.hash = '#marketplace';
                      return;
                  }
                  
                  const themeId = el.dataset.id;
                  
                  // Update UI optimistic
                  document.querySelectorAll('.theme-card').forEach(c => {
                      c.classList.remove('active');
                      const status = c.querySelector('span');
                      if(status && !c.dataset.locked) status.remove();
                  });
                  el.classList.add('active');
                  
                  // Apply immediately to body
                  document.body.dataset.theme = themeId;
                  
                  // Save to API
                  try {
                      await Homeroom.API.put('/users/me', { theme: themeId });
                      Homeroom.toast('Theme applied!', 'success');
                  } catch(err) {
                      Homeroom.toast('Failed to save theme', 'error');
                  }
              });
          });

      } catch(e) {
          document.getElementById('theme-grid').innerHTML = '<div class="error-state">Failed to load themes.</div>';
      }
  },

  logout() {
      if(confirm('Are you sure you want to log out?')) {
          localStorage.removeItem('homeroom_token');
          window.location.href = '/auth.html';
      }
  },

  destroy() {}
};
