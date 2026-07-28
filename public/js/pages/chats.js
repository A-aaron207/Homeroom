window.Homeroom = window.Homeroom || {};
Homeroom.pages = Homeroom.pages || {};

Homeroom.pages.chats = {
  async render() {
    return `
      <div class="page-container page-chats fade-in" style="height: calc(100vh - 100px); display: flex; flex-direction: column; overflow: hidden; padding-bottom: 0;">
        <div class="header-section" style="margin-bottom: 1rem; flex-shrink: 0;">
          <h1 class="page-title" style="font-size: 2rem; font-weight: 800; background: linear-gradient(to right, var(--accent-color), #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Messages</h1>
        </div>
        
        <div class="chat-layout" style="display: flex; gap: 1rem; flex: 1; min-height: 0; background: rgba(255,255,255,0.02); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.05); overflow: hidden;">
            
            <!-- Sidebar -->
            <div class="chat-sidebar" style="width: 300px; display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">
                <div style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; gap: 0.5rem;">
                    <button id="btn-new-chat" class="btn btn-premium" style="flex: 1; padding: 0.75rem; border-radius: 0.5rem; font-size: 0.9rem;">+ New Chat</button>
                </div>
                <div style="padding: 1rem;">
                    <input type="text" id="chat-search" placeholder="Search conversations..." style="width: 100%; padding: 0.75rem 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; outline: none;">
                </div>
                <div id="conversations-list" style="flex: 1; overflow-y: auto; padding: 0.5rem;">
                    <div class="spinner" style="margin: 2rem auto; display: block;"></div>
                </div>
            </div>

            <!-- Main Chat Area -->
            <div class="chat-main" id="chat-main" style="flex: 1; display: flex; flex-direction: column; background: rgba(0,0,0,0.1);">
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); flex-direction: column; gap: 1rem;">
                    <div style="font-size: 4rem;">💬</div>
                    <h3>Select a conversation to start chatting</h3>
                </div>
            </div>

        </div>
      </div>
      <style>
        .chat-item { padding: 1rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; display: flex; gap: 1rem; align-items: center; }
        .chat-item:hover { background: rgba(255,255,255,0.05); }
        .chat-item.active { background: rgba(var(--accent-color-rgb, 99, 102, 241), 0.15); border-left: 4px solid var(--accent-color); }
        .message-bubble { max-width: 70%; padding: 0.75rem 1rem; border-radius: 1rem; margin-bottom: 0.5rem; position: relative; word-wrap: break-word; }
        .message-own { background: var(--accent-color); color: white; align-self: flex-end; border-bottom-right-radius: 0.25rem; }
        .message-other { background: rgba(255,255,255,0.1); color: var(--text-color); align-self: flex-start; border-bottom-left-radius: 0.25rem; }
        .message-row { display: flex; flex-direction: column; width: 100%; margin-bottom: 1rem; }
        .message-actions { position: absolute; right: -40px; top: 50%; transform: translateY(-50%); display: none; gap: 0.25rem; }
        .message-row:hover .message-actions { display: flex; }
      </style>
    `;
  },
  async init() {
    this.conversations = [];
    this.currentChatId = null;
    this.pollInterval = null;
    this.lastMessageId = null;
    
    await this.loadConversations();
    
    document.getElementById('btn-new-chat').addEventListener('click', () => {
        this.openNewChatModal();
    });

    // Start polling for new messages if chat is open
    this.pollInterval = setInterval(() => {
        if(this.currentChatId) {
            this.loadMessages(this.currentChatId, true);
        } else {
            this.loadConversations(true);
        }
    }, 5000);
  },
  
  async loadConversations(silent = false) {
    const list = document.getElementById('conversations-list');
    if(!silent) list.innerHTML = '<div class="spinner" style="margin: 2rem auto; display: block;"></div>';
    
    try {
        const res = await Homeroom.API.get('/conversations');
        if(!res.success) throw new Error();
        this.conversations = res.data || [];
        
        if(this.conversations.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No conversations yet.</div>';
            return;
        }

        list.innerHTML = this.conversations.map(c => `
            <div class="chat-item ${this.currentChatId === c.id ? 'active' : ''}" data-id="${c.id}" onclick="Homeroom.pages.chats.openChat('${c.id}')">
                <div style="font-size: 2rem; width: 45px; height: 45px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center;">${c.icon || '💬'}</div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                        <h4 style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-color);">${c.name || 'Chat'}</h4>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${c.last_message_time ? new Date(c.last_message_time).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'}) : ''}</span>
                    </div>
                    <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.last_message_content || 'No messages yet'}</p>
                </div>
            </div>
        `).join('');
        
    } catch(err) {
        if(!silent) list.innerHTML = '<div style="color: red; padding: 1rem;">Failed to load conversations.</div>';
    }
  },

  async openChat(id) {
    this.currentChatId = id;
    const chat = this.conversations.find(c => c.id === id);
    if(!chat) return;

    // Update active class
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.chat-item[data-id="${id}"]`)?.classList.add('active');

    const main = document.getElementById('chat-main');
    main.innerHTML = `
        <div style="padding: 1rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 1rem; background: rgba(255,255,255,0.02);">
            <div style="font-size: 2rem; width: 45px; height: 45px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center;">${chat.icon || '💬'}</div>
            <div>
                <h3 style="margin: 0; color: var(--text-color);">${chat.name || 'Chat'}</h3>
                <span style="font-size: 0.85rem; color: var(--text-muted);">${chat.type === 'dm' ? 'Direct Message' : 'Group Chat'}</span>
            </div>
        </div>
        
        <div id="messages-container" style="flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column;">
            <div class="spinner" style="margin: auto;"></div>
        </div>
        
        <div style="padding: 1rem; border-top: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02);">
            <form id="chat-form" style="display: flex; gap: 0.5rem; align-items: flex-end;">
                <textarea id="chat-input" placeholder="Type a message..." rows="1" style="flex: 1; padding: 1rem; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; resize: none; outline: none; font-family: inherit; line-height: 1.4;"></textarea>
                <button type="submit" class="btn btn-premium" style="padding: 1rem 1.5rem; border-radius: 1rem; display: flex; align-items: center; justify-content: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </button>
            </form>
        </div>
    `;

    // Auto-resize textarea
    const input = document.getElementById('chat-input');
    input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight < 120 ? this.scrollHeight : 120) + 'px';
    });
    input.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('chat-form').dispatchEvent(new Event('submit'));
        }
    });

    document.getElementById('chat-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = input.value.trim();
        if(!content) return;
        
        input.value = '';
        input.style.height = 'auto';
        
        // Optimistic UI update
        const container = document.getElementById('messages-container');
        const tempId = 'temp-' + Date.now();
        this.appendMessage(container, { id: tempId, content, sender_id: Homeroom.auth.user.id, created_at: new Date().toISOString() }, true);
        container.scrollTop = container.scrollHeight;

        try {
            await Homeroom.API.post(`/conversations/${id}/messages`, { content });
            this.loadMessages(id, true);
        } catch(err) {
            Homeroom.toast('Failed to send message', 'error');
            document.getElementById(tempId)?.remove();
            input.value = content;
        }
    });

    await this.loadMessages(id);
  },

  async loadMessages(chatId, silent = false) {
    if(this.currentChatId !== chatId) return;
    const container = document.getElementById('messages-container');
    if(!container) return;

    try {
        const res = await Homeroom.API.get(`/conversations/${chatId}/messages?limit=50`);
        if(!res.success) return;
        
        const messages = res.data || [];
        
        if(!silent) {
            container.innerHTML = '';
            if(messages.length === 0) {
                container.innerHTML = '<div style="text-align:center; color:var(--text-muted); margin: auto;">No messages here yet. Say hi! 👋</div>';
            }
        }
        
        if(messages.length > 0) {
            if(!silent) container.innerHTML = ''; // clear initial state
            
            // Just re-render all for simplicity, can be optimized later
            const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 50;
            
            let html = '';
            let lastDate = null;
            
            messages.reverse().forEach(msg => {
                const msgDate = new Date(msg.created_at).toLocaleDateString();
                if(msgDate !== lastDate) {
                    html += `<div style="text-align: center; margin: 1.5rem 0; font-size: 0.8rem; color: var(--text-muted); position: relative;">
                        <span style="background: var(--bg-color); padding: 0 1rem; position: relative; z-index: 1;">${msgDate === new Date().toLocaleDateString() ? 'Today' : msgDate}</span>
                        <div style="position: absolute; top: 50%; left: 0; right: 0; border-top: 1px solid rgba(255,255,255,0.05); z-index: 0;"></div>
                    </div>`;
                    lastDate = msgDate;
                }
                
                const isOwn = msg.sender_id === Homeroom.auth.user.id;
                const time = new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                html += `
                    <div class="message-row" id="msg-${msg.id}">
                        <div class="message-bubble ${isOwn ? 'message-own' : 'message-other'}">
                            ${!isOwn ? `<div style="font-size: 0.75rem; color: var(--accent-color); margin-bottom: 0.25rem; font-weight: bold;">${msg.sender_name || 'User'}</div>` : ''}
                            <div style="white-space: pre-wrap; line-height: 1.5;">${msg.content}</div>
                            <div style="font-size: 0.7rem; text-align: right; margin-top: 0.25rem; opacity: 0.7;">${time}</div>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            
            if(!silent || isScrolledToBottom) {
                container.scrollTop = container.scrollHeight;
            }
        }
        
        // Mark as read
        Homeroom.API.post(`/conversations/${chatId}/read`);
        
    } catch(err) {
        if(!silent) container.innerHTML = '<div style="color:red; margin:auto;">Failed to load messages</div>';
    }
  },

  appendMessage(container, msg, isOwn) {
      const time = new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const div = document.createElement('div');
      div.className = 'message-row';
      div.id = msg.id;
      div.innerHTML = `
        <div class="message-bubble ${isOwn ? 'message-own' : 'message-other'}">
            <div style="white-space: pre-wrap; line-height: 1.5;">${msg.content}</div>
            <div style="font-size: 0.7rem; text-align: right; margin-top: 0.25rem; opacity: 0.7;">${time}</div>
        </div>
      `;
      container.appendChild(div);
  },

  async openNewChatModal() {
    Homeroom.modal.open('New Message', `
        <div style="margin-bottom: 1rem;">
            <p style="color: var(--text-muted); margin-bottom: 1rem;">Enter a username to start a direct message.</p>
            <input type="text" id="new-chat-username" placeholder="Username..." style="width: 100%; padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
        </div>
    `, `
        <button id="btn-start-chat" class="btn btn-premium" style="width: 100%; padding: 1rem; border-radius: 0.5rem;">Start Chat</button>
    `);
    
    document.getElementById('btn-start-chat').addEventListener('click', async () => {
        const username = document.getElementById('new-chat-username').value.trim();
        if(!username) return;
        
        try {
            // we need to find the user id first, or the backend can accept username
            // Assuming backend accepts participant names or we fetch users
            const usersRes = await Homeroom.API.get('/users');
            if(!usersRes.success) throw new Error();
            const targetUser = usersRes.data.find(u => u.username === username);
            
            if(!targetUser) {
                Homeroom.toast('User not found', 'error');
                return;
            }
            
            const res = await Homeroom.API.post('/conversations', {
                type: 'dm',
                participants: [Homeroom.auth.user.id, targetUser.id]
            });
            
            if(res.success) {
                Homeroom.modal.close();
                this.loadConversations();
                this.openChat(res.data.id);
            } else {
                Homeroom.toast(res.message, 'error');
            }
        } catch(err) {
            Homeroom.toast('Failed to start chat', 'error');
        }
    });
  },

  destroy() {
      if(this.pollInterval) clearInterval(this.pollInterval);
  }
};
