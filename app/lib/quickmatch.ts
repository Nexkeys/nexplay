import { get, onDisconnect, onValue, ref, remove, runTransaction, serverTimestamp, set } from 'firebase/database';
import { gameMeta } from '~/engine/catalog';
import type { GameId } from '~/engine/types';
import { db, serverNow } from './firebase';
import { closeRoom, createRoom } from './rooms';

/** A waiting player who has not checked in for this long has gone (closed the tab, lost signal). */
const STALE = 20_000;
/** How often a waiting player checks in. */
const BEAT = 6_000;
/** How long the player who made the room waits for the other one to sit down (slow mobile data included). */
const JOIN_WAIT = 20_000;

interface Waiting {
  name: string;
  avatar: string;
  t: number;
}

/**
 * Pairs two players who want the same game. The first one waits in `/queue/{game}`. The second
 * takes them out of the queue in a transaction (so nobody gets paired twice), creates a room and
 * drops the room code into `/matches/{uid}` for the first player.
 *
 * A pairing only counts once both players are in the room. If the waiting player has quietly gone,
 * the room is closed and the search carries on, so nobody is left alone in a room.
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
  let requeue: ReturnType<typeof setTimeout> | null = null;

  const stopWaiting = () => {
    if (keepAlive) clearInterval(keepAlive);
    if (requeue) clearTimeout(requeue);
    keepAlive = requeue = null;
    document.removeEventListener('visibilitychange', beat);
  };

  const finish = (code: string) => {
    if (cancelled) return;
    cancelled = true;
    offMatch();
    stopWaiting();
    remove(myMatch).catch(() => {});
    remove(myQueue).catch(() => {});
    opts.onRoom(code);
  };

  // Check in, but never put back an entry someone else took out: that player is about to send a room.
  // If nothing arrives soon after being taken out, we were dropped as stale, so look again.
  function beat() {
    if (cancelled) return;
    runTransaction(myQueue, (w: Waiting | null) => (w ? { ...w, t: serverNow() } : undefined))
      .then((r) => {
        if (cancelled || r.committed || requeue) return;
        requeue = setTimeout(() => {
          requeue = null;
          if (!cancelled) {
            stopWaiting();
            search().catch((e) => console.error('Quick match failed', e));
          }
        }, 6_000);
      })
      .catch(() => {});
  }

  /** Resolves true once the room has at least two players, false if that does not happen in time. */
  const waitForPartner = (code: string) =>
    new Promise<boolean>((resolve) => {
      const t = setTimeout(() => {
        off();
        resolve(false);
      }, JOIN_WAIT);
      const off = onValue(ref(d, `rooms/${code}/players`), (s) => {
        if (s.size >= 2) {
          clearTimeout(t);
          off();
          resolve(true);
        }
      });
    });

  async function search(): Promise<void> {
    let partner: string | null = null;
    await runTransaction(queueRef, (queue: Record<string, Waiting> | null) => {
      partner = null;
      const now = serverNow();
      const next: Record<string, Waiting> = {};
      // Only complete entries count, and stale ones are cleared out on the way.
      for (const [id, w] of Object.entries(queue ?? {})) if (id !== opts.uid && w?.name && now - (w.t ?? 0) < STALE) next[id] = w;
      const others = Object.entries(next).sort((a, b) => a[1].t - b[1].t);
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
      if (cancelled) return void closeRoom(code);
      await set(ref(d, `matches/${partner}`), { code, t: serverTimestamp() });
      const joined = await waitForPartner(code);
      if (joined) return finish(code);
      // They had gone. Tidy up and keep looking.
      await Promise.all([closeRoom(code), remove(ref(d, `matches/${partner}`)).catch(() => {})]);
      if (!cancelled) return search();
      return;
    }

    opts.onWaiting();
    onDisconnect(myQueue).remove().catch(() => {});
    keepAlive = setInterval(beat, BEAT);
    // Phones pause timers in the background, so check in the moment the page is back.
    document.addEventListener('visibilitychange', beat);
  }

  (async () => {
    await remove(myMatch).catch(() => {});
    if (cancelled) return;
    offMatch = onValue(myMatch, async (s) => {
      const v = s.val() as { code: string } | null;
      if (!v?.code || cancelled) return;
      // The room may already be closed if we were slow to answer. Then just keep looking.
      const status = (await get(ref(d, `rooms/${v.code}/meta/status`)).catch(() => null))?.val();
      if (status === 'lobby') return finish(v.code);
      remove(myMatch).catch(() => {});
      stopWaiting();
      if (!cancelled) search().catch((e) => console.error('Quick match failed', e));
    });
    await search();
  })().catch((e) => console.error('Quick match failed', e));

  return () => {
    if (cancelled) return;
    cancelled = true;
    offMatch();
    stopWaiting();
    remove(myQueue).catch(() => {});
    onDisconnect(myQueue).cancel().catch(() => {});
  };
}
