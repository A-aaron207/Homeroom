window.Homeroom = window.Homeroom || {};

// Firebase configuration (Replace with your Firebase Console credentials if needed)
const firebaseConfig = window.FIREBASE_CONFIG || {
  apiKey: "AIzaSyBlLFFFtIKWjkOtQZJGg79nW3RRzDWQ4-U",
  authDomain: "homeroom-7dde3.firebaseapp.com",
  projectId: "homeroom-7dde3",
  storageBucket: "homeroom-7dde3.firebasestorage.app",
  messagingSenderId: "887765100842",
  appId: "1:887765100842:web:da005d3c53c372fac4d653",
  measurementId: "G-C6HPMFZ1D2"
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
