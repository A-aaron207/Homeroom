window.Homeroom = window.Homeroom || {};
Homeroom.pages = Homeroom.pages || {};

Homeroom.pages.tasks = {
  async render() {
    const isAdmin = Homeroom.auth?.user?.role === 'admin';
    return `
      <div class="page-container page-tasks fade-in">
        <div class="header-section" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 class="page-title" style="font-size: 2.5rem; font-weight: 800; background: linear-gradient(to right, var(--accent-color), #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Task Board</h1>
            <p style="color: var(--text-muted); font-size: 1.1rem; margin-top: 0.5rem;">Complete tasks to earn ClassCoins and XP.</p>
          </div>
          <div style="display: flex; gap: 1rem;">
              ${isAdmin ? `
                <button id="btn-review-tasks" class="btn" style="padding: 0.75rem 1.5rem; border-radius: 2rem; border: 1px solid var(--accent-color); background: transparent; color: var(--accent-color);">Review Submissions</button>
                <button id="btn-create-task" class="btn btn-premium" style="padding: 0.75rem 1.5rem; border-radius: 2rem;">+ Create Task</button>
              ` : ''}
          </div>
        </div>

        <div class="glass-card stats-row" style="margin-bottom: 2rem; padding: 1.5rem; display: flex; justify-content: space-around; flex-wrap: wrap; gap: 1rem; text-align: center;">
            <div>
                <div style="font-size: 2rem; font-weight: 800; color: var(--accent-color);" id="stat-available">-</div>
                <div style="font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase;">Available Tasks</div>
            </div>
            <div>
                <div style="font-size: 2rem; font-weight: 800; color: #22c55e;" id="stat-completed">-</div>
                <div style="font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase;">Completed</div>
            </div>
        </div>

        <div class="content-section" id="tasks-content">
          <div class="loading-state" style="display: flex; justify-content: center; padding: 3rem;">
             <div class="spinner"></div>
          </div>
        </div>
      </div>
    `;
  },
  async init() {
    this.isAdmin = Homeroom.auth?.user?.role === 'admin';
    
    document.getElementById('btn-create-task')?.addEventListener('click', () => {
        Homeroom.modal.open('Create Task', `
            <form id="create-task-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Title</label>
                    <input type="text" name="title" required style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Description</label>
                    <textarea name="description" required rows="3" style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;"></textarea>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Reward CC</label>
                        <input type="number" name="rewardCoins" value="10" required style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Reward XP</label>
                        <input type="number" name="rewardXp" value="20" required style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
                    </div>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Deadline (optional)</label>
                    <input type="date" name="deadline" style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; color-scheme: dark;">
                </div>
            </form>
        `, `
            <button class="btn btn-premium" onclick="document.getElementById('create-task-form').dispatchEvent(new Event('submit'))" style="width: 100%; padding: 1rem; border-radius: 0.5rem;">Create Task</button>
        `);

        document.getElementById('create-task-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const data = Object.fromEntries(new FormData(form));
            data.rewardCoins = parseInt(data.rewardCoins) || 0;
            data.rewardXp = parseInt(data.rewardXp) || 0;
            
            try {
                const res = await Homeroom.API.post('/tasks', data);
                if(res.success) {
                    Homeroom.toast('Task created!', 'success');
                    Homeroom.modal.close();
                    this.loadTasks();
                }
            } catch(err) {
                Homeroom.toast('Failed to create task', 'error');
            }
        });
    });

    document.getElementById('btn-review-tasks')?.addEventListener('click', async () => {
        // Just mock opening review modal
        Homeroom.toast('Review submissions coming soon!', 'info');
    });

    this.loadTasks();
  },
  
  async loadTasks() {
      const content = document.getElementById('tasks-content');
      content.innerHTML = '<div style="display: flex; justify-content: center; padding: 3rem;"><div class="spinner"></div></div>';
      
      try {
          const res = await Homeroom.API.get('/tasks');
          if(!res.success) throw new Error();
          
          const tasks = res.data || [];
          document.getElementById('stat-available').innerText = tasks.length;
          document.getElementById('stat-completed').innerText = '0'; // mock
          
          if(tasks.length === 0) {
              content.innerHTML = `
                  <div style="text-align: center; padding: 4rem 2rem; background: rgba(255,255,255,0.02); border-radius: 1rem; border: 1px dashed rgba(255,255,255,0.1);">
                      <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">📋</div>
                      <h3 style="margin-top: 0; color: var(--text-color);">No active tasks</h3>
                      <p style="color: var(--text-muted);">Check back later for new ways to earn!</p>
                  </div>
              `;
              return;
          }
          
          content.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
                ${tasks.map(t => {
                    return `
                        <div class="glass-card" style="padding: 1.5rem; display: flex; flex-direction: column;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; align-items: flex-start;">
                                <h3 style="margin: 0; font-size: 1.25rem; color: var(--text-color);">${t.title}</h3>
                            </div>
                            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.5; flex: 1;">${t.description}</p>
                            
                            <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
                                <span style="background: rgba(255, 183, 3, 0.1); color: #ffb703; padding: 0.4rem 0.8rem; border-radius: 0.5rem; font-size: 0.85rem; font-weight: bold; border: 1px solid rgba(255,183,3,0.3);">⭐ ${t.reward_coins} CC</span>
                                <span style="background: rgba(99, 102, 241, 0.1); color: var(--accent-color); padding: 0.4rem 0.8rem; border-radius: 0.5rem; font-size: 0.85rem; font-weight: bold; border: 1px solid rgba(99,102,241,0.3);">⚡ ${t.reward_xp} XP</span>
                            </div>
                            
                            <button class="btn btn-premium" style="width: 100%; padding: 0.75rem; border-radius: 0.5rem;" onclick="Homeroom.pages.tasks.submitProof('${t.id}', '${t.title.replace(/'/g,"\\'")}')">Submit Proof</button>
                        </div>
                    `;
                }).join('')}
            </div>
          `;
          
      } catch(e) {
          content.innerHTML = '<div class="error-state">Failed to load tasks.</div>';
      }
  },
  
  submitProof(taskId, taskTitle) {
      Homeroom.modal.open(`Submit: ${taskTitle}`, `
        <form id="submit-proof-form">
            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Proof of Completion</label>
            <textarea name="proof" required rows="4" style="width: 100%; padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;" placeholder="Describe how you completed this task, or paste a link..."></textarea>
        </form>
      `, `
        <button class="btn btn-premium" onclick="document.getElementById('submit-proof-form').dispatchEvent(new Event('submit'))" style="width: 100%; padding: 1rem; border-radius: 0.5rem;">Submit for Review</button>
      `);
      
      document.getElementById('submit-proof-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const proof = e.target.proof.value;
          try {
              const res = await Homeroom.API.post(`/tasks/${taskId}/submit`, { proof });
              if(res.success) {
                  Homeroom.toast('Proof submitted successfully! Pending review.', 'success');
                  Homeroom.modal.close();
                  this.loadTasks();
              } else {
                  Homeroom.toast(res.message, 'error');
              }
          } catch(err) {
              Homeroom.toast('Network error', 'error');
          }
      });
  },

  destroy() {}
};
