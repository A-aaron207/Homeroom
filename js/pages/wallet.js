window.Homeroom = window.Homeroom || {};
Homeroom.pages = Homeroom.pages || {};

Homeroom.pages.wallet = {
  async render() {
    return `
      <div class="page-container page-wallet fade-in">
        <div class="header-section" style="margin-bottom: 2rem;">
          <h1 class="page-title" style="font-size: 2.5rem; font-weight: 800; background: linear-gradient(to right, #ffb703, #fb8500); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Wallet</h1>
          <p style="color: var(--text-muted); font-size: 1.1rem; margin-top: 0.5rem;">Manage your ClassCoins.</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
            <!-- Balance Card -->
            <div class="glass-card" style="padding: 2.5rem 2rem; background: linear-gradient(135deg, rgba(255,183,3,0.1) 0%, rgba(251,133,0,0.1) 100%); border: 1px solid rgba(255,183,3,0.2); position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                <div style="position: absolute; top: -20px; right: -20px; font-size: 10rem; opacity: 0.05; transform: rotate(15deg);">⭐</div>
                
                <h3 style="margin: 0 0 0.5rem 0; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-size: 0.9rem;">Current Balance</h3>
                <div style="font-size: 4rem; font-weight: 900; color: #ffb703; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1.5rem; text-shadow: 0 0 20px rgba(255,183,3,0.3);">
                    <span style="font-size: 3rem;">⭐</span> <span id="wallet-balance">...</span>
                </div>
                
                <div style="display: flex; gap: 1rem; width: 100%;">
                    <button id="btn-transfer" class="btn btn-premium" style="flex: 1; padding: 1rem; border-radius: 0.75rem; background: linear-gradient(135deg, #fbbf24, #f59e0b); display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3l4 4-4 4M21 7H3M7 21l-4-4 4-4M3 17h18"/></svg>
                        Transfer
                    </button>
                    <button class="btn" style="flex: 1; padding: 1rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;" onclick="window.location.hash='#tasks'">
                        Earn More
                    </button>
                </div>
            </div>

            <!-- Stats & Ways to Earn -->
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div class="glass-card" style="padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase;">Total Earned</div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #22c55e;" id="wallet-earned">...</div>
                    </div>
                    <div style="font-size: 2rem; opacity: 0.5;">📈</div>
                </div>
                <div class="glass-card" style="padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase;">Total Spent</div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #ef4444;" id="wallet-spent">...</div>
                    </div>
                    <div style="font-size: 2rem; opacity: 0.5;">📉</div>
                </div>
                <div class="glass-card" style="padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase;">Wealth Rank</div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-color);" id="wallet-rank">...</div>
                    </div>
                    <div style="font-size: 2rem; opacity: 0.5;">👑</div>
                </div>
            </div>
        </div>

        <!-- Transactions -->
        <div class="glass-card" style="padding: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; font-size: 1.5rem;">Transaction History</h3>
                <div id="tx-filters" style="display: flex; gap: 0.5rem; background: rgba(0,0,0,0.3); padding: 0.25rem; border-radius: 0.5rem;">
                    <button class="tx-filter active" data-filter="all" style="padding: 0.4rem 1rem; border-radius: 0.25rem; border: none; background: rgba(255,255,255,0.1); color: white; cursor: pointer; font-size: 0.85rem;">All</button>
                    <button class="tx-filter" data-filter="earned" style="padding: 0.4rem 1rem; border-radius: 0.25rem; border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 0.85rem;">Earned</button>
                    <button class="tx-filter" data-filter="spent" style="padding: 0.4rem 1rem; border-radius: 0.25rem; border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 0.85rem;">Spent</button>
                </div>
            </div>
            
            <div id="transactions-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="display: flex; justify-content: center; padding: 2rem;"><div class="spinner"></div></div>
            </div>
        </div>
      </div>
    `;
  },
  async init() {
    this.currentFilter = 'all';
    
    document.querySelectorAll('.tx-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tx-filter').forEach(b => { b.style.background = 'transparent'; b.style.color = 'var(--text-muted)'; b.classList.remove('active'); });
            e.target.style.background = 'rgba(255,255,255,0.1)';
            e.target.style.color = 'white';
            e.target.classList.add('active');
            this.currentFilter = e.target.dataset.filter;
            this.renderTransactions();
        });
    });

    document.getElementById('btn-transfer').addEventListener('click', async () => {
        // Need to load users for the dropdown
        try {
            const usersRes = await Homeroom.API.get('/users');
            if(!usersRes.success) throw new Error();
            const users = usersRes.data.filter(u => u.id !== Homeroom.auth.user.id && (u.display_name || u.username));
            
            Homeroom.modal.open('Transfer Coins', `
                <form id="transfer-form" action="javascript:void(0);" style="display: flex; flex-direction: column; gap: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Recipient</label>
                        <select name="recipientId" required style="width: 100%; padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
                            <option value="" disabled selected>Select a user...</option>
                            ${users.map(u => `<option value="${u.id}">${u.display_name || u.username} (@${u.username})</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Amount (CC)</label>
                        <input type="number" name="amount" min="1" max="${this.walletData?.balance || 9999}" required style="width: 100%; padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;" placeholder="e.g. 50">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Reason (optional)</label>
                        <input type="text" name="reason" style="width: 100%; padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;" placeholder="e.g. Thanks for the help!">
                    </div>
                    <button type="submit" id="btn-submit-transfer" class="btn btn-premium" style="width: 100%; padding: 1rem; border-radius: 0.5rem; margin-top: 0.5rem;">Send Coins</button>
                </form>
            `, '');

            const form = document.getElementById('transfer-form');
            form.onsubmit = async (e) => {
                e.preventDefault();
                const btn = document.getElementById('btn-submit-transfer');
                const oldText = btn.innerText;
                btn.innerText = 'Sending...';
                btn.disabled = true;

                const data = Object.fromEntries(new FormData(form));
                data.amount = parseInt(data.amount);

                try {
                    const res = await Homeroom.API.post('/wallet/transfer', data);
                    if(res.success) {
                        Homeroom.toast('Transfer successful!', 'success');
                        Homeroom.modal.close();
                        if (window.App && window.App.refreshUser) {
                            window.App.refreshUser();
                        }
                        this.loadData();
                    } else {
                        Homeroom.toast(res.message || 'Transfer failed', 'error');
                        btn.innerText = oldText;
                        btn.disabled = false;
                    }
                } catch(err) {
                    Homeroom.toast('Network error', 'error');
                    btn.innerText = oldText;
                    btn.disabled = false;
                }
                return false;
            };
        } catch(e) {
            Homeroom.toast('Failed to load users for transfer', 'error');
        }
    });

    await this.loadData();
  },
  
  async loadData() {
      try {
          const res = await Homeroom.API.get('/wallet');
          if(res.success) {
              this.walletData = res.data;
              document.getElementById('wallet-balance').innerText = this.walletData.balance;
              document.getElementById('wallet-earned').innerText = '+' + this.walletData.totalEarned;
              document.getElementById('wallet-spent').innerText = '-' + this.walletData.totalSpent;
              document.getElementById('wallet-rank').innerText = '#' + (this.walletData.rank || '?');
              
              this.renderTransactions();
          }
      } catch(e) {
          document.getElementById('transactions-list').innerHTML = '<div class="error-state">Failed to load wallet data.</div>';
      }
  },

  renderTransactions() {
      const list = document.getElementById('transactions-list');
      let txs = this.walletData.transactions || [];
      
      if(this.currentFilter === 'earned') txs = txs.filter(t => t.type === 'earned' || t.amount > 0);
      if(this.currentFilter === 'spent') txs = txs.filter(t => t.type === 'spent' || t.type === 'expense' || t.amount < 0);
      
      if(txs.length === 0) {
          list.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No transactions found.</div>';
          return;
      }
      
      const getIcon = (cat) => {
          if(!cat) return '🪙';
          if(cat.includes('spin')) return '🎡';
          if(cat.includes('login')) return '📅';
          if(cat.includes('note')) return '📚';
          if(cat.includes('purchase') || cat.includes('market')) return '🛒';
          if(cat.includes('transfer')) return '💸';
          if(cat.includes('answer')) return '💡';
          return '🪙';
      };
      
      list.innerHTML = txs.map(t => {
          const isSpent = t.type === 'spent' || t.type === 'expense' || t.amount < 0;
          const isPos = !isSpent;
          const absAmount = Math.abs(t.amount);
          return `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.02);">
                  <div style="display: flex; align-items: center; gap: 1rem;">
                      <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                          ${getIcon(t.category)}
                      </div>
                      <div>
                          <div style="font-weight: bold; color: var(--text-color);">${t.description || t.category || 'Transaction'}</div>
                          <div style="font-size: 0.8rem; color: var(--text-muted);">${new Date((t.created_at || '').replace(' ', 'T')).toLocaleString()}</div>
                      </div>
                  </div>
                  <div style="font-weight: bold; font-size: 1.1rem; color: ${isPos ? '#22c55e' : '#ef4444'};">
                      ${isPos ? '+' : '-'}${absAmount} CC
                  </div>
              </div>
          `;
      }).join('');
  },

  destroy() {}
};
