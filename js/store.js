window.Homeroom = window.Homeroom || {};

Homeroom.store = {
  currentUser: null,
  users: [],
  notes: [],
  conversations: [],
  tasks: [],
  announcements: [],
  leaderboard: [],
  marketplace: [],
  questions: [],
  dailyStatus: null,
  wallet: null,

  async loadUsers() {
    const res = await Homeroom.API.get('/users');
    if (res.success) {
      this.users = res.data;
      this.emit('users_updated', this.users);
    }
  },

  async loadNotes(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const res = await Homeroom.API.get(`/notes?${query}`);
    if (res.success) {
      this.notes = res.data;
      this.emit('notes_updated', this.notes);
    }
    return res;
  },

  async loadConversations() {
    const res = await Homeroom.API.get('/conversations');
    if (res.success) {
      this.conversations = res.data;
      this.emit('conversations_updated', this.conversations);
    }
  },

  async loadTasks() {
    const res = await Homeroom.API.get('/tasks');
    if (res.success) {
      this.tasks = res.data;
      this.emit('tasks_updated', this.tasks);
    }
  },

  async loadAnnouncements() {
    const res = await Homeroom.API.get('/announcements');
    if (res.success) {
      this.announcements = res.data;
      this.emit('announcements_updated', this.announcements);
    }
  },

  async loadLeaderboard(type = 'xp', period = 'all') {
    const res = await Homeroom.API.get(`/leaderboard?type=${type}&period=${period}`);
    if (res.success) {
      this.leaderboard = res.data;
      this.emit('leaderboard_updated', this.leaderboard);
    }
  },

  async loadMarketplace() {
    const res = await Homeroom.API.get('/marketplace');
    if (res.success) {
      this.marketplace = res.data;
      this.emit('marketplace_updated', this.marketplace);
    }
  },

  async loadQuestions(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const res = await Homeroom.API.get(`/questions?${query}`);
    if (res.success) {
      this.questions = res.data;
      this.emit('questions_updated', this.questions);
    }
  },

  async loadDailyStatus() {
    const res = await Homeroom.API.get('/daily/status');
    if (res.success) {
      this.dailyStatus = res.data;
      this.emit('daily_status_updated', this.dailyStatus);
    }
  },

  async loadWallet() {
    const res = await Homeroom.API.get('/wallet');
    if (res.success) {
      this.wallet = res.data;
      this.emit('wallet_updated', this.wallet);
    }
  },

  getUserById(id) {
    if (this.currentUser && this.currentUser.id === id) return this.currentUser;
    return this.users.find(u => u.id === id) || { displayName: 'Unknown User', avatarEmoji: '👤' };
  },

  formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  },

  formatCoins(n) {
    return `⭐ ${n} CC`;
  },

  _listeners: {},

  on(event, cb) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(cb);
  },

  off(event, cb) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(l => l !== cb);
  },

  emit(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach(cb => cb(data));
  }
};
