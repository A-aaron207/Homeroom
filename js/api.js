window.Homeroom = window.Homeroom || {};

Homeroom.API = {
  token: localStorage.getItem('homeroom_token'),

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('homeroom_token');
    }
    return this.token;
  },

  setToken(token) {
    this.token = token;
    localStorage.setItem('homeroom_token', token);
  },

  clearToken() {
    this.token = null;
    localStorage.removeItem('homeroom_token');
    try { if (Homeroom.firebase && Homeroom.firebase.auth) Homeroom.firebase.auth.signOut(); } catch(e) {}
  },

  // Firebase Firestore / Auth Adapter
  async firebaseHandler(method, path, body) {
    const db = Homeroom.firebase ? Homeroom.firebase.db : null;
    const auth = Homeroom.firebase ? Homeroom.firebase.auth : null;
    const currentUser = auth ? auth.currentUser : null;
    let payload = {};
    if (body) {
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        for (const [key, val] of body.entries()) {
          if (key === 'tags') {
            try { payload[key] = JSON.parse(val); } catch(e) { payload[key] = val ? String(val).split(',').map(s=>s.trim()) : []; }
          } else {
            payload[key] = val;
          }
        }
      } else if (typeof body === 'object') {
        payload = { ...body };
      }
    }

    try {
      // Helper for friendly Firebase Auth error messages
      const getFriendlyAuthError = (err) => {
        if (!err) return 'Authentication failed';
        const code = err.code || '';
        const msg = err.message || '';

        if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain') || msg.includes('unauthorized domain')) {
          const currentHost = window.location.hostname || 'your domain';
          return `Domain "${currentHost}" is not authorized in Firebase Console. Please add "${currentHost}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`;
        }
        if (code === 'auth/invalid-email') {
          return 'Please enter a valid email address.';
        }
        if (code === 'auth/email-already-in-use') {
          return 'An account with this email address already exists.';
        }
        if (code === 'auth/weak-password') {
          return 'Password must be at least 6 characters long.';
        }
        if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          return 'Invalid email/username or password.';
        }
        if (code === 'auth/too-many-requests') {
          return 'Too many failed login attempts. Please try again later.';
        }
        if (code === 'auth/network-request-failed' || msg.includes('network-request-failed')) {
          return 'Network error connecting to Firebase. Check internet connection and ensure your domain is authorized in Firebase Console.';
        }
        return msg ? msg.replace(/^Firebase:\s*/, '') : 'Authentication failed';
      };

      // Safe Firestore get with cache fallback
      const safeGet = async (ref) => {
        try {
          return await ref.get();
        } catch (e) {
          try {
            return await ref.get({ source: 'cache' });
          } catch (e2) {
            throw e;
          }
        }
      };

      // 1. Auth Signup
      if (path === '/auth/signup' && method === 'POST') {
        const inputEmail = (body.email || body.username || '').trim();
        const username = (body.username || '').trim().replace(/^@/, '');
        const email = inputEmail.includes('@') ? inputEmail : `${username}@homeroom.app`;
        const displayName = (body.displayName || username).trim();

        let userCred;
        try {
          userCred = await auth.createUserWithEmailAndPassword(email, body.password);
        } catch (signupErr) {
          return { success: false, message: getFriendlyAuthError(signupErr) };
        }

        const uid = userCred.user.uid;
        
        const userData = {
          id: uid,
          email: email,
          username: username,
          display_name: displayName,
          avatar_emoji: body.avatarEmoji || '🎓',
          avatar_bg: '',
          bio: body.bio || '',
          roll_number: body.rollNumber || '',
          xp: 0,
          coins: 100,
          streak_current: 1,
          streak_longest: 1,
          achievements: [],
          purchased_items: [],
          last_login_date: new Date().toISOString(),
          status: 'approved',
          role: 'member',
          created_at: new Date().toISOString()
        };

        try {
          if (db) {
            await db.collection('users').doc(uid).set(userData);
          }
        } catch (dbErr) {
          console.warn('Could not write user profile to Firestore:', dbErr);
        }

        this.setToken(uid);
        localStorage.setItem('homeroom_uid', uid);
        try { localStorage.setItem('homeroom_cached_user', JSON.stringify(userData)); } catch(e) {}
        return { success: true, message: '🎉 Welcome to Homeroom! Your account has been created successfully.', data: { token: uid, user: userData } };
      }

      // 2. Auth Login (Supports Email OR @username)
      if (path === '/auth/login' && method === 'POST') {
        const input = (body.email || body.username || '').trim();
        let loginEmail = input;

        // If user entered a username instead of an email, look up their email in Firestore
        if (!input.includes('@')) {
          const handle = input.replace(/^@/, '');
          try {
            if (db) {
              const snap = await safeGet(db.collection('users').where('username', '==', handle));
              if (snap && !snap.empty) {
                loginEmail = snap.docs[0].data().email || `${handle}@homeroom.app`;
              } else {
                loginEmail = `${handle}@homeroom.app`;
              }
            } else {
              loginEmail = `${handle}@homeroom.app`;
            }
          } catch (lookupErr) {
            console.warn('Username lookup in Firestore skipped/failed:', lookupErr);
            loginEmail = `${handle}@homeroom.app`;
          }
        }

        let userCred;
        try {
          userCred = await auth.signInWithEmailAndPassword(loginEmail, body.password);
        } catch (loginErr) {
          return { success: false, message: getFriendlyAuthError(loginErr) };
        }

        const uid = userCred.user.uid;
        this.setToken(uid);
        localStorage.setItem('homeroom_uid', uid);

        let userData = {
          id: uid,
          email: userCred.user.email || loginEmail,
          username: input.includes('@') ? input.split('@')[0] : input.replace(/^@/, ''),
          display_name: userCred.user.displayName || (input.includes('@') ? input.split('@')[0] : input.replace(/^@/, '')),
          avatar_emoji: '🎓',
          role: 'member',
          xp: 0,
          coins: 100
        };

        try {
          if (db) {
            const userSnap = await safeGet(db.collection('users').doc(uid));
            if (userSnap && userSnap.exists) {
              userData = { ...userData, ...userSnap.data() };
            } else {
              // Create doc in Firestore if missing
              await db.collection('users').doc(uid).set(userData, { merge: true }).catch(() => {});
            }
          }
        } catch (e) {
          console.warn('User profile fetch after login failed:', e);
        }

        try { localStorage.setItem('homeroom_cached_user', JSON.stringify(userData)); } catch(e) {}
        return { success: true, message: 'Login successful', data: { token: uid, user: userData } };
      }

      // 3. Auth Me
      if (path === '/auth/me' && method === 'GET') {
        const uid = currentUid || (auth && auth.currentUser ? auth.currentUser.uid : null);
        if (!uid) return { success: false, message: 'Not logged in' };
        
        try {
          if (db) {
            const userSnap = await safeGet(db.collection('users').doc(uid));
            if (userSnap && userSnap.exists) {
              const userData = userSnap.data();
              try { localStorage.setItem('homeroom_cached_user', JSON.stringify(userData)); } catch(e) {}
              return { success: true, data: { user: userData } };
            }
          }
        } catch (e) {
          console.warn('Firestore fetch for /auth/me failed:', e);
        }

        // Fallback: If logged into Firebase Auth or token exists, construct user profile from cache or Firebase Auth object
        const cachedUser = localStorage.getItem('homeroom_cached_user');
        if (cachedUser) {
          try {
            return { success: true, data: { user: JSON.parse(cachedUser) } };
          } catch(e) {}
        }

        const fbUser = auth ? auth.currentUser : null;
        const fallbackUser = {
          id: uid,
          email: fbUser ? fbUser.email : 'user@homeroom.app',
          username: fbUser ? (fbUser.displayName || fbUser.email?.split('@')[0] || 'User') : 'User',
          display_name: fbUser ? (fbUser.displayName || 'Homeroom User') : 'Homeroom User',
          avatar_emoji: '🎓',
          role: 'member',
          xp: 0,
          coins: 100
        };

        if (db && uid) {
          try { await db.collection('users').doc(uid).set(fallbackUser, { merge: true }); } catch(e) {}
        }

        try { localStorage.setItem('homeroom_cached_user', JSON.stringify(fallbackUser)); } catch(e) {}
        return { success: true, data: { user: fallbackUser } };
      }

      // 4. Users Profile
      if (path === '/users/me' && method === 'GET') {
        const uid = currentUid || (auth && auth.currentUser ? auth.currentUser.uid : null);
        if (!uid) return { success: false, message: 'Not logged in' };
        
        try {
          if (db) {
            const snap = await safeGet(db.collection('users').doc(uid));
            if (snap && snap.exists) {
              const u = snap.data();
              return { success: true, data: { ...u, user: u } };
            }
          }
        } catch (e) {}

        const cachedUser = localStorage.getItem('homeroom_cached_user');
        if (cachedUser) {
          try {
            const u = JSON.parse(cachedUser);
            return { success: true, data: { ...u, user: u } };
          } catch(e) {}
        }
        
        return { success: false, message: 'User not found' };
      }

      if (path.startsWith('/users/') && method === 'GET') {
        const uid = path.split('/')[2];
        const targetUid = (uid === 'me') ? currentUid : uid;
        const snap = await safeGet(db.collection('users').doc(targetUid));
        if (!snap.exists) return { success: false, message: 'User not found' };
        const u = snap.data();
        return { success: true, data: { ...u, user: u } };
      }

      if (path === '/users/me' && method === 'PUT') {
        if (!currentUid) return { success: false, message: 'Not logged in' };
        await db.collection('users').doc(currentUid).update({
          ...body,
          updated_at: new Date().toISOString()
        });
        const snap = await safeGet(db.collection('users').doc(currentUid));
        const u = snap.data();
        return { success: true, message: 'Profile updated', data: { ...u, user: u } };
      }

      // 5. Conversations
      if (path === '/conversations' && method === 'GET') {
        if (!currentUid) return { success: true, data: [] };
        const snap = await safeGet(db.collection('conversations')
          .where('participant_ids', 'array-contains', currentUid));
        const convs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { success: true, data: convs };
      }

      if (path === '/conversations' && method === 'POST') {
        const newRef = db.collection('conversations').doc();
        const convData = {
          id: newRef.id,
          name: body.name || 'Chat',
          type: body.type || 'dm',
          participant_ids: [currentUid, ...(body.participant_ids || [])],
          created_at: new Date().toISOString(),
          last_message_content: '',
          last_message_time: new Date().toISOString()
        };
        await newRef.set(convData);
        return { success: true, data: convData };
      }

      if (path.includes('/messages') && method === 'GET') {
        const convId = path.split('/')[2];
        const snap = await db.collection('conversations').doc(convId).collection('messages')
          .orderBy('created_at', 'asc')
          .limit(100)
          .get();
        const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return { success: true, data: msgs };
      }

      if (path.includes('/messages') && method === 'POST') {
        const convId = path.split('/')[2];
        const msgRef = db.collection('conversations').doc(convId).collection('messages').doc();
        const msgData = {
          id: msgRef.id,
          conversation_id: convId,
          sender_id: currentUid,
          content: body.content,
          reply_to: body.replyTo || null,
          created_at: new Date().toISOString()
        };
        await msgRef.set(msgData);
        await db.collection('conversations').doc(convId).update({
          last_message_content: body.content,
          last_message_time: new Date().toISOString()
        });
        return { success: true, data: msgData };
      }

      // 6. Notes
      if (path.startsWith('/notes') && method === 'GET') {
        let snap;
        try {
          snap = await db.collection('notes').orderBy('created_at', 'desc').limit(50).get();
        } catch (e) {
          snap = await db.collection('notes').get();
        }
        const notes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return { success: true, data: notes };
      }

      if (path === '/notes' && method === 'POST') {
        const docRef = db.collection('notes').doc();
        let fileUrl = payload.file_url || '';
        
        if (payload.file instanceof File && payload.file.name && Homeroom.firebase && Homeroom.firebase.storage) {
          try {
            const storageRef = Homeroom.firebase.storage.ref().child(`notes/${Date.now()}_${payload.file.name}`);
            await storageRef.put(payload.file);
            fileUrl = await storageRef.getDownloadURL();
          } catch (e) {
            console.warn('Firebase storage note upload warning:', e);
            fileUrl = payload.file.name || '';
          }
        }

        const userSnap = await safeGet(db.collection('users').doc(currentUid)).catch(() => null);
        const authorObj = userSnap && userSnap.exists ? userSnap.data() : { id: currentUid, username: 'User' };

        const noteData = {
          id: docRef.id,
          title: payload.title || 'Untitled Note',
          subject: payload.subject || 'General',
          description: payload.description || '',
          content: payload.content || payload.description || '',
          file_url: fileUrl,
          file_name: payload.file instanceof File ? payload.file.name : (payload.file_name || 'Note Document'),
          tags: Array.isArray(payload.tags) ? payload.tags : [],
          author_id: currentUid,
          author: { id: authorObj.id, username: authorObj.username || 'User', display_name: authorObj.display_name || authorObj.username || 'User', avatar_emoji: authorObj.avatar_emoji || '🎓' },
          rating: 5.0,
          downloads_count: 0,
          created_at: new Date().toISOString()
        };

        await docRef.set(noteData);
        return { success: true, message: 'Note uploaded successfully!', data: noteData };
      }

      // 7. Q&A / Questions
      if ((path.startsWith('/questions') || path.startsWith('/qna')) && method === 'GET') {
        const cleanPath = path.split('?')[0];
        const parts = cleanPath.split('/').filter(Boolean);

        // Fetch single question with answers: GET /questions/:id
        if (parts.length === 2 && parts[1] !== 'questions' && parts[1] !== 'qna') {
          const qId = parts[1];
          const qSnap = await safeGet(db.collection('questions').doc(qId));
          if (!qSnap || !qSnap.exists) return { success: false, message: 'Question not found' };
          
          let answers = [];
          try {
            const ansSnap = await db.collection('questions').doc(qId).collection('answers').orderBy('created_at', 'asc').get();
            answers = ansSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          } catch(e) {
            try {
              const ansSnap = await db.collection('questions').doc(qId).collection('answers').get();
              answers = ansSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch(e2) {}
          }
          return { success: true, data: { ...qSnap.data(), answers } };
        }

        let snap;
        try {
          snap = await db.collection('questions').orderBy('created_at', 'desc').limit(50).get();
        } catch(e) {
          snap = await db.collection('questions').get();
        }
        const questions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return { success: true, data: questions };
      }

      if ((path.startsWith('/questions') || path.startsWith('/qna')) && method === 'POST') {
        const cleanPath = path.split('?')[0];
        const parts = cleanPath.split('/').filter(Boolean);

        // Post answer: POST /questions/:id/answers
        if (parts.length === 3 && parts[2] === 'answers') {
          const qId = parts[1];
          const ansRef = db.collection('questions').doc(qId).collection('answers').doc();
          const userSnap = await safeGet(db.collection('users').doc(currentUid)).catch(() => null);
          const authorObj = userSnap && userSnap.exists ? userSnap.data() : { id: currentUid, username: 'User' };

          const ansData = {
            id: ansRef.id,
            question_id: qId,
            content: payload.content || '',
            author_id: currentUid,
            author: { id: authorObj.id, username: authorObj.username || 'User', display_name: authorObj.display_name || authorObj.username || 'User', avatar_emoji: authorObj.avatar_emoji || '🎓' },
            created_at: new Date().toISOString()
          };
          await ansRef.set(ansData);

          try {
            await db.collection('questions').doc(qId).update({
              answer_count: firebase.firestore.FieldValue.increment(1)
            });
          } catch(e) {}

          return { success: true, message: 'Answer posted!', data: ansData };
        }

        // Post new Question
        const docRef = db.collection('questions').doc();
        const userSnap = await safeGet(db.collection('users').doc(currentUid)).catch(() => null);
        const authorObj = userSnap && userSnap.exists ? userSnap.data() : { id: currentUid, username: 'User' };

        const qData = {
          id: docRef.id,
          title: payload.title || 'Untitled Question',
          subject: payload.subject || 'General',
          content: payload.content || '',
          tags: Array.isArray(payload.tags) ? payload.tags : [],
          author_id: currentUid,
          author: { id: authorObj.id, username: authorObj.username || 'User', display_name: authorObj.display_name || authorObj.username || 'User', avatar_emoji: authorObj.avatar_emoji || '🎓' },
          asked_by_name: authorObj.display_name || authorObj.username || 'User',
          answer_count: 0,
          best_answer_count: 0,
          upvotes: 0,
          created_at: new Date().toISOString()
        };

        await docRef.set(qData);
        return { success: true, message: 'Question posted successfully!', data: qData };
      }

      // 8. Tasks
      if (path.startsWith('/tasks') && method === 'GET') {
        let snap;
        try {
          snap = await db.collection('tasks').get();
        } catch(e) {
          snap = { docs: [] };
        }
        const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return { success: true, data: tasks };
      }

      if (path === '/tasks' && method === 'POST') {
        const docRef = db.collection('tasks').doc();
        const taskData = {
          id: docRef.id,
          title: payload.title || '',
          description: payload.description || '',
          reward_coins: parseInt(payload.rewardCoins || payload.reward_coins) || 10,
          reward_xp: parseInt(payload.rewardXp || payload.reward_xp) || 20,
          completed: false,
          user_id: currentUid,
          created_at: new Date().toISOString()
        };
        await docRef.set(taskData);
        return { success: true, data: taskData };
      }

      if (path.includes('/tasks/') && path.endsWith('/submit') && method === 'POST') {
        const taskId = path.split('/')[2];
        await db.collection('tasks').doc(taskId).collection('submissions').doc(currentUid).set({
          task_id: taskId,
          user_id: currentUid,
          proof: payload.proof || '',
          status: 'pending',
          submitted_at: new Date().toISOString()
        });
        return { success: true, message: 'Proof submitted successfully!' };
      }

      // 9. Leaderboard
      if (path.startsWith('/leaderboard') && method === 'GET') {
        let snap;
        try {
          snap = await db.collection('users').orderBy('xp', 'desc').limit(25).get();
        } catch (e) {
          snap = await db.collection('users').limit(25).get();
        }
        const users = snap.docs.map(d => d.data());
        return { success: true, data: users };
      }

      // 10. Daily Checkin & Spin
      if (path === '/daily/checkin' && method === 'POST') {
        if (!currentUid) return { success: false, message: 'Not logged in' };
        const uRef = db.collection('users').doc(currentUid);
        const uSnap = await uRef.get();
        const uData = uSnap.data() || {};
        const streak = (uData.streak_current || 0) + 1;
        await uRef.update({
          streak_current: streak,
          last_login_date: new Date().toISOString()
        });
        return { success: true, message: 'Checked in successfully!' };
      }

      if (path === '/daily/spin' && method === 'POST') {
        if (!currentUid) return { success: false, message: 'Not logged in' };
        const rewards = [
          { type: 'coins', amount: 50, label: '+50 ClassCoins 🪙' },
          { type: 'xp', amount: 100, label: '+100 XP ⚡' },
          { type: 'nothing', amount: 0, label: 'Nothing 😅' },
          { type: 'coins', amount: 200, label: '+200 ClassCoins 🪙' }
        ];
        const reward = rewards[Math.floor(Math.random() * rewards.length)];
        const uRef = db.collection('users').doc(currentUid);
        const uSnap = await uRef.get();
        const uData = uSnap.data() || {};

        let newCoins = uData.coins || 0;
        let newXp = uData.xp || 0;
        if (reward.type === 'coins') newCoins += reward.amount;
        if (reward.type === 'xp') newXp += reward.amount;

        await uRef.update({
          coins: newCoins,
          xp: newXp,
          last_spin_date: new Date().toISOString()
        });

        return { success: true, data: { reward } };
      }

      // 11. Users Listing
      if (path === '/users' && method === 'GET') {
        let snap;
        try {
          snap = await db.collection('users').limit(100).get();
        } catch(e) {
          snap = { docs: [] };
        }
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return { success: true, data: users };
      }

      // 12. Wallet & Transfer
      if (path === '/wallet' && method === 'GET') {
        if (!currentUid) return { success: false, message: 'Not logged in' };
        const uSnap = await safeGet(db.collection('users').doc(currentUid)).catch(() => null);
        const uData = uSnap && uSnap.exists ? uSnap.data() : {};
        const balance = uData.coins || 100;
        const totalEarned = uData.coins_earned || balance;
        const totalSpent = uData.coins_spent || 0;
        
        let txSnap;
        try {
          txSnap = await db.collection('users').doc(currentUid).collection('transactions').orderBy('created_at', 'desc').limit(20).get();
        } catch(e) {
          try {
            txSnap = await db.collection('users').doc(currentUid).collection('transactions').get();
          } catch(e2) {
            txSnap = { docs: [] };
          }
        }
        const transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (transactions.length === 0) {
          transactions.push({ id: 'tx_init', type: 'earned', amount: 100, reason: 'Welcome Bonus 🎁', created_at: uData.created_at || new Date().toISOString() });
        }
        return { success: true, data: { balance, totalEarned, totalSpent, rank: 1, transactions } };
      }

      if (path === '/wallet/transfer' && method === 'POST') {
        if (!currentUid) return { success: false, message: 'Not logged in' };
        const recipientId = payload.recipientId;
        const amount = parseInt(payload.amount) || 0;
        if (!recipientId || amount <= 0) return { success: false, message: 'Invalid recipient or amount' };

        const senderRef = db.collection('users').doc(currentUid);
        const recipientRef = db.collection('users').doc(recipientId);

        const senderSnap = await senderRef.get();
        const senderData = senderSnap.data() || {};
        if ((senderData.coins || 0) < amount) {
          return { success: false, message: 'Insufficient ClassCoins balance' };
        }

        await senderRef.update({
          coins: firebase.firestore.FieldValue.increment(-amount),
          coins_spent: firebase.firestore.FieldValue.increment(amount)
        });

        await recipientRef.update({
          coins: firebase.firestore.FieldValue.increment(amount),
          coins_earned: firebase.firestore.FieldValue.increment(amount)
        }).catch(() => {});

        const txReason = payload.reason || 'Coins Transfer';
        await senderRef.collection('transactions').doc().set({
          type: 'spent',
          amount: amount,
          reason: `Sent to user: ${txReason}`,
          created_at: new Date().toISOString()
        });

        await recipientRef.collection('transactions').doc().set({
          type: 'earned',
          amount: amount,
          reason: `Received transfer: ${txReason}`,
          created_at: new Date().toISOString()
        }).catch(() => {});

        return { success: true, message: 'Transfer successful!' };
      }

      // 13. Marketplace
      if (path === '/marketplace' && method === 'GET') {
        const catalog = [
          { id: 'theme_neon', name: 'Cyber Neon Theme', type: 'theme', price: 150, icon: '🎨', description: 'Futuristic glowing neon aesthetic for your interface.' },
          { id: 'theme_sunset', name: 'Golden Sunset Theme', type: 'theme', price: 150, icon: '🌅', description: 'Warm amber gradients for cozy study sessions.' },
          { id: 'avatar_crown', name: 'Scholar Crown Avatar', type: 'avatar', price: 200, icon: '👑', description: 'Exclusive crown avatar badge.' },
          { id: 'avatar_dragon', name: 'Dragon Companion', type: 'avatar', price: 300, icon: '🐉', description: 'Legendary dragon avatar icon.' },
          { id: 'title_master', name: 'Class Master Title', type: 'title', price: 250, icon: '🏅', description: 'Show off your dedication with the Class Master title.' }
        ];
        return { success: true, data: catalog };
      }

      if (path.includes('/marketplace/purchase/') && method === 'POST') {
        if (!currentUid) return { success: false, message: 'Not logged in' };
        const itemId = path.split('/')[3];
        const userRef = db.collection('users').doc(currentUid);
        const userSnap = await userRef.get();
        const userData = userSnap.data() || {};
        
        const catalog = { 'theme_neon': 150, 'theme_sunset': 150, 'avatar_crown': 200, 'avatar_dragon': 300, 'title_master': 250 };
        const price = catalog[itemId] || 100;

        if ((userData.coins || 0) < price) {
          return { success: false, message: 'Insufficient ClassCoins for this item' };
        }

        const items = Array.isArray(userData.purchased_items) ? userData.purchased_items : [];
        if (!items.includes(itemId)) items.push(itemId);

        await userRef.update({
          coins: firebase.firestore.FieldValue.increment(-price),
          coins_spent: firebase.firestore.FieldValue.increment(price),
          purchased_items: items
        });

        return { success: true, message: 'Item purchased successfully!' };
      }

      // 14. Daily Status, Announcements, Notifications & Search
      if (path === '/daily/status' && method === 'GET') {
        const uSnap = currentUid ? await safeGet(db.collection('users').doc(currentUid)).catch(() => null) : null;
        const uData = uSnap && uSnap.exists ? uSnap.data() : {};
        return { success: true, data: { checked_in_today: false, can_spin: true, streak: uData.streak_current || 1 } };
      }

      if (path.startsWith('/announcements') && method === 'GET') {
        return {
          success: true,
          data: [
            { id: '1', title: '🎉 Welcome to Homeroom!', content: 'Your digital class portal is live with Q&A, Notes, Tasks, and Market Rewards.', created_at: new Date().toISOString() }
          ]
        };
      }

      if (path.startsWith('/notifications') && method === 'GET') {
        return { success: true, data: [] };
      }

      if (path.startsWith('/notifications/read-all') && method === 'POST') {
        return { success: true, message: 'Notifications marked as read' };
      }

      if (path.startsWith('/search') && method === 'GET') {
        return { success: true, data: { notes: [], questions: [], users: [] } };
      }

      // Fallback empty response
      return { success: true, data: [] };
    } catch (err) {
      console.warn('Firebase error:', err);
      if (err && err.code && err.code.startsWith('auth/')) {
        return { success: false, message: getFriendlyAuthError(err) };
      }
      if (path && path.startsWith('/auth')) {
        return { success: false, message: getFriendlyAuthError(err) };
      }
      if (err && err.message && (err.message.includes('offline') || err.message.includes('unavailable') || err.message.includes('network') || err.message.includes('Failed to get'))) {
        return null;
      }
      return { success: false, message: err.message || 'Database error' };
    }
  },

  async request(method, path, body, isFormData = false) {
    // If Firebase initialized, use Firestore Cloud Database directly
    if (window.firebase && window.firebase.apps && window.firebase.apps.length) {
      const fbResult = await this.firebaseHandler(method, path, body);
      if (fbResult !== null && fbResult !== undefined) {
        if (fbResult.success && path === '/auth/me' && fbResult.data && fbResult.data.user) {
          try { localStorage.setItem('homeroom_cached_user', JSON.stringify(fbResult.data.user)); } catch(e) {}
        }
        return fbResult;
      }
    }
    
    // HTTP Fallback
    const headers = {};
    const curToken = this.getToken();
    if (curToken) headers['Authorization'] = `Bearer ${curToken}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    try {
      const res = await fetch('/api' + path, {
        method,
        headers,
        body: body ? (isFormData ? body : JSON.stringify(body)) : null
      });
      const data = await res.json();
      if (data && data.success && path === '/auth/me' && data.data && data.data.user) {
        try { localStorage.setItem('homeroom_cached_user', JSON.stringify(data.data.user)); } catch(e) {}
      }
      return data;
    } catch(e) {
      // Offline fallback for cached user profile
      if (path === '/auth/me' && curToken) {
        const cachedUser = localStorage.getItem('homeroom_cached_user');
        if (cachedUser) {
          try {
            return { success: true, data: { user: JSON.parse(cachedUser) } };
          } catch(err) {}
        }
      }
      return { success: false, message: 'Network error' };
    }
  },

  get(path) { return this.request('GET', path); },
  post(path, body, isFormData = false) { return this.request('POST', path, body, isFormData); },
  put(path, body, isFormData = false) { return this.request('PUT', path, body, isFormData); },
  delete(path) { return this.request('DELETE', path); },
  upload(path, formData) { return this.request('POST', path, formData, true); }
};
