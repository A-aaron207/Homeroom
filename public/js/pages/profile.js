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

    document.getElementById('btn-edit-profile').addEventListener('click', () => {
        const u = this.user;
        Homeroom.modal.open('Edit Profile', `
            <form id="edit-profile-form" style="display: flex; flex-direction: column; gap: 1.5rem;">
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Avatar Emoji</label>
                        <input type="text" name="avatar_emoji" value="${u.avatar_emoji || ''}" maxlength="2" style="width: 100%; padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; font-size: 2rem; text-align: center;">
                    </div>
                    <div style="flex: 3;">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Avatar Background (CSS)</label>
                        <input type="text" name="avatar_bg" value="${u.avatar_bg || ''}" style="width: 100%; padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;" placeholder="e.g. #ff0000 or linear-gradient(...)">
                    </div>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Display Name</label>
                    <input type="text" name="display_name" value="${u.display_name || ''}" required style="width: 100%; padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Bio</label>
                    <textarea name="bio" rows="3" style="width: 100%; padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">${u.bio || ''}</textarea>
                </div>
            </form>
        `, `
            <button class="btn btn-premium" onclick="document.getElementById('edit-profile-form').dispatchEvent(new Event('submit'))" style="width: 100%; padding: 1rem; border-radius: 0.5rem;">Save Changes</button>
        `);

        document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.closest('.modal-content').querySelector('.modal-footer button');
            btn.innerText = 'Saving...';
            btn.disabled = true;

            const data = Object.fromEntries(new FormData(e.target));
            
            try {
                const res = await Homeroom.API.put('/users/me', data);
                if(res.success) {
                    if (res.data && res.data.user) {
                        Homeroom.auth.user = res.data.user;
                        Homeroom.store.currentUser = res.data.user;
                        if (window.App && window.App.updateHeaderAndSidebar) {
                            window.App.updateHeaderAndSidebar();
                        }
                    }
                    Homeroom.toast('Profile updated!', 'success');
                    Homeroom.modal.close();
                    this.loadProfile();
                } else {
                    Homeroom.toast(res.message || 'Update failed', 'error');
                }
            } catch(err) {
                Homeroom.toast('Network error', 'error');
            } finally {
                btn.innerText = 'Save Changes';
                btn.disabled = false;
            }
        });
    });
  },

  async loadProfile() {
      try {
          const res = await Homeroom.API.get('/auth/me'); // Getting current user detailed
          if(!res.success) throw new Error();
          
          this.user = res.data.user;
          const u = this.user;
          const level = Math.floor(u.xp / 1000) + 1;
          const progress = (u.xp % 1000) / 10;
          
          // Render Hero
          document.getElementById('profile-hero-content').innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; position: relative; z-index: 2;">
                <div style="width: 120px; height: 120px; border-radius: 50%; background: ${u.avatar_bg || 'var(--accent-color)'}; font-size: 4rem; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.3); ${u.profile_frame ? 'border: 5px solid var(--accent-color);' : ''}">
                    ${u.avatar_emoji || '🎓'}
                </div>
                
                <h2 style="margin: 0 0 0.5rem 0; font-size: 2.5rem; color: ${u.username_color || 'var(--text-color)'}; font-weight: 800;">${u.display_name}</h2>
                <div style="font-size: 1.1rem; color: var(--text-muted); margin-bottom: 1.5rem;">@${u.username} • Joined ${new Date(u.join_date).toLocaleDateString()}</div>
                
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                    <span class="badge" style="background: rgba(99, 102, 241, 0.2); color: var(--accent-color); padding: 0.4rem 1rem; border-radius: 2rem; font-size: 0.9rem; font-weight: bold; border: 1px solid rgba(99,102,241,0.3);">Level ${level}</span>
                    ${u.role === 'admin' ? '<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 0.4rem 1rem; border-radius: 2rem; font-size: 0.9rem; font-weight: bold; border: 1px solid rgba(239,68,68,0.3);">Admin</span>' : ''}
                </div>
                
                <p style="font-size: 1.1rem; color: var(--text-color); max-width: 600px; line-height: 1.6; margin: 0 auto;">${u.bio || 'This student is focused on studying.'}</p>
            </div>
            
            <div style="width: 100%; max-width: 400px; margin: 2rem auto 0 auto; text-align: left;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: bold;">
                    <span style="color: var(--accent-color);">XP Progress</span>
                    <span style="color: var(--text-muted);">${u.xp % 1000} / 1000</span>
                </div>
                <div style="height: 12px; background: rgba(0,0,0,0.5); border-radius: 6px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);">
                    <div style="height: 100%; width: ${progress}%; background: linear-gradient(90deg, var(--accent-color), #8b5cf6); border-radius: 6px;"></div>
                </div>
            </div>
          `;
          
          // Render Stats Grid
          document.getElementById('profile-stats-grid').innerHTML = `
            <div class="glass-card" style="padding: 1.5rem; text-align: center; background: rgba(0,0,0,0.2);">
                <div style="font-size: 2rem; font-weight: bold; color: var(--accent-color);">${u.xp}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Total XP</div>
            </div>
            <div class="glass-card" style="padding: 1.5rem; text-align: center; background: rgba(0,0,0,0.2);">
                <div style="font-size: 2rem; font-weight: bold; color: #ffb703;">${u.coins}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">ClassCoins</div>
            </div>
            <div class="glass-card" style="padding: 1.5rem; text-align: center; background: rgba(0,0,0,0.2);">
                <div style="font-size: 2rem; font-weight: bold; color: #22c55e;">${u.streak_current}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Current Streak</div>
            </div>
            <div class="glass-card" style="padding: 1.5rem; text-align: center; background: rgba(0,0,0,0.2);">
                <div style="font-size: 2rem; font-weight: bold; color: #ef4444;">${u.streak_longest}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Longest Streak</div>
            </div>
          `;
          
          // Render Streak Visualizer
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
          document.getElementById('streak-visualizer').innerHTML = streakHtml;
          
          // Render Achievements (mock data for now, since it's seeded in backend)
          const allAchievements = [
              {id: "first_upload", title: "First Upload", desc: "Share your first note", icon: "📝"},
              {id: "100_downloads", title: "Popular Notes", desc: "Get 100 total downloads", icon: "⬇️"},
              {id: "7_day_streak", title: "Week Warrior", desc: "7-day login streak", icon: "🔥"},
              {id: "first_purchase", title: "Shopper", desc: "Buy from marketplace", icon: "🛒"},
              {id: "helpful_person", title: "Helpful Person", desc: "Answer questions", icon: "🤝"},
              {id: "rich_student", title: "Rich Student", desc: "Accumulate 1000 CC", icon: "💰"}
          ];
          
          const userAchievs = JSON.parse(u.achievements || '[]');
          // Give user a couple of achievements for demo if they have none
          if(userAchievs.length === 0 && u.xp > 50) userAchievs.push("first_upload", "7_day_streak");
          
          document.getElementById('achievements-grid').innerHTML = allAchievements.map(a => {
              const unlocked = userAchievs.includes(a.id);
              return `
                  <div class="glass-card" style="padding: 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; overflow: hidden; ${unlocked ? 'border: 1px solid var(--accent-color); background: rgba(var(--accent-color-rgb,99,102,241), 0.05);' : 'opacity: 0.5; grayscale(1); filter: saturate(0);'}">
                      <div style="font-size: 3rem; margin-bottom: 0.5rem; ${unlocked ? 'text-shadow: 0 0 15px rgba(255,255,255,0.3);' : ''}">${a.icon}</div>
                      <h4 style="margin: 0 0 0.5rem 0; color: var(--text-color);">${a.title}</h4>
                      <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">${a.desc}</p>
                      ${unlocked ? '<div style="position: absolute; top: -10px; right: -20px; background: var(--accent-color); color: white; padding: 0.25rem 2rem; transform: rotate(45deg); font-size: 0.6rem; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">UNLOCKED</div>' : ''}
                  </div>
              `;
          }).join('');

      } catch(e) {
          document.getElementById('profile-hero-content').innerHTML = '<div style="color: red;">Failed to load profile.</div>';
      }
  },

  destroy() {}
};
