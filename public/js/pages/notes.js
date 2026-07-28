window.Homeroom = window.Homeroom || {};
Homeroom.pages = Homeroom.pages || {};

Homeroom.pages.notes = {
  async render() {
    return `
      <div class="page-container page-notes fade-in">
        <div class="header-section" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 class="page-title" style="font-size: 2.5rem; font-weight: 800; background: linear-gradient(to right, var(--accent-color), #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Class Notes</h1>
            <p style="color: var(--text-muted); font-size: 1.1rem; margin-top: 0.5rem;">Share and discover study materials.</p>
          </div>
          <button id="btn-upload-note" class="btn btn-premium" style="padding: 0.75rem 1.5rem; border-radius: 2rem; display: flex; align-items: center; gap: 0.5rem;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            Upload Note
          </button>
        </div>

        <div class="filters-section glass-card" style="margin-bottom: 2rem; padding: 1.5rem;">
          <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
            <div style="flex: 1; min-width: 250px; position: relative;">
                <input type="text" id="notes-search" placeholder="Search notes..." style="width: 100%; padding: 0.75rem 1rem 0.75rem 2.5rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: var(--text-color); font-size: 1rem; outline: none;">
                <svg style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-muted);" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <select id="notes-sort" style="padding: 0.75rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: var(--text-color); font-size: 1rem; outline: none; cursor: pointer;">
                <option value="newest">Newest First</option>
                <option value="rating">Highest Rated</option>
                <option value="downloads">Most Downloaded</option>
            </select>
          </div>
          <div id="subject-chips" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
            <!-- Chips injected by JS -->
          </div>
        </div>

        <div class="content-section" id="notes-content">
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
    const chipsContainer = document.getElementById('subject-chips');
    
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
                this.loadNotes();
            });
        });
    }

    document.getElementById('notes-sort')?.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.loadNotes();
    });

    let searchTimeout;
    document.getElementById('notes-search')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        this.currentSearch = e.target.value;
        searchTimeout = setTimeout(() => this.loadNotes(), 500);
    });

    document.getElementById('btn-upload-note')?.addEventListener('click', () => {
        Homeroom.modal.open('Upload Note', `
            <form id="upload-note-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Title</label>
                    <input type="text" name="title" required style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;" placeholder="e.g. Chapter 4 Integration">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Subject</label>
                    <select name="subject" required style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
                        ${subjects.filter(s => s!=='All').map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Description (optional)</label>
                    <textarea name="description" rows="3" style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;" placeholder="Briefly describe what's in this note..."></textarea>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Tags (comma separated)</label>
                    <input type="text" name="tags" style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;" placeholder="math, calculus, final">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">File</label>
                    <input type="file" name="file" required style="width: 100%; padding: 0.5rem; color: white;">
                </div>
            </form>
        `, `
            <button class="btn btn-premium" onclick="document.getElementById('upload-note-form').dispatchEvent(new Event('submit'))" style="width: 100%; padding: 1rem; border-radius: 0.5rem;">Upload & Earn +15 CC</button>
        `);

        document.getElementById('upload-note-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);
            const tags = formData.get('tags').split(',').map(t=>t.trim()).filter(Boolean);
            formData.set('tags', JSON.stringify(tags));
            
            const btn = form.closest('.modal-content').querySelector('.modal-footer button');
            const oldText = btn.innerText;
            btn.innerText = 'Uploading...';
            btn.disabled = true;

            try {
                const res = await Homeroom.API.post('/notes', formData, true);
                if(res.success) {
                    Homeroom.toast('Note uploaded successfully!', 'success');
                    Homeroom.modal.close();
                    this.loadNotes();
                } else {
                    Homeroom.toast(res.message || 'Failed to upload', 'error');
                }
            } catch(err) {
                Homeroom.toast('Network error', 'error');
            } finally {
                btn.innerText = oldText;
                btn.disabled = false;
            }
        });
    });

    this.loadNotes();
  },
  async loadNotes() {
    const content = document.getElementById('notes-content');
    content.innerHTML = `<div style="display: flex; justify-content: center; padding: 3rem;"><div class="spinner" style="width: 40px; height: 40px; border: 4px solid var(--border-color); border-top-color: var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite;"></div></div>`;
    
    try {
        const query = new URLSearchParams();
        if(this.currentSubject) query.append('subject', this.currentSubject);
        if(this.currentSort) query.append('sort', this.currentSort);
        if(this.currentSearch) query.append('search', this.currentSearch);

        const res = await Homeroom.API.get(`/notes?${query.toString()}`);
        if(!res.success) throw new Error(res.message);
        
        const notes = res.data;
        if(notes.length === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 4rem 2rem; background: rgba(255,255,255,0.02); border-radius: 1rem; border: 1px dashed rgba(255,255,255,0.1);">
                    <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">📭</div>
                    <h3 style="margin-top: 0; color: var(--text-color);">No notes found</h3>
                    <p style="color: var(--text-muted);">Be the first to upload a note for this subject!</p>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
                ${notes.map(note => {
                    const rating = note.rating_count ? (note.rating_sum / note.rating_count).toFixed(1) : 'New';
                    const date = new Date(note.created_at).toLocaleDateString();
                    return `
                        <div class="glass-card note-card" style="padding: 1.5rem; display: flex; flex-direction: column; cursor: pointer; position: relative;" onclick="Homeroom.pages.notes.openNote('${note.id}')">
                            <div style="position: absolute; top: -10px; right: 20px; background: var(--accent-color); padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.8rem; font-weight: bold; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                                ${note.subject}
                            </div>
                            <h3 style="margin: 0.5rem 0; font-size: 1.25rem; color: var(--text-color);">${note.title}</h3>
                            <p style="color: var(--text-muted); font-size: 0.9rem; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 1rem;">${note.description || 'No description provided.'}</p>
                            
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                                ${(JSON.parse(note.tags || '[]')).map(t => `<span style="background: rgba(255,255,255,0.1); padding: 0.2rem 0.5rem; border-radius: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">#${t}</span>`).join('')}
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05); margin-top: auto;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <div style="width: 24px; height: 24px; background: #333; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">👤</div>
                                    <span style="font-size: 0.85rem; color: var(--text-muted);">${note.uploaded_by_name || 'User'}</span>
                                </div>
                                <div style="display: flex; gap: 0.75rem; font-size: 0.85rem; color: var(--text-muted);">
                                    <span style="display: flex; align-items: center; gap: 0.25rem;">⭐ ${rating}</span>
                                    <span style="display: flex; align-items: center; gap: 0.25rem;">⬇️ ${note.download_count}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

    } catch(err) {
        content.innerHTML = `<div class="error-state">Error loading notes: ${err.message}</div>`;
    }
  },
  async openNote(id) {
    try {
        Homeroom.modal.open('Loading...', '<div style="text-align:center; padding: 2rem;"><div class="spinner"></div></div>');
        const res = await Homeroom.API.get(`/notes/${id}`);
        if(!res.success) throw new Error(res.message);
        
        const note = res.data;
        const rating = note.rating_count ? (note.rating_sum / note.rating_count).toFixed(1) : 'No ratings yet';
        
        Homeroom.modal.open(note.title, `
            <div style="margin-bottom: 1rem;">
                <span class="badge" style="background: var(--accent-color); color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.8rem;">${note.subject}</span>
                <span style="color: var(--text-muted); font-size: 0.9rem; margin-left: 1rem;">Uploaded on ${new Date(note.created_at).toLocaleDateString()}</span>
            </div>
            
            <p style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 0.5rem; line-height: 1.6; border: 1px solid rgba(255,255,255,0.05);">${note.description || 'No description.'}</p>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 1.5rem 0; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 0.5rem;">
                <div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #ffb703;">⭐ ${rating}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${note.rating_count} reviews</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.2rem; font-weight: bold; color: var(--text-color);">⬇️ ${note.download_count}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Downloads</div>
                </div>
            </div>

            <div style="margin-bottom: 1.5rem; text-align: center;">
                <p style="margin-bottom: 0.5rem; color: var(--text-muted);">Rate this note:</p>
                <div id="star-rating" style="display: flex; justify-content: center; gap: 0.5rem; font-size: 2rem; cursor: pointer;">
                    ${[1,2,3,4,5].map(i => `<span data-val="${i}" style="color: rgba(255,255,255,0.2); transition: color 0.2s;">★</span>`).join('')}
                </div>
            </div>

            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1.5rem 0;">
            
            <h4 style="margin-top: 0;">Comments (${(note.comments||[]).length})</h4>
            <div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1rem; padding-right: 0.5rem;">
                ${(note.comments||[]).map(c => `
                    <div style="background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 0.5rem;">
                        <div style="font-size: 0.8rem; color: var(--accent-color); font-weight: bold; margin-bottom: 0.25rem;">${c.user_name || 'User'}</div>
                        <div style="font-size: 0.95rem; color: var(--text-color);">${c.content}</div>
                    </div>
                `).join('')}
                ${!(note.comments||[]).length ? '<div style="color: var(--text-muted); font-size: 0.9rem;">No comments yet.</div>' : ''}
            </div>
            
            <div style="display: flex; gap: 0.5rem;">
                <input type="text" id="comment-input" placeholder="Add a comment..." style="flex: 1; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
                <button id="btn-comment" class="btn btn-premium" style="padding: 0.75rem 1rem; border-radius: 0.5rem;">Post</button>
            </div>

        `, `
            <a href="/api/notes/${note.id}/download" target="_blank" class="btn btn-premium" style="width: 100%; padding: 1rem; border-radius: 0.5rem; text-align: center; text-decoration: none; display: flex; justify-content: center; align-items: center; gap: 0.5rem; font-size: 1.1rem;" onclick="setTimeout(()=>Homeroom.pages.notes.loadNotes(), 1000)">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Download Note
            </a>
        `);

        // Star rating logic
        const stars = document.querySelectorAll('#star-rating span');
        let currentRating = 0;
        stars.forEach(s => {
            s.addEventListener('mouseover', (e) => {
                const val = parseInt(e.target.dataset.val);
                stars.forEach(st => st.style.color = parseInt(st.dataset.val) <= val ? '#ffb703' : 'rgba(255,255,255,0.2)');
            });
            s.addEventListener('mouseout', () => {
                stars.forEach(st => st.style.color = parseInt(st.dataset.val) <= currentRating ? '#ffb703' : 'rgba(255,255,255,0.2)');
            });
            s.addEventListener('click', async (e) => {
                const val = parseInt(e.target.dataset.val);
                currentRating = val;
                stars.forEach(st => st.style.color = parseInt(st.dataset.val) <= currentRating ? '#ffb703' : 'rgba(255,255,255,0.2)');
                try {
                    await Homeroom.API.post(`/notes/${note.id}/rate`, { rating: val });
                    Homeroom.toast('Rating submitted!', 'success');
                    this.loadNotes();
                } catch(err) {}
            });
        });

        // Comment logic
        document.getElementById('btn-comment').addEventListener('click', async () => {
            const input = document.getElementById('comment-input');
            const content = input.value.trim();
            if(!content) return;
            try {
                const res = await Homeroom.API.post(`/notes/${note.id}/comment`, { content });
                if(res.success) {
                    input.value = '';
                    this.openNote(note.id); // reload modal
                }
            } catch(err) {
                Homeroom.toast('Failed to post comment', 'error');
            }
        });

    } catch(err) {
        Homeroom.toast('Failed to load note details', 'error');
        Homeroom.modal.close();
    }
  },
  destroy() {}
};
