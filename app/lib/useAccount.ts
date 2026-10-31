import { useCallback, useEffect, useState } from 'react';

export interface Account {
  name: string;
  avatar: string;
  email: string | null;
}

const local = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * For the public pages: is someone signed in with Google on this browser? It only reads the sign in
 * saved in the browser (no database reads, no guest account), and waits until the page is idle.
 */
export function useAccount() {
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    let live = true;
    let off = () => {};
    const start = async () => {
      const [{ auth }, fa] = await Promise.all([import('./firebase'), import('firebase/auth')]);
      if (!live) return;
      off = fa.onAuthStateChanged(auth(), (u) => {
        setAccount(
          u && !u.isAnonymous
            ? { name: local('np-name') || u.displayName?.split(' ')[0] || 'Player', avatar: local('np-avatar') || '#9be8d9', email: u.email }
            : null
        );
      });
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => void start());
    else setTimeout(() => void start(), 1200);
    return () => {
      live = false;
      off();
    };
  }, []);

  const signOut = useCallback(async () => {
    const [{ auth }, fa] = await Promise.all([import('./firebase'), import('firebase/auth')]);
    await fa.signOut(auth());
    setAccount(null);
  }, []);

  return { account, signOut };
}
