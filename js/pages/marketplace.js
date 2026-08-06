window.Homeroom = window.Homeroom || {};
Homeroom.pages = Homeroom.pages || {};

Homeroom.pages.marketplace = {
  async render() {
    return `
      <div class="page-container page-marketplace fade-in">
        <div class="header-section" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 class="page-title" style="font-size: 2.5rem; font-weight: 800; background: linear-gradient(to right, #10b981, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Marketplace</h1>
            <p style="color: var(--text-muted); font-size: 1.1rem; margin-top: 0.5rem;">Spend your ClassCoins on customizations.</p>
          </div>
          <div class="glass-card" style="padding: 0.75rem 1.5rem; border-radius: 2rem; border: 1px solid rgba(255, 183, 3, 0.3); background: rgba(255, 183, 3, 0.1); display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.2rem;">⭐</span>
            <span style="font-size: 1.2rem; font-weight: bold; color: #ffb703;" id="shop-balance">...</span>
          </div>
        </div>

        <div class="filters-section" style="margin-bottom: 2rem; overflow-x: auto; padding-bottom: 0.5rem;">
            <div id="shop-categories" style="display: flex; gap: 0.5rem; min-width: max-content;">
                <button class="cat-chip active" data-cat="all" style="padding: 0.5rem 1.5rem; border-radius: 2rem; border: 1px solid var(--accent-color); background: var(--accent-color); color: white; cursor: pointer;">All Items</button>
                <button class="cat-chip" data-cat="theme" style="padding: 0.5rem 1.5rem; border-radius: 2rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; cursor: pointer;">Themes</button>
                <button class="cat-chip" data-cat="username_color" style="padding: 0.5rem 1.5rem; border-radius: 2rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; cursor: pointer;">Username Colors</button>
                <button class="cat-chip" data-cat="profile_frame" style="padding: 0.5rem 1.5rem; border-radius: 2rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; cursor: pointer;">Frames</button>
                <button class="cat-chip" data-cat="badge" style="padding: 0.5rem 1.5rem; border-radius: 2rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; cursor: pointer;">Badges</button>
                <button class="cat-chip" data-cat="profile_card" style="padding: 0.5rem 1.5rem; border-radius: 2rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; cursor: pointer;">Profile Cards</button>
            </div>
        </div>

        <div class="content-section" id="shop-content">
          <div class="loading-state" style="display: flex; justify-content: center; padding: 3rem;">
             <div class="spinner"></div>
          </div>
        </div>
      </div>
      <style>
        .shop-item { display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; position: relative; overflow: hidden; }
        .shop-item:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .shop-item.owned { border: 1px solid rgba(34, 197, 94, 0.3); }
        .shop-item.owned::after { content: 'OWNED'; position: absolute; top: 20px; right: -30px; background: #22c55e; color: white; padding: 0.25rem 2.5rem; transform: rotate(45deg); font-size: 0.7rem; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
      </style>
    `;
  },
  async init() {
    this.currentCat = 'all';
    
    document.querySelectorAll('.cat-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.cat-chip').forEach(b => { b.style.background = 'rgba(0,0,0,0.2)'; b.style.borderColor = 'rgba(255,255,255,0.1)'; b.classList.remove('active'); });
            e.target.style.background = 'var(--accent-color)';
            e.target.style.borderColor = 'var(--accent-color)';
            e.target.classList.add('active');
            this.currentCat = e.target.dataset.cat;
            this.renderItems();
        });
    });

    await this.loadShop();
  },
  
  async loadShop() {
      try {
          const [userRes, shopRes] = await Promise.all([
              Homeroom.API.get('/auth/me').catch(() => null),
              Homeroom.API.get('/marketplace').catch(() => null)
          ]);
          
          if (userRes && userRes.success && userRes.data) {
              const u = userRes.data.user || userRes.data;
              this.userCoins = typeof u.coins === 'number' ? u.coins : (u.coins || 0);
              if (Array.isArray(u.purchased_items)) {
                  this.userPurchases = u.purchased_items;
              } else if (typeof u.purchased_items === 'string') {
                  try { this.userPurchases = JSON.parse(u.purchased_items || '[]'); } catch(e) { this.userPurchases = []; }
              } else {
                  this.userPurchases = [];
              }
              const balanceEl = document.getElementById('shop-balance');
              if (balanceEl) balanceEl.innerText = this.userCoins;
          } else {
              this.userCoins = 0;
              this.userPurchases = [];
              const balanceEl = document.getElementById('shop-balance');
              if (balanceEl) balanceEl.innerText = '0';
          }
          
          if (shopRes && shopRes.success && Array.isArray(shopRes.data)) {
              this.items = shopRes.data;
              this.renderItems();
          } else {
              const content = document.getElementById('shop-content');
              if (content) content.innerHTML = '<div class="error-state" style="text-align: center; color: var(--text-muted); padding: 3rem;">Failed to load marketplace items.</div>';
          }
      } catch(e) {
          console.error('Error loading marketplace:', e);
          const content = document.getElementById('shop-content');
          if (content) content.innerHTML = '<div class="error-state" style="text-align: center; color: var(--text-muted); padding: 3rem;">Failed to load marketplace.</div>';
      }
  },
  
  renderItems() {
      const content = document.getElementById('shop-content');
      if (!content) return;

      let filtered = this.items || [];
      if (this.currentCat !== 'all') {
          filtered = filtered.filter(i => (i.category || i.type || '') === this.currentCat);
      }
      
      if (filtered.length === 0) {
          content.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 3rem;">No items found in this category.</div>';
          return;
      }
      
      const getCatColor = (cat) => {
          switch(cat) {
              case 'theme': return '#8b5cf6';
              case 'username_color': return '#ec4899';
              case 'profile_frame': return '#3b82f6';
              case 'badge': return '#f59e0b';
              case 'profile_card': return '#10b981';
              case 'avatar': case 'title': return '#3b82f6';
              default: return 'var(--accent-color)';
          }
      };
      
      const userPurchases = Array.isArray(this.userPurchases) ? this.userPurchases : [];
      const userCoins = typeof this.userCoins === 'number' ? this.userCoins : 0;
      
      content.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem;">
            ${filtered.map(item => {
                const category = item.category || item.type || 'item';
                const isOwned = userPurchases.includes(item.id);
                const canAfford = userCoins >= item.price;
                const catColor = getCatColor(category);
                const itemDesc = item.description || item.desc || '';
                const itemName = item.name || 'Item';
                const safeName = itemName.replace(/'/g, "\\'");
                
                return `
                    <div class="glass-card shop-item ${isOwned ? 'owned' : ''}" style="padding: 1.5rem; background: rgba(0,0,0,0.2);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
                            <div style="width: 60px; height: 60px; border-radius: 1rem; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; border: 1px solid rgba(255,255,255,0.1);">
                                ${item.icon || '🎁'}
                            </div>
                            <span style="background: rgba(255,255,255,0.1); color: ${catColor}; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; text-transform: uppercase; font-weight: bold; border: 1px solid ${catColor}; opacity: 0.8;">
                                ${category.replace('_', ' ')}
                            </span>
                        </div>
                        
                        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; color: var(--text-color);">${itemName}</h3>
                        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; flex: 1; line-height: 1.4;">${itemDesc}</p>
                        
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: auto;">
                            <div style="font-size: 1.25rem; font-weight: bold; color: #ffb703; display: flex; align-items: center; gap: 0.25rem;">
                                ⭐ ${item.price}
                            </div>
                            
                            ${isOwned ? `
                                <button class="btn" style="padding: 0.6rem 1.25rem; border-radius: 2rem; background: rgba(255,255,255,0.08); color: var(--text-muted); font-size: 0.85rem; font-weight: bold; border: 1px solid rgba(255,255,255,0.1); cursor: not-allowed;" disabled>✓ Owned</button>
                            ` : `
                                <button class="btn btn-premium" style="padding: 0.6rem 1.25rem; border-radius: 2rem; font-size: 0.9rem; font-weight: bold; ${!canAfford ? 'opacity: 0.4; cursor: not-allowed; filter: grayscale(1);' : ''}" onclick="Homeroom.pages.marketplace.purchase('${item.id}', '${safeName}', ${item.price})" ${!canAfford ? 'disabled' : ''}>
                                    🛒 Purchase
                                </button>
                            `}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
      `;
  },
  
  purchase(id, name, price) {
      Homeroom.modal.open('Confirm Purchase', `
        <div style="text-align: center; padding: 1rem 0;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🛒</div>
            <p style="font-size: 1.1rem;">Are you sure you want to buy <strong>${name}</strong>?</p>
            <p style="font-size: 1.5rem; color: #ffb703; font-weight: bold; margin: 1rem 0;">Cost: ⭐ ${price} CC</p>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Your balance: ⭐ ${this.userCoins || 0}</p>
        </div>
      `, `
        <div style="display: flex; gap: 1rem; width: 100%;">
            <button class="btn" style="flex: 1; padding: 1rem; border-radius: 0.5rem; background: rgba(255,255,255,0.1); color: white;" onclick="Homeroom.modal.close()">Cancel</button>
            <button class="btn btn-premium" style="flex: 1; padding: 1rem; border-radius: 0.5rem; background: #22c55e;" onclick="Homeroom.pages.marketplace.executePurchase('${id}')">Confirm Buy</button>
        </div>
      `);
  },
  
  async executePurchase(id) {
      try {
          const res = await Homeroom.API.post(`/marketplace/purchase/${id}`);
          if (res && res.success) {
              Homeroom.toast('Purchase successful! Item added to inventory.', 'success');
              Homeroom.modal.close();
              if (window.App && window.App.refreshUser) {
                  await window.App.refreshUser();
              }
              await this.loadShop();
          } else {
              Homeroom.toast((res && res.message) || 'Purchase failed', 'error');
              Homeroom.modal.close();
          }
      } catch(e) {
          Homeroom.toast('Network error', 'error');
      }
  },

  destroy() {}
};
