import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase, onValue, ref, type Database } from 'firebase/database';
import { SITE } from './seo';

// Web config for the nexplay-948af project. These values are public by design: they identify the
// project to Firebase, and access is controlled by Authentication and the database rules.
// On the live site, sign in pages are served from the site's own domain (vercel.json passes /__/auth
// through to Firebase). Browsers that block third party storage need this for Google sign in.
const LIVE_HOST = new URL(SITE).host;
const onLiveSite = typeof window !== 'undefined' && window.location.host === LIVE_HOST;

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyA7qjvGQD_cKLH773qIBhIV0sH16E4VDbs',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? (onLiveSite ? LIVE_HOST : 'nexplay-948af.firebaseapp.com'),
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? 'https://nexplay-948af-default-rtdb.firebaseio.com',
  projectId: 'nexplay-948af',
  storageBucket: 'nexplay-948af.firebasestorage.app',
  messagingSenderId: '723598973274',
  appId: '1:723598973274:web:aa228253c4a5b0733bbb63'
};

export const DATABASE_URL = config.databaseURL;

/** Set VITE_USE_EMULATORS=1 to run against the local Firebase emulators instead of the live project. */
const EMULATORS = import.meta.env.VITE_USE_EMULATORS === '1';

let app: FirebaseApp | null = null;
let offset = 0;
let offsetBound = false;
let dbWired = false;
let authWired = false;

function firebaseApp(): FirebaseApp {
  if (typeof window === 'undefined') throw new Error('Firebase is only available in the browser.');
  app ??= getApps()[0] ?? initializeApp(config);
  return app;
}

export function db(): Database {
  const database = getDatabase(firebaseApp());
  if (EMULATORS && !dbWired) {
    dbWired = true;
    connectDatabaseEmulator(database, '127.0.0.1', 9000);
  }
  if (!offsetBound) {
    offsetBound = true;
    onValue(ref(database, '.info/serverTimeOffset'), (snap) => {
      offset = Number(snap.val()) || 0;
    });
  }
  return database;
}

export function auth(): Auth {
  const a = getAuth(firebaseApp());
  if (EMULATORS && !authWired) {
    authWired = true;
    connectAuthEmulator(a, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return a;
}

/** Current time on the Firebase server, so every player's timers agree. */
export function serverNow(): number {
  return Date.now() + offset;
}
