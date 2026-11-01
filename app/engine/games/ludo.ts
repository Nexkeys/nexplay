import type { BotLevel, Ctx, GameDef, MatchResult, PlayerId } from '../types';

/**
 * Ludo as played in Nigeria, for 2 to 4 players.
 *
 * Board: the 52 square track runs clockwise. Colour 0 (red) starts on track square 0, colour 1 (green)
 * on 13, colour 2 (yellow) on 26, colour 3 (blue) on 39. With two players the colours sit opposite.
 *
 * A seed is stored as its progress from its own start square:
 *   BASE (-10)  still in base
 *   -1 .. 50    on the track: track square = (start + progress) mod 52. Below 0 only happens after a
 *               lap under the capture before home rule.
 *   51 .. 55    in its home column
 *   56          home
 */
export interface LudoConfig extends Record<string, unknown> {
  /** Nobody can be captured on start squares and star squares. */
  safeSquares: boolean;
  /** A seed needs the exact number to reach home. Off: any roll that gets there is enough. */
  exactHome: boolean;
  /** A third six in a row ends the turn. */
  threeSixes: boolean;
  /** Naija house rule: capture a rival seed before any of your seeds may enter the home column. */
  captureFirst: boolean;
}

export type LudoMove = { kind: 'roll' } | { kind: 'move'; seed: number };

export interface LudoEvent {
  /** Counts every update, so boards can replay events in order and notice missed ones. */
  n: number;
  /** Player index. */
  p: number;
  roll: number;
  /** This update included a dice roll (possibly with the only possible move played straight away). */
  rolled: boolean;
  /** The seed that moved, or -1. */
  seed: number;
  from: number;
  to: number;
  /** Seeds sent back to base: [player, seed, progress it was at]. */
  hit: [number, number, number][];
  /** Roll again, pick a seed, turn passed, turn lost to three sixes, or the game was won. */
  next: 'again' | 'pick' | 'pass' | 'three' | 'win';
}

export interface LudoState {
  players: PlayerId[];
  /** Colour of each player: 0 red, 1 green, 2 yellow, 3 blue. */
  colours: number[];
  /** Progress of each player's four seeds. */
  seeds: number[][];
  turn: number;
  phase: 'roll' | 'move';
  /** The roll waiting to be used, or the last roll. 0 before the first roll. */
  dice: number;
  /** Sixes in a row this turn. */
  sixes: number;
  /** Rival seeds each player has captured. */
  captures: number[];
  rules: LudoConfig;
  last: LudoEvent | null;
  /** Dice rolls so far, to cap runaway games. */
  rolls: number;
  /** Player index of the winner, or -1. */
  winner: number;
  over: boolean;
}

export const BASE = -10;
export const LAST_TRACK = 50;
export const HOME = 56;
export const TRACK = 52;
const MAX_ROLLS = 4000;

/** Track squares where nobody can be captured: the four start squares and the four stars. */
export const SAFE_TRACK = [0, 8, 13, 21, 26, 34, 39, 47];
export const COLOUR_NAMES = ['Red', 'Green', 'Yellow', 'Blue'];

export const startOf = (colour: number) => colour * 13;

/** The track square a seed sits on, or null when it is in base, its home column or home. */
export function trackSquare(colour: number, progress: number): number | null {
  if (progress === BASE || progress > LAST_TRACK) return null;
  return (((startOf(colour) + progress) % TRACK) + TRACK) % TRACK;
}

const isSafe = (state: LudoState, square: number) => state.rules.safeSquares && SAFE_TRACK.includes(square);
/** False while a player still owes a capture under the capture before home rule. */
export const mayEnterHome = (state: LudoState, p: number) => !state.rules.captureFirst || state.captures[p] > 0;

/** Where a seed at `progress` ends up with a roll, or null when it cannot move. */
export function target(state: LudoState, p: number, progress: number, roll: number): number | null {
  if (progress === BASE) return roll === 6 ? 0 : null;
  if (progress >= HOME) return null;
  let t = progress + roll;
  // No capture yet: the seed goes round again instead of turning into its home column.
  if (progress <= LAST_TRACK && t > LAST_TRACK && !mayEnterHome(state, p)) return t - TRACK;
  if (t > HOME) {
    if (state.rules.exactHome) return null;
    t = HOME;
  }
  return t;
}

/** Seeds a player may move with this roll. */
export function legalSeeds(state: LudoState, p: number, roll: number): number[] {
  const out: number[] = [];
  state.seeds[p].forEach((progress, i) => {
    if (target(state, p, progress, roll) !== null) out.push(i);
  });
  return out;
}

/** Legal seeds, one per starting square: seeds stacked together, or all in base, make the same move. */
export function distinctSeeds(state: LudoState, p: number, roll: number): number[] {
  const seen = new Set<number>();
  return legalSeeds(state, p, roll).filter((i) => {
    const from = state.seeds[p][i];
    if (seen.has(from)) return false;
    seen.add(from);
    return true;
  });
}

export const seedsHome = (seeds: number[]) => seeds.filter((s) => s === HOME).length;
const progressOf = (seeds: number[]) => seeds.reduce((a, s) => a + (s === BASE ? 0 : Math.max(0, s)), 0);

function passTurn(state: LudoState): LudoState {
  return { ...state, turn: (state.turn + 1) % state.players.length, phase: 'roll', sixes: 0 };
}

function endIfLong(state: LudoState): LudoState {
  return !state.over && state.rolls >= MAX_ROLLS ? { ...state, over: true } : state;
}

/** Moves a seed with the current dice and settles captures, extra rolls and the win. No validation. */
function moveSeed(state: LudoState, seed: number, rolled: boolean, n: number): LudoState {
  const p = state.turn;
  const roll = state.dice;
  const from = state.seeds[p][seed];
  const to = target(state, p, from, roll)!;
  const seeds = state.seeds.map((s) => [...s]);
  seeds[p][seed] = to;
  const captures = [...state.captures];
  const hit: [number, number, number][] = [];

  const square = trackSquare(state.colours[p], to);
  if (square !== null && !isSafe(state, square)) {
    for (let q = 0; q < state.players.length; q++) {
      if (q === p) continue;
      seeds[q].forEach((sp, i) => {
        if (trackSquare(state.colours[q], sp) === square) {
          hit.push([q, i, sp]);
          seeds[q][i] = BASE;
        }
      });
    }
    captures[p] += hit.length;
  }

  let next: LudoEvent['next'];
  let out: LudoState = { ...state, seeds, captures };
  if (seeds[p].every((s) => s === HOME)) {
    next = 'win';
    out = { ...out, over: true, winner: p, phase: 'roll' };
  } else if (roll === 6 || hit.length > 0 || to === HOME) {
    next = 'again';
    out = { ...out, phase: 'roll' };
  } else {
    next = 'pass';
    out = passTurn(out);
  }
  return { ...out, last: { n, p, roll, rolled, seed, from, to, hit, next } };
}

function rollDice(state: LudoState, ctx: Ctx): LudoState {
  const p = state.turn;
  const d = ctx.rng.int(6) + 1;
  const n = (state.last?.n ?? 0) + 1;
  const sixes = d === 6 ? state.sixes + 1 : 0;
  const rolled: LudoState = { ...state, dice: d, sixes, rolls: state.rolls + 1 };
  const event = (next: LudoEvent['next']): LudoEvent => ({ n, p, roll: d, rolled: true, seed: -1, from: 0, to: 0, hit: [], next });

  if (state.rules.threeSixes && sixes >= 3) return endIfLong({ ...passTurn(rolled), last: event('three') });
  const options = distinctSeeds(rolled, p, d);
  if (options.length === 0) {
    // Nothing can move. A six still earns another roll.
    const out = d === 6 ? { ...rolled, phase: 'roll' as const } : passTurn(rolled);
    return endIfLong({ ...out, last: event(d === 6 ? 'again' : 'pass') });
  }
  // Only one possible move: play it so nobody waits.
  if (options.length === 1) return endIfLong(moveSeed(rolled, options[0], true, n));
  return { ...rolled, phase: 'move', last: event('pick') };
}

/* ------------------------------------------------------------------ computer players */

/** Roughly how likely a seed at this progress is to be captured before its owner moves again, 0 to 1. */
export function danger(state: LudoState, p: number, progress: number): number {
  const square = trackSquare(state.colours[p], progress);
  if (square === null || isSafe(state, square)) return 0;
  let threats = 0;
  for (let q = 0; q < state.players.length; q++) {
    if (q === p) continue;
    const colour = state.colours[q];
    for (const sp of state.seeds[q]) {
      if (sp === BASE) {
        // A seed coming out with a six lands on its own start square.
        if (square === startOf(colour)) threats += 1;
        continue;
      }
      const from = trackSquare(colour, sp);
      if (from === null) continue;
      const dist = (square - from + TRACK) % TRACK;
      if (dist < 1 || dist > 6) continue;
      // A rival seed turns into its home column rather than passing, unless it still owes a capture.
      if (sp + dist > LAST_TRACK && mayEnterHome(state, q)) continue;
      threats += 1;
    }
  }
  return Math.min(1, threats / 6 + (threats > 1 ? 0.1 : 0));
}

function scoreMove(state: LudoState, p: number, seed: number, level: BotLevel): number {
  const from = state.seeds[p][seed];
  const after = moveSeed(state, seed, false, 0);
  const to = after.seeds[p][seed];
  const hits = after.last?.hit ?? [];
  const victimValue = hits.reduce((a, [, , sp]) => a + Math.max(0, sp) + 8, 0);
  const entersColumn = to > LAST_TRACK && from <= LAST_TRACK && to !== HOME;

  if (level !== 'hard') {
    // Capture > escape danger > leave base > reach home > advance.
    let s = Math.max(0, to);
    if (hits.length) s += 10000 + victimValue;
    if (from !== BASE && danger(state, p, from) > 0 && danger(after, p, to) === 0) s += 5000 + Math.max(0, from);
    if (from === BASE) s += 3000;
    if (to === HOME) s += 2000;
    else if (entersColumn) s += 1000;
    return s;
  }

  // Hard: weigh the whole position after the move, including danger from rivals up to six behind.
  let s = 0;
  if (hits.length) s += 60 + victimValue * 2;
  if (to === HOME) s += 45;
  else if (entersColumn) s += 30;
  if (from === BASE) s += 32;
  else s += (to - from) * 0.8;
  const risk = (st: LudoState) => st.seeds[p].reduce((a, sp) => a + danger(st, p, sp) * (Math.max(0, sp) + 12), 0);
  s += (risk(state) - risk(after)) * 1.6;
  const sq = trackSquare(state.colours[p], to);
  if (sq !== null && isSafe(state, sq)) s += 6;
  return s;
}

function pickBest(state: LudoState, p: number, level: BotLevel, ctx: Ctx): number {
  const options = ctx.rng.shuffle(distinctSeeds(state, p, state.dice));
  let best = options[0];
  let bestScore = -Infinity;
  for (const seed of options) {
    const sc = scoreMove(state, p, seed, level);
    if (sc > bestScore) {
      bestScore = sc;
      best = seed;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ the game */

/** Colours for each table size. Two players sit opposite each other. */
export const coloursFor = (count: number) => (count === 2 ? [0, 2] : count === 3 ? [0, 1, 2] : [0, 1, 2, 3]);

export const ludo: GameDef<LudoState, LudoMove, LudoConfig> = {
  id: 'ludo',
  minPlayers: 2,
  maxPlayers: 4,
  defaultConfig: { safeSquares: true, exactHome: true, threeSixes: true, captureFirst: false },
  setup(players, config) {
    const count = Math.max(2, Math.min(4, players.length));
    return {
      players: players.slice(0, count).map((p) => p.id),
      colours: coloursFor(count),
      seeds: Array.from({ length: count }, () => [BASE, BASE, BASE, BASE]),
      turn: 0,
      phase: 'roll',
      dice: 0,
      sixes: 0,
      captures: Array(count).fill(0),
      rules: {
        safeSquares: config.safeSquares !== false,
        exactHome: config.exactHome !== false,
        threeSixes: config.threeSixes !== false,
        captureFirst: config.captureFirst === true
      },
      last: null,
      rolls: 0,
      winner: -1,
      over: false
    };
  },
  actors(state) {
    return state.over ? [] : [state.players[state.turn]];
  },
  validate(state, player, move) {
    if (state.over) return 'The game is over.';
    if (state.players[state.turn] !== player) return 'It is not your turn.';
    if (move?.kind === 'roll') return state.phase === 'roll' ? null : 'Pick a seed to move first.';
    if (move?.kind === 'move') {
      if (state.phase !== 'move') return 'Roll the dice first.';
      if (!Number.isInteger(move.seed) || move.seed < 0 || move.seed > 3) return 'Pick one of your seeds.';
      if (!legalSeeds(state, state.turn, state.dice).includes(move.seed)) {
        const at = state.seeds[state.turn][move.seed];
        if (at === BASE) return 'You need a six to bring a seed out.';
        if (at === HOME) return 'That seed is already home.';
        return 'That seed needs the exact number to get home.';
      }
      return null;
    }
    return 'Roll the dice or pick a seed.';
  },
  apply(state, _player, move, ctx) {
    if (move.kind === 'roll') return rollDice(state, ctx);
    return endIfLong(moveSeed(state, move.seed, false, (state.last?.n ?? 0) + 1));
  },
  result(state) {
    if (!state.over) return null;
    // The winner first, then by seeds home, then by distance travelled.
    const key = (i: number) => (i === state.winner ? 1e6 : 0) + seedsHome(state.seeds[i]) * 1000 + progressOf(state.seeds[i]);
    const order = state.players.map((_, i) => i).sort((a, b) => key(b) - key(a));
    const ranking: PlayerId[][] = [];
    order.forEach((i, k) => {
      if (k > 0 && key(order[k - 1]) === key(i)) ranking[ranking.length - 1].push(state.players[i]);
      else ranking.push([state.players[i]]);
    });
    const scores: Record<PlayerId, number> = {};
    state.players.forEach((id, i) => (scores[id] = seedsHome(state.seeds[i])));
    const summary =
      state.winner >= 0
        ? `${COLOUR_NAMES[state.colours[state.winner]]} brought all four seeds home first.`
        : 'The game ran very long, so it was settled on seeds home and distance travelled.';
    return { ranking, scores, draw: ranking.length === 1, summary } satisfies MatchResult;
  },
  view(state) {
    return state; // nothing is hidden in Ludo
  },
  random(state, player, { rng }) {
    if (state.over || state.players[state.turn] !== player) return null;
    if (state.phase === 'roll') return { kind: 'roll' };
    const options = legalSeeds(state, state.turn, state.dice);
    return options.length ? { kind: 'move', seed: rng.pick(options) } : null;
  },
  bot(state, player, level, ctx) {
    if (state.over || state.players[state.turn] !== player) return null;
    if (state.phase === 'roll') return { kind: 'roll' };
    const options = legalSeeds(state, state.turn, state.dice);
    if (!options.length) return null;
    if (level === 'easy' && ctx.rng.next() < 0.7) return { kind: 'move', seed: ctx.rng.pick(options) };
    return { kind: 'move', seed: pickBest(state, state.turn, level, ctx) };
  }
};
