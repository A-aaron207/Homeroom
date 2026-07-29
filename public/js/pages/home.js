window.Homeroom = window.Homeroom || {};
Homeroom.pages = Homeroom.pages || {};

Homeroom.pages.home = {
  _refreshInterval: null,

  async render() {
    return `
      <div class="page-container page-home fade-in">
        <div id="home-content">
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:1rem;">
            <div class="skeleton" style="width:100%;height:160px;border-radius:1.5rem;"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;width:100%;">
              <div class="skeleton" style="height:120px;border-radius:1rem;"></div>
              <div class="skeleton" style="height:120px;border-radius:1rem;"></div>
            </div>
          </div>
        </div>
      </div>
      <style>
        @keyframes shimmer { 0%{background-position:-1000px 0} 100%{background-position:1000px 0} }
        .skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%); background-size: 1000px 100%; animation: shimmer 2s infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-glow { 0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); } 70% { box-shadow: 0 0 0 10px rgba(99,102,241,0); } 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        .slide-up { animation: slideUp 0.5s ease-out; }
        .glass-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 1.25rem;
          padding: 1.75rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .glass-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.2); }
        .btn-premium {
          background: linear-gradient(135deg, var(--accent, #6366f1), #8b5cf6);
          border: none; color: white; font-weight: 600;
          transition: all 0.2s ease; cursor: pointer;
        }
        .btn-premium:hover:not(:disabled) { opacity: 0.9; transform: scale(1.03); }
        .btn-premium:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }
        .btn-disabled { opacity: 0.5; cursor: not-allowed; background: rgba(255,255,255,0.1); color: var(--text-muted, #718096); }
        .stat-pill { background: rgba(255,255,255,0.05); border-radius: 0.75rem; padding: 1.25rem; text-align: center; border: 1px solid rgba(255,255,255,0.06); transition: transform 0.2s; }
        .stat-pill:hover { transform: scale(1.04); }
        .quick-action-btn {
          text-decoration: none; display: flex; flex-direction: column; align-items: center;
          padding: 1.5rem 1rem; background: rgba(255,255,255,0.03);
          border-radius: 1rem; border: 1px solid rgba(255,255,255,0.06);
          color: var(--text-primary, white); transition: all 0.2s; gap: 0.5rem;
        }
        .quick-action-btn:hover { background: rgba(255,255,255,0.07); transform: translateY(-3px); border-color: var(--accent, #6366f1); }
        .widget-title { font-size: 1.1rem; font-weight: 700; margin: 0 0 1.25rem 0; display: flex; align-items: center; gap: 0.5rem; }
        .unread-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 0.75rem; cursor: pointer; transition: background 0.2s; }
        .unread-item:hover { background: rgba(255,255,255,0.05); }
        .note-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .note-item:last-child { border-bottom: none; }
        .announcement-item { padding: 1rem; background: rgba(99,102,241,0.06); border-left: 3px solid var(--accent, #6366f1); border-radius: 0.5rem; margin-bottom: 0.75rem; }
        .announcement-item:last-child { margin-bottom: 0; }
        .leaderboard-row { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .leaderboard-row:last-child { border-bottom: none; }
      </style>
    `;
  },

  async init() {
    if (this._refreshInterval) clearInterval(this._refreshInterval);
    await this._loadDashboard();
    // Refresh unread messages badge every 10s
    this._refreshInterval = setInterval(() => this._refreshUnread(), 10000);
  },

  async _loadDashboard() {
    const content = document.getElementById('home-content');
    try {
      // Load all data concurrently
      const [userRes, statusRes, annRes, convRes, notesRes, lbRes] = await Promise.all([
        Homeroom.API.get('/auth/me'),
        Homeroom.API.get('/daily/status'),
        Homeroom.API.get('/announcements'),
        Homeroom.API.get('/conversations'),
        Homeroom.API.get('/notes?sort=newest'),
        Homeroom.API.get('/leaderboard?type=xp&period=all')
      ]);

      if (!userRes.success) throw new Error('Failed to load user');
      const user = userRes.data.user;
      Homeroom.store.currentUser = user;
      if (Homeroom.auth) Homeroom.auth.user = user;

      const status = statusRes.data || { canSpin: true, streak: { current: 0 }, todayCheckedIn: false };
      const announcements = annRes.data || [];
      const conversations = convRes.data || [];
      const notes = notesRes.data || [];
      const leaderboard = lbRes.data || [];

      // Compute greeting
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

      // XP progress using actual level system
      const levels = [0, 500, 1500, 3000, 5000, 8000, 12000, 18000];
      let level = 1;
      for (let i = 0; i < levels.length; i++) { if (user.xp >= levels[i]) level = i + 1; }
      const curMin = levels[level - 1] || 0;
      const nextMin = levels[level] || levels[levels.length - 1];
      const progress = Math.min(100, Math.round(((user.xp - curMin) / (nextMin - curMin)) * 100));

      // Unread messages
      const unreadConvs = conversations.filter(c => c.unread_count > 0);
      const totalUnread = unreadConvs.reduce((s, c) => s + c.unread_count, 0);

      // Recent notes (top 5)
      const recentNotes = notes.slice(0, 5);

      // Leaderboard top 3
      const top3 = leaderboard.slice(0, 3);

      content.innerHTML = `
        <div class="slide-up" style="display:grid;gap:1.5rem;">

          <!-- Hero Banner -->
          <div class="glass-card" style="background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08)); border-color: rgba(99,102,241,0.2); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1.5rem; padding:2rem;">
            <div style="display:flex;align-items:center;gap:1.5rem;">
              <div style="position:relative;">
                <div style="width:80px;height:80px;border-radius:50%;background:${user.avatar_bg || 'linear-gradient(135deg,#6366f1,#8b5cf6)'};font-size:2.5rem;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(99,102,241,0.3);">
                  ${user.avatar_emoji || '🎓'}
                </div>
                <div style="position:absolute;bottom:2px;right:2px;width:16px;height:16px;background:#22c55e;border-radius:50%;border:2px solid var(--bg-base,#08081a);"></div>
              </div>
              <div>
                <div style="font-size:0.85rem;color:var(--text-muted,#718096);text-transform:uppercase;letter-spacing:1px;font-weight:600;">${greeting}</div>
                <h1 style="font-size:1.8rem;font-weight:800;margin:0.25rem 0;background:linear-gradient(to right,var(--accent,#6366f1),#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
                  ${user.display_name} 👋
                </h1>
                <div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap;">
                  <span style="background:rgba(99,102,241,0.15);color:var(--accent,#6366f1);padding:0.3rem 0.8rem;border-radius:2rem;font-size:0.8rem;font-weight:600;border:1px solid rgba(99,102,241,0.25);">Lv. ${level}</span>
                  <span style="background:rgba(255,152,0,0.15);color:#ff9800;padding:0.3rem 0.8rem;border-radius:2rem;font-size:0.8rem;font-weight:600;">🔥 ${user.streak_current || 0} Day Streak</span>
                  <span style="background:rgba(255,183,3,0.15);color:#ffb703;padding:0.3rem 0.8rem;border-radius:2rem;font-size:0.8rem;font-weight:600;">⭐ ${user.coins} CC</span>
                </div>
              </div>
            </div>
            <!-- XP Bar -->
            <div style="min-width:220px;flex:1;max-width:280px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;font-size:0.8rem;color:var(--text-muted,#718096);">
                <span>XP Progress</span>
                <span>${user.xp} XP</span>
              </div>
              <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,var(--accent,#6366f1),#8b5cf6);border-radius:4px;transition:width 1s ease;"></div>
              </div>
              <div style="font-size:0.75rem;color:var(--text-muted,#718096);margin-top:0.3rem;">${nextMin - user.xp} XP to Level ${level + 1}</div>
            </div>
          </div>

          <!-- Stats Row -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1rem;">
            <div class="stat-pill">
              <div style="font-size:1.8rem;font-weight:800;color:var(--accent,#6366f1);">${user.xp}</div>
              <div style="font-size:0.75rem;color:var(--text-muted,#718096);text-transform:uppercase;letter-spacing:1px;margin-top:0.25rem;">Total XP</div>
            </div>
            <div class="stat-pill">
              <div style="font-size:1.8rem;font-weight:800;color:#ffb703;">⭐ ${user.coins}</div>
              <div style="font-size:0.75rem;color:var(--text-muted,#718096);text-transform:uppercase;letter-spacing:1px;margin-top:0.25rem;">ClassCoins</div>
            </div>
            <div class="stat-pill">
              <div style="font-size:1.8rem;font-weight:800;color:#ff9800;">🔥 ${user.streak_current || 0}</div>
              <div style="font-size:0.75rem;color:var(--text-muted,#718096);text-transform:uppercase;letter-spacing:1px;margin-top:0.25rem;">Day Streak</div>
            </div>
            <div class="stat-pill" style="${totalUnread > 0 ? 'border-color:rgba(239,68,68,0.3);' : ''}">
              <div style="font-size:1.8rem;font-weight:800;color:${totalUnread > 0 ? '#ef4444' : 'var(--text-muted,#718096)'};" id="home-unread-badge">${totalUnread > 0 ? totalUnread : '—'}</div>
              <div style="font-size:0.75rem;color:var(--text-muted,#718096);text-transform:uppercase;letter-spacing:1px;margin-top:0.25rem;">Unread Msgs</div>
            </div>
          </div>

          <!-- Main Grid -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.5rem;">

            <!-- Daily Rewards -->
            <div class="glass-card">
              <h3 class="widget-title">🎁 Daily Rewards</h3>
              <p style="color:var(--text-muted,#718096);font-size:0.9rem;margin-bottom:1.5rem;">Complete these every day to keep your streak alive!</p>
              <div style="display:flex;gap:0.75rem;">
                <button id="btn-checkin" class="btn ${status.todayCheckedIn ? 'btn-disabled' : 'btn-premium'}" 
                        style="flex:1;padding:0.9rem;border-radius:0.75rem;font-size:0.9rem;font-weight:600;" 
                        ${status.todayCheckedIn ? 'disabled' : ''}>
                  ${status.todayCheckedIn ? '✅ Checked In' : '📅 Check In'}
                </button>
                <button id="btn-spin" class="btn ${!status.canSpin ? 'btn-disabled' : 'btn-premium'}" 
                        style="flex:1;padding:0.9rem;border-radius:0.75rem;font-size:0.9rem;font-weight:600;${status.canSpin ? 'animation:pulse-glow 2s infinite;' : ''}" 
                        ${!status.canSpin ? 'disabled' : ''}>
                  ${status.canSpin ? '🎡 Spin' : '⏳ Tomorrow'}
                </button>
              </div>
            </div>

            <!-- Unread Messages -->
            <div class="glass-card">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
                <h3 class="widget-title" style="margin:0;">📩 Messages ${totalUnread > 0 ? `<span style="background:#ef4444;color:white;border-radius:2rem;font-size:0.7rem;padding:0.15rem 0.5rem;">${totalUnread}</span>` : ''}</h3>
                <a href="#chats" style="font-size:0.8rem;color:var(--accent,#6366f1);">View All →</a>
              </div>
              ${unreadConvs.length === 0 ? `
                <div style="text-align:center;padding:1.5rem;color:var(--text-muted,#718096);">
                  <div style="font-size:2rem;margin-bottom:0.5rem;">✉️</div>
                  <p style="font-size:0.9rem;">No unread messages</p>
                </div>
              ` : unreadConvs.slice(0, 3).map(c => {
                const otherPerson = c.participants?.find(p => p.id !== user.id);
                return `
                  <div class="unread-item" onclick="location.hash='#chats'">
                    <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">${otherPerson?.avatar_emoji || c.icon || '💬'}</div>
                    <div style="flex:1;min-width:0;">
                      <div style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name || 'Chat'}</div>
                      <div style="font-size:0.8rem;color:var(--text-muted,#718096);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.last_message_content || 'New message'}</div>
                    </div>
                    <span style="background:#ef4444;color:white;border-radius:2rem;font-size:0.7rem;padding:0.15rem 0.5rem;flex-shrink:0;">${c.unread_count}</span>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Latest Notes -->
            <div class="glass-card">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
                <h3 class="widget-title" style="margin:0;">📚 Latest Notes</h3>
                <a href="#notes" style="font-size:0.8rem;color:var(--accent,#6366f1);">Browse →</a>
              </div>
              ${recentNotes.length === 0 ? `
                <div style="text-align:center;padding:1.5rem;color:var(--text-muted,#718096);">
                  <div style="font-size:2rem;margin-bottom:0.5rem;">📄</div>
                  <p style="font-size:0.9rem;">No notes uploaded yet</p>
                </div>
              ` : recentNotes.map(n => `
                <div class="note-item">
                  <div style="width:38px;height:38px;border-radius:0.5rem;background:rgba(99,102,241,0.15);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">📄</div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${n.title}</div>
                    <div style="font-size:0.78rem;color:var(--text-muted,#718096);">${n.subject} · ${n.author?.display_name || 'Unknown'}</div>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Leaderboard Top 3 -->
            <div class="glass-card">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;">
                <h3 class="widget-title" style="margin:0;">🏆 Leaderboard</h3>
                <a href="#leaderboard" style="font-size:0.8rem;color:var(--accent,#6366f1);">Full Board →</a>
              </div>
              ${top3.length === 0 ? `
                <div style="text-align:center;padding:1.5rem;color:var(--text-muted,#718096);">No data yet</div>
              ` : top3.map((u, i) => {
                const medals = ['🥇', '🥈', '🥉'];
                const isMe = u.id === user.id;
                return `
                  <div class="leaderboard-row" ${isMe ? 'style="background:rgba(99,102,241,0.08);border-radius:0.5rem;padding:0.75rem;margin:-0 -0.25rem;"' : ''}>
                    <div style="font-size:1.5rem;width:28px;text-align:center;">${medals[i]}</div>
                    <div style="font-size:1.5rem;">${u.avatar_emoji || '🎓'}</div>
                    <div style="flex:1;">
                      <div style="font-weight:600;font-size:0.9rem;">${u.display_name}${isMe ? ' <span style="color:var(--accent,#6366f1);">(you)</span>' : ''}</div>
                      <div style="font-size:0.78rem;color:var(--text-muted,#718096);">${u.xp} XP</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

          </div>

          <!-- Quick Actions -->
          <div class="glass-card">
            <h3 class="widget-title">⚡ Quick Actions</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:0.75rem;">
              <a href="#notes" class="quick-action-btn"><span style="font-size:2rem;">📚</span><span style="font-size:0.85rem;font-weight:500;">Browse Notes</span></a>
              <a href="#qna" class="quick-action-btn"><span style="font-size:2rem;">❓</span><span style="font-size:0.85rem;font-weight:500;">Ask Question</span></a>
              <a href="#chats" class="quick-action-btn"><span style="font-size:2rem;">💬</span><span style="font-size:0.85rem;font-weight:500;">Messages</span></a>
              <a href="#tasks" class="quick-action-btn"><span style="font-size:2rem;">📋</span><span style="font-size:0.85rem;font-weight:500;">Tasks</span></a>
              <a href="#wallet" class="quick-action-btn"><span style="font-size:2rem;">💰</span><span style="font-size:0.85rem;font-weight:500;">Wallet</span></a>
              <a href="#leaderboard" class="quick-action-btn"><span style="font-size:2rem;">🏆</span><span style="font-size:0.85rem;font-weight:500;">Leaderboard</span></a>
            </div>
          </div>

          <!-- Announcements -->
          ${announcements.length > 0 ? `
            <div class="glass-card">
              <h3 class="widget-title">📢 Announcements</h3>
              ${announcements.slice(0, 3).map(a => `
                <div class="announcement-item">
                  <h4 style="margin:0 0 0.4rem 0;font-size:0.95rem;display:flex;align-items:center;gap:0.4rem;">
                    ${a.pinned ? '<span>📌</span>' : ''} ${a.title}
                  </h4>
                  <p style="margin:0;font-size:0.85rem;color:var(--text-muted,#718096);line-height:1.5;">${a.content}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}

        </div>
      `;

      // Bind daily buttons
      this._bindDailyButtons(status);

    } catch (err) {
      content.innerHTML = `
        <div style="text-align:center;padding:3rem;background:rgba(239,68,68,0.08);border-radius:1.25rem;border:1px solid rgba(239,68,68,0.2);">
          <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
          <p style="color:#ef4444;margin-bottom:1.5rem;">Failed to load dashboard: ${err.message}</p>
          <button onclick="Homeroom.pages.home.init()" class="btn btn-premium" style="padding:0.75rem 1.5rem;border-radius:0.5rem;">Try Again</button>
        </div>
      `;
    }
  },

  async _refreshUnread() {
    try {
      const res = await Homeroom.API.get('/conversations');
      if (!res.success) return;
      const convs = res.data || [];
      const total = convs.filter(c => c.unread_count > 0).reduce((s, c) => s + c.unread_count, 0);
      const el = document.getElementById('home-unread-badge');
      if (el) {
        el.textContent = total > 0 ? total : '—';
        el.style.color = total > 0 ? '#ef4444' : 'var(--text-muted,#718096)';
      }
    } catch (e) {}
  },

  _bindDailyButtons(status) {
    const btnCheckin = document.getElementById('btn-checkin');
    if (btnCheckin && !status.todayCheckedIn) {
      btnCheckin.addEventListener('click', async () => {
        btnCheckin.disabled = true;
        btnCheckin.innerHTML = '<span style="display:inline-block;width:1rem;height:1rem;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span>';
        try {
          const res = await Homeroom.API.post('/daily/checkin');
          if (res.success) {
            Homeroom.toast('✅ Checked in! Streak continues!', 'success');
            setTimeout(() => Homeroom.pages.home.init(), 800);
          } else {
            Homeroom.toast(res.message || 'Already checked in', 'info');
            btnCheckin.disabled = false;
            btnCheckin.innerHTML = '📅 Check In';
          }
        } catch (e) {
          Homeroom.toast('Network error', 'error');
          btnCheckin.disabled = false;
          btnCheckin.innerHTML = '📅 Check In';
        }
      });
    }

    const btnSpin = document.getElementById('btn-spin');
    if (btnSpin && status.canSpin) {
      btnSpin.addEventListener('click', async () => {
        btnSpin.disabled = true;
        btnSpin.innerHTML = '<span style="display:inline-block;width:1rem;height:1rem;border:2px solid white;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></span>';
        try {
          const res = await Homeroom.API.post('/daily/spin');
          if (res.success) {
            Homeroom.modal.open('🎡 Spin Result!', `
              <div style="text-align:center;padding:2rem;">
                <div style="font-size:5rem;margin-bottom:1rem;">🎉</div>
                <h2 style="margin:0 0 0.5rem 0;font-size:1.5rem;">You Won!</h2>
                <p style="font-size:2rem;color:var(--accent,#6366f1);font-weight:800;margin:0.5rem 0;">
                  +${res.data.reward_amount} ${res.data.reward_type.toUpperCase()}
                </p>
                <p style="color:var(--text-muted,#718096);font-size:0.9rem;">Keep spinning daily for bigger rewards!</p>
              </div>
            `, '<button onclick="Homeroom.modal.close();Homeroom.pages.home.init();" class="btn btn-premium" style="width:100%;padding:1rem;border-radius:0.5rem;">Awesome! 🚀</button>');
          } else {
            Homeroom.toast(res.message || 'Already spun today', 'info');
            btnSpin.innerHTML = '⏳ Tomorrow';
          }
        } catch (e) {
          Homeroom.toast('Network error', 'error');
          btnSpin.disabled = false;
          btnSpin.innerHTML = '🎡 Spin';
        }
      });
    }
  },

  destroy() {
    if (this._refreshInterval) clearInterval(this._refreshInterval);
  }
};
