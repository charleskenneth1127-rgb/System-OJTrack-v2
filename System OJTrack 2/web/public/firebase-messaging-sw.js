/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Service workers can't read Vite's import.meta.env, so this config is
// duplicated from web/src/firebase.ts. If you set real VITE_FIREBASE_* values
// in .env for production, update these values to match.
firebase.initializeApp({
  apiKey: 'demo-api-key',
  authDomain: 'demo-ojtrack.firebaseapp.com',
  projectId: 'demo-ojtrack',
  storageBucket: 'demo-ojtrack.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:demo',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'OJTrack', { body });
});
