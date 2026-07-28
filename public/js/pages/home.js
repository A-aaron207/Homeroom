window.Homeroom = window.Homeroom || {};
Homeroom.pages = Homeroom.pages || {};

Homeroom.pages.home = {
  async render() {
    return `
      <div class="page-container page-home fade-in">
        <div class="header-section" style="margin-bottom: 2rem;">
          <h1 class="page-title" style="font-size: 2.5rem; font-weight: 800; background: linear-gradient(to right, var(--accent-color), #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Dashboard</h1>
          <p style="color: var(--text-muted); font-size: 1.1rem; margin-top: 0.5rem;">Your daily hub for learning and growing.</p>
        </div>
        <div class="content-section" id="home-content">
          <div class="loading-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: var(--text-muted);">
             <div class="spinner" style="width: 40px; height: 40px; border: 4px solid var(--border-color); border-top-color: var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite;"></div>
             <p style="margin-top: 1rem; font-weight: 500;">Loading your dashboard...</p>
          </div>
        </div>
      </div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-glow { 0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); } 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); } }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .glass-card { background: rgba(var(--card-bg-rgb, 255, 255, 255), 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 8px 32px rgba(0,0,0,0.1); transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .glass-card:hover { transform: translateY(-5px); box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
        .btn-premium { background: linear-gradient(135deg, var(--accent-color), #8b5cf6); border: none; color: white; font-weight: bold; transition: all 0.3s ease; }
        .btn-premium:hover { opacity: 0.9; transform: scale(1.05); }
        .btn-premium:disabled { opacity: 0.5; transform: none; cursor: not-allowed; filter: grayscale(1); }
      </style>
    `;
  },
  async init() {
    const content = document.getElementById('home-content');
    try {
      const userRes = await Homeroom.API.get('/auth/me');
      if(!userRes.success) throw new Error("Failed to load user");
      const user = userRes.data.user;
      Homeroom.auth = Homeroom.auth || {};
      Homeroom.auth.user = user;
      
      const statusRes = await Homeroom.API.get('/daily/status');
      const status = statusRes.data || { canSpin: true, streak: {current: user.streak_current}, todayCheckedIn: false };
      
      const annRes = await Homeroom.API.get('/announcements');
      const announcements = annRes.data || [];
      
      const level = Math.floor(user.xp / 1000) + 1;
      const progress = (user.xp % 1000) / 10;

      content.innerHTML = `
        <div class="dashboard-grid" style="display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
          
          <div class="glass-card hero-card" style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 2rem;">
            <div style="display: flex; align-items: center; gap: 1.5rem;">
              <div class="avatar" style="position: relative; font-size: 3.5rem; background: ${user.avatar_bg || 'linear-gradient(135deg, #6366f1, #8b5cf6)'}; border-radius: 50%; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                ${user.avatar_emoji || '🎓'}
                <div style="position: absolute; bottom: -5px; right: -5px; background: #22c55e; width: 20px; height: 20px; border-radius: 50%; border: 3px solid var(--card-bg);"></div>
              </div>
              <div>
                <h2 style="margin: 0; font-size: 2rem; color: var(--text-color); font-weight: 700;">Welcome back, <span style="color: var(--accent-color); ${user.username_color ? 'color:'+user.username_color : ''}">${user.display_name}</span>!</h2>
                <div style="display: flex; gap: 0.75rem; margin-top: 0.75rem;">
                  <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: var(--accent-color); padding: 0.4rem 0.8rem; border-radius: 2rem; font-size: 0.85rem; font-weight: 600;">Level ${level}</span>
                  <span class="badge" style="background: rgba(255, 152, 0, 0.15); color: #ff9800; padding: 0.4rem 0.8rem; border-radius: 2rem; font-size: 0.85rem; font-weight: 600;">🔥 ${user.streak_current} Day Streak</span>
                </div>
              </div>
            </div>
            <div style="min-width: 200px; flex: 1; max-width: 300px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-muted); font-weight: 500;">
                    <span>XP Progress</span>
                    <span>${user.xp % 1000} / 1000</span>
                </div>
                <div style="height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden;">
                    <div style="height: 100%; width: ${progress}%; background: linear-gradient(90deg, var(--accent-color), #8b5cf6); border-radius: 5px; transition: width 1s ease;"></div>
                </div>
            </div>
          </div>

          <div class="glass-card stats-card" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div class="stat-item" style="text-align: center; padding: 1.5rem; background: rgba(255,255,255,0.03); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.05); transition: transform 0.2s;">
              <div style="font-size: 2.5rem; font-weight: 800; color: var(--accent-color); line-height: 1;">${user.xp}</div>
              <div style="font-size: 0.95rem; color: var(--text-muted); margin-top: 0.5rem; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Total XP</div>
            </div>
            <div class="stat-item" style="text-align: center; padding: 1.5rem; background: rgba(255,255,255,0.03); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.05); transition: transform 0.2s;">
              <div style="font-size: 2.5rem; font-weight: 800; color: #ffb703; line-height: 1; text-shadow: 0 0 15px rgba(255, 183, 3, 0.3);">⭐ ${user.coins}</div>
              <div style="font-size: 0.95rem; color: var(--text-muted); margin-top: 0.5rem; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">CC Balance</div>
            </div>
          </div>
          
          <div class="glass-card daily-card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
                <h3 style="margin-top: 0; font-size: 1.3rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">🎁 Daily Rewards</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem;">Don't forget to claim your daily bonuses to keep your streak alive!</p>
            </div>
            <div style="display: flex; gap: 1rem;">
              <button id="btn-checkin" class="btn ${status.todayCheckedIn ? 'btn-disabled' : 'btn-premium'}" style="flex: 1; padding: 1rem; border-radius: 0.75rem; border: none; cursor: pointer; font-size: 1rem;" ${status.todayCheckedIn ? 'disabled' : ''}>
                ${status.todayCheckedIn ? '✅ Claimed' : '📅 Check In'}
              </button>
              <button id="btn-spin" class="btn ${!status.canSpin ? 'btn-disabled' : 'btn-premium'}" style="flex: 1; padding: 1rem; border-radius: 0.75rem; border: none; cursor: pointer; font-size: 1rem; ${status.canSpin ? 'animation: pulse-glow 2s infinite;' : ''}" ${!status.canSpin ? 'disabled' : ''}>
                ${status.canSpin ? '🎡 Spin Wheel' : '⏳ Tomorrow'}
              </button>
            </div>
          </div>
          
          <div class="glass-card actions-card" style="grid-column: 1 / -1;">
             <h3 style="margin-top: 0; font-size: 1.3rem; margin-bottom: 1.5rem;">⚡ Quick Actions</h3>
             <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                <a href="#notes" style="text-decoration: none; display: flex; flex-direction: column; align-items: center; padding: 1.5rem; background: rgba(255,255,255,0.03); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.05); color: var(--text-color); transition: all 0.2s;">
                    <span style="font-size: 2rem; margin-bottom: 0.5rem;">📚</span>
                    <span style="font-weight: 500;">Browse Notes</span>
                </a>
                <a href="#chats" style="text-decoration: none; display: flex; flex-direction: column; align-items: center; padding: 1.5rem; background: rgba(255,255,255,0.03); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.05); color: var(--text-color); transition: all 0.2s;">
                    <span style="font-size: 2rem; margin-bottom: 0.5rem;">💬</span>
                    <span style="font-weight: 500;">Messages</span>
                </a>
                <a href="#tasks" style="text-decoration: none; display: flex; flex-direction: column; align-items: center; padding: 1.5rem; background: rgba(255,255,255,0.03); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.05); color: var(--text-color); transition: all 0.2s;">
                    <span style="font-size: 2rem; margin-bottom: 0.5rem;">📋</span>
                    <span style="font-weight: 500;">Tasks</span>
                </a>
                <a href="#qna" style="text-decoration: none; display: flex; flex-direction: column; align-items: center; padding: 1.5rem; background: rgba(255,255,255,0.03); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.05); color: var(--text-color); transition: all 0.2s;">
                    <span style="font-size: 2rem; margin-bottom: 0.5rem;">❓</span>
                    <span style="font-weight: 500;">Ask Question</span>
                </a>
             </div>
          </div>
          
          <div class="glass-card announcements-card" style="grid-column: 1 / -1;">
            <h3 style="margin-top: 0; font-size: 1.3rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">📢 Announcements</h3>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${announcements.length === 0 ? '<div style="text-align: center; padding: 2rem; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: 1rem;">No new announcements.</div>' : ''}
              ${announcements.map(a => `
                <div style="padding: 1.5rem; background: rgba(var(--accent-color-rgb, 99, 102, 241), 0.05); border-left: 4px solid var(--accent-color); border-radius: 0.5rem; transition: transform 0.2s;">
                  <h4 style="margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem;">
                    ${a.pinned ? '<span title="Pinned" style="font-size: 1.2rem;">📌</span>' : ''} ${a.title}
                  </h4>
                  <p style="margin: 0; font-size: 0.95rem; color: var(--text-muted); line-height: 1.5;">${a.content}</p>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      `;
      
      const btnCheckin = document.getElementById('btn-checkin');
      if(btnCheckin) {
        btnCheckin.addEventListener('click', async () => {
          btnCheckin.disabled = true;
          const oldHtml = btnCheckin.innerHTML;
          btnCheckin.innerHTML = '<span class="spinner" style="width: 1.2rem; height: 1.2rem; display: inline-block; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></span>';
          try {
            const res = await Homeroom.API.post('/daily/checkin');
            if(res.success) {
               Homeroom.toast('Checked in successfully! +CC', 'success');
               setTimeout(() => Homeroom.pages.home.init(), 1000);
            } else {
               Homeroom.toast(res.message || 'Error checking in', 'error');
               btnCheckin.disabled = false;
               btnCheckin.innerHTML = oldHtml;
            }
          } catch(e) {
            Homeroom.toast('Network error', 'error');
            btnCheckin.disabled = false;
            btnCheckin.innerHTML = oldHtml;
          }
        });
      }
      
      const btnSpin = document.getElementById('btn-spin');
      if(btnSpin) {
        btnSpin.addEventListener('click', async () => {
          btnSpin.disabled = true;
          const oldHtml = btnSpin.innerHTML;
          btnSpin.innerHTML = '<span class="spinner" style="width: 1.2rem; height: 1.2rem; display: inline-block; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></span>';
          try {
            const res = await Homeroom.API.post('/daily/spin');
            if(res.success) {
               Homeroom.modal.open('🎡 Spin Result', `
                 <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem; animation: bounce 1s infinite;">🎉</div>
                    <h2 style="margin:0 0 1rem 0;">You Won!</h2>
                    <p style="font-size: 1.5rem; color: var(--accent-color); font-weight: bold; margin:0;">${res.data.reward_amount} ${res.data.reward_type.toUpperCase()}</p>
                 </div>
               `, '<button onclick="Homeroom.modal.close(); Homeroom.pages.home.init()" class="btn btn-premium" style="width: 100%; padding: 1rem; border-radius: 0.5rem;">Awesome!</button>');
            } else {
               Homeroom.toast(res.message || 'Error spinning wheel', 'error');
               btnSpin.disabled = false;
               btnSpin.innerHTML = oldHtml;
            }
          } catch(e) {
            Homeroom.toast('Network error', 'error');
            btnSpin.disabled = false;
            btnSpin.innerHTML = oldHtml;
          }
        });
      }
      
    } catch (err) {
      content.innerHTML = `<div class="error-state" style="text-align: center; padding: 3rem; background: rgba(239, 68, 68, 0.1); border-radius: 1rem; border: 1px solid rgba(239, 68, 68, 0.2);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
        <p style="color: #ef4444; font-size: 1.1rem; margin-bottom: 1.5rem;">Failed to load dashboard: ${err.message}</p>
        <button onclick="Homeroom.pages.home.init()" class="btn btn-premium" style="padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer;">Try Again</button>
      </div>`;
    }
  },
  destroy() {}
};
