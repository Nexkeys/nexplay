// Checks the rate limits in database.rules.json against the local emulator.
// Run: firebase emulators:start --only database,auth  then  node tests/ratelimit.emu.mjs
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase, ref, set, update, push, serverTimestamp, runTransaction } from 'firebase/database';

const mk = (name) => {
  const app = initializeApp({ apiKey: 'x', projectId: 'nexplay-948af', databaseURL: 'http://127.0.0.1:9000?ns=nexplay-948af-default-rtdb' }, name);
  const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getDatabase(app); connectDatabaseEmulator(db, '127.0.0.1', 9000);
  return { auth, db };
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = async (label, p, expect) => { let r; try { await p; r = true; } catch { r = false; } console.log(r === expect ? 'PASS' : 'FAIL', label, r ? 'allowed' : 'denied'); };
const meta = (code, uid) => ({ code, game: 'rps', hostUid: uid, status: 'lobby', expiresAt: Date.now() + 60000 });

const a = mk('a'); const { user } = await signInAnonymously(a.auth); const uid = user.uid;
await ok('create room without a claim', set(ref(a.db, 'rooms/AAAAA/meta'), meta('AAAAA', uid)), false);
await ok('claim code AAAAA', set(ref(a.db, `limits/${uid}`), { room: 'AAAAA', at: serverTimestamp() }), true);
await ok('create claimed room (transaction, like the app)', runTransaction(ref(a.db, 'rooms/AAAAA/meta'), (c) => c ? undefined : meta('AAAAA', uid)).then((r) => { if (!r.committed) throw 0; }), true);
await ok('create a different room on the same claim', set(ref(a.db, 'rooms/BBBBB/meta'), meta('BBBBB', uid)), false);
await ok('claim another code right away', set(ref(a.db, `limits/${uid}`), { room: 'BBBBB', at: serverTimestamp() }), false);
await ok('host still edits own room', update(ref(a.db, 'rooms/AAAAA/meta'), { status: 'playing' }), true);
await set(ref(a.db, `rooms/AAAAA/players/${uid}`), { name: 'A', seat: 0 });
const emote = () => update(ref(a.db, 'rooms/AAAAA'), { [`emotes/${push(ref(a.db, 'x')).key}`]: { uid, e: 'x', t: serverTimestamp() }, [`emoteAt/${uid}`]: serverTimestamp() });
await ok('first emote', emote(), true);
await ok('second emote straight away', emote(), false);
await ok('emote without the timestamp', set(ref(a.db, `rooms/AAAAA/emotes/${push(ref(a.db, 'x')).key}`), { uid, e: 'x' }), false);
await sleep(3100);
await ok('emote after a second', emote(), true);
await ok('claim another code after 3s', set(ref(a.db, `limits/${uid}`), { room: 'BBBBB', at: serverTimestamp() }), true);
await ok('create that room', set(ref(a.db, 'rooms/BBBBB/meta'), meta('BBBBB', uid)), true);
const b = mk('b'); const ub = (await signInAnonymously(b.auth)).user.uid;
await ok('someone else writes my limit', set(ref(b.db, `limits/${uid}`), { room: 'CCCCC', at: serverTimestamp() }), false);
await ok('player joins a room', set(ref(b.db, `rooms/AAAAA/players/${ub}`), { name: 'B', seat: 1 }), true);
const eb = () => update(ref(b.db, "rooms/AAAAA"), { [`emotes/${push(ref(b.db, "x")).key}`]: { uid: ub, e: "y", t: serverTimestamp() }, [`emoteAt/${ub}`]: serverTimestamp() });
await ok("guest emote", eb(), true);
await ok("guest emote straight away", eb(), false);
await ok("host clears emotes for a new game", update(ref(a.db, "rooms/AAAAA"), { emotes: null, "meta/match": 1 }), true);
await ok("host deletes the whole room", set(ref(a.db, "rooms/AAAAA"), null), true);
process.exit(0);
