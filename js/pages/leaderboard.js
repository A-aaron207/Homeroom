window.Homeroom = window.Homeroom || {};
Homeroom.pages = Homeroom.pages || {};

Homeroom.pages.leaderboard = {
  async render() {
    return `
      <div class="page-container page-leaderboard fade-in">
        <div class="header-section" style="margin-bottom: 2rem; text-align: center;">
          <h1 class="page-title" style="font-size: 3rem; font-weight: 800; background: linear-gradient(to right, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Hall of Fame</h1>
          <p style="color: var(--text-muted); font-size: 1.1rem; margin-top: 0.5rem;">The top students in Homeroom.</p>
        </div>

        <div class="filters-section" style="display: flex; justify-content: center; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap;">
            <div class="glass-card" style="display: flex; padding: 0.5rem; border-radius: 2rem; gap: 0.5rem; background: rgba(0,0,0,0.2);">
                <button class="lb-type-btn active" data-type="xp" style="padding: 0.5rem 1.5rem; border-radius: 1.5rem; border: none; background: var(--accent-color); color: white; cursor: pointer; font-weight: bold; transition: all 0.2s;">Top XP</button>
                <button class="lb-type-btn" data-type="coins" style="padding: 0.5rem 1.5rem; border-radius: 1.5rem; border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-weight: bold; transition: all 0.2s;">Richest</button>
            </div>
            
            <div class="glass-card" style="display: flex; padding: 0.5rem; border-radius: 2rem; gap: 0.5rem; background: rgba(0,0,0,0.2);">
                <button class="lb-period-btn active" data-period="all" style="padding: 0.5rem 1.5rem; border-radius: 1.5rem; border: none; background: rgba(255,255,255,0.1); color: white; cursor: pointer; font-weight: bold; transition: all 0.2s;">All Time</button>
                <button class="lb-period-btn" data-period="monthly" style="padding: 0.5rem 1.5rem; border-radius: 1.5rem; border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-weight: bold; transition: all 0.2s;">This Month</button>
            </div>
        </div>

        <div class="content-section" id="leaderboard-content" style="max-width: 800px; margin: 0 auto;">
          <div class="loading-state" style="display: flex; justify-content: center; padding: 3rem;">
             <div class="spinner"></div>
          </div>
        </div>
      </div>
      <style>
        .podium-card { position: relative; display: flex; flex-direction: column; align-items: center; padding: 2rem 1rem; border-radius: 1rem; text-align: center; }
        .podium-1 { transform: scale(1.1); z-index: 3; background: linear-gradient(180deg, rgba(251, 191, 36, 0.1), rgba(251, 191, 36, 0.05)); border: 1px solid rgba(251, 191, 36, 0.3); box-shadow: 0 10px 30px rgba(251, 191, 36, 0.1); }
        .podium-2 { z-index: 2; background: linear-gradient(180deg, rgba(148, 163, 184, 0.1), rgba(148, 163, 184, 0.05)); border: 1px solid rgba(148, 163, 184, 0.3); }
        .podium-3 { z-index: 1; background: linear-gradient(180deg, rgba(180, 83, 9, 0.1), rgba(180, 83, 9, 0.05)); border: 1px solid rgba(180, 83, 9, 0.3); }
        .rank-badge { position: absolute; top: -15px; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; background: var(--card-bg); }
        .lb-row { display: flex; align-items: center; padding: 1rem 1.5rem; border-radius: 1rem; background: rgba(255,255,255,0.02); margin-bottom: 0.5rem; transition: transform 0.2s; }
        .lb-row:hover { transform: translateX(5px); background: rgba(255,255,255,0.05); }
        .lb-row.is-me { border: 1px solid var(--accent-color); background: rgba(var(--accent-color-rgb, 99, 102, 241), 0.1); }
      </style>
    `;
  },
  async init() {
    this.currentType = 'xp';
    this.currentPeriod = 'all';

    document.querySelectorAll('.lb-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.lb-type-btn').forEach(b => { b.style.background = 'transparent'; b.style.color = 'var(--text-muted)'; b.classList.remove('active'); });
            e.target.style.background = 'var(--accent-color)';
            e.target.style.color = 'white';
            e.target.classList.add('active');
            this.currentType = e.target.dataset.type;
            this.loadLeaderboard();
        });
    });

    document.querySelectorAll('.lb-period-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.lb-period-btn').forEach(b => { b.style.background = 'transparent'; b.style.color = 'var(--text-muted)'; b.classList.remove('active'); });
            e.target.style.background = 'rgba(255,255,255,0.1)';
            e.target.style.color = 'white';
            e.target.classList.add('active');
            this.currentPeriod = e.target.dataset.period;
            this.loadLeaderboard();
        });
    });

    this.loadLeaderboard();
  },
  
  async loadLeaderboard() {
      const content = document.getElementById('leaderboard-content');
      content.innerHTML = '<div style="display: flex; justify-content: center; padding: 3rem;"><div class="spinner"></div></div>';
      
      try {
          const res = await Homeroom.API.get(`/leaderboard?type=${this.currentType}&period=${this.currentPeriod}`);
          if(!res.success) throw new Error();
          
          const users = res.data || [];
          if(users.length === 0) {
              content.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 3rem;">No data yet.</div>';
              return;
          }

          const top3 = users.slice(0, 3);
          const rest = users.slice(3);
          
          const getVal = (u) => this.currentType === 'xp' ? `${u.xp} XP` : `⭐ ${u.coins}`;
          const valColor = this.currentType === 'xp' ? 'var(--accent-color)' : '#ffb703';
          
          let html = '';
          
          // Render Podium
          if(top3.length > 0) {
              html += `<div style="display: flex; justify-content: center; align-items: flex-end; gap: 1rem; margin-bottom: 3rem; padding-top: 2rem;">`;
              
              // Second
              if(top3[1]) {
                  html += `<div class="glass-card podium-card podium-2" style="flex: 1; max-width: 200px;">
                      <div class="rank-badge" style="border: 2px solid #94a3b8; color: #94a3b8;">2</div>
                      <div style="font-size: 3rem; margin-bottom: 0.5rem;">🥈</div>
                      <div style="width: 60px; height: 60px; border-radius: 50%; background: ${top3[1].avatar_bg}; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 0.5rem; border: 2px solid #94a3b8;">${top3[1].avatar_emoji}</div>
                      <div style="font-weight: bold; margin-bottom: 0.25rem;">${top3[1].display_name}</div>
                      <div style="color: ${valColor}; font-weight: bold;">${getVal(top3[1])}</div>
                  </div>`;
              }
              
              // First
              html += `<div class="glass-card podium-card podium-1" style="flex: 1; max-width: 220px;">
                  <div class="rank-badge" style="border: 2px solid #fbbf24; color: #fbbf24;">1</div>
                  <div style="font-size: 4rem; margin-bottom: 0.5rem;">👑</div>
                  <div style="width: 80px; height: 80px; border-radius: 50%; background: ${top3[0].avatar_bg}; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 0.5rem; border: 3px solid #fbbf24; box-shadow: 0 0 15px rgba(251,191,36,0.5);">${top3[0].avatar_emoji}</div>
                  <div style="font-weight: bold; font-size: 1.2rem; margin-bottom: 0.25rem; color: ${top3[0].username_color || 'white'}">${top3[0].display_name}</div>
                  <div style="color: ${valColor}; font-weight: bold; font-size: 1.2rem;">${getVal(top3[0])}</div>
              </div>`;
              
              // Third
              if(top3[2]) {
                  html += `<div class="glass-card podium-card podium-3" style="flex: 1; max-width: 200px;">
                      <div class="rank-badge" style="border: 2px solid #b45309; color: #b45309;">3</div>
                      <div style="font-size: 3rem; margin-bottom: 0.5rem;">🥉</div>
                      <div style="width: 60px; height: 60px; border-radius: 50%; background: ${top3[2].avatar_bg}; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 0.5rem; border: 2px solid #b45309;">${top3[2].avatar_emoji}</div>
                      <div style="font-weight: bold; margin-bottom: 0.25rem;">${top3[2].display_name}</div>
                      <div style="color: ${valColor}; font-weight: bold;">${getVal(top3[2])}</div>
                  </div>`;
              }
              
              html += `</div>`;
          }
          
          // Rest of list
          if(rest.length > 0) {
              html += `<div style="display: flex; flex-direction: column;">`;
              rest.forEach((u, idx) => {
                  const rank = idx + 4;
                  const isMe = u.id === Homeroom.auth.user.id;
                  html += `
                      <div class="lb-row ${isMe ? 'is-me' : ''}">
                          <div style="width: 40px; font-weight: bold; color: var(--text-muted); font-size: 1.2rem;">#${rank}</div>
                          <div style="width: 45px; height: 45px; border-radius: 50%; background: ${u.avatar_bg}; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-right: 1rem;">${u.avatar_emoji}</div>
                          <div style="flex: 1;">
                              <div style="font-weight: bold; font-size: 1.1rem; color: ${u.username_color || 'white'}">${u.display_name} ${isMe ? '(You)' : ''}</div>
                              <div style="font-size: 0.8rem; color: var(--text-muted);">@${u.username} • Level ${Math.floor(u.xp/1000)+1}</div>
                          </div>
                          <div style="font-weight: bold; color: ${valColor}; font-size: 1.2rem;">
                              ${getVal(u)}
                          </div>
                      </div>
                  `;
              });
              html += `</div>`;
          }
          
          content.innerHTML = html;
          
      } catch(e) {
          content.innerHTML = '<div class="error-state">Failed to load leaderboard data.</div>';
      }
  },

  destroy() {}
};
