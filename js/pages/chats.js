window.Homeroom = window.Homeroom || {};
Homeroom.pages = Homeroom.pages || {};

Homeroom.pages.chats = {
  conversations: [],
  currentChatId: null,
  _pollInterval: null,
  _typingTimeout: null,
  _replyTo: null,

  async render() {
    return `
      <div class="page-container page-chats fade-in">
        <div class="chats-header-title">
          <h1 style="font-size:2rem;font-weight:800;background:linear-gradient(to right,var(--accent,#6366f1),#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0;">Messages</h1>
        </div>
        <div id="chat-layout" class="chat-layout">
          <!-- Sidebar -->
          <div id="chat-sidebar" class="chat-sidebar">
            <div style="padding:1rem;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0;">
              <button id="btn-new-chat" class="btn btn-premium" style="width:100%;padding:0.75rem;border-radius:0.6rem;font-size:0.9rem;font-weight:600;">+ New Chat</button>
            </div>
            <div style="padding:0.75rem;flex-shrink:0;">
              <input type="text" id="chat-search" placeholder="Search conversations..." style="width:100%;box-sizing:border-box;min-width:0;padding:0.6rem 0.9rem;border-radius:0.6rem;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;outline:none;font-size:0.9rem;">
            </div>
            <div id="conversations-list" style="flex:1;overflow-y:auto;padding:0.25rem 0.5rem;min-height:0;">
              ${this._skeletonConvs()}
            </div>
          </div>
          <!-- Main Area -->
          <div id="chat-main" class="chat-main">
            <div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1rem;color:var(--text-muted,#718096);padding:2rem;text-align:center;">
              <div style="font-size:4rem;opacity:0.5;">💬</div>
              <p style="font-size:1.1rem;margin:0;">Select a conversation to start chatting</p>
            </div>
          </div>
        </div>
      </div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:translateY(0); } }
        @keyframes shimmer { 0%{background-position:-1000px 0} 100%{background-position:1000px 0} }
        .fade-in { animation: fadeIn 0.3s ease; }
        .page-chats { height:calc(100vh - 100px);display:flex;flex-direction:column;overflow:hidden;padding-bottom:0; }
        .chats-header-title { margin-bottom:1rem;flex-shrink:0; }
        .skeleton-line { background: linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.05) 75%); background-size:1000px 100%; animation:shimmer 2s infinite; border-radius:0.5rem; }
        .chat-layout { display:flex;gap:0;flex:1;min-height:0;border-radius:1.25rem;border:1px solid rgba(255,255,255,0.07);overflow:hidden;background:rgba(0,0,0,0.15);width:100%; }
        .chat-sidebar { width:320px;display:flex;flex-direction:column;border-right:1px solid rgba(255,255,255,0.07);flex-shrink:0;box-sizing:border-box; }
        .chat-main { flex:1;display:flex;flex-direction:column;background:rgba(0,0,0,0.08);min-width:0;box-sizing:border-box; }
        .chat-item { padding:0.85rem;border-radius:0.6rem;cursor:pointer;transition:all 0.15s;display:flex;gap:0.75rem;align-items:center; }
        .chat-item:hover { background:rgba(255,255,255,0.06); }
        .chat-item.active { background:rgba(99,102,241,0.15);border-left:3px solid var(--accent,#6366f1); }
        .msg-row { display:flex;flex-direction:column;width:100%;margin-bottom:0.25rem;animation:fadeIn 0.2s ease; }
        .msg-bubble { max-width:72%;padding:0.75rem 1rem;border-radius:1rem;position:relative;word-wrap:break-word;word-break:break-word;line-height:1.5; }
        .msg-own { background:var(--accent,#6366f1);color:white;align-self:flex-end;border-bottom-right-radius:0.2rem; }
        .msg-other { background:rgba(255,255,255,0.1);color:var(--text-primary,white);align-self:flex-start;border-bottom-left-radius:0.2rem; }
        .msg-deleted { opacity:0.5;font-style:italic; }
        .msg-actions { display:none;position:absolute;right:-8px;top:50%;transform:translateY(-50%);flex-direction:column;gap:0.2rem;z-index:10; }
        .msg-row:hover .msg-actions { display:flex; }
        .msg-action-btn { width:28px;height:28px;border-radius:50%;background:rgba(30,30,60,0.95);border:1px solid rgba(255,255,255,0.15);color:white;font-size:0.8rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s; }
        .msg-action-btn:hover { background:rgba(99,102,241,0.5); }
        .reaction-bar { display:flex;gap:0.25rem;flex-wrap:wrap;margin-top:0.3rem; }
        .reaction-chip { background:rgba(255,255,255,0.1);border-radius:2rem;padding:0.15rem 0.5rem;font-size:0.8rem;cursor:pointer;border:1px solid rgba(255,255,255,0.1);transition:all 0.15s; }
        .reaction-chip:hover { background:rgba(99,102,241,0.3); }
        .reaction-chip.mine { border-color:var(--accent,#6366f1);background:rgba(99,102,241,0.2); }
        .reply-preview { background:rgba(99,102,241,0.15);border-left:3px solid var(--accent,#6366f1);border-radius:0.4rem;padding:0.4rem 0.75rem;margin-bottom:0.4rem;font-size:0.8rem;color:var(--text-muted,#718096);cursor:pointer; }
        .typing-indicator { display:flex;align-items:center;gap:0.3rem;padding:0.5rem 1rem; }
        .typing-dot { width:6px;height:6px;border-radius:50%;background:var(--accent,#6366f1);animation:typing-bounce 1.4s infinite; }
        .typing-dot:nth-child(2) { animation-delay:0.2s; }
        .typing-dot:nth-child(3) { animation-delay:0.4s; }
        @keyframes typing-bounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-6px);opacity:1} }
        .online-dot { width:10px;height:10px;border-radius:50%;background:#22c55e;border:2px solid rgba(0,0,0,0.4);position:absolute;bottom:1px;right:1px; }
        .reply-bar { display:flex;align-items:center;gap:0.5rem;padding:0.5rem 1rem;background:rgba(99,102,241,0.1);border-top:1px solid rgba(99,102,241,0.2);font-size:0.85rem; }
        .delivery-icon { font-size:0.7rem;opacity:0.7;margin-left:4px; }
        .btn-premium { background:linear-gradient(135deg,var(--accent,#6366f1),#8b5cf6);border:none;color:white;font-weight:600;transition:all 0.2s; }
        .btn-premium:hover:not(:disabled) { opacity:0.9;transform:scale(1.02); }
        .fab-container, .fab-main, #fab-container { display:none !important; }

        @media (max-width: 768px) {
          body.in-active-chat .mobile-nav,
          body.in-active-chat .app-header,
          body:has(#chat-layout.has-active-chat) .mobile-nav,
          body:has(#chat-layout.has-active-chat) .app-header {
            display: none !important;
          }
          body.in-active-chat .main-wrapper,
          body.in-active-chat .content-area,
          body.in-active-chat .app-layout,
          body.in-active-chat .page-chats,
          body:has(#chat-layout.has-active-chat) .main-wrapper,
          body:has(#chat-layout.has-active-chat) .content-area,
          body:has(#chat-layout.has-active-chat) .app-layout,
          body:has(#chat-layout.has-active-chat) .page-chats {
            height: 100dvh !important;
            max-height: 100dvh !important;
            height: 100vh !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .chats-header-title {
            display: none !important;
          }
          .chat-layout {
            border-radius: 0 !important;
            border: none !important;
            height: 100% !important;
            width: 100% !important;
          }
          body.in-active-chat .chat-layout,
          body:has(#chat-layout.has-active-chat) .chat-layout {
            height: 100dvh !important;
            height: 100vh !important;
          }
          .chat-layout:not(.has-active-chat) .chat-sidebar {
            display: flex !important;
            width: 100% !important;
            height: 100% !important;
            flex: 1 !important;
            border-right: none !important;
          }
          .chat-layout:not(.has-active-chat) .chat-main {
            display: none !important;
          }
          .chat-layout.has-active-chat .chat-sidebar {
            display: none !important;
          }
          .chat-layout.has-active-chat .chat-main {
            display: flex !important;
            width: 100% !important;
            height: 100% !important;
            flex: 1 !important;
            min-width: 0 !important;
          }
          .chat-back-btn {
            display: flex !important;
          }
          .msg-bubble {
            max-width: 85% !important;
          }
        }

        @media (min-width: 769px) {
          .chat-back-btn {
            display: none !important;
          }
        }
      </style>
    `;
  },

  _skeletonConvs() {
    return Array(5).fill(0).map(() => `
      <div style="display:flex;gap:0.75rem;align-items:center;padding:0.85rem;margin-bottom:0.25rem;">
        <div class="skeleton-line" style="width:44px;height:44px;border-radius:50%;flex-shrink:0;"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:0.4rem;">
          <div class="skeleton-line" style="height:12px;width:70%;"></div>
          <div class="skeleton-line" style="height:10px;width:50%;"></div>
        </div>
      </div>
    `).join('');
  },

  async init() {
    this.conversations = [];
    this.currentChatId = null;
    this._replyTo = null;

    await this.loadConversations();

    document.getElementById('btn-new-chat')?.addEventListener('click', () => this.openNewChatModal());

    const search = document.getElementById('chat-search');
    search?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.chat-item').forEach(el => {
        el.style.display = el.dataset.name?.toLowerCase().includes(q) ? '' : 'none';
      });
    });

    if (this._pollInterval) clearInterval(this._pollInterval);
    this._pollInterval = setInterval(() => {
      if (this.currentChatId) this.loadMessages(this.currentChatId, true);
      this.loadConversations(true);
    }, 3000);
  },

  async loadConversations(silent = false) {
    const list = document.getElementById('conversations-list');
    if (!list) return;
    if (!silent) list.innerHTML = this._skeletonConvs();

    const res = await Homeroom.API.get('/conversations');
    if (!res.success) {
      if (!silent) list.innerHTML = '<div style="color:var(--text-muted,#718096);text-align:center;padding:1.5rem;font-size:0.9rem;">Failed to load conversations.</div>';
      return;
    }
    this.conversations = res.data || [];

    if (this.conversations.length === 0) {
      list.innerHTML = `
        <div style="text-align:center;color:var(--text-muted,#718096);padding:2rem 1rem;">
          <div style="font-size:2.5rem;margin-bottom:0.75rem;opacity:0.5;">💬</div>
          <p style="font-size:0.9rem;">No conversations yet.<br>Start one with a classmate!</p>
        </div>
      `;
      return;
    }

    const currentUser = Homeroom.store.currentUser || Homeroom.auth?.user;
    list.innerHTML = this.conversations.map(c => {
      const totalUnread = c.unread_count || 0;
      const lastTime = c.last_message_time ? new Date(c.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return `
        <div class="chat-item ${this.currentChatId === c.id ? 'active' : ''}" 
             data-id="${c.id}" data-name="${(c.name || 'Chat').replace(/"/g,'')}"
             onclick="Homeroom.pages.chats.openChat('${c.id}')">
          <div style="position:relative;flex-shrink:0;">
            <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:1.4rem;">${c.icon || '💬'}</div>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.15rem;">
              <h4 style="margin:0;font-size:0.9rem;font-weight:${totalUnread > 0 ? '700' : '500'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary,white);">${c.name || 'Chat'}</h4>
              <span style="font-size:0.7rem;color:var(--text-muted,#718096);flex-shrink:0;">${lastTime}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <p style="margin:0;font-size:0.8rem;color:var(--text-muted,#718096);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:${totalUnread > 0 ? '600' : '400'};">${c.last_message_content || 'No messages yet'}</p>
              ${totalUnread > 0 ? `<span style="background:var(--accent,#6366f1);color:white;border-radius:2rem;font-size:0.65rem;padding:0.1rem 0.45rem;flex-shrink:0;font-weight:700;">${totalUnread > 99 ? '99+' : totalUnread}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  destroy() {
    if (this._pollInterval) clearInterval(this._pollInterval);
    document.body.classList.remove('in-active-chat');
  },

  closeChat() {
    this.currentChatId = null;
    this._replyTo = null;
    document.body.classList.remove('in-active-chat');
    const layout = document.getElementById('chat-layout');
    if (layout) layout.classList.remove('has-active-chat');
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    const main = document.getElementById('chat-main');
    if (main) {
      main.innerHTML = `
        <div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1rem;color:var(--text-muted,#718096);">
          <div style="font-size:4rem;opacity:0.5;">💬</div>
          <p style="font-size:1.1rem;">Select a conversation</p>
        </div>
      `;
    }
  },

  async openChat(id) {
    this.currentChatId = id;
    this._replyTo = null;
    const layout = document.getElementById('chat-layout');
    if (layout) {
      if (id) {
        layout.classList.add('has-active-chat');
        document.body.classList.add('in-active-chat');
      } else {
        layout.classList.remove('has-active-chat');
        document.body.classList.remove('in-active-chat');
      }
    }

    const chat = this.conversations.find(c => c.id === id);

    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.chat-item[data-id="${id}"]`)?.classList.add('active');

    const main = document.getElementById('chat-main');
    if (!main) return;

    const participants = chat?.participants || [];
    const currentUser = Homeroom.store.currentUser || Homeroom.auth?.user;
    const otherUser = participants.find(p => p.id !== currentUser?.id);

    main.innerHTML = `
      <!-- Header -->
      <div style="padding:0.75rem 1rem;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;gap:0.6rem;background:rgba(255,255,255,0.02);flex-shrink:0;">
        <button class="chat-back-btn" onclick="Homeroom.pages.chats.closeChat()" style="background:rgba(255,255,255,0.08);border:none;color:white;font-size:1.2rem;cursor:pointer;padding:0.4rem 0.7rem;border-radius:0.5rem;align-items:center;justify-content:center;margin-right:0.2rem;display:none;">
          ←
        </button>
        <div style="position:relative;flex-shrink:0;">
          <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:1.4rem;">${chat?.icon || '💬'}</div>
        </div>
        <div style="flex:1;min-width:0;">
          <h3 style="margin:0;font-size:1rem;font-weight:700;color:var(--text-primary,white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${chat?.name || 'Chat'}</h3>
          <div id="chat-status" style="font-size:0.78rem;color:var(--text-muted,#718096);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${chat?.type === 'dm' ? 'Direct Message' : 'Group Chat'}</div>
        </div>
        <div id="chat-typing" style="font-size:0.8rem;color:var(--accent,#6366f1);display:none;"></div>
      </div>

      <!-- Messages -->
      <div id="messages-container" style="flex:1;overflow-y:auto;padding:1.25rem;display:flex;flex-direction:column;"></div>

      <!-- Reply Preview -->
      <div id="reply-bar" style="display:none;" class="reply-bar">
        <div style="flex:1;">
          <div style="font-size:0.75rem;color:var(--accent,#6366f1);font-weight:600;margin-bottom:0.15rem;">Replying to:</div>
          <div id="reply-text" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></div>
        </div>
        <button onclick="Homeroom.pages.chats.cancelReply()" style="background:none;border:none;color:var(--text-muted,#718096);font-size:1.2rem;cursor:pointer;padding:0.25rem;">×</button>
      </div>

      <!-- Input -->
      <div style="padding:0.75rem 1rem;border-top:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);flex-shrink:0;width:100%;box-sizing:border-box;">
        <form id="chat-form" action="javascript:void(0);" onsubmit="return false;" style="display:flex;gap:0.5rem;align-items:flex-end;width:100%;min-width:0;box-sizing:border-box;">
          <textarea id="chat-input" placeholder="Type a message..." rows="1"
            style="flex:1;min-width:0;width:100%;box-sizing:border-box;padding:0.75rem 1rem;border-radius:1rem;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.3);color:white;resize:none;outline:none;font-family:inherit;font-size:0.95rem;line-height:1.4;max-height:120px;word-break:break-word;overflow-wrap:break-word;"></textarea>
          <button type="submit" class="btn btn-premium" style="padding:0.75rem 1rem;border-radius:1rem;flex-shrink:0;height:42px;display:flex;align-items:center;justify-content:center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
      </div>
    `;

    // Auto-resize textarea
    const input = document.getElementById('chat-input');
    input.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const f = document.getElementById('chat-form');
        if (f.requestSubmit) { f.requestSubmit(); } else { f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }
      }
    });
    input.focus();

    const form = document.getElementById('chat-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const content = input.value.trim();
      if (!content) return false;
      input.value = '';
      input.style.height = 'auto';

      const replyTo = this._replyTo ? this._replyTo.id : null;
      this.cancelReply();

      try {
        await Homeroom.API.post(`/conversations/${id}/messages`, { content, replyTo });
        this.loadMessages(id, true);
      } catch (err) {
        Homeroom.toast('Failed to send message', 'error');
        input.value = content;
      }
      return false;
    };

    // Mark delivered then load
    Homeroom.API.post(`/conversations/${id}/delivered`).catch(() => {});
    await this.loadMessages(id);
  },

  async loadMessages(chatId, silent = false) {
    if (this.currentChatId !== chatId) return;
    const container = document.getElementById('messages-container');
    if (!container) return;

    const res = await Homeroom.API.get(`/conversations/${chatId}/messages?limit=60`);
    if (!res.success) {
      if (!silent) container.innerHTML = '<div style="color:var(--text-muted);text-align:center;margin:auto;">Failed to load messages.</div>';
      return;
    }
    const messages = res.data || [];
    const currentUser = Homeroom.store.currentUser || Homeroom.auth?.user;
    const wasScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 60;

    if (messages.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-muted,#718096);margin:auto;font-size:0.9rem;">No messages yet. Say hi! 👋</div>';
      // Mark as read
      Homeroom.API.post(`/conversations/${chatId}/read`).catch(() => {});
      return;
    }

    let html = '';
    let lastDate = null;

    messages.forEach((msg, idx) => {
      const msgDate = new Date(msg.created_at).toLocaleDateString();
      if (msgDate !== lastDate) {
        const label = msgDate === new Date().toLocaleDateString() ? 'Today' : msgDate;
        html += `
          <div style="text-align:center;margin:1rem 0;position:relative;">
            <span style="background:var(--bg-base,#08081a);padding:0 1rem;font-size:0.75rem;color:var(--text-muted,#718096);position:relative;z-index:1;">${label}</span>
            <div style="position:absolute;top:50%;left:0;right:0;border-top:1px solid rgba(255,255,255,0.06);z-index:0;"></div>
          </div>
        `;
        lastDate = msgDate;
      }

      const isOwn = msg.sender_id === currentUser?.id;
      const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const sender = msg.sender || {};
      const senderName = sender.display_name || sender.username || 'User';

      // Delivery status (own messages only)
      let deliveryIcon = '';
      if (isOwn && !msg.deleted) {
        const readBy = Array.isArray(msg.read_by) ? msg.read_by : [];
        const deliveredTo = Array.isArray(msg.delivered_to) ? msg.delivered_to : [];
        const otherReadBy = readBy.filter(uid => uid !== currentUser.id);
        const otherDelivered = deliveredTo.filter(uid => uid !== currentUser.id);
        if (otherReadBy.length > 0) {
          deliveryIcon = '<span class="delivery-icon" title="Seen" style="color:#3b82f6;">✓✓</span>';
        } else if (otherDelivered.length > 0) {
          deliveryIcon = '<span class="delivery-icon" title="Delivered">✓✓</span>';
        } else {
          deliveryIcon = '<span class="delivery-icon" title="Sent">✓</span>';
        }
      }

      // Reactions
      const reactions = msg.reactions || {};
      let reactionsHTML = '';
      if (Object.keys(reactions).length > 0) {
        reactionsHTML = '<div class="reaction-bar">' +
          Object.entries(reactions).map(([emoji, users]) => {
            const mine = Array.isArray(users) && users.includes(currentUser?.id);
            return `<span class="reaction-chip${mine ? ' mine' : ''}" onclick="Homeroom.pages.chats.react('${msg.id}','${emoji}')" title="${Array.isArray(users) ? users.length + ' reactions' : ''}">${emoji} ${Array.isArray(users) ? users.length : 1}</span>`;
          }).join('') + '</div>';
      }

      // Reply preview
      let replyHTML = '';
      if (msg.reply_to) {
        replyHTML = `<div class="reply-preview" onclick="document.getElementById('msg-${msg.reply_to}')?.scrollIntoView({behavior:'smooth'})">↩ Replied to a message</div>`;
      }

      // Actions (react, reply, delete)
      const actionsHTML = `
        <div class="msg-actions">
          <button class="msg-action-btn" title="React" onclick="Homeroom.pages.chats.showReactPicker('${msg.id}',event)">😊</button>
          <button class="msg-action-btn" title="Reply" onclick="Homeroom.pages.chats.setReply('${msg.id}','${(msg.content || '').replace(/'/g, "\\'").substring(0, 60)}')">↩</button>
          ${isOwn && !msg.deleted ? `<button class="msg-action-btn" title="Delete" onclick="Homeroom.pages.chats.deleteMsg('${msg.id}')" style="color:#ef4444;">🗑</button>` : ''}
        </div>
      `;

      html += `
        <div class="msg-row" id="msg-${msg.id}" style="align-items:${isOwn ? 'flex-end' : 'flex-start'};">
          ${!isOwn ? `<div style="font-size:0.72rem;color:var(--accent,#6366f1);margin-bottom:0.15rem;margin-left:0.25rem;font-weight:600;">${senderName}</div>` : ''}
          <div style="position:relative;max-width:72%;">
            <div class="msg-bubble ${isOwn ? 'msg-own' : 'msg-other'} ${msg.deleted ? 'msg-deleted' : ''}">
              ${replyHTML}
              <div style="white-space:pre-wrap;">${msg.deleted ? '🚫 This message was deleted' : this._escapeHtml(msg.content)}</div>
              <div style="font-size:0.68rem;text-align:right;margin-top:0.3rem;opacity:0.7;display:flex;align-items:center;justify-content:flex-end;gap:0.2rem;">
                ${msg.edited && !msg.deleted ? '<span style="font-style:italic;">edited</span>' : ''}
                ${time}${deliveryIcon}
              </div>
            </div>
            ${actionsHTML}
          </div>
          ${reactionsHTML}
        </div>
      `;
    });

    container.innerHTML = html;

    if (!silent || wasScrolledToBottom) {
      container.scrollTop = container.scrollHeight;
    }

    if (!silent) {
      Homeroom.API.post(`/conversations/${chatId}/read`).catch(() => {});
      Homeroom.API.post(`/conversations/${chatId}/delivered`).catch(() => {});
    }
  },

  _escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  setReply(msgId, content) {
    this._replyTo = { id: msgId, content };
    const bar = document.getElementById('reply-bar');
    const text = document.getElementById('reply-text');
    if (bar && text) {
      bar.style.display = 'flex';
      text.textContent = content + (content.length >= 60 ? '...' : '');
    }
    document.getElementById('chat-input')?.focus();
  },

  cancelReply() {
    this._replyTo = null;
    const bar = document.getElementById('reply-bar');
    if (bar) bar.style.display = 'none';
  },

  async react(msgId, emoji) {
    const res = await Homeroom.API.post(`/messages/${msgId}/react`, { emoji });
    if (res.success) this.loadMessages(this.currentChatId, true);
  },

  showReactPicker(msgId, e) {
    e.stopPropagation();
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '💯'];
    // Remove existing picker
    document.getElementById('emoji-picker')?.remove();
    const picker = document.createElement('div');
    picker.id = 'emoji-picker';
    picker.style.cssText = `position:fixed;background:rgba(20,20,50,0.98);border:1px solid rgba(255,255,255,0.15);border-radius:0.75rem;padding:0.5rem;display:flex;gap:0.3rem;z-index:999;box-shadow:0 8px 32px rgba(0,0,0,0.4);`;
    picker.innerHTML = emojis.map(em => `<button onclick="Homeroom.pages.chats.react('${msgId}','${em}');document.getElementById('emoji-picker')?.remove();" style="background:none;border:none;cursor:pointer;font-size:1.4rem;padding:0.25rem;border-radius:0.4rem;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='none'">${em}</button>`).join('');
    document.body.appendChild(picker);
    const rect = e.target.getBoundingClientRect();
    picker.style.left = Math.min(rect.left, window.innerWidth - 280) + 'px';
    picker.style.top = (rect.bottom + 4) + 'px';
    setTimeout(() => document.addEventListener('click', () => picker.remove(), { once: true }), 10);
  },

  async deleteMsg(msgId) {
    if (!confirm('Delete this message for everyone?')) return;
    const res = await Homeroom.API.delete(`/messages/${msgId}`);
    if (res.success) {
      Homeroom.toast('Message deleted', 'info');
      this.loadMessages(this.currentChatId, true);
    } else {
      Homeroom.toast(res.message || 'Failed to delete', 'error');
    }
  },

  async openNewChatModal() {
    const usersRes = await Homeroom.API.get('/users');
    if (!usersRes.success) { Homeroom.toast('Failed to load users', 'error'); return; }

    const currentUser = Homeroom.store.currentUser || Homeroom.auth?.user;
    const users = (usersRes.data || []).filter(u => u.id !== currentUser?.id);

    Homeroom.modal.open('New Message', `
      <div>
        <input type="text" id="new-chat-search" placeholder="Search classmates..." style="width:100%;padding:0.8rem 1rem;border-radius:0.6rem;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.2);color:white;margin-bottom:1rem;outline:none;">
        <div id="user-pick-list" style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:0.5rem;">
          ${users.map(u => `
            <div class="user-pick-item" data-name="${u.display_name.toLowerCase()} ${u.username.toLowerCase()}"
                 style="display:flex;align-items:center;gap:0.75rem;padding:0.8rem;border-radius:0.6rem;cursor:pointer;border:1px solid rgba(255,255,255,0.07);transition:background 0.15s;"
                 onmouseover="this.style.background='rgba(99,102,241,0.1)'" onmouseout="this.style.background=''"
                 onclick="Homeroom.pages.chats._startChat('${u.id}')">
              <div style="font-size:1.5rem;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;">${u.avatar_emoji || '🎓'}</div>
              <div>
                <div style="font-weight:600;font-size:0.9rem;">${u.display_name}</div>
                <div style="font-size:0.78rem;color:var(--text-muted,#718096);">@${u.username}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `);

    document.getElementById('new-chat-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.user-pick-item').forEach(el => {
        el.style.display = el.dataset.name?.includes(q) ? '' : 'none';
      });
    });
  },

  async _startChat(userId) {
    const currentUser = Homeroom.store.currentUser || Homeroom.auth?.user;
    const res = await Homeroom.API.post('/conversations', {
      type: 'dm',
      participants: [currentUser.id, userId]
    });
    if (res.success) {
      Homeroom.modal.close();
      await this.loadConversations();
      await this.openChat(res.data.id);
    } else {
      Homeroom.toast(res.message || 'Failed to start chat', 'error');
    }
  },

  destroy() {
    if (this._pollInterval) clearInterval(this._pollInterval);
    document.getElementById('emoji-picker')?.remove();
  }
};
