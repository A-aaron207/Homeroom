window.Homeroom = window.Homeroom || {};
Homeroom.pages = Homeroom.pages || {};

Homeroom.pages.profile = {
  async render() {
    return `
      <div class="page-container page-profile fade-in" style="max-width: 900px; margin: 0 auto;">
        
        <!-- Hero Section -->
        <div class="glass-card hero-section" style="position: relative; margin-bottom: 2rem; padding: 3rem 2rem; text-align: center; border-radius: 2rem; background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.2)); border: 1px solid rgba(255,255,255,0.1); overflow: hidden;">
            
            <button id="btn-edit-profile" class="btn" style="position: absolute; top: 1.5rem; right: 1.5rem; background: rgba(255,255,255,0.1); border: none; padding: 0.5rem 1rem; border-radius: 2rem; color: white; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; z-index: 10;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
            </button>

            <div id="profile-hero-content">
                <div class="spinner" style="margin: auto;"></div>
            </div>
        </div>

        <!-- Stats Grid -->
        <h3 style="margin-bottom: 1rem; font-size: 1.5rem;">Your Statistics</h3>
        <div class="stats-grid" id="profile-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2.5rem;">
            <!-- Injected -->
        </div>

        <!-- Streak Visualizer -->
        <div class="glass-card" style="margin-bottom: 2.5rem; padding: 1.5rem;">
            <h3 style="margin: 0 0 1.5rem 0; font-size: 1.3rem; display: flex; align-items: center; gap: 0.5rem;">🔥 Streak Progress</h3>
            <div id="streak-visualizer"></div>
        </div>

        <!-- Achievements -->
        <h3 style="margin-bottom: 1rem; font-size: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">🏆 Achievements</h3>
        <div id="achievements-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
            <div class="spinner" style="margin: auto;"></div>
        </div>

      </div>
    `;
  },
  async init() {
    await this.loadProfile();

    document.getElementById('btn-edit-profile')?.addEventListener('click', () => {
        const u = this.user || Homeroom.store.currentUser || Homeroom.auth?.user || {};
        const emoji = u.avatar_emoji || u.avatarEmoji || '🎓';
        const bg = u.avatar_bg || u.avatarBg || '';
        const name = u.display_name || u.displayName || u.username || '';
        const bio = u.bio || '';

        Homeroom.modal.open('Edit Profile', `
            <form id="edit-profile-form" style="display: flex; flex-direction: column; gap: 1.5rem;" onsubmit="Homeroom.pages.profile.saveProfile(event); return false;">
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Avatar Emoji</label>
                        <input type="text" id="edit-avatar-emoji" name="avatar_emoji" value="${emoji}" maxlength="2" style="width: 100%; padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; font-size: 2rem; text-align: center;">
                    </div>
                    <div style="flex: 3;">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Avatar Background (CSS)</label>
                        <input type="text" id="edit-avatar-bg" name="avatar_bg" value="${bg}" style="width: 100%; padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;" placeholder="e.g. #ff0000 or linear-gradient(...)">
                    </div>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Display Name</label>
                    <input type="text" id="edit-display-name" name="display_name" value="${name}" required style="width: 100%; padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Bio</label>
                    <textarea id="edit-bio" name="bio" rows="3" style="width: 100%; padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">${bio}</textarea>
                </div>
            </form>
        `, `
            <button type="button" id="btn-save-profile" onclick="Homeroom.pages.profile.saveProfile(event)" class="btn btn-premium" style="width: 100%; padding: 1rem; border-radius: 0.5rem;">Save Changes</button>
        `);

        document.getElementById('edit-profile-form')?.addEventListener('submit', (e) => this.saveProfile(e));
    });
  },

  async saveProfile(e) {
      if (e) e.preventDefault();
      const btn = document.getElementById('btn-save-profile');
      if (btn) {
          btn.innerText = 'Saving...';
          btn.disabled = true;
      }

      const displayName = document.getElementById('edit-display-name')?.value.trim();
      const avatarEmoji = document.getElementById('edit-avatar-emoji')?.value.trim();
      const avatarBg = document.getElementById('edit-avatar-bg')?.value.trim();
      const bio = document.getElementById('edit-bio')?.value.trim();

      if (!displayName) {
          Homeroom.toast('Display name is required', 'error');
          if (btn) { btn.innerText = 'Save Changes'; btn.disabled = false; }
          return;
      }

      const data = {
          display_name: displayName,
          avatar_emoji: avatarEmoji || '🎓',
          avatar_bg: avatarBg,
          bio: bio
      };

      try {
          const res = await Homeroom.API.put('/users/me', data);
          if (res && res.success) {
              const updated = (res.data && res.data.user) ? res.data.user : (res.data || null);
              if (updated) {
                  Homeroom.auth.user = updated;
                  Homeroom.store.currentUser = updated;
                  this.user = updated;
                  if (window.App && window.App.updateHeaderAndSidebar) {
                      window.App.updateHeaderAndSidebar();
                  }
              }
              Homeroom.toast('Profile updated!', 'success');
              Homeroom.modal.close();
              await this.loadProfile();
          } else {
              Homeroom.toast((res && res.message) || 'Update failed', 'error');
          }
      } catch (err) {
          console.error('Save profile error:', err);
          Homeroom.toast('Network error', 'error');
      } finally {
          if (btn) {
              btn.innerText = 'Save Changes';
              btn.disabled = false;
          }
      }
  },

  async loadProfile() {
      let u = null;
      try {
          const res = await Homeroom.API.get('/auth/me');
          if (res && res.success && res.data) {
              u = res.data.user || res.data;
          }
      } catch(e) {}

      if (!u) {
          u = Homeroom.store.currentUser || Homeroom.auth?.user;
      }

      if (!u) {
          const heroEl = document.getElementById('profile-hero-content');
          if (heroEl) heroEl.innerHTML = '<div style="color: red; padding: 2rem;">Failed to load profile.</div>';
          return;
      }

      this.user = u;
      const xp = u.xp || 0;
      const level = Math.floor(xp / 1000) + 1;
      const progress = (xp % 1000) / 10;
      const displayName = u.display_name || u.displayName || u.username || 'Student';
      const username = u.username || 'user';
      let joinDateStr = 'Recently';
      if (u.join_date || u.joinDate) {
          try { joinDateStr = new Date(u.join_date || u.joinDate).toLocaleDateString(); } catch(e) {}
      }

      // Render Hero
      const heroEl = document.getElementById('profile-hero-content');
      const heroBg  = document.getElementById('profile-hero-bg');

      // Map item IDs to CSS classes
      const usernameColorClass = {
        'color_gold':    'username-color-gold',
        'color_rainbow': 'username-color-rainbow',
        'color_fire':    'username-color-fire'
      }[u.username_color] || '';

      const frameClass = {
        'frame_animated': 'frame-animated',
        'frame_diamond':  'frame-diamond'
      }[u.active_frame] || '';

      const cardClass = u.active_card === 'card_premium' ? 'card-premium-bg' : '';

      const badgeEmoji = {
        'badge_vip':    '👑',
        'avatar_dragon':'🐉',
        'title_master': '🏆'
      }[u.active_badge] || '';

      // Apply premium card class to hero container
      const heroContainer = document.querySelector('.hero-section');
      if (heroContainer && cardClass) heroContainer.classList.add(cardClass);

      if (heroEl) {
          heroEl.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; position: relative; z-index: 2;">
                <div style="position:relative;margin-bottom:1rem;">
                  <div style="width: 120px; height: 120px; border-radius: 50%; background: ${u.avatar_bg || u.avatarBg || 'var(--accent)'}; font-size: 4rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.3);" class="${frameClass}">
                      ${u.avatar_emoji || u.avatarEmoji || '🎓'}
                  </div>
                  ${badgeEmoji ? `<div style="position:absolute;bottom:-4px;right:-4px;font-size:1.8rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${badgeEmoji}</div>` : ''}
                </div>
                
                <h2 style="margin: 0 0 0.5rem 0; font-size: 2.5rem; font-weight: 800;" class="${usernameColorClass}">${displayName}</h2>
                <div style="font-size: 1.1rem; color: var(--text-muted); margin-bottom: 1.5rem;">@${username} • Joined ${joinDateStr}</div>
                
                <div style="display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap:wrap; justify-content:center;">
                    <span class="badge" style="background: rgba(99, 102, 241, 0.2); color: var(--accent); padding: 0.4rem 1rem; border-radius: 2rem; font-size: 0.9rem; font-weight: bold; border: 1px solid rgba(99,102,241,0.3);">Level ${level}</span>
                    ${u.role === 'admin' ? '<span class="badge" style="background: rgba(239,68,68,0.2); color: #ef4444; padding: 0.4rem 1rem; border-radius: 2rem; font-size: 0.9rem; font-weight: bold; border: 1px solid rgba(239,68,68,0.3);">Admin</span>' : ''}
                    ${u.is_developer ? '<span class="badge" style="background: rgba(99,102,241,0.2); color: #818cf8; padding: 0.4rem 1rem; border-radius: 2rem; font-size: 0.9rem; font-weight: bold; border: 1px solid rgba(129,140,248,0.3);">👨‍💻 Developer</span>' : ''}
                    ${u.is_premium ? '<span class="badge" style="background: rgba(245,158,11,0.2); color: #fbbf24; padding: 0.4rem 1rem; border-radius: 2rem; font-size: 0.9rem; font-weight: bold; border: 1px solid rgba(245,158,11,0.3);">⭐ Premium</span>' : ''}
                </div>
                
                <p style="font-size: 1.1rem; color: var(--text-color); max-width: 600px; line-height: 1.6; margin: 0 auto;">${u.bio || 'This student is focused on studying.'}</p>
            </div>
            
            <div style="width: 100%; max-width: 400px; margin: 2rem auto 0 auto; text-align: left;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: bold;">
                    <span style="color: var(--accent);">XP Progress</span>
                    <span style="color: var(--text-muted);">${xp % 1000} / 1000</span>
                </div>
                <div style="height: 12px; background: rgba(0,0,0,0.5); border-radius: 6px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);">
                    <div style="height: 100%; width: ${progress}%; background: linear-gradient(90deg, var(--accent), #8b5cf6); border-radius: 6px;"></div>
                </div>
            </div>
          `;
      }
      
      // Render Stats Grid
      const statsGridEl = document.getElementById('profile-stats-grid');
      if (statsGridEl) {
          statsGridEl.innerHTML = `
            <div class="glass-card" style="padding: 1.5rem; text-align: center; background: rgba(0,0,0,0.2);">
                <div style="font-size: 2rem; font-weight: bold; color: var(--accent-color);">${xp}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Total XP</div>
            </div>
            <div class="glass-card" style="padding: 1.5rem; text-align: center; background: rgba(0,0,0,0.2);">
                <div style="font-size: 2rem; font-weight: bold; color: #ffb703;">${u.coins || 0}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">ClassCoins</div>
            </div>
            <div class="glass-card" style="padding: 1.5rem; text-align: center; background: rgba(0,0,0,0.2);">
                <div style="font-size: 2rem; font-weight: bold; color: #22c55e;">${u.streak_current || 0}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Current Streak</div>
            </div>
            <div class="glass-card" style="padding: 1.5rem; text-align: center; background: rgba(0,0,0,0.2);">
                <div style="font-size: 2rem; font-weight: bold; color: #ef4444;">${u.streak_longest || 0}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Longest Streak</div>
            </div>
          `;
      }
      
      // Render Streak Visualizer
      const streakEl = document.getElementById('streak-visualizer');
      if (streakEl) {
          let streakHtml = `<div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">`;
          const currentStreak = u.streak_current || 0;
          for(let i=0; i<30; i++) {
              const active = i < currentStreak;
              streakHtml += `
                <div style="width: 30px; height: 30px; border-radius: 0.25rem; background: ${active ? '#ff9800' : 'rgba(255,255,255,0.05)'}; 
                            border: 1px solid ${active ? '#fb8500' : 'rgba(255,255,255,0.1)'};
                            display: flex; align-items: center; justify-content: center; font-size: 0.8rem;
                            box-shadow: ${active ? '0 0 10px rgba(255, 152, 0, 0.3)' : 'none'};">
                    ${active ? '🔥' : ''}
                </div>
              `;
          }
          streakHtml += `</div><p style="text-align: center; margin-top: 1rem; color: var(--text-muted); font-size: 0.9rem;">Log in every day to keep the flame alive! Caps at 30 days visualization.</p>`;
          streakEl.innerHTML = streakHtml;
      }
      
      // Render Achievements
      const achEl = document.getElementById('achievements-grid');
      if (achEl) {
          const allAchievements = [
              {id: "first_upload", title: "First Upload", desc: "Share your first note", icon: "📝"},
              {id: "100_downloads", title: "Popular Notes", desc: "Get 100 total downloads", icon: "⬇️"},
              {id: "7_day_streak", title: "Week Warrior", desc: "7-day login streak", icon: "🔥"},
              {id: "first_purchase", title: "Shopper", desc: "Buy from marketplace", icon: "🛒"},
              {id: "helpful_person", title: "Helpful Person", desc: "Answer questions", icon: "🤝"},
              {id: "rich_student", title: "Rich Student", desc: "Accumulate 1000 CC", icon: "💰"}
          ];
          
          const userAchievs = Array.isArray(u.achievements) ? u.achievements : (typeof u.achievements === 'string' ? (() => { try { return JSON.parse(u.achievements); } catch(e) { return []; } })() : []);
          if(userAchievs.length === 0 && xp > 50) userAchievs.push("first_upload", "7_day_streak");
          
          achEl.innerHTML = allAchievements.map(a => {
              const unlocked = userAchievs.includes(a.id);
              return `
                  <div class="glass-card" style="padding: 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; overflow: hidden; ${unlocked ? 'border: 1px solid var(--accent-color); background: rgba(var(--accent-color-rgb,99,102,241), 0.05);' : 'opacity: 0.5; filter: saturate(0);'}">
                      <div style="font-size: 3rem; margin-bottom: 0.5rem; ${unlocked ? 'text-shadow: 0 0 15px rgba(255,255,255,0.3);' : ''}">${a.icon}</div>
                      <h4 style="margin: 0 0 0.5rem 0; color: var(--text-color);">${a.title}</h4>
                      <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">${a.desc}</p>
                      ${unlocked ? '<div style="position: absolute; top: -10px; right: -20px; background: var(--accent-color); color: white; padding: 0.25rem 2rem; transform: rotate(45deg); font-size: 0.6rem; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">UNLOCKED</div>' : ''}
                  </div>
              `;
          }).join('');
      }
  },

  destroy() {}
};
