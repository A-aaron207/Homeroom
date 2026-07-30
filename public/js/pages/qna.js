window.Homeroom = window.Homeroom || {};
Homeroom.pages = Homeroom.pages || {};

Homeroom.pages.qna = {
  async render() {
    return `
      <div class="page-container page-qna fade-in">
        <div class="header-section" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 class="page-title" style="font-size: 2.5rem; font-weight: 800; background: linear-gradient(to right, var(--accent-color), #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Q&A Forum</h1>
            <p style="color: var(--text-muted); font-size: 1.1rem; margin-top: 0.5rem;">Get help, solve doubts, and earn ClassCoins!</p>
          </div>
          <button id="btn-ask-q" class="btn btn-premium" style="padding: 0.75rem 1.5rem; border-radius: 2rem; display: flex; align-items: center; gap: 0.5rem;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
            Ask Question
          </button>
        </div>

        <div class="filters-section glass-card" style="margin-bottom: 2rem; padding: 1.5rem;">
          <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
            <div style="flex: 1; min-width: 250px; position: relative;">
                <input type="text" id="qna-search" placeholder="Search questions..." style="width: 100%; padding: 0.75rem 1rem 0.75rem 2.5rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: var(--text-color); font-size: 1rem; outline: none;">
                <svg style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-muted);" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <select id="qna-sort" style="padding: 0.75rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: var(--text-color); font-size: 1rem; outline: none; cursor: pointer;">
                <option value="newest">Newest First</option>
                <option value="popular">Most Votes</option>
                <option value="solved">Solved Only</option>
                <option value="unanswered">Unanswered</option>
            </select>
          </div>
          <div id="qna-subject-chips" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
            <!-- Chips injected by JS -->
          </div>
        </div>

        <div class="content-section" id="qna-content">
          <div class="loading-state" style="display: flex; justify-content: center; padding: 3rem;">
             <div class="spinner" style="width: 40px; height: 40px; border: 4px solid var(--border-color); border-top-color: var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite;"></div>
          </div>
        </div>
      </div>
    `;
  },
  async init() {
    this.currentSubject = '';
    this.currentSort = 'newest';
    this.currentSearch = '';
    
    const subjects = ['All', 'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Geography', 'History'];
    const chipsContainer = document.getElementById('qna-subject-chips');
    
    if(chipsContainer) {
        chipsContainer.innerHTML = subjects.map(s => `
            <button class="subject-chip ${s === 'All' ? 'active' : ''}" data-subject="${s === 'All' ? '' : s}" style="padding: 0.4rem 1rem; border-radius: 2rem; border: 1px solid ${s === 'All' ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'}; background: ${s === 'All' ? 'var(--accent-color)' : 'rgba(0,0,0,0.2)'}; color: white; cursor: pointer; transition: all 0.2s; font-size: 0.9rem;">
                ${s}
            </button>
        `).join('');

        chipsContainer.querySelectorAll('.subject-chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                chipsContainer.querySelectorAll('.subject-chip').forEach(b => { b.style.background = 'rgba(0,0,0,0.2)'; b.style.borderColor = 'rgba(255,255,255,0.1)'; b.classList.remove('active'); });
                e.target.style.background = 'var(--accent-color)';
                e.target.style.borderColor = 'var(--accent-color)';
                e.target.classList.add('active');
                this.currentSubject = e.target.dataset.subject;
                this.loadQuestions();
            });
        });
    }

    document.getElementById('qna-sort')?.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.loadQuestions();
    });

    let searchTimeout;
    document.getElementById('qna-search')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        this.currentSearch = e.target.value;
        searchTimeout = setTimeout(() => this.loadQuestions(), 500);
    });

    document.getElementById('btn-ask-q')?.addEventListener('click', () => {
        Homeroom.modal.open('Ask Question', `
            <form id="ask-q-form" action="javascript:void(0);" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Title</label>
                    <input type="text" name="title" required style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;" placeholder="e.g. How to balance this chemical equation?">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Subject</label>
                    <select name="subject" required style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
                        ${subjects.filter(s => s!=='All').map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Content</label>
                    <textarea name="content" required rows="5" style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;" placeholder="Describe your question in detail..."></textarea>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Tags (comma separated)</label>
                    <input type="text" name="tags" style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;" placeholder="chemistry, equations">
                </div>
                <button type="submit" id="btn-submit-q" class="btn btn-premium" style="width: 100%; padding: 1rem; border-radius: 0.5rem; margin-top: 0.5rem;">Post Question</button>
            </form>
        `, '');

        const form = document.getElementById('ask-q-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form));
            data.tags = data.tags ? data.tags.split(',').map(t=>t.trim()).filter(Boolean) : [];
            
            const btn = document.getElementById('btn-submit-q');
            const oldText = btn.innerText;
            btn.innerText = 'Posting...';
            btn.disabled = true;

            try {
                const res = await Homeroom.API.post('/questions', data);
                if(res.success) {
                    Homeroom.toast('Question posted successfully!', 'success');
                    Homeroom.modal.close();
                    this.currentSubject = '';
                    this.loadQuestions();
                } else {
                    Homeroom.toast(res.message || 'Failed to post', 'error');
                }
            } catch(err) {
                Homeroom.toast('Network error', 'error');
            } finally {
                btn.innerText = oldText;
                btn.disabled = false;
            }
            return false;
        };
    });

    this.loadQuestions();
  },

  async loadQuestions() {
    const content = document.getElementById('qna-content');
    content.innerHTML = `<div style="display: flex; justify-content: center; padding: 3rem;"><div class="spinner"></div></div>`;
    
    try {
        const query = new URLSearchParams();
        if(this.currentSubject) query.append('subject', this.currentSubject);
        if(this.currentSort === 'solved') {
            query.append('solved', '1');
        } else if(this.currentSort) {
            query.append('sort', this.currentSort);
        }
        if(this.currentSearch) query.append('search', this.currentSearch);

        const res = await Homeroom.API.get(`/questions?${query.toString()}`);
        if(!res.success) throw new Error(res.message);
        
        const qs = res.data;
        if(qs.length === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 4rem 2rem; background: rgba(255,255,255,0.02); border-radius: 1rem; border: 1px dashed rgba(255,255,255,0.1);">
                    <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">🤔</div>
                    <h3 style="margin-top: 0; color: var(--text-color);">No questions found</h3>
                    <p style="color: var(--text-muted);">Be the first to ask a question!</p>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${qs.map(q => {
                    const date = new Date(q.created_at).toLocaleDateString();
                    const tagsArr = Array.isArray(q.tags) ? q.tags : (()=>{ try{ return JSON.parse(q.tags||'[]'); }catch(e){ return []; } })();
                    const authorName = q.author ? (q.author.display_name || q.author.username) : (q.asked_by_name || 'User');
                    const isSolved = q.best_answer_count > 0;
                    return `
                        <div class="glass-card" style="padding: 1.5rem; display: flex; gap: 1.5rem; align-items: flex-start; cursor: pointer; transition: all 0.2s;" onclick="Homeroom.pages.qna.openQuestion('${q.id}')">
                            <div style="display: flex; flex-direction: column; align-items: center; min-width: 60px; background: rgba(0,0,0,0.2); padding: 1rem 0.5rem; border-radius: 0.5rem; border: 1px solid ${isSolved ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)'};">
                                <span style="font-size: 1.5rem; color: var(--accent-color); font-weight: bold;">${q.upvotes}</span>
                                <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">votes</span>
                                <div style="margin: 0.5rem 0; width: 30px; height: 1px; background: rgba(255,255,255,0.1);"></div>
                                <span style="font-size: 1.2rem; color: ${isSolved ? '#22c55e' : (q.answer_count > 0 ? '#3b82f6' : 'var(--text-muted)')}; font-weight: bold;">${q.answer_count}</span>
                                <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">answers</span>
                            </div>
                            
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                                        <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: var(--accent-color); padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.8rem;">${q.subject}</span>
                                        ${isSolved ? '<span class="badge" style="background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.8rem; font-weight: bold;">✅ SOLVED</span>' : ''}
                                    </div>
                                </div>
                                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; color: var(--text-color);">${q.title}</h3>
                                <p style="color: var(--text-muted); font-size: 0.95rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 1rem; line-height: 1.5;">${q.content}</p>
                                
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                        ${tagsArr.map(t => `<span style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 0.2rem 0.5rem; border-radius: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">#${t}</span>`).join('')}
                                    </div>
                                    <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem;">
                                        <span>Asked by <span style="color: var(--accent-color);">${authorName}</span></span>
                                        <span>•</span>
                                        <span>${date}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

    } catch(err) {
        content.innerHTML = `<div class="error-state">Error loading questions: ${err.message}</div>`;
    }
  },
  
  async openQuestion(id) {
    try {
        Homeroom.modal.open('Loading...', '<div style="text-align:center; padding: 2rem;"><div class="spinner"></div></div>');
        const res = await Homeroom.API.get(`/questions/${id}`);
        if(!res.success) throw new Error(res.message);
        
        const q = res.data;
        const isAuthor = q.asked_by === Homeroom.auth.user.id;
        const isSolved = q.answers?.some(a => a.is_best);
        
        const renderAnswers = () => {
            if(!q.answers || q.answers.length === 0) return '<div style="color: var(--text-muted); padding: 1rem; text-align: center;">No answers yet. Be the first to help!</div>';
            return q.answers.map(a => `
                <div style="display: flex; gap: 1rem; padding: 1.5rem; background: ${a.is_best ? 'rgba(34, 197, 94, 0.05)' : 'rgba(0,0,0,0.2)'}; border-radius: 0.5rem; border: 1px solid ${a.is_best ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255,255,255,0.05)'}; position: relative; margin-bottom: 1rem;">
                    ${a.is_best ? '<div style="position: absolute; top: -10px; right: 20px; background: #22c55e; color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.8rem; font-weight: bold; box-shadow: 0 4px 10px rgba(34,197,94,0.3);">⭐ Accepted Answer</div>' : ''}
                    <div style="display: flex; flex-direction: column; align-items: center; min-width: 40px;">
                        <button class="btn-upvote-a" data-id="${a.id}" style="background: transparent; border: none; font-size: 1.5rem; cursor: pointer; color: ${a.user_voted ? 'var(--accent-color)' : 'var(--text-muted)'}; transition: color 0.2s;">▲</button>
                        <span style="font-size: 1.2rem; font-weight: bold; color: var(--text-color);">${a.upvotes}</span>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 1rem; line-height: 1.6; color: var(--text-color); margin-bottom: 1rem; white-space: pre-wrap;">${a.content}</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
                            <div style="font-size: 0.85rem; color: var(--text-muted);">
                                Answered by <span style="color: var(--accent-color);">${a.author ? (a.author.display_name || a.author.username) : (a.answered_by_name || 'User')}</span> on ${new Date(a.created_at).toLocaleDateString()}
                            </div>
                            ${isAuthor && !a.is_best ? `<button class="btn-mark-best" data-id="${a.id}" style="background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); color: #22c55e; padding: 0.4rem 0.8rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;">Accept Answer</button>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');
        };

        const modalTags = Array.isArray(q.tags) ? q.tags : (()=>{ try{ return JSON.parse(q.tags||'[]'); }catch(e){ return []; } })();
        const qAuthorName = q.author ? (q.author.display_name || q.author.username) : (q.asked_by_name || 'User');

        Homeroom.modal.open(q.title, `
            <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
                <div style="display: flex; flex-direction: column; align-items: center; min-width: 40px;">
                    <button id="btn-upvote-q" style="background: transparent; border: none; font-size: 1.5rem; cursor: pointer; color: ${q.user_voted ? 'var(--accent-color)' : 'var(--text-muted)'}; transition: transform 0.2s;">▲</button>
                    <span style="font-size: 1.5rem; font-weight: bold; color: var(--text-color);">${q.upvotes}</span>
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
                        <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: var(--accent-color); padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.8rem;">${q.subject}</span>
                        ${isSolved ? '<span class="badge" style="background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.8rem; font-weight: bold;">✅ SOLVED</span>' : ''}
                    </div>
                    <div style="font-size: 1.1rem; line-height: 1.6; color: var(--text-color); margin-bottom: 1rem; white-space: pre-wrap;">${q.content}</div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                        ${modalTags.map(t => `<span style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 0.2rem 0.5rem; border-radius: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">#${t}</span>`).join('')}
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">
                        Asked by <span style="color: var(--accent-color);">${qAuthorName}</span> on ${new Date(q.created_at).toLocaleDateString()}
                    </div>
                </div>
            </div>

            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1.5rem 0;">
            
            <h3 style="margin-top: 0;">${q.answer_count} Answers</h3>
            
            <div id="answers-container">
                ${renderAnswers()}
            </div>
            
            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1.5rem 0;">
            
            <h4 style="margin-top: 0;">Your Answer</h4>
            <form id="post-answer-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <textarea name="content" required rows="4" style="width: 100%; padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;" placeholder="Write a detailed answer to help out..."></textarea>
                <button type="submit" class="btn btn-premium" style="padding: 1rem; border-radius: 0.5rem; align-self: flex-start;">Post Answer (+3 CC)</button>
            </form>
        `);

        // Upvote Q
        document.getElementById('btn-upvote-q')?.addEventListener('click', async function() {
            this.style.transform = 'scale(1.2)';
            setTimeout(() => this.style.transform = 'scale(1)', 200);
            try {
                await Homeroom.API.post(`/questions/${q.id}/upvote`);
                Homeroom.pages.qna.openQuestion(q.id);
            } catch(e) {}
        });
        
        // Upvote A
        document.querySelectorAll('.btn-upvote-a').forEach(btn => {
            btn.addEventListener('click', async function() {
                const id = this.dataset.id;
                try {
                    await Homeroom.API.post(`/answers/${id}/upvote`);
                    Homeroom.pages.qna.openQuestion(q.id);
                } catch(e) {}
            });
        });

        // Mark best
        document.querySelectorAll('.btn-mark-best').forEach(btn => {
            btn.addEventListener('click', async function() {
                const id = this.dataset.id;
                try {
                    await Homeroom.API.post(`/answers/${id}/best`);
                    Homeroom.toast('Accepted answer! +15 CC awarded', 'success');
                    Homeroom.pages.qna.openQuestion(q.id);
                } catch(e) {}
            });
        });

        // Post Answer
        document.getElementById('post-answer-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const content = e.target.content.value;
            btn.disabled = true;
            btn.innerText = 'Posting...';
            
            try {
                const res = await Homeroom.API.post(`/questions/${q.id}/answer`, { content });
                if(res.success) {
                    Homeroom.toast('Answer posted! +3 CC', 'success');
                    this.openQuestion(q.id);
                    this.loadQuestions();
                } else {
                    Homeroom.toast('Failed to post answer', 'error');
                }
            } catch(err) {
                Homeroom.toast('Network error', 'error');
            } finally {
                btn.disabled = false;
                btn.innerText = 'Post Answer (+3 CC)';
            }
        });

    } catch(err) {
        Homeroom.toast('Failed to load question details', 'error');
        Homeroom.modal.close();
    }
  },
  
  destroy() {}
};
