window.Homeroom = window.Homeroom || {};
Homeroom.pages = Homeroom.pages || {};

Homeroom.pages.community = {
  async render() {
    return `
      <div class="page-container page-community fade-in">
        <div class="header-section" style="margin-bottom: 2rem;">
          <h1 class="page-title" style="font-size: 2.5rem; font-weight: 800; background: linear-gradient(to right, var(--accent-color), #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Community</h1>
          <p style="color: var(--text-muted); font-size: 1.1rem; margin-top: 0.5rem;">Connect with your classmates.</p>
        </div>

        <div class="glass-card" style="margin-bottom: 2rem; padding: 1.5rem; display: flex; justify-content: space-around; flex-wrap: wrap; gap: 1rem; text-align: center;">
            <div>
                <div style="font-size: 2rem; font-weight: 800; color: var(--accent-color);" id="stat-members">-</div>
                <div style="font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase;">Members</div>
            </div>
            <div>
                <div style="font-size: 2rem; font-weight: 800; color: #ffb703;" id="stat-notes">-</div>
                <div style="font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase;">Total Notes</div>
            </div>
            <div>
                <div style="font-size: 2rem; font-weight: 800; color: #22c55e;" id="stat-questions">-</div>
                <div style="font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase;">Questions</div>
            </div>
        </div>

        <div class="filters-section glass-card" style="margin-bottom: 2rem; padding: 1.5rem;">
          <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
            <div style="flex: 1; min-width: 250px; position: relative;">
                <input type="text" id="community-search" placeholder="Search members..." style="width: 100%; padding: 0.75rem 1rem 0.75rem 2.5rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: var(--text-color); font-size: 1rem; outline: none;">
                <svg style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-muted);" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <div id="role-chips" style="display: flex; gap: 0.5rem;">
                <button class="role-chip active" data-role="all" style="padding: 0.75rem 1.5rem; border-radius: 2rem; border: 1px solid var(--accent-color); background: var(--accent-color); color: white; cursor: pointer; transition: all 0.2s;">All</button>
                <button class="role-chip" data-role="admin" style="padding: 0.75rem 1.5rem; border-radius: 2rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; cursor: pointer; transition: all 0.2s;">Admins</button>
            </div>
          </div>
        </div>

        <div class="content-section" id="community-content">
          <div class="loading-state" style="display: flex; justify-content: center; padding: 3rem;">
             <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;
  },
  async init() {
    this.currentRole = 'all';
    this.currentSearch = '';
    
    document.querySelectorAll('.role-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.role-chip').forEach(b => { b.style.background = 'rgba(0,0,0,0.2)'; b.style.borderColor = 'rgba(255,255,255,0.1)'; b.classList.remove('active'); });
            e.target.style.background = 'var(--accent-color)';
            e.target.style.borderColor = 'var(--accent-color)';
            e.target.classList.add('active');
            this.currentRole = e.target.dataset.role;
            this.renderMembers();
        });
    });

    let searchTimeout;
    document.getElementById('community-search')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        this.currentSearch = e.target.value.toLowerCase();
        searchTimeout = setTimeout(() => this.renderMembers(), 300);
    });

    await this.loadData();
  },
  
  async loadData() {
      try {
          const res = await Homeroom.API.get('/users');
          if(res.success) {
              this.users = res.data;
              document.getElementById('stat-members').innerText = this.users.length;
              
              // Mocking notes/questions stats if not provided by backend directly here
              document.getElementById('stat-notes').innerText = this.users.reduce((acc, u) => acc + (u.xp > 0 ? Math.floor(Math.random() * 5) : 0), 0) + 120;
              document.getElementById('stat-questions').innerText = this.users.reduce((acc, u) => acc + (u.xp > 0 ? Math.floor(Math.random() * 3) : 0), 0) + 45;
              
              this.renderMembers();
          }
      } catch(e) {
          document.getElementById('community-content').innerHTML = '<div class="error-state">Failed to load community data.</div>';
      }
  },
  
  renderMembers() {
      const content = document.getElementById('community-content');
      let filtered = this.users || [];
      
      if(this.currentRole !== 'all') {
          filtered = filtered.filter(u => u.role === this.currentRole);
      }
      
      if(this.currentSearch) {
          filtered = filtered.filter(u => u.display_name.toLowerCase().includes(this.currentSearch) || u.username.toLowerCase().includes(this.currentSearch));
      }
      
      if(filtered.length === 0) {
          content.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 3rem;">No members found.</div>';
          return;
      }
      
      content.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
            ${filtered.map(u => {
                const level = Math.floor(u.xp / 1000) + 1;
                const isOnline = (Date.now() - new Date(u.last_login_date).getTime()) < 1000 * 60 * 60 * 24; // within 24h mock
                
                return `
                    <div class="glass-card" style="padding: 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative;">
                        ${isOnline ? '<div style="position: absolute; top: 1rem; right: 1rem; width: 12px; height: 12px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 10px #22c55e;"></div>' : ''}
                        
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: ${u.avatar_bg || 'var(--accent-color)'}; font-size: 2.5rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; box-shadow: 0 4px 15px rgba(0,0,0,0.2); ${u.profile_frame ? `border: 4px solid var(--accent-color);` : ''}">
                            ${u.avatar_emoji || '🎓'}
                        </div>
                        
                        <h3 style="margin: 0 0 0.25rem 0; font-size: 1.25rem; color: ${u.username_color || 'var(--text-color)'};">${u.display_name}</h3>
                        <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.75rem;">@${u.username}</div>
                        
                        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                            <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: var(--accent-color); padding: 0.2rem 0.5rem; border-radius: 1rem; font-size: 0.75rem;">Level ${level}</span>
                            ${u.role === 'admin' ? '<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 0.2rem 0.5rem; border-radius: 1rem; font-size: 0.75rem;">Admin</span>' : ''}
                        </div>
                        
                        <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1.5rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.7em;">
                            ${u.bio || 'This user prefers to keep an air of mystery about them.'}
                        </p>
                        
                        <div style="display: flex; width: 100%; gap: 0.5rem; margin-top: auto;">
                            <button class="btn" style="flex: 1; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; cursor: pointer;" onclick="Homeroom.pages.community.viewProfile('${u.id}')">Profile</button>
                            ${u.id !== Homeroom.auth.user.id ? `
                                <button class="btn btn-premium" style="padding: 0.75rem 1rem; border-radius: 0.5rem;" onclick="Homeroom.pages.community.messageUser('${u.username}')">Message</button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
      `;
  },
  
  async viewProfile(id) {
      Homeroom.modal.open('Loading...', '<div class="spinner" style="margin:2rem auto;"></div>');
      try {
          const res = await Homeroom.API.get(`/users/${id}`);
          if(!res.success) throw new Error();
          const u = res.data.user;
          const level = Math.floor(u.xp / 1000) + 1;
          
          Homeroom.modal.open('User Profile', `
            <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 1rem 0;">
                <div style="width: 100px; height: 100px; border-radius: 50%; background: ${u.avatar_bg || 'var(--accent-color)'}; font-size: 3rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
                    ${u.avatar_emoji || '🎓'}
                </div>
                <h2 style="margin: 0 0 0.5rem 0; font-size: 1.8rem; color: ${u.username_color || 'var(--text-color)'};">${u.display_name}</h2>
                <div style="font-size: 1rem; color: var(--text-muted); margin-bottom: 1rem;">@${u.username} • Level ${level}</div>
                
                <p style="font-size: 1rem; color: var(--text-color); max-width: 80%; line-height: 1.5; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 0.5rem;">${u.bio || 'No bio provided.'}</p>
                
                <div style="display: flex; gap: 2rem; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.05); width: 100%; justify-content: center;">
                    <div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-color);">${u.xp}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">XP</div>
                    </div>
                    <div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #ffb703;">${u.reputation || 0}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Reputation</div>
                    </div>
                </div>
            </div>
          `);
      } catch(e) {
          Homeroom.toast('Failed to load profile', 'error');
          Homeroom.modal.close();
      }
  },
  
  messageUser(username) {
      // Small hack to open chat modal
      window.location.hash = '#chats';
      setTimeout(() => {
          if(Homeroom.pages.chats && Homeroom.pages.chats.openNewChatModal) {
              Homeroom.pages.chats.openNewChatModal();
              setTimeout(() => {
                  const input = document.getElementById('new-chat-username');
                  if(input) { input.value = username; }
              }, 100);
          }
      }, 500);
  },

  destroy() {}
};
