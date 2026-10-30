import { sha256 } from '../sha256';
import type { BotLevel, GameDef, PlayerId } from '../types';

export type RpsMode = 'classic' | 'lizard-spock';
export type Choice = 'rock' | 'paper' | 'scissors' | 'lizard' | 'spock';

export interface RpsConfig extends Record<string, unknown> {
  mode: RpsMode;
  bestOf: number;
  seconds: number;
}

export const BEATS: Record<Choice, Partial<Record<Choice, string>>> = {
  rock: { scissors: 'crushes', lizard: 'crushes' },
  paper: { rock: 'covers', spock: 'disproves' },
  scissors: { paper: 'cut', lizard: 'decapitate' },
  lizard: { spock: 'poisons', paper: 'eats' },
  spock: { scissors: 'smashes', rock: 'vaporizes' }
};

export const choicesFor = (mode: RpsMode): Choice[] =>
  mode === 'classic' ? ['rock', 'paper', 'scissors'] : ['rock', 'paper', 'scissors', 'lizard', 'spock'];

export interface RpsRound {
  picks: [Choice | null, Choice | null];
  winner: 0 | 1 | null;
  verb: string;
}

export interface RpsState {
  mode: RpsMode;
  bestOf: number;
  seconds: number;
  players: [PlayerId, PlayerId];
  bots: PlayerId[];
  phase: 'choose' | 'reveal' | 'result' | 'over';
  deadline: number;
  commits: [string | null, string | null];
  picks: [Choice | null, Choice | null];
  history: RpsRound[];
  wins: [number, number];
}

export type RpsMove =
  | { type: 'commit'; hash: string }
  | { type: 'reveal'; choice: Choice; salt: string }
  | { type: 'pick'; choice: Choice };

export const commitHash = (choice: Choice, salt: string) => sha256(`${choice}:${salt}`);

const REVEAL_MS = 6000;
const RESULT_MS = 2600;

function decide(a: Choice | null, b: Choice | null): { winner: 0 | 1 | null; verb: string } {
  if (a && !b) return { winner: 0, verb: 'ran out of time' };
  if (b && !a) return { winner: 1, verb: 'ran out of time' };
  if (!a || !b || a === b) return { winner: null, verb: 'tie' };
  if (BEATS[a][b]) return { winner: 0, verb: BEATS[a][b]! };
  return { winner: 1, verb: BEATS[b][a]! };
}

function resolve(s: RpsState, now: number): RpsState {
  const { winner, verb } = decide(s.picks[0], s.picks[1]);
  const wins: [number, number] = [...s.wins];
  if (winner !== null) wins[winner]++;
  const target = Math.ceil(s.bestOf / 2);
  const history = [...s.history, { picks: [...s.picks] as [Choice | null, Choice | null], winner, verb }];
  const over = wins[0] >= target || wins[1] >= target || history.length >= s.bestOf * 3;
  return { ...s, wins, history, phase: over ? 'over' : 'result', deadline: over ? 0 : now + RESULT_MS };
}

function newRound(s: RpsState, now: number): RpsState {
  return { ...s, phase: 'choose', deadline: now + s.seconds * 1000, commits: [null, null], picks: [null, null] };
}

/** Moves to reveal once both players have locked in. Bots skip the sealing step. */
function afterCommit(s: RpsState, now: number): RpsState {
  if (s.commits.every(Boolean)) {
    const needReveal = s.players.some((p, i) => !s.bots.includes(p) && !s.picks[i]);
    if (!needReveal) return resolve(s, now);
    return { ...s, phase: 'reveal', deadline: now + REVEAL_MS };
  }
  return s;
}

// --- computer: several pattern models, trust the one that has been right lately ------------
function predictNext(history: (Choice | null)[], options: Choice[], order: number): Choice | null {
  const seq = history.filter(Boolean) as Choice[];
  if (seq.length <= order) return null;
  const ctx = seq.slice(seq.length - order).join(',');
  const counts = new Map<Choice, number>();
  for (let i = order; i < seq.length; i++) {
    if (seq.slice(i - order, i).join(',') === ctx) counts.set(seq[i], (counts.get(seq[i]) ?? 0) + 1);
  }
  let best: Choice | null = null, max = 0;
  for (const o of options) if ((counts.get(o) ?? 0) > max) [best, max] = [o, counts.get(o)!];
  return best;
}

function counter(c: Choice, options: Choice[]): Choice {
  const beaters = options.filter((o) => BEATS[o][c]);
  return beaters[0] ?? options[0];
}

function botChoice(s: RpsState, me: 0 | 1, level: BotLevel, rand: () => number): Choice {
  const options = choicesFor(s.mode);
  const pickRandom = () => options[Math.floor(rand() * options.length)];
  if (level === 'easy' || s.history.length < 2) return pickRandom();
  const theirs = s.history.map((h) => h.picks[1 - me]);
  if (level === 'medium') {
    const p = predictNext(theirs, options, 0);
    return p && rand() < 0.75 ? counter(p, options) : pickRandom();
  }
  // Hard: score each memory length on past rounds and follow the most accurate one.
  let bestOrder = 0, bestHits = -1;
  for (const order of [0, 1, 2, 3]) {
    let hits = 0;
    for (let t = Math.max(order + 1, theirs.length - 8); t < theirs.length; t++) {
      if (predictNext(theirs.slice(0, t), options, order) === theirs[t]) hits++;
    }
    if (hits > bestHits) [bestOrder, bestHits] = [order, hits];
  }
  const p = predictNext(theirs, options, bestOrder);
  return p && rand() < 0.9 ? counter(p, options) : pickRandom();
}

export const rps: GameDef<RpsState, RpsMove, RpsConfig> = {
  id: 'rps',
  minPlayers: 2,
  maxPlayers: 2,
  selfTimed: true,
  defaultConfig: { mode: 'classic', bestOf: 5, seconds: 8 },
  setup(players, config, { now }) {
    const bestOf = [1, 3, 5, 7].includes(Number(config.bestOf)) ? Number(config.bestOf) : 5;
    const seconds = Math.min(30, Math.max(4, Number(config.seconds) || 8));
    const base: RpsState = {
      mode: config.mode === 'lizard-spock' ? 'lizard-spock' : 'classic',
      bestOf,
      seconds,
      players: [players[0].id, players[1].id],
      bots: players.filter((p) => p.bot).map((p) => p.id),
      phase: 'choose',
      deadline: 0,
      commits: [null, null],
      picks: [null, null],
      history: [],
      wins: [0, 0]
    };
    return newRound(base, now);
  },
  actors(s) {
    if (s.phase === 'choose') return s.players.filter((_, i) => !s.commits[i]);
    if (s.phase === 'reveal') return s.players.filter((_, i) => !s.picks[i]);
    return [];
  },
  validate(s, player, move) {
    const i = s.players.indexOf(player);
    if (i < 0) return 'You are not playing.';
    const options = choicesFor(s.mode);
    if (move?.type === 'pick') {
      if (!s.bots.includes(player)) return 'Picks must be sealed first.';
      if (s.phase !== 'choose' || s.commits[i]) return 'Already locked in.';
      return options.includes(move.choice) ? null : 'Unknown choice.';
    }
    if (move?.type === 'commit') {
      if (s.phase !== 'choose') return 'Too late for this round.';
      if (s.commits[i]) return 'You already locked in.';
      return typeof move.hash === 'string' && move.hash.length === 64 ? null : 'Bad seal.';
    }
    if (move?.type === 'reveal') {
      if (s.phase !== 'reveal' && s.phase !== 'choose') return 'Nothing to reveal.';
      if (!s.commits[i] || s.picks[i]) return 'Nothing to reveal.';
      if (!options.includes(move.choice)) return 'Unknown choice.';
      return commitHash(move.choice, String(move.salt)) === s.commits[i] ? null : 'That does not match what you locked in.';
    }
    return 'Unknown move.';
  },
  apply(s, player, move, { now }) {
    const i = s.players.indexOf(player) as 0 | 1;
    const commits: [string | null, string | null] = [...s.commits];
    const picks: [Choice | null, Choice | null] = [...s.picks];
    if (move.type === 'pick') {
      commits[i] = 'bot';
      picks[i] = move.choice;
      return afterCommit({ ...s, commits, picks }, now);
    }
    if (move.type === 'commit') {
      commits[i] = move.hash;
      return afterCommit({ ...s, commits }, now);
    }
    picks[i] = move.choice;
    const n = { ...s, picks };
    return n.picks.every(Boolean) ? resolve(n, now) : n;
  },
  deadline(s) {
    return s.phase === 'over' ? null : s.deadline;
  },
  tick(s, { now }) {
    if (s.phase === 'over' || now < s.deadline) return null;
    if (s.phase === 'result') return newRound(s, now);
    // Time is up: whoever did not lock in (or did not reveal) loses the round.
    const picks: [Choice | null, Choice | null] = [...s.picks];
    if (s.phase === 'choose') for (let i = 0; i < 2; i++) if (!s.commits[i]) picks[i] = null;
    return resolve({ ...s, picks }, now);
  },
  result(s) {
    if (s.phase !== 'over') return null;
    const [a, b] = s.players;
    const scores = { [a]: s.wins[0], [b]: s.wins[1] };
    if (s.wins[0] === s.wins[1]) return { ranking: [[a, b]], scores, draw: true, summary: `Level at ${s.wins[0]} each.` };
    const w = s.wins[0] > s.wins[1] ? 0 : 1;
    return { ranking: [[s.players[w]], [s.players[1 - w]]], scores, draw: false, summary: `${Math.max(...s.wins)} to ${Math.min(...s.wins)}.` };
  },
  view(s, viewer) {
    // Never show a pick for the current round until both are revealed.
    if (s.phase === 'choose' || s.phase === 'reveal') {
      const i = viewer ? s.players.indexOf(viewer) : -1;
      return { ...s, picks: s.picks.map((p, k) => (k === i ? p : null)), commits: s.commits.map(Boolean) };
    }
    return { ...s, commits: s.commits.map(Boolean) };
  },
  bot(s, player, level, { rng }) {
    const i = s.players.indexOf(player) as 0 | 1;
    if (s.phase !== 'choose' || s.commits[i]) return null;
    return { type: 'pick', choice: botChoice(s, i, level, () => rng.next()) };
  }
};
