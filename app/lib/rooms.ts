import {
  get,
  onDisconnect,
  push,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update
} from 'firebase/database';
import { gameMeta } from '~/engine/catalog';
import type { BotLevel, GameId } from '~/engine/types';
import { db, serverNow } from './firebase';

/** No 0, O, 1, I or L, so codes are easy to read out over the phone. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;
export const normaliseCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
export const isCode = (code: string) => new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`).test(code);

export function randomCode(): string {
  const bytes = new Uint32Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export type RoomStatus = 'lobby' | 'playing' | 'ended';

export interface RoomMeta {
  code: string;
  game: GameId;
  config: Record<string, unknown>;
  hostUid: string;
  status: RoomStatus;
  createdAt: number;
  maxPlayers: number;
  minPlayers: number;
  turnSeconds: number;
  match: number;
  quick?: boolean;
  visibility: 'private' | 'public';
}

export interface RoomPlayer {
  name: string;
  avatar: string;
  seat: number;
  ready: boolean;
  connected: boolean;
  bot: BotLevel | null;
  wins: number;
  joinedAt: number;
}

export interface PublicState {
  match: number;
  rev: number;
  view: string;
  actors: string[] | null;
  deadline: number;
  turnDeadline: number;
  result: string | null;
  lastMove: string | null;
  at: number;
}

const roomRef = (code: string, path = '') => ref(db(), `rooms/${code}${path ? `/${path}` : ''}`);

export async function createRoom(opts: {
  uid: string;
  name: string;
  avatar: string;
  game: GameId;
  config: Record<string, unknown>;
  maxPlayers?: number;
  quick?: boolean;
}): Promise<string> {
  const meta = gameMeta(opts.game)!;
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    // A transaction on the code makes sure two rooms can never share one.
    const result = await runTransaction(roomRef(code, 'meta'), (current) => {
      if (current) return; // taken, abort
      const fresh: Omit<RoomMeta, 'createdAt'> & { createdAt: object } = {
        code,
        game: opts.game,
        config: opts.config,
        hostUid: opts.uid,
        status: 'lobby',
        createdAt: serverTimestamp(),
        maxPlayers: Math.min(opts.maxPlayers ?? meta.players[1], meta.players[1]),
        minPlayers: Math.max(2, meta.players[0]),
        turnSeconds: 30,
        match: 0,
        quick: opts.quick ?? false,
        visibility: 'private'
      };
      return fresh;
    });
    if (!result.committed) continue;
    await set(roomRef(code, `players/${opts.uid}`), playerRecord(opts.name, opts.avatar, 0));
    return code;
  }
  throw new Error('Could not create a room. Try again.');
}

const playerRecord = (name: string, avatar: string, seat: number, bot: BotLevel | null = null): RoomPlayer => ({
  name,
  avatar,
  seat,
  ready: bot !== null,
  connected: true,
  bot,
  wins: 0,
  joinedAt: serverNow()
});

export type JoinResult = 'joined' | 'spectating' | 'full' | 'missing';

export async function joinRoom(code: string, uid: string, name: string, avatar: string): Promise<JoinResult> {
  // Read meta and players separately: the rules do not allow reading a whole room at once.
  const [metaSnap, playersSnap] = await Promise.all([get(roomRef(code, 'meta')), get(roomRef(code, 'players'))]);
  const room = { meta: metaSnap.val() as RoomMeta | null };
  if (!room.meta) return 'missing';
  const players = (playersSnap.val() ?? {}) as Record<string, RoomPlayer>;
  if (players[uid]) {
    await update(roomRef(code, `players/${uid}`), { connected: true, name });
    return 'joined';
  }
  if (room.meta.status !== 'lobby') return 'spectating';
  const seats = Object.values(players).map((p) => p.seat);
  if (seats.length >= room.meta.maxPlayers) return 'full';
  let seat = 0;
  while (seats.includes(seat)) seat++;
  await set(roomRef(code, `players/${uid}`), playerRecord(name, avatar, seat));
  return 'joined';
}

/** Marks the player connected now and disconnected automatically when the tab closes or the network drops. */
export function trackPresence(code: string, uid: string): () => void {
  const d = db();
  const connectedRef = ref(d, '.info/connected');
  const playerRef = roomRef(code, `players/${uid}/connected`);
  let off = () => {};
  import('firebase/database').then(({ onValue }) => {
    off = onValue(connectedRef, async (snap) => {
      if (snap.val() !== true) return;
      await onDisconnect(playerRef).set(false);
      const exists = await get(roomRef(code, `players/${uid}`));
      if (exists.exists()) await set(playerRef, true);
    });
  });
  return () => {
    off();
    onDisconnect(playerRef).cancel().catch(() => {});
  };
}

export async function leaveRoom(code: string, uid: string, meta: RoomMeta | null, players: Record<string, RoomPlayer>) {
  const humans = Object.entries(players).filter(([id, p]) => id !== uid && !p.bot);
  if (meta?.status !== 'playing') await remove(roomRef(code, `players/${uid}`));
  else await update(roomRef(code, `players/${uid}`), { connected: false });
  if (meta && meta.hostUid === uid) {
    if (!humans.length) {
      await remove(roomRef(code));
      return;
    }
    const next = humans.sort((a, b) => a[1].seat - b[1].seat)[0][0];
    await update(roomRef(code, 'meta'), { hostUid: next });
  }
}

export const setReady = (code: string, uid: string, ready: boolean) => update(roomRef(code, `players/${uid}`), { ready });
export const renamePlayer = (code: string, uid: string, name: string) => update(roomRef(code, `players/${uid}`), { name });
export const kickPlayer = (code: string, id: string) => remove(roomRef(code, `players/${id}`));
export const setRoomConfig = (code: string, patch: Partial<Pick<RoomMeta, 'config' | 'game' | 'maxPlayers' | 'turnSeconds' | 'visibility'>>) =>
  update(roomRef(code, 'meta'), patch);

export async function addBot(code: string, players: Record<string, RoomPlayer>, level: BotLevel) {
  const seats = Object.values(players).map((p) => p.seat);
  let seat = 0;
  while (seats.includes(seat)) seat++;
  const names = ['Ada', 'Bayo', 'Chidi', 'Dami', 'Efe', 'Femi', 'Gozie', 'Halima', 'Ife', 'Jide'];
  const taken = new Set(Object.values(players).map((p) => p.name));
  const name = `${names.find((n) => !taken.has(`${n} (bot)`)) ?? 'Bot'} (bot)`;
  const id = `bot-${Math.random().toString(36).slice(2, 8)}`;
  await set(roomRef(code, `players/${id}`), { ...playerRecord(name, '#9be8d9', seat, level), connected: true });
}

/** Players send moves into a queue that only the host can read. */
export const sendMove = (code: string, uid: string, match: number, move: unknown) =>
  push(roomRef(code, 'moves'), { uid, match, move: JSON.stringify(move), t: serverTimestamp() });

export const sendEmote = (code: string, uid: string, e: string) => push(roomRef(code, 'emotes'), { uid, e, t: serverTimestamp() });

/** Takes over as host when the current host has gone quiet. Only succeeds for one player. */
export async function claimHost(code: string, uid: string, previousHost: string) {
  await runTransaction(roomRef(code, 'meta/hostUid'), (current) => (current === previousHost ? uid : undefined));
}

export { roomRef };
