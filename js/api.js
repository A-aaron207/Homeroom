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
    const currentUid = currentUser ? currentUser.uid : localStorage.getItem('homeroom_uid');

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

        if (db) {
          try {
            await db.collection('users').doc(uid).set(userData);
          } catch (dbErr) {
            console.warn('Could not write user profile to Firestore:', dbErr);
          }
        }

        this.setToken(uid);
        localStorage.setItem('homeroom_uid', uid);
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

        let userData = { id: uid, email: loginEmail, username: input };
        try {
          if (db) {
            const userSnap = await safeGet(db.collection('users').doc(uid));
            if (userSnap && userSnap.exists) {
              userData = userSnap.data();
            }
          }
        } catch (e) {
          console.warn('User profile fetch after login failed:', e);
        }

        return { success: true, message: 'Login successful', data: { token: uid, user: userData } };
      }

      // 3. Auth Me
      if (path === '/auth/me' && method === 'GET') {
        if (!currentUid) return { success: false, message: 'Not logged in' };
        const userSnap = await safeGet(db.collection('users').doc(currentUid));
        if (!userSnap.exists) return { success: false, message: 'User not found' };
        const userData = userSnap.data();
        return { success: true, data: { user: userData } };
      }

      // 4. Users Profile
      if (path === '/users/me' && method === 'GET') {
        if (!currentUid) return { success: false, message: 'Not logged in' };
        const snap = await safeGet(db.collection('users').doc(currentUid));
        const u = snap.data();
        return { success: true, data: { ...u, user: u } };
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
        const snap = await db.collection('notes').orderBy('created_at', 'desc').limit(50).get();
        const notes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return { success: true, data: notes };
      }

      if (path === '/notes' && method === 'POST') {
        const docRef = db.collection('notes').doc();
        const noteData = {
          id: docRef.id,
          title: body.title || 'Untitled Note',
          subject: body.subject || 'General',
          content: body.content || '',
          file_url: body.file_url || '',
          author_id: currentUid,
          created_at: new Date().toISOString()
        };
        await docRef.set(noteData);
        return { success: true, data: noteData };
      }

      // 7. Q&A
      if (path.startsWith('/qna') && method === 'GET') {
        const snap = await db.collection('questions').orderBy('created_at', 'desc').limit(50).get();
        const questions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return { success: true, data: questions };
      }

      if (path === '/qna' && method === 'POST') {
        const docRef = db.collection('questions').doc();
        const qData = {
          id: docRef.id,
          title: body.title || '',
          subject: body.subject || 'General',
          content: body.content || '',
          author_id: currentUid,
          answer_count: 0,
          created_at: new Date().toISOString()
        };
        await docRef.set(qData);
        return { success: true, data: qData };
      }

      // 8. Tasks
      if (path.startsWith('/tasks') && method === 'GET') {
        if (!currentUid) return { success: true, data: [] };
        const snap = await db.collection('tasks').where('user_id', '==', currentUid).get();
        const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return { success: true, data: tasks };
      }

      if (path === '/tasks' && method === 'POST') {
        const docRef = db.collection('tasks').doc();
        const taskData = {
          id: docRef.id,
          title: body.title || '',
          completed: false,
          user_id: currentUid,
          created_at: new Date().toISOString()
        };
        await docRef.set(taskData);
        return { success: true, data: taskData };
      }

      // 9. Leaderboard
      if (path.startsWith('/leaderboard') && method === 'GET') {
        const snap = await db.collection('users').orderBy('xp', 'desc').limit(25).get();
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
