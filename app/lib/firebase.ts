import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getDatabase, onValue, ref, type Database } from 'firebase/database';

// Web config for the nexplay-948af project. These values are public by design: they identify the
// project to Firebase, and access is controlled by Authentication and the database rules.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyA7qjvGQD_cKLH773qIBhIV0sH16E4VDbs',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'nexplay-948af.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? 'https://nexplay-948af-default-rtdb.firebaseio.com',
  projectId: 'nexplay-948af',
  storageBucket: 'nexplay-948af.firebasestorage.app',
  messagingSenderId: '723598973274',
  appId: '1:723598973274:web:aa228253c4a5b0733bbb63'
};

export const DATABASE_URL = config.databaseURL;

let app: FirebaseApp | null = null;
let offset = 0;
let offsetBound = false;

function firebaseApp(): FirebaseApp {
  if (typeof window === 'undefined') throw new Error('Firebase is only available in the browser.');
  app ??= getApps()[0] ?? initializeApp(config);
  return app;
}

export function db(): Database {
  const database = getDatabase(firebaseApp());
  if (!offsetBound) {
    offsetBound = true;
    onValue(ref(database, '.info/serverTimeOffset'), (snap) => {
      offset = Number(snap.val()) || 0;
    });
  }
  return database;
}

export function auth(): Auth {
  return getAuth(firebaseApp());
}

/** Current time on the Firebase server, so every player's timers agree. */
export function serverNow(): number {
  return Date.now() + offset;
}
