import { hash01 } from '../timed';
import type { BotLevel, GameDef, MatchResult, PlayerId, Rng } from '../types';

/*
 * Love Lock: a co-op puzzle for two. Each lock hides a code of 3 to 5 symbols. The clues that pin it
 * down are split between the partners: neither half is enough alone, together they give exactly one
 * code. On your turn you either share one of your clues (a small score cost) or try a code (a wrong
 * try costs a shared heart and shows which slots were right).
 */

// ---------- symbols and clues ----------

/** The lock symbols, by index. The board draws each one as a little coloured picture. */
export const SYMBOL_NAMES = ['heart', 'star', 'moon', 'gem', 'flower', 'sun', 'note'];

export type Clue =
  | { t: 'at'; i: number; s: number }
  | { t: 'not'; i: number; s: number }
  | { t: 'either'; i: number; a: number; b: number }
  | { t: 'count'; s: number; m: number }
  | { t: 'same'; i: number; j: number }
  | { t: 'diff'; i: number; j: number }
  | { t: 'left'; a: number; b: number }
  | { t: 'next'; a: number; b: number }
  | { t: 'distinct'; m: number };

export type ClueType = Clue['t'];

/** A try and which slots matched. Public to both players, and a clue in itself. */
export interface Attempt {
  by: number;
  code: number[];
  hits: boolean[];
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five'];

/** A clue as text pieces, where a number is a symbol. The board draws symbols as little icons. */
export function clueParts(c: Clue): (string | number)[] {
  switch (c.t) {
    case 'at':
      return [`Slot ${c.i + 1} is `, c.s];
    case 'not':
      return [c.s, ` is not in slot ${c.i + 1}`];
    case 'either':
      return [`Slot ${c.i + 1} is `, c.a, ' or ', c.b];
    case 'count':
      return c.m === 0 ? ['There is no ', c.s] : c.m === 1 ? ['There is exactly one ', c.s] : [`There are exactly ${WORDS[c.m]} `, c.s];
    case 'same':
      return [`Slots ${c.i + 1} and ${c.j + 1} match`];
    case 'diff':
      return [`Slots ${c.i + 1} and ${c.j + 1} are different`];
    case 'left':
      return ['A ', c.a, ' is somewhere left of a ', c.b];
    case 'next':
      return ['A ', c.a, ' sits right next to a ', c.b];
    case 'distinct':
      return [`The code uses exactly ${WORDS[c.m]} different symbol${c.m === 1 ? '' : 's'}`];
  }
}

/** Plain text, for screen readers and tests. */
export const clueText = (c: Clue) =>
  clueParts(c)
    .map((p) => (typeof p === 'number' ? SYMBOL_NAMES[p] : p))
    .join('');

/** Does a clue hold for the code stored at `d[o .. o + n)`? */
export function holds(c: Clue, d: ArrayLike<number>, o: number, n: number): boolean {
  switch (c.t) {
    case 'at':
      return d[o + c.i] === c.s;
    case 'not':
      return d[o + c.i] !== c.s;
    case 'either': {
      const v = d[o + c.i];
      return v === c.a || v === c.b;
    }
    case 'count': {
      let m = 0;
      for (let x = 0; x < n; x++) if (d[o + x] === c.s) m++;
      return m === c.m;
    }
    case 'same':
      return d[o + c.i] === d[o + c.j];
    case 'diff':
      return d[o + c.i] !== d[o + c.j];
    case 'left': {
      let seen = false;
      for (let x = 0; x < n; x++) {
        const v = d[o + x];
        if (seen && v === c.b) return true;
        if (v === c.a) seen = true;
      }
      return false;
    }
    case 'next':
      for (let x = 0; x < n - 1; x++) {
        const v = d[o + x];
        const w = d[o + x + 1];
        if ((v === c.a && w === c.b) || (v === c.b && w === c.a)) return true;
      }
      return false;
    case 'distinct': {
      let mask = 0;
      let m = 0;
      for (let x = 0; x < n; x++) {
        const bit = 1 << d[o + x];
        if (!(mask & bit)) {
          mask |= bit;
          m++;
        }
      }
      return m === c.m;
    }
  }
}

/** A try is a clue too: matching slots are right, the others are wrong. */
function fits(t: Attempt, d: ArrayLike<number>, o: number, n: number): boolean {
  for (let x = 0; x < n; x++) if ((d[o + x] === t.code[x]) !== t.hits[x]) return false;
  return true;
}

// ---------- the code space and solver ----------

const spaces = new Map<string, Uint8Array>();

/** Every possible code for n slots and k symbols, flattened (k^n codes of n digits; at most 16,807 × 5 bytes). */
export function codeSpace(n: number, k: number): Uint8Array {
  const key = `${n}:${k}`;
  let sp = spaces.get(key);
  if (!sp) {
    const total = k ** n;
    sp = new Uint8Array(total * n);
    for (let idx = 0; idx < total; idx++) {
      let v = idx;
      for (let x = n - 1; x >= 0; x--) {
        sp[idx * n + x] = v % k;
        v = Math.floor(v / k);
      }
    }
    spaces.set(key, sp);
  }
  return sp;
}

/** Every code that fits the clues and tries, as arrays of symbols. Stops after `limit` codes. */
export function candidates(n: number, k: number, clues: readonly Clue[], tries: readonly Attempt[] = [], limit = Infinity): number[][] {
  const sp = codeSpace(n, k);
  const total = k ** n;
  const out: number[][] = [];
  outer: for (let idx = 0; idx < total; idx++) {
    const o = idx * n;
    for (const c of clues) if (!holds(c, sp, o, n)) continue outer;
    for (const t of tries) if (!fits(t, sp, o, n)) continue outer;
    out.push(Array.from(sp.subarray(o, o + n)));
    if (out.length >= limit) break;
  }
  return out;
}

// ---------- lock generation ----------

/** Difficulty by tier: slots and symbols grow, and the clues get subtler. */
export const TIERS = [
  { n: 3, k: 5 },
  { n: 3, k: 6 },
  { n: 4, k: 5 },
  { n: 4, k: 6 },
  { n: 4, k: 7 },
  { n: 5, k: 6 },
  { n: 5, k: 7 }
];
export const MAX_TIER = TIERS.length;
/** Each half of the clues must leave at least this many codes open on its own. */
export const MIN_LEFT = 3;
/** Fewest and most clues on a lock, by slot count, so both hands are worth playing and fit a phone. */
export const clueRange = (n: number): [number, number] => [4, n === 3 ? 6 : n === 4 ? 8 : 10];

/** How often each kind of clue is drawn. Early locks lean on direct clues, later ones on relations. */
function familyWeights(tier: number): Record<ClueType, number> {
  if (tier <= 2) return { at: 1, not: 3, either: 3, count: 2, same: 1, diff: 1, left: 0.6, next: 0.6, distinct: 0.4 };
  if (tier <= 5) return { at: 0.3, not: 2, either: 2.5, count: 2, same: 1.4, diff: 1.4, left: 1.5, next: 1.3, distinct: 0.8 };
  return { at: 0, not: 1.4, either: 2, count: 2, same: 1.5, diff: 1.5, left: 2, next: 2, distinct: 1 };
}

/** Every true clue about a code, grouped by kind. */
function truths(code: number[], n: number, k: number): Record<ClueType, Clue[]> {
  const f: Record<ClueType, Clue[]> = { at: [], not: [], either: [], count: [], same: [], diff: [], left: [], next: [], distinct: [] };
  for (let i = 0; i < n; i++) {
    f.at.push({ t: 'at', i, s: code[i] });
    for (let s = 0; s < k; s++) {
      if (s === code[i]) continue;
      f.not.push({ t: 'not', i, s });
      f.either.push(s < code[i] ? { t: 'either', i, a: s, b: code[i] } : { t: 'either', i, a: code[i], b: s });
    }
    for (let j = i + 1; j < n; j++) {
      if (code[i] === code[j]) f.same.push({ t: 'same', i, j });
      else f.diff.push({ t: 'diff', i, j });
    }
  }
  for (let s = 0; s < k; s++) {
    const m = code.filter((v) => v === s).length;
    if (m < n) f.count.push({ t: 'count', s, m });
  }
  for (let a = 0; a < k; a++)
    for (let b = 0; b < k; b++) {
      if (a === b) continue;
      const left: Clue = { t: 'left', a, b };
      if (holds(left, code, 0, n)) f.left.push(left);
      const next: Clue = { t: 'next', a, b };
      if (a < b && holds(next, code, 0, n)) f.next.push(next);
    }
  f.distinct.push({ t: 'distinct', m: new Set(code).size });
  return f;
}

/** How many codes no clue in `bits` rules out, counting no further than `cap`. */
function countOpen(fails: Uint32Array, bits: number, cap: number) {
  let count = 0;
  for (let idx = 0; idx < fails.length; idx++) if (!(fails[idx] & bits) && ++count >= cap) break;
  return count;
}

/**
 * Draws true clues until only the code is left, then drops every clue that is not needed.
 * Returns the clues and, for every code in the space, a bit mask of the clues that rule it out.
 */
function minimalClues(rng: Rng, code: number[], n: number, k: number, tier: number): { clues: Clue[]; fails: Uint32Array; bits: number[] } {
  const sp = codeSpace(n, k);
  const total = k ** n;
  const pool = truths(code, n, k);
  const weights = familyWeights(tier);
  // Codes still open, compacted in place as clues rule them out.
  const left = new Int32Array(total);
  for (let i = 0; i < total; i++) left[i] = i;
  let size = total;
  const chosen: Clue[] = [];
  while (size > 1) {
    const fams = (Object.keys(pool) as ClueType[]).filter((f) => pool[f].length && weights[f] > 0);
    if (!fams.length) break;
    const sum = fams.reduce((a, f) => a + weights[f], 0);
    let r = rng.next() * sum;
    let fam = fams[fams.length - 1];
    for (const f of fams) {
      r -= weights[f];
      if (r < 0) {
        fam = f;
        break;
      }
    }
    const list = pool[fam];
    const clue = list.splice(rng.int(list.length), 1)[0];
    let w = 0;
    for (let x = 0; x < size; x++) if (holds(clue, sp, left[x] * n, n)) left[w++] = left[x];
    if (w < size) {
      chosen.push(clue);
      size = w;
    }
  }
  // Bit masks hold up to 31 clues. Far more than any lock needs; start again if it ever happens.
  if (chosen.length > 31) return { clues: [], fails: new Uint32Array(0), bits: [] };
  const fails = new Uint32Array(total);
  chosen.forEach((c, x) => {
    const bit = 1 << x;
    for (let idx = 0; idx < total; idx++) if (!holds(c, sp, idx * n, n)) fails[idx] |= bit;
  });
  // A clue can go when no code is ruled out by that clue alone, among the clues still kept.
  let active = (1 << chosen.length) - 1;
  for (const i of rng.shuffle(chosen.map((_, x) => x))) {
    const bit = 1 << i;
    let needed = false;
    for (let idx = 0; idx < total; idx++)
      if ((fails[idx] & active) === bit) {
        needed = true;
        break;
      }
    if (!needed) active &= ~bit;
  }
  const kept = chosen.map((_, x) => x).filter((x) => active & (1 << x));
  return { clues: kept.map((x) => chosen[x]), fails, bits: kept.map((x) => 1 << x) };
}

export interface Lock {
  tier: number;
  n: number;
  k: number;
  clues: Clue[];
  /** Which player (0 or 1) holds each clue. */
  owner: number[];
  shared: boolean[];
  /** The secret. Never sent to players while the lock is closed. */
  code: number[];
}

/**
 * Makes a lock for a tier: a random code and a minimal set of true clues that leave exactly that
 * code, split so each half on its own leaves at least MIN_LEFT codes open. Minimal means every clue
 * is needed, so no half (indeed no smaller set) can ever be enough on its own.
 */
export function makeLock(rng: Rng, tier: number): Lock {
  const t = Math.min(MAX_TIER, Math.max(1, Math.floor(tier) || 1));
  const { n, k } = TIERS[t - 1];
  const [fewest, most] = clueRange(n);
  let fallback: Lock | null = null;
  let fallbackScore = -Infinity;
  for (let attempt = 0; attempt < 300; attempt++) {
    const code = Array.from({ length: n }, () => rng.int(k));
    const { clues, fails, bits } = minimalClues(rng, code, n, k, t);
    const m = clues.length;
    if (m < 2) continue;
    // Try a few balanced splits and keep the one where the weaker half still leaves the most codes.
    let best: number[] = [];
    let bestLeft = -1;
    for (let s = 0; s < 12; s++) {
      const order = rng.shuffle(clues.map((_, x) => x));
      const half = Math.floor(m / 2) + (m % 2 ? rng.int(2) : 0);
      const owner = clues.map(() => 1);
      for (let x = 0; x < half; x++) owner[order[x]] = 0;
      const half0 = bits.reduce((acc, bit, x) => (owner[x] === 0 ? acc | bit : acc), 0);
      const half1 = bits.reduce((acc, bit, x) => (owner[x] === 1 ? acc | bit : acc), 0);
      const a = countOpen(fails, half0, 24);
      const b = countOpen(fails, half1, 24);
      if (Math.min(a, b) > bestLeft) {
        bestLeft = Math.min(a, b);
        best = owner;
      }
      if (bestLeft >= 8) break;
    }
    const lock: Lock = { tier: t, n, k, clues, owner: best, shared: clues.map(() => false), code };
    if (m >= fewest && m <= most && bestLeft >= MIN_LEFT) return shuffleClues(rng, lock);
    const score = (bestLeft >= MIN_LEFT ? 100 : bestLeft) - Math.abs(m - fewest);
    if (score > fallbackScore) {
      fallback = lock;
      fallbackScore = score;
    }
  }
  // Practically unreachable: the closest lock found still has one answer and two incomplete halves.
  return shuffleClues(rng, fallback!);
}

/** Deals the clues out in a random order so their position gives nothing away. */
function shuffleClues(rng: Rng, lock: Lock): Lock {
  const order = rng.shuffle(lock.clues.map((_, x) => x));
  return { ...lock, clues: order.map((x) => lock.clues[x]), owner: order.map((x) => lock.owner[x]), shared: order.map(() => false) };
}

// ---------- the game ----------

/** Quick reactions, so partners can nudge each other without voice chat. The board draws an icon for each. */
export const REACTIONS = ['Love you', 'Hmm…', 'I think I know!', 'Share a clue?', 'Go for it'];

export interface LoveLockConfig extends Record<string, unknown> {
  /** 'set': open a fixed number of locks. 'run': keep going until the hearts run out. */
  mode: 'set' | 'run';
  /** Locks in a set, or the goal of a heart run. */
  locks: number;
  hearts: number;
  /** Seconds per turn. */
  seconds: number;
  start: 'gentle' | 'tricky' | 'fiendish';
}

export type LogItem =
  | { k: 'share'; by: number; clue: number; auto?: boolean }
  | { k: 'try'; by: number; ok: boolean }
  | { k: 'pass'; by: number; auto?: boolean };

export interface Gain {
  total: number;
  base: number;
  speed: number;
  cost: number;
  streak: number;
  heart: boolean;
}

export interface LoveLockState {
  players: PlayerId[];
  mode: 'set' | 'run';
  /** Locks in the set, or the goal of a heart run. */
  goal: number;
  /** Hard stop for a heart run, so two perfect partners still finish one day. */
  maxLocks: number;
  startTier: number;
  seconds: number;
  phase: 'play' | 'opened' | 'over';
  /** When the "opened" celebration ends. */
  phaseEnd: number;
  lockNo: number;
  lock: Lock;
  tries: Attempt[];
  log: LogItem[];
  /** Index into `players` of whoever's turn it is. */
  turn: number;
  turnNo: number;
  turnStart: number;
  turnEnd: number;
  lockStart: number;
  lockShares: number;
  lockWrong: number;
  hearts: number;
  maxHearts: number;
  score: number;
  /** Locks opened in a row without a wrong try. */
  streak: number;
  bestStreak: number;
  opened: number;
  sharesTotal: number;
  wrongTotal: number;
  /** The code of the lock just opened, or of the one that beat you. */
  reveal: number[] | null;
  gain: Gain | null;
  outcome: 'won' | 'lost' | null;
  reacts: Record<PlayerId, { r: number; at: number }>;
}

/** What a player is sent: clues they may not see are null and the code is empty. */
export type LoveLockView = Omit<LoveLockState, 'lock'> & { lock: Omit<Lock, 'clues'> & { clues: (Clue | null)[] } };

export type LoveLockMove = { type: 'share'; clue: number } | { type: 'try'; code: number[] } | { type: 'pass' } | { type: 'react'; r: number };

/** A heart run stops here even if nobody ever slips. */
export const RUN_CAP = 30;
export const OPEN_MS = 2800;
const START_TIER: Record<string, number> = { gentle: 1, tricky: 3, fiendish: 5 };

export const tierFor = (lockNo: number, startTier: number) => Math.min(MAX_TIER, startTier + lockNo - 1);

/** Points for opening a lock: size, speed, minus shares and wrong tries, plus the streak bonus. */
export function lockPoints(n: number, elapsedMs: number, shares: number, wrong: number, streak: number) {
  const base = 40 * n;
  const speed = Math.max(0, Math.round(100 * (1 - elapsedMs / (n * 30_000))));
  const cost = 10 * shares + 30 * wrong;
  const bonus = streak >= 2 ? Math.min(150, 25 * (streak - 1)) : 0;
  return { base, speed, cost, streak: bonus, total: Math.max(20, base + speed - cost) + bonus };
}

const clamp = (v: unknown, lo: number, hi: number, dflt: number) => {
  const x = Math.round(Number(v));
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : dflt;
};

type LockOnly = { lock: { clues: (Clue | null)[]; owner: number[]; shared: boolean[] } };

/** What a player knows: their own clues and everything shared. */
export const knownClues = (s: LockOnly, who: number): Clue[] => s.lock.clues.filter((c, i): c is Clue => !!c && (s.lock.owner[i] === who || s.lock.shared[i]));
/** Indices of the clues a player has not shared yet. */
export const unsharedOf = (s: LockOnly, who: number) => s.lock.owner.flatMap((o, i) => (o === who && !s.lock.shared[i] ? [i] : []));

/** The clue of `who` that narrows down the codes both partners can see the most. */
export function bestShare(s: LockOnly & { lock: { n: number; k: number }; tries: Attempt[] }, who: number): number | null {
  const mine = unsharedOf(s, who);
  if (!mine.length) return null;
  const { n, k } = s.lock;
  const shared = s.lock.clues.filter((c, i): c is Clue => !!c && s.lock.shared[i]);
  const pub = candidates(n, k, shared, s.tries);
  let best = mine[0];
  let bestCount = Infinity;
  for (const ci of mine) {
    const c = s.lock.clues[ci];
    if (!c) continue;
    let count = 0;
    for (const code of pub) if (holds(c, code, 0, n)) count++;
    if (count < bestCount) {
      bestCount = count;
      best = ci;
    }
  }
  return best;
}

function nextTurn(s: LoveLockState, now: number): LoveLockState {
  return { ...s, turn: 1 - s.turn, turnNo: s.turnNo + 1, turnStart: now, turnEnd: now + s.seconds * 1000 };
}

function startLock(s: LoveLockState, rng: Rng, now: number, lockNo: number): LoveLockState {
  return {
    ...s,
    phase: 'play',
    phaseEnd: 0,
    lockNo,
    lock: makeLock(rng, tierFor(lockNo, s.startTier)),
    tries: [],
    log: [],
    turnStart: now,
    turnEnd: now + s.seconds * 1000,
    lockStart: now,
    lockShares: 0,
    lockWrong: 0,
    reveal: null,
    gain: null
  };
}

function share(s: LoveLockState, clue: number, now: number, auto: boolean): LoveLockState {
  const shared = s.lock.shared.slice();
  shared[clue] = true;
  const item: LogItem = auto ? { k: 'share', by: s.turn, clue, auto } : { k: 'share', by: s.turn, clue };
  return nextTurn({ ...s, lock: { ...s.lock, shared }, lockShares: s.lockShares + 1, sharesTotal: s.sharesTotal + 1, log: [...s.log, item] }, now);
}

function pass(s: LoveLockState, now: number, auto: boolean): LoveLockState {
  const item: LogItem = auto ? { k: 'pass', by: s.turn, auto } : { k: 'pass', by: s.turn };
  return nextTurn({ ...s, log: [...s.log, item] }, now);
}

function attempt(s: LoveLockState, code: number[], now: number): LoveLockState {
  const hits = code.map((v, i) => v === s.lock.code[i]);
  const ok = hits.every(Boolean);
  const tries = [...s.tries, { by: s.turn, code: code.slice(), hits }];
  const log: LogItem[] = [...s.log, { k: 'try', by: s.turn, ok }];
  if (!ok) {
    const hearts = s.hearts - 1;
    const next: LoveLockState = { ...s, tries, log, hearts, lockWrong: s.lockWrong + 1, wrongTotal: s.wrongTotal + 1, streak: 0 };
    if (hearts <= 0) {
      const won = s.mode === 'run' && s.opened >= s.goal;
      return { ...next, hearts: 0, phase: 'over', phaseEnd: 0, reveal: s.lock.code.slice(), outcome: won ? 'won' : 'lost' };
    }
    return nextTurn(next, now);
  }
  const streak = s.lockWrong === 0 ? s.streak + 1 : 0;
  const pts = lockPoints(s.lock.n, now - s.lockStart, s.lockShares, s.lockWrong, streak);
  // In a heart run, every third clean lock in a row wins a heart back.
  const heart = s.mode === 'run' && streak > 0 && streak % 3 === 0 && s.hearts < s.maxHearts;
  const opened = s.opened + 1;
  const done = s.mode === 'set' ? opened >= s.goal : opened >= s.maxLocks;
  return {
    ...s,
    tries,
    log,
    opened,
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    score: s.score + pts.total,
    hearts: s.hearts + (heart ? 1 : 0),
    gain: { ...pts, heart },
    reveal: s.lock.code.slice(),
    phase: done ? 'over' : 'opened',
    phaseEnd: done ? 0 : now + OPEN_MS,
    outcome: done ? 'won' : null,
    // Whoever did not open this lock starts the next one.
    turn: 1 - s.turn,
    turnNo: s.turnNo + 1
  };
}

/** How long a computer partner thinks before it moves, in ms. */
const THINK: Record<BotLevel, [number, number]> = { easy: [3500, 7000], medium: [2200, 4500], hard: [1200, 2600] };

/**
 * The computer partner's move, reasoning only from what it may know: its own clues, shared clues
 * and the tries so far. It tries a code once only one fits, otherwise shares a clue (hard always
 * picks the most useful one). Easy and medium sometimes guess early; easy forgets what tries taught.
 */
export function partnerMove(s: LoveLockState | LoveLockView, who: number, level: BotLevel): LoveLockMove {
  const { n, k } = s.lock;
  const key = `${s.lockNo}:${s.turnNo}:${who}`;
  const cands = candidates(n, k, knownClues(s, who), level === 'easy' ? [] : s.tries, 64);
  if (cands.length === 1) return { type: 'try', code: cands[0] };
  const mine = unsharedOf(s, who);
  const theirs = unsharedOf(s, 1 - who).length;
  const roll = hash01(`${key}:g`);
  const guess = (): LoveLockMove => ({ type: 'try', code: cands[Math.floor(hash01(`${key}:c`) * cands.length)] });
  if (level === 'easy' && cands.length <= 4 && s.hearts >= 2 && roll < 0.4) return guess();
  if (level === 'medium' && cands.length <= 2 && s.hearts >= 3 && roll < 0.5) return guess();
  if (mine.length) {
    const smart = level === 'hard' || (level === 'medium' && hash01(`${key}:s`) < 0.65);
    const clue = smart ? bestShare(s, who)! : mine[Math.floor(hash01(`${key}:r`) * mine.length)];
    return { type: 'share', clue };
  }
  // Nothing left to share: wait for the partner's clues rather than spend a heart.
  if (theirs > 0) return { type: 'pass' };
  return guess();
}

export const loveLock: GameDef<LoveLockState, LoveLockMove, LoveLockConfig> = {
  id: 'love-lock',
  minPlayers: 2,
  maxPlayers: 2,
  selfTimed: true,
  defaultConfig: { mode: 'set', locks: 5, hearts: 5, seconds: 60, start: 'gentle' },
  setup(players, config, { rng, now }) {
    const hearts = clamp(config.hearts, 1, 9, 5);
    const base: LoveLockState = {
      players: players.slice(0, 2).map((p) => p.id),
      mode: config.mode === 'run' ? 'run' : 'set',
      goal: clamp(config.locks, 1, 20, 5),
      maxLocks: RUN_CAP,
      startTier: START_TIER[config.start] ?? 1,
      seconds: clamp(config.seconds, 10, 300, 60),
      phase: 'play',
      phaseEnd: 0,
      lockNo: 1,
      lock: { tier: 1, n: 3, k: 5, clues: [], owner: [], shared: [], code: [] },
      tries: [],
      log: [],
      turn: rng.int(2),
      turnNo: 0,
      turnStart: now,
      turnEnd: now,
      lockStart: now,
      lockShares: 0,
      lockWrong: 0,
      hearts,
      maxHearts: hearts,
      score: 0,
      streak: 0,
      bestStreak: 0,
      opened: 0,
      sharesTotal: 0,
      wrongTotal: 0,
      reveal: null,
      gain: null,
      outcome: null,
      reacts: {}
    };
    return startLock(base, rng, now, 1);
  },
  actors(s) {
    return s.phase === 'play' ? [s.players[s.turn]] : [];
  },
  validate(s, player, move) {
    const who = s.players.indexOf(player);
    if (who < 0) return 'You are not playing.';
    if (!move || typeof move !== 'object') return 'Unknown move.';
    if (s.phase === 'over') return 'The run is over.';
    if (move.type === 'react') return Number.isInteger(move.r) && move.r >= 0 && move.r < REACTIONS.length ? null : 'Unknown reaction.';
    if (s.phase !== 'play') return 'Wait for the next lock.';
    if (s.turn !== who) return "It's your partner's turn.";
    switch (move.type) {
      case 'share': {
        const i = move.clue;
        if (!Number.isInteger(i) || i < 0 || i >= s.lock.clues.length || s.lock.owner[i] !== who) return 'Pick one of your clues.';
        if (s.lock.shared[i]) return 'You already shared that clue.';
        return null;
      }
      case 'try': {
        const c = move.code;
        if (!Array.isArray(c) || c.length !== s.lock.n || !c.every((v) => Number.isInteger(v) && v >= 0 && v < s.lock.k)) return 'Fill every slot first.';
        return null;
      }
      case 'pass':
        return unsharedOf(s, who).length ? 'Share a clue or try a code.' : null;
      default:
        return 'Unknown move.';
    }
  },
  apply(s, player, move, { now }) {
    if (move.type === 'react') {
      const prev = s.reacts[player];
      if (prev && now - prev.at < 800) return s;
      return { ...s, reacts: { ...s.reacts, [player]: { r: move.r, at: now } } };
    }
    if (move.type === 'share') return share(s, move.clue, now, false);
    if (move.type === 'pass') return pass(s, now, false);
    return attempt(s, move.code, now);
  },
  deadline(s) {
    if (s.phase === 'over') return null;
    return s.phase === 'opened' ? s.phaseEnd : s.turnEnd;
  },
  tick(s, { now, rng }) {
    if (s.phase === 'opened' && now >= s.phaseEnd) return startLock(s, rng, now, s.lockNo + 1);
    if (s.phase === 'play' && now >= s.turnEnd) {
      // Out of time: share their most useful clue for them, or hand the turn over.
      const clue = bestShare(s, s.turn);
      return clue === null ? pass(s, now, true) : share(s, clue, now, true);
    }
    return null;
  },
  result(s) {
    if (s.phase !== 'over') return null;
    const won = s.outcome === 'won';
    const locks = `${s.opened} lock${s.opened === 1 ? '' : 's'}`;
    // The summary doubles as the heading of the results card, so it reads as a headline.
    const summary =
      s.mode === 'set'
        ? won
          ? `All ${s.goal} locks opened together!`
          : `${s.opened} of ${s.goal} locks opened together`
        : won
          ? `${locks} opened together!`
          : `${locks} opened together, ${s.goal - s.opened} short of the goal`;
    // Co-op: both partners share one place, one score and one outcome, so neither beats the other.
    // A lost run is also marked a draw so neither partner is credited a room win.
    const res = {
      ranking: [s.players.slice()],
      scores: Object.fromEntries(s.players.map((p) => [p, s.score])),
      draw: !won,
      summary,
      coop: { won }
    } as MatchResult;
    return res;
  },
  view(s, viewer): LoveLockView {
    const who = viewer ? s.players.indexOf(viewer) : -1;
    const clues = s.lock.clues.map((c, i) => (s.lock.shared[i] || (who >= 0 && s.lock.owner[i] === who) ? c : null));
    return { ...s, lock: { ...s.lock, clues, code: [] } };
  },
  bot(s, player, level, { now }) {
    const who = s.players.indexOf(player);
    if (s.phase !== 'play' || who !== s.turn) return null;
    const [lo, hi] = THINK[level];
    if (now - s.turnStart < lo + (hi - lo) * hash01(`${s.lockNo}:${s.turnNo}:${player}:t`)) return null;
    return partnerMove(s, who, level);
  }
};
