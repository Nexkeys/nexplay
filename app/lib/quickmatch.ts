import { onDisconnect, onValue, ref, remove, runTransaction, serverTimestamp, set } from 'firebase/database';
import { gameMeta } from '~/engine/catalog';
import type { GameId } from '~/engine/types';
import { db, serverNow } from './firebase';
import { createRoom } from './rooms';

const STALE = 45_000;

interface Waiting {
  name: string;
  avatar: string;
  t: number;
}

/**
 * Pairs two players who want the same game. The first one waits in `/queue/{game}`. The second
 * takes them out of the queue in a transaction (so nobody gets paired twice), creates a room and
 * drops the room code into `/matches/{uid}` for the first player.
 */
export function findMatch(opts: {
  uid: string;
  name: string;
  avatar: string;
  game: GameId;
  onRoom(code: string): void;
  onWaiting(): void;
}): () => void {
  const d = db();
  const queueRef = ref(d, `queue/${opts.game}`);
  const myQueue = ref(d, `queue/${opts.game}/${opts.uid}`);
  const myMatch = ref(d, `matches/${opts.uid}`);
  let cancelled = false;
  let offMatch = () => {};
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  const finish = (code: string) => {
    if (cancelled) return;
    cancelled = true;
    offMatch();
    if (keepAlive) clearInterval(keepAlive);
    remove(myMatch).catch(() => {});
    remove(myQueue).catch(() => {});
    opts.onRoom(code);
  };

  (async () => {
    await remove(myMatch).catch(() => {});
    let partner: string | null = null;
    await runTransaction(queueRef, (queue: Record<string, Waiting> | null) => {
      partner = null;
      const now = serverNow();
      const others = Object.entries(queue ?? {})
        .filter(([id, w]) => id !== opts.uid && now - (w?.t ?? 0) < STALE)
        .sort((a, b) => a[1].t - b[1].t);
      const next: Record<string, Waiting> = {};
      for (const [id, w] of Object.entries(queue ?? {})) if (now - (w?.t ?? 0) < STALE && id !== opts.uid) next[id] = w;
      if (others.length) {
        partner = others[0][0];
        delete next[partner];
      } else {
        next[opts.uid] = { name: opts.name, avatar: opts.avatar, t: now };
      }
      return next;
    });
    if (cancelled) return;

    if (partner) {
      const meta = gameMeta(opts.game)!;
      const code = await createRoom({
        uid: opts.uid,
        name: opts.name,
        avatar: opts.avatar,
        game: opts.game,
        config: {},
        maxPlayers: Math.max(2, meta.players[0]),
        quick: true
      });
      await set(ref(d, `matches/${partner}`), { code, t: serverTimestamp() });
      finish(code);
      return;
    }

    opts.onWaiting();
    onDisconnect(myQueue).remove().catch(() => {});
    // Stay fresh in the queue while waiting.
    keepAlive = setInterval(() => set(ref(d, `queue/${opts.game}/${opts.uid}/t`), serverNow()).catch(() => {}), 15_000);
    offMatch = onValue(myMatch, (s) => {
      const v = s.val() as { code: string } | null;
      if (v?.code) finish(v.code);
    });
  })().catch((e) => console.error('Quick match failed', e));

  return () => {
    if (cancelled) return;
    cancelled = true;
    offMatch();
    if (keepAlive) clearInterval(keepAlive);
    remove(myQueue).catch(() => {});
    onDisconnect(myQueue).cancel().catch(() => {});
  };
}
