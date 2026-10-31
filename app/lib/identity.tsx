import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';

export interface Identity {
  ready: boolean;
  uid: string | null;
  name: string;
  avatar: string;
  isGuest: boolean;
  email: string | null;
  error: string | null;
  /** Why the last Google sign in did not work, if it did not. */
  googleError: string | null;
  setName(name: string): void;
  setAvatar(colour: string): void;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
}

const NAME_KEY = 'np-name';
const AVATAR_KEY = 'np-avatar';
export const AVATARS = ['#ff9a62', '#7ab8ff', '#c48bff', '#ffd98c', '#9be8d9', '#ff7a8a', '#b4e07a', '#f2b7a9'];

const ADJ = ['Swift', 'Lucky', 'Bold', 'Calm', 'Sharp', 'Bright', 'Cool', 'Brave', 'Quick', 'Clever'];
const NOUN = ['Eagle', 'Falcon', 'Lion', 'Leopard', 'Kite', 'Heron', 'Panther', 'Cobra', 'Owl', 'Buffalo'];
const randomName = () => `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${NOUN[Math.floor(Math.random() * NOUN.length)]}`;

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
};

const GOOGLE_FAILED = 'Google sign in did not work. Try again.';
const googleMessage = (code: string) =>
  code.includes('unauthorized-domain')
    ? 'Google sign in is not set up for this web address yet.'
    : code.includes('operation-not-allowed')
      ? 'Google sign in is switched off for this project.'
      : code.includes('network')
        ? 'Could not reach Google. Check your internet and try again.'
        : GOOGLE_FAILED;

export const cleanName = (name: string) => name.replace(/[^\p{L}\p{N} .'_-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 18);

const IdentityContext = createContext<Identity | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Linking Google to a guest changes the same user object, so bump this to refresh what the app shows.
  const [rev, setRev] = useState(0);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setNameState] = useState('');
  const [avatar, setAvatarState] = useState(AVATARS[0]);

  useEffect(() => {
    let stored = read(NAME_KEY);
    if (!stored) {
      stored = randomName();
      write(NAME_KEY, stored);
    }
    setNameState(stored);
    let colour = read(AVATAR_KEY);
    if (!colour) {
      colour = AVATARS[Math.floor(Math.random() * AVATARS.length)];
      write(AVATAR_KEY, colour);
    }
    setAvatarState(colour);

    let unsub = () => {};
    (async () => {
      const [{ auth }, fa] = await Promise.all([import('./firebase'), import('firebase/auth')]);
      const { onIdTokenChanged, signInAnonymously } = fa;
      const a = auth();
      // onIdTokenChanged also fires when Google is linked to a guest, which onAuthStateChanged does not.
      unsub = onIdTokenChanged(a, async (u) => {
        if (u) {
          setUser(u);
          setRev((r) => r + 1);
          if (!u.isAnonymous) setGoogleError(null);
          if (!u.isAnonymous && u.displayName && read(NAME_KEY) === stored && !read('np-name-set')) {
            const n = cleanName(u.displayName.split(' ')[0]);
            setNameState(n);
            write(NAME_KEY, n);
          }
          setReady(true);
          return;
        }
        try {
          await signInAnonymously(a);
        } catch (e) {
          setError(
            e instanceof Error && /admin-restricted|operation-not-allowed/.test(e.message)
              ? 'Guest sign in is switched off for this project. Turn on Anonymous sign in in Firebase.'
              : 'Could not connect. Check your internet and refresh.'
          );
          setReady(true);
        }
      });
    })();
    return () => unsub();
  }, []);

  const setName = useCallback((n: string) => {
    const clean = cleanName(n);
    if (!clean) return;
    setNameState(clean);
    write(NAME_KEY, clean);
    write('np-name-set', '1');
  }, []);

  const setAvatar = useCallback((c: string) => {
    if (!AVATARS.includes(c)) return;
    setAvatarState(c);
    write(AVATAR_KEY, c);
  }, []);

  // The Google window opens as a popup. Some browsers (Edge, Chrome) hide that window from the page, so
  // Firebase can wrongly report it closed after about ten seconds while the player is still signing in.
  // So a "closed" report is never shown as an error: onIdTokenChanged above picks up the sign in
  // whenever it actually lands.
  const signInWithGoogle = useCallback(async () => {
    setGoogleError(null);
    const [{ auth }, fa] = await Promise.all([import('./firebase'), import('firebase/auth')]);
    const a = auth();
    const provider = new fa.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      // Linking keeps the guest account's uid, so stats carry over.
      if (a.currentUser?.isAnonymous) await fa.linkWithPopup(a.currentUser, provider);
      else await fa.signInWithPopup(a, provider);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
        // That Google account already plays NexPlay: switch to it, without a second popup.
        const cred = fa.GoogleAuthProvider.credentialFromError(e as Parameters<typeof fa.GoogleAuthProvider.credentialFromError>[0]);
        if (cred) await fa.signInWithCredential(a, cred).catch(() => setGoogleError(GOOGLE_FAILED));
        else setGoogleError(GOOGLE_FAILED);
      } else if (code === 'auth/provider-already-linked') {
        await a.currentUser?.reload().catch(() => {});
        setRev((r) => r + 1);
      } else if (code === 'auth/popup-blocked') {
        setGoogleError('Your browser blocked the Google window. Allow pop ups for this site and try again.');
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setGoogleError(googleMessage(code));
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    const [{ auth }, fa] = await Promise.all([import('./firebase'), import('firebase/auth')]);
    await fa.signOut(auth());
  }, []);

  const value = useMemo<Identity>(
    () => ({
      ready,
      uid: user?.uid ?? null,
      name,
      avatar,
      isGuest: !user || user.isAnonymous,
      email: user?.email ?? null,
      error,
      googleError,
      setName,
      setAvatar,
      signInWithGoogle,
      signOut
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, user, rev, name, avatar, error, googleError, setName, setAvatar, signInWithGoogle, signOut]
  );

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}

export function useIdentity(): Identity {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error('useIdentity must be used inside IdentityProvider');
  return ctx;
}
