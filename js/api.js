window.Homeroom = window.Homeroom || {};

Homeroom.API = {
  token: localStorage.getItem('homeroom_token'),
  _authReadyPromise: null,

  // Waits for Firebase Auth to restore the session before proceeding.
  // This prevents the race condition where auth.currentUser is null on cold load.
  waitForAuthReady() {
    if (this._authReadyPromise) return this._authReadyPromise;
    this._authReadyPromise = new Promise((resolve) => {
      const getAuth = () => (Homeroom.firebase && Homeroom.firebase.auth) ? Homeroom.firebase.auth : (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null);
      const auth = getAuth();
      if (auth) {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user ? user.uid : null);
        });
        return;
      }

      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const dynamicAuth = getAuth();
        if (dynamicAuth) {
          clearInterval(interval);
          const unsubscribe = dynamicAuth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user ? user.uid : null);
          });
        } else if (attempts >= 15) {
          clearInterval(interval);
          resolve(null);
        }
      }, 100);
    });
    return this._authReadyPromise;
  },

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
    this._authReadyPromise = null; // Reset so next login re-runs auth state check
    localStorage.removeItem('homeroom_token');
    localStorage.removeItem('homeroom_uid');
    try { if (Homeroom.firebase && Homeroom.firebase.auth) Homeroom.firebase.auth.signOut(); } catch(e) {}
  },

  // Firebase Firestore / Auth Adapter
  async firebaseHandler(method, path, body) {
    const db = Homeroom.firebase ? Homeroom.firebase.db : null;
    const auth = Homeroom.firebase ? Homeroom.firebase.auth : null;

    // Wait for Firebase Auth to fully restore the session.
    // This resolves the race condition where auth.currentUser is null on cold load.
    const uidFromAuth = await this.waitForAuthReady();
    const currentUid = uidFromAuth || localStorage.getItem('homeroom_uid') || localStorage.getItem('homeroom_token');

    // Keep localStorage in sync with the resolved Firebase UID
    if (uidFromAuth && uidFromAuth !== localStorage.getItem('homeroom_uid')) {
      localStorage.setItem('homeroom_uid', uidFromAuth);
      localStorage.setItem('homeroom_token', uidFromAuth);
      this.token = uidFromAuth;
    }

    // === DIAGNOSTIC LOGGING — visible in browser DevTools (F12 → Console) ===
    console.group(`%c[Homeroom API] ${method} ${path}`, 'color: #6366f1; font-weight: bold;');
    console.log('UID (from Firebase Auth):', uidFromAuth || '⚠️ NULL — not authenticated!');
    console.log('UID (final used):', currentUid || '⚠️ NULL — no fallback either!');
    console.log('Firestore db:', db ? '✅ Connected' : '❌ NULL — Firebase not initialized!');
    console.log('Firebase Auth currentUser:', auth?.currentUser?.uid || '⚠️ null (may still be loading)');
    if (!currentUid) {
      console.error('[Homeroom] CRITICAL: currentUid is null. Data written without a valid user ID will not sync across devices!');
    }
    console.groupEnd();
    // === END DIAGNOSTIC LOGGING ===

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

    try {

      // Safe Firestore get with graceful network & offline fallbacks
      const safeGet = async (ref) => {
        if (!ref) return { exists: false, data: () => ({}), docs: [] };
        try {
          return await ref.get();
        } catch (serverErr) {
          console.warn('Firestore safeGet fallback:', serverErr);
          try {
            return await ref.get({ source: 'cache' });
          } catch (cacheErr) {
            return { exists: false, data: () => ({}), docs: [] };
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
        const snap = await safeGet(db.collection('conversations').doc(convId).collection('messages').orderBy('created_at', 'asc').limit(100));
        const msgs = (snap && snap.docs) ? snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
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

      // 6. Notes — Bookmarked List
      if (path === '/notes/bookmarked' && method === 'GET') {
        if (!currentUid) return { success: true, data: [] };
        let bookmarkedIds = [];
        try {
          const bmSnap = await safeGet(db.collection('users').doc(currentUid).collection('bookmarks'));
          bookmarkedIds = (bmSnap && bmSnap.docs) ? bmSnap.docs.map(d => d.id) : [];
        } catch(e) {}
        if (!bookmarkedIds.length) return { success: true, data: [] };
        // Firestore doesn't support 'in' with >10 items but notes are manageable
        const chunks = [];
        for (let i = 0; i < bookmarkedIds.length; i += 10) chunks.push(bookmarkedIds.slice(i, i+10));
        let notes = [];
        for (const chunk of chunks) {
          const snap = await safeGet(db.collection('notes').where(firebase.firestore.FieldPath.documentId(), 'in', chunk));
          if (snap && snap.docs) {
            notes = notes.concat(snap.docs.map(d => ({ id: d.id, ...d.data(), is_bookmarked: true })));
          }
        }
        return { success: true, data: notes };
      }

      // 6. Notes — General List (with optional subject/search/sort filters)
      if (path.startsWith('/notes') && method === 'GET') {
        const urlParams = new URLSearchParams(path.includes('?') ? path.split('?')[1] : '');
        const subject = urlParams.get('subject');
        const search = urlParams.get('search')?.toLowerCase();
        let snap;
        try {
          let query = db.collection('notes');
          if (subject) query = query.where('subject', '==', subject);
          query = query.orderBy('created_at', 'desc').limit(50);
          snap = await safeGet(query);
        } catch (e) {
          snap = await safeGet(db.collection('notes').limit(50));
        }
        let notes = (snap && snap.docs) ? snap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
        if (search) {
          notes = notes.filter(n =>
            (n.title || '').toLowerCase().includes(search) ||
            (n.description || '').toLowerCase().includes(search) ||
            (Array.isArray(n.tags) ? n.tags.join(' ') : '').toLowerCase().includes(search)
          );
        }
        // Attach bookmark status if user logged in
        if (currentUid) {
          try {
            const bmSnap = await safeGet(db.collection('users').doc(currentUid).collection('bookmarks'));
            const bookmarked = new Set((bmSnap && bmSnap.docs) ? bmSnap.docs.map(d => d.id) : []);
            notes = notes.map(n => ({ ...n, is_bookmarked: bookmarked.has(n.id) }));
          } catch(e) {}
        }
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

      // Note Rating: POST /notes/:id/rate
      if (path.match(/^\/notes\/[^/]+\/rate$/) && method === 'POST') {
        const noteId = path.split('/')[2];
        const rating = parseInt(payload.rating) || 5;
        const noteRef = db.collection('notes').doc(noteId);
        await noteRef.update({
          rating_sum: firebase.firestore.FieldValue.increment(rating),
          rating_count: firebase.firestore.FieldValue.increment(1)
        });
        return { success: true, message: 'Rating submitted!' };
      }

      // Note Comments: POST /notes/:id/comment
      if (path.match(/^\/notes\/[^/]+\/comment$/) && method === 'POST') {
        if (!currentUid) return { success: false, message: 'Not logged in' };
        const noteId = path.split('/')[2];
        const userSnap = await safeGet(db.collection('users').doc(currentUid)).catch(() => null);
        const authorObj = userSnap && userSnap.exists ? userSnap.data() : { id: currentUid, username: 'User' };
        const commentRef = db.collection('notes').doc(noteId).collection('comments').doc();
        const commentData = {
          id: commentRef.id,
          content: payload.content || '',
          user_id: currentUid,
          user_name: authorObj.display_name || authorObj.username || 'User',
          avatar_emoji: authorObj.avatar_emoji || '🎓',
          created_at: new Date().toISOString()
        };
        await commentRef.set(commentData);
        return { success: true, message: 'Comment posted!', data: commentData };
      }

      // Note GET with comments: GET /notes/:id
      if (path.match(/^\/notes\/[^/]+$/) && method === 'GET') {
        const noteId = path.split('/')[2];
        const noteSnap = await safeGet(db.collection('notes').doc(noteId)).catch(() => null);
        if (!noteSnap || !noteSnap.exists) return { success: false, message: 'Note not found' };
        let comments = [];
        try {
          const commentsSnap = await safeGet(db.collection('notes').doc(noteId).collection('comments').orderBy('created_at', 'asc'));
          comments = (commentsSnap && commentsSnap.docs) ? commentsSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
        } catch(e) {}
        return { success: true, data: { ...noteSnap.data(), comments } };
      }

      // Note Bookmark Toggle: POST /notes/:id/bookmark
      if (path.match(/^\/notes\/[^/]+\/bookmark$/) && method === 'POST') {
        if (!currentUid) return { success: false, message: 'Not logged in' };
        const noteId = path.split('/')[2];
        const bmRef = db.collection('users').doc(currentUid).collection('bookmarks').doc(noteId);
        const bmSnap = await safeGet(bmRef);
        if (bmSnap && bmSnap.exists) {
          await bmRef.delete();
          return { success: true, bookmarked: false, message: 'Bookmark removed' };
        } else {
          await bmRef.set({ note_id: noteId, bookmarked_at: new Date().toISOString() });
          return { success: true, bookmarked: true, message: 'Note bookmarked!' };
        }
      }

      // Message Reactions: POST /conversations/:convId/messages/:msgId/react
      if (path.match(/^\/conversations\/[^/]+\/messages\/[^/]+\/react$/) && method === 'POST') {
        const parts = path.split('/');
        const convId = parts[2], msgId = parts[4];
        const emoji = payload.emoji || '👍';
        const msgRef = db.collection('conversations').doc(convId).collection('messages').doc(msgId);
        const key = `reactions.${currentUid}`;
        await msgRef.update({ [key]: emoji }).catch(() => {});
        return { success: true };
      }

      // Message Delete: DELETE /conversations/:convId/messages/:msgId
      if (path.match(/^\/conversations\/[^/]+\/messages\/[^/]+$/) && method === 'DELETE') {
        const parts = path.split('/');
        const convId = parts[2], msgId = parts[4];
        await db.collection('conversations').doc(convId).collection('messages').doc(msgId)
          .update({ content: '🗑️ Message deleted', deleted: true, deleted_at: new Date().toISOString() })
          .catch(() => {});
        return { success: true };
      }

      // Conversation Read/Delivered: POST /conversations/:id/read or /delivered
      if (path.match(/^\/conversations\/[^/]+\/(read|delivered)$/) && method === 'POST') {
        // Lightweight receipt — stored on the user's read-state subcollection
        const convId = path.split('/')[2];
        if (currentUid) {
          await db.collection('conversations').doc(convId)
            .collection('receipts').doc(currentUid)
            .set({ last_read: new Date().toISOString() }, { merge: true })
            .catch(() => {});
        }
        return { success: true };
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
            const ansSnap = await safeGet(db.collection('questions').doc(qId).collection('answers').orderBy('created_at', 'asc'));
            answers = (ansSnap && ansSnap.docs) ? ansSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
          } catch(e) {
            try {
              const ansSnap = await safeGet(db.collection('questions').doc(qId).collection('answers'));
              answers = (ansSnap && ansSnap.docs) ? ansSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
            } catch(e2) {}
          }
          return { success: true, data: { ...qSnap.data(), answers } };
        }

        let snap;
        try {
          snap = await safeGet(db.collection('questions').orderBy('created_at', 'desc').limit(50));
        } catch(e) {
          snap = await safeGet(db.collection('questions'));
        }
        const questions = (snap && snap.docs) ? snap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
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

      // 8. Tasks (Auto-seed if empty)
      if (path.startsWith('/tasks') && method === 'GET') {
        let tasks = [];
        try {
          const snap = await safeGet(db.collection('tasks'));
          tasks = (snap && snap.docs) ? snap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
        } catch(e) {
          tasks = [];
        }

        if (tasks.length === 0 && db) {
          const defaultTasks = [
            {
              id: 'task_welcome',
              title: '🎓 Complete Your Profile',
              description: 'Update your display name, roll number, and bio in Settings to get recognized by classmates.',
              reward_coins: 50,
              reward_xp: 100,
              created_at: new Date().toISOString()
            },
            {
              id: 'task_note',
              title: '📚 Share Class Study Notes',
              description: 'Upload a PDF or image of your subject notes to help classmates in the Notes section.',
              reward_coins: 40,
              reward_xp: 80,
              created_at: new Date().toISOString()
            },
            {
              id: 'task_qna',
              title: '❓ Answer a Classmate Doubt',
              description: 'Head over to the Q&A Forum and provide a helpful answer to any student doubt.',
              reward_coins: 30,
              reward_xp: 60,
              created_at: new Date().toISOString()
            },
            {
              id: 'task_streak',
              title: '🔥 Build a 3-Day Study Streak',
              description: 'Log in and check in for 3 consecutive days to build your study habit.',
              reward_coins: 60,
              reward_xp: 120,
              created_at: new Date().toISOString()
            }
          ];

          for (const t of defaultTasks) {
            await db.collection('tasks').doc(t.id).set(t, { merge: true }).catch(() => {});
          }
          tasks = defaultTasks;
        }

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
          snap = await safeGet(db.collection('users').orderBy('xp', 'desc').limit(25));
        } catch (e) {
          snap = await safeGet(db.collection('users').limit(25));
        }
        const users = (snap && snap.docs) ? snap.docs.map(d => d.data()) : [];
        return { success: true, data: users };
      }

      // 10. Daily Checkin & Spin (Real Date-based streak calculation)
      if (path === '/daily/checkin' && method === 'POST') {
        if (!currentUid) return { success: false, message: 'Not logged in' };
        const uRef = db.collection('users').doc(currentUid);
        const uSnap = await safeGet(uRef);
        const uData = (uSnap && typeof uSnap.data === 'function') ? uSnap.data() || {} : {};

        const getLocalDateStr = (d) => {
          const date = d ? new Date(d) : new Date();
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };

        const todayStr = getLocalDateStr(new Date());
        const lastCheckinStr = uData.last_checkin_date ? getLocalDateStr(uData.last_checkin_date) : null;

        if (lastCheckinStr === todayStr) {
          return { success: false, message: '📅 You have already checked in today! Come back tomorrow.' };
        }

        let newStreak = 1;
        if (lastCheckinStr) {
          const d1 = new Date(lastCheckinStr + 'T00:00:00Z');
          const d2 = new Date(todayStr + 'T00:00:00Z');
          const diffDays = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            newStreak = (uData.streak_current || 0) + 1;
          } else if (diffDays > 1) {
            newStreak = 1;
          }
        }

        const rewardCoins = 20 + Math.min(newStreak * 5, 50);
        const rewardXp = 40 + Math.min(newStreak * 10, 100);

        await uRef.update({
          streak_current: newStreak,
          streak_longest: Math.max(newStreak, uData.streak_longest || 1),
          coins: firebase.firestore.FieldValue.increment(rewardCoins),
          coins_earned: firebase.firestore.FieldValue.increment(rewardCoins),
          xp: firebase.firestore.FieldValue.increment(rewardXp),
          last_checkin_date: new Date().toISOString()
        });

        return {
          success: true,
          message: `✅ Checked in! Day ${newStreak} Streak (+${rewardCoins} CC, +${rewardXp} XP)`,
          data: { streak: newStreak, rewardCoins, rewardXp }
        };
      }

      if (path === '/daily/spin' && method === 'POST') {
        if (!currentUid) return { success: false, message: 'Not logged in' };
        const uRef = db.collection('users').doc(currentUid);
        const uSnap = await safeGet(uRef);
        const uData = (uSnap && typeof uSnap.data === 'function') ? uSnap.data() || {} : {};

        const getLocalDateStr = (d) => {
          const date = d ? new Date(d) : new Date();
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };

        const todayStr = getLocalDateStr(new Date());
        const lastSpinStr = uData.last_spin_date ? getLocalDateStr(uData.last_spin_date) : null;

        if (lastSpinStr === todayStr) {
          return { success: false, message: '🎡 You have already spun the wheel today! Come back tomorrow.' };
        }

        const rewards = [
          { type: 'coins', amount: 50, label: '+50 ClassCoins 🪙' },
          { type: 'xp', amount: 100, label: '+100 XP ⚡' },
          { type: 'nothing', amount: 0, label: 'Nothing 😅' },
          { type: 'coins', amount: 200, label: '+200 ClassCoins 🪙' }
        ];
        const reward = rewards[Math.floor(Math.random() * rewards.length)];

        let newCoins = uData.coins || 0;
        let newXp = uData.xp || 0;
        if (reward.type === 'coins') newCoins += reward.amount;
        if (reward.type === 'xp') newXp += reward.amount;

        await uRef.update({
          coins: newCoins,
          coins_earned: firebase.firestore.FieldValue.increment(reward.type === 'coins' ? reward.amount : 0),
          xp: newXp,
          last_spin_date: new Date().toISOString()
        });

        return {
          success: true,
          data: {
            reward,
            reward_type: reward.type,
            reward_amount: reward.amount,
            reward_label: reward.label
          }
        };
      }

      // 11. Users Listing
      if (path === '/users' && method === 'GET') {
        let snap;
        try {
          snap = await safeGet(db.collection('users').limit(100));
        } catch(e) {
          snap = { docs: [] };
        }
        const users = (snap && snap.docs) ? snap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
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
          txSnap = await safeGet(db.collection('users').doc(currentUid).collection('transactions').orderBy('created_at', 'desc').limit(20));
        } catch(e) {
          try {
            txSnap = await safeGet(db.collection('users').doc(currentUid).collection('transactions'));
          } catch(e2) {
            txSnap = { docs: [] };
          }
        }
        const transactions = (txSnap && txSnap.docs) ? txSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
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

        const senderSnap = await safeGet(senderRef);
        const senderData = (senderSnap && typeof senderSnap.data === 'function') ? senderSnap.data() || {} : {};
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
        const userSnap = await safeGet(userRef);
        const userData = (userSnap && typeof userSnap.data === 'function') ? userSnap.data() || {} : {};
        
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
        
        const getLocalDateStr = (d) => {
          const date = d ? new Date(d) : new Date();
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };

        const todayStr = getLocalDateStr(new Date());
        const lastCheckinStr = uData.last_checkin_date ? getLocalDateStr(uData.last_checkin_date) : null;
        const lastSpinStr = uData.last_spin_date ? getLocalDateStr(uData.last_spin_date) : null;

        const checkedInToday = (lastCheckinStr === todayStr);
        const canSpin = (lastSpinStr !== todayStr);
        const currentStreak = uData.streak_current || 1;

        return {
          success: true,
          data: {
            todayCheckedIn: checkedInToday,
            checked_in_today: checkedInToday,
            canSpin: canSpin,
            can_spin: canSpin,
            streak: { current: currentStreak, longest: uData.streak_longest || currentStreak },
            streak_current: currentStreak
          }
        };
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
      if (err && err.message && (err.message.includes('offline') || err.message.includes('unavailable') || err.message.includes('network') || err.message.includes('Failed to get') || err.message.includes('fetch'))) {
        if (method === 'GET') {
          return { success: true, data: [] };
        }
        return { success: false, message: 'Firebase connection error. Please verify network and authorized domains in Firebase Console.' };
      }
      return { success: false, message: err.message || 'Database error' };
    }
  },

  async request(method, path, body, isFormData = false) {
    // Architecture: Render (app hosting) + GitHub (source) + Firebase (database).
    // All data operations go directly to Firebase Firestore via client-side SDK.
    const isFbReady = () => (window.firebase && window.firebase.apps && window.firebase.apps.length) || (Homeroom.firebase && Homeroom.firebase.db);
    
    if (!isFbReady() && this.waitForAuthReady) {
      await this.waitForAuthReady();
    }

    if (isFbReady()) {
      const fbResult = await this.firebaseHandler(method, path, body);
      if (fbResult !== null && fbResult !== undefined) {
        if (fbResult.success && path === '/auth/me' && fbResult.data && fbResult.data.user) {
          try { localStorage.setItem('homeroom_cached_user', JSON.stringify(fbResult.data.user)); } catch(e) {}
        }
        return fbResult;
      }
    }

    // Firebase unavailable — serve from localStorage cache (offline mode)
    console.warn('[Homeroom] Firebase unavailable for', method, path, '— serving from local cache.');
    if (path === '/auth/me') {
      const cachedUser = localStorage.getItem('homeroom_cached_user');
      if (cachedUser) {
        try { return { success: true, data: { user: JSON.parse(cachedUser) } }; } catch(e) {}
      }
    }
    if (method === 'GET') {
      return { success: true, data: [] };
    }
    return { success: false, message: 'Firebase is not available. Please check your internet connection or domain authorization in Firebase Console.' };
  },


  get(path) { return this.request('GET', path); },
  post(path, body, isFormData = false) { return this.request('POST', path, body, isFormData); },
  put(path, body, isFormData = false) { return this.request('PUT', path, body, isFormData); },
  delete(path) { return this.request('DELETE', path); },
  upload(path, formData) { return this.request('POST', path, formData, true); }
};
