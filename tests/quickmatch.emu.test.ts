// Quick match against the local emulators, with each player as a separate copy of the app code.
// Skipped unless the emulators are running: firebase emulators:start --only database,auth
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectDatabaseEmulator, get, getDatabase, ref, set, type Database } from 'firebase/database';
import { describe, expect, it, vi } from 'vitest';

const NS = 'nexplay-948af-default-rtdb';
const up = await fetch(`http://127.0.0.1:9000/.json?ns=${NS}&shallow=true`).then(
  () => true,
  () => false
);

(globalThis as { document?: unknown }).document ??= { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };

let n = 0;
async function player(name: string) {
  const app = initializeApp({ apiKey: 'x', projectId: 'nexplay-948af', databaseURL: `http://127.0.0.1:9000?ns=${NS}` }, `${name}-${n++}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const database = getDatabase(app);
  connectDatabaseEmulator(database, '127.0.0.1', 9000);
  const uid = (await signInAnonymously(auth)).user.uid;
  // A fresh copy of the app modules, wired to this player's own connection.
  vi.resetModules();
  vi.doMock('~/lib/firebase', () => ({ db: () => database, serverNow: () => Date.now(), DATABASE_URL: '' }));
  const qm = await import('~/lib/quickmatch');
  const rooms = await import('~/lib/rooms');
  const events: string[] = [];
  let resolveRoom: (code: string) => void = () => {};
  const room = new Promise<string>((r) => (resolveRoom = r));
  const start = (game: 'rps', opts: { sitDown?: boolean } = {}) =>
    qm.findMatch({
      uid,
      name,
      avatar: '#fff',
      game,
      onWaiting: () => events.push('waiting'),
      onRoom: (code) => {
        events.push(`room:${code}`);
        // What the room page does when it opens.
        if (opts.sitDown !== false) rooms.joinRoom(code, uid, name, '#fff');
        resolveRoom(code);
      }
    });
  return { uid, db: database, events, room, start };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const within = <T>(p: Promise<T>, ms: number) => Promise.race([p, sleep(ms).then(() => 'timeout' as const)]);
const queue = async (db: Database) => Object.keys((await get(ref(db, 'queue/rps'))).val() ?? {});

describe.skipIf(!up)('quick match', () => {
  it('pairs two players into the same room', async () => {
    const a = await player('Ada');
    const b = await player('Bayo');
    const stopA = a.start('rps');
    await sleep(1500);
    expect(a.events).toContain('waiting');
    b.start('rps');
    const [ra, rb] = await Promise.all([within(a.room, 15_000), within(b.room, 15_000)]);
    expect(ra).not.toBe('timeout');
    expect(ra).toBe(rb);
    stopA();
  }, 30_000);

  it('skips a player who has gone and keeps looking', async () => {
    const c = await player('Chi');
    await set(ref(c.db, 'queue/rps/ghost'), { name: 'Ghost', avatar: '#000', t: Date.now() });
    c.start('rps');
    // Paired with the ghost, who never sits down: the room is closed and Chi waits instead.
    await sleep(24_000);
    expect(c.events).toEqual(['waiting']);
    expect(await queue(c.db)).toEqual([c.uid]);
    const d = await player('Dayo');
    d.start('rps');
    const [rc, rd] = await Promise.all([within(c.room, 15_000), within(d.room, 15_000)]);
    expect(rc).not.toBe('timeout');
    expect(rc).toBe(rd);
  }, 60_000);

  it('does not strand the player who made the room when the other never arrives', async () => {
    const e = await player('Efe');
    const f = await player('Funmi');
    e.start('rps', { sitDown: false }); // Efe's phone was asleep: told about the room, never opened it
    await sleep(1500);
    f.start('rps');
    await sleep(24_000);
    // Funmi is not sitting alone in a room: the room was closed and she is back in the queue.
    expect(f.events.filter((x) => x.startsWith('room:'))).toEqual([]);
    expect(await queue(f.db)).toContain(f.uid);
  }, 60_000);
});
