window.Homeroom = window.Homeroom || {};

// Firebase configuration (Replace with your Firebase Console credentials if needed)
const firebaseConfig = window.FIREBASE_CONFIG || {
  apiKey: "AIzaSyDemoKeyHomeroomApp2026Firebase",
  authDomain: "homeroom-app.firebaseapp.com",
  projectId: "homeroom-app",
  storageBucket: "homeroom-app.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

Homeroom.firebase = {
  auth: firebase.auth(),
  db: firebase.firestore(),
  storage: firebase.storage()
};

// Enable Firestore persistence for offline support
try {
  Homeroom.firebase.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
} catch (e) {}
