import { get, onValue, ref, runTransaction, update } from 'firebase/database';
import type { GameId, MatchResult } from '~/engine/types';
import { db } from './firebase';

export type Outcome = 'win' | 'loss' | 'draw';

export interface Profile {
  xp: number;
  wins: number;
  played: number;
  streak: number;
  best: number;
  games: Partial<Record<GameId, { played: number; wins: number }>>;
  daily?: Record<string, boolean>;
}

const XP: Record<Outcome, number> = { win: 100, loss: 30, draw: 50 };

export const levelFor = (xp: number) => Math.floor(Math.sqrt(xp / 50)) + 1;
/** XP needed to reach a level. */
export const xpForLevel = (level: number) => (level - 1) ** 2 * 50;
export const levelProgress = (xp: number) => {
  const lvl = levelFor(xp);
  const from = xpForLevel(lvl);
  const to = xpForLevel(lvl + 1);
  return { level: lvl, into: xp - from, need: to - from, pct: (xp - from) / (to - from) };
};

export function outcomeFor(result: MatchResult, me: string): Outcome {
  if (result.draw) return 'draw';
  return result.ranking[0]?.includes(me) ? (result.ranking[0].length > 1 ? 'draw' : 'win') : 'loss';
}

/** XP for one match. Games against the computer count for less, so the leaderboard stays fair. */
export const xpFor = (outcome: Outcome, vsComputerOnly: boolean, daily = false) =>
  Math.round(XP[outcome] * (vsComputerOnly ? 0.4 : 1)) + (daily && outcome === 'win' ? 50 : 0);

const today = () => new Date().toISOString().slice(0, 10);

/** The daily challenge: one game a day, the same for everyone. */
export function dailyGame(date = today()): GameId {
  const order: GameId[] = ['ayo', 'whot', 'connect-four', 'trivia', 'tic-tac-toe', 'word-race', 'rps', 'quick-math'];
  let h = 0;
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return order[h % order.length];
}

const once = (key: string) => {
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
  return true;
};

export async function recordMatch(opts: { uid: string; name: string; avatar: string; game: GameId; outcome: Outcome; vsComputerOnly: boolean; key: string }) {
  if (!once(`np-rec:${opts.key}`)) return 0;
  const isDaily = dailyGame() === opts.game;
  const gained = xpFor(opts.outcome, opts.vsComputerOnly, isDaily);
  const userRef = ref(db(), `users/${opts.uid}/stats`);
  const res = await runTransaction(userRef, (cur: Profile | null) => {
    const p: Profile = cur ?? { xp: 0, wins: 0, played: 0, streak: 0, best: 0, games: {} };
    p.games ??= {};
    p.xp = (p.xp ?? 0) + gained;
    p.played = (p.played ?? 0) + 1;
    const g = p.games[opts.game] ?? { played: 0, wins: 0 };
    g.played += 1;
    if (opts.outcome === 'win') {
      p.wins = (p.wins ?? 0) + 1;
      p.streak = (p.streak ?? 0) + 1;
      p.best = Math.max(p.best ?? 0, p.streak);
      g.wins += 1;
    } else if (opts.outcome === 'loss') p.streak = 0;
    p.games[opts.game] = g;
    if (isDaily && opts.outcome === 'win') p.daily = { ...(p.daily ?? {}), [today()]: true };
    return p;
  });
  const p = res.snapshot.val() as Profile;
  await update(ref(db(), `leaderboard/${opts.uid}`), { name: opts.name, avatar: opts.avatar, xp: p.xp, wins: p.wins, level: levelFor(p.xp) }).catch(() => {});
  return gained;
}

export function watchProfile(uid: string, cb: (p: Profile | null) => void) {
  return onValue(ref(db(), `users/${uid}/stats`), (s) => cb(s.val()));
}

export async function syncLeaderboardName(uid: string, name: string, avatar: string) {
  const s = await get(ref(db(), `leaderboard/${uid}`));
  if (s.exists()) await update(ref(db(), `leaderboard/${uid}`), { name, avatar });
}
