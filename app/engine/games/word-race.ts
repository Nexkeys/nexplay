import { botPlan, hash01 } from '../timed';
import type { GameDef, MatchResult, PlayerId, Rng } from '../types';

export type WordMode = 'unscramble' | 'hunt';

export interface WordConfig extends Record<string, unknown> {
  mode: WordMode;
  rounds: number;
  seconds: number;
}

export interface WordState {
  mode: WordMode;
  players: PlayerId[];
  bots: Record<PlayerId, 'easy' | 'medium' | 'hard'>;
  round: number;
  rounds: number;
  seconds: number;
  phase: 'play' | 'result' | 'over';
  start: number;
  deadline: number;
  letters: string;
  /** Every accepted answer. Hidden from players until the round ends. */
  answers: string[];
  /** Unscramble: order of solvers. */
  solved: PlayerId[];
  /** Word Hunt: words found per player. */
  found: Record<PlayerId, string[]>;
  scores: Record<PlayerId, number>;
  feed: { by: PlayerId; text: string; points: number }[];
  history: { id: string; letters: string; answer: string; winner: PlayerId | null }[];
  /** The puzzle for each round, picked at the start. Never sent to players. */
  queue: Puzzle[];
}

export type WordMove = { type: 'guess'; word: string };

/** One round: the word to find (Unscramble) or the seed word (Word Hunt), then every accepted answer. */
type Puzzle = string[];

// Puzzles ship as shards (scripts/build-data.mjs) so a game downloads only a few of them.
const SHARD_FILES = import.meta.glob<Puzzle[]>('../data/words/*.json', { import: 'default' });
const SHARDS = Object.keys(SHARD_FILES).map((path) => {
  const key = path.slice(path.lastIndexOf('/') + 1, -'.json'.length);
  return { path, key, mode: key.replace(/-\d+$/, '') as WordMode };
});
const loaded = new Map<string, Puzzle[]>();
/** Ids are the mode's first letter and the word, so Unscramble and Word Hunt never clash. */
const idOf = (mode: WordMode, p: Puzzle) => `${mode[0]}:${p[0]}`;
/** What `prepare` picked for the next `setup`. */
let prepared: { mode: WordMode | ''; puzzles: Puzzle[] } = { mode: '', puzzles: [] };
/** How many fresh puzzles to have on hand before stopping. */
const ENOUGH = 60;

/** Downloads random shards for the mode until there are enough puzzles nobody at the table has had. */
async function preparePuzzles(config: WordConfig, avoid: ReadonlySet<string>, state?: WordState) {
  // A saved match carries its own puzzles.
  if (state) return;
  const mode: WordMode = config.mode === 'hunt' ? 'hunt' : 'unscramble';
  const shards = SHARDS.filter((s) => s.mode === mode)
    .map((s) => ({ s, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.s);
  const all: Puzzle[] = [];
  const fresh = () => all.filter((p) => !avoid.has(idOf(mode, p)));
  for (const s of shards) {
    if (!loaded.has(s.key)) loaded.set(s.key, await SHARD_FILES[s.path]());
    all.push(...loaded.get(s.key)!);
    if (fresh().length >= ENOUGH) break;
  }
  const f = fresh();
  // Only once every puzzle has been seen do repeats come back.
  prepared = { mode, puzzles: f.length >= 15 ? f : all };
}

const RESULT_MS = 3200;
const UNSCRAMBLE_POINTS = [500, 350, 250, 150];
export const huntPoints = (len: number) => ({ 3: 50, 4: 100, 5: 200, 6: 350, 7: 600 })[Math.min(len, 7) as 3 | 4 | 5 | 6 | 7] ?? 0;

function scramble(word: string, rng: Rng): string {
  for (let i = 0; i < 20; i++) {
    const s = rng.shuffle([...word]).join('');
    if (s !== word) return s;
  }
  return word.split('').reverse().join('');
}

function deal(s: WordState, rng: Rng, now: number): WordState {
  const [word, ...rest] = s.queue[s.round - 1];
  if (s.mode === 'unscramble') {
    return { ...s, phase: 'play', start: now, deadline: now + s.seconds * 1000, letters: scramble(word, rng).toUpperCase(), answers: [word, ...rest], solved: [], found: {} };
  }
  // Word Hunt: the seed's letters, and every word they make, longest first.
  const found = Object.fromEntries(s.players.map((p) => [p, [] as string[]]));
  return { ...s, phase: 'play', start: now, deadline: now + s.seconds * 1000, letters: scramble(word, rng).toUpperCase(), answers: rest, solved: [], found };
}

function closeRound(s: WordState, now: number): WordState {
  const winner = s.mode === 'unscramble' ? s.solved[0] ?? null : Object.entries(s.found).sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? null;
  const puzzle = s.queue[s.round - 1];
  const history = [...s.history, { id: idOf(s.mode, puzzle), letters: s.letters, answer: s.mode === 'unscramble' ? s.answers[0] : puzzle[0], winner }];
  const over = s.round >= s.rounds;
  return { ...s, history, phase: over ? 'over' : 'result', deadline: over ? 0 : now + RESULT_MS };
}

export const wordRace: GameDef<WordState, WordMove, WordConfig> = {
  id: 'word-race',
  minPlayers: 1,
  maxPlayers: 8,
  selfTimed: true,
  defaultConfig: { mode: 'unscramble', rounds: 8, seconds: 30 },
  prepare: preparePuzzles,
  seen(view) {
    return ((view as Partial<WordState> | null)?.history ?? []).map((h) => h.id).filter(Boolean);
  },
  setup(players, config, { rng, now, avoid }) {
    const mode: WordMode = config.mode === 'hunt' ? 'hunt' : 'unscramble';
    if (prepared.mode !== mode || !prepared.puzzles.length) throw new Error('Word puzzles are not loaded yet.');
    const rounds = mode === 'hunt' ? Math.min(3, Math.max(1, Number(config.rounds) || 1)) : Math.min(15, Math.max(3, Number(config.rounds) || 8));
    const seconds = mode === 'hunt' ? Math.min(180, Math.max(45, Number(config.seconds) || 90)) : Math.min(60, Math.max(15, Number(config.seconds) || 30));
    const base: WordState = {
      mode,
      players: players.map((p) => p.id),
      bots: Object.fromEntries(players.filter((p) => p.bot).map((p) => [p.id, p.bot!])),
      round: 1,
      rounds,
      seconds,
      phase: 'play',
      start: 0,
      deadline: 0,
      letters: '',
      answers: [],
      solved: [],
      found: {},
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      feed: [],
      history: [],
      queue: []
    };
    const fresh = prepared.puzzles.filter((p) => !avoid?.has(idOf(mode, p)));
    base.queue = rng.shuffle(fresh.length >= rounds ? fresh : prepared.puzzles).slice(0, rounds);
    base.rounds = base.queue.length;
    return deal(base, rng, now);
  },
  actors(s) {
    if (s.phase !== 'play') return [];
    return s.mode === 'unscramble' ? s.players.filter((p) => !s.solved.includes(p)) : s.players;
  },
  validate(s, player, move) {
    if (s.phase !== 'play') return 'Wait for the next round.';
    if (!s.players.includes(player)) return 'You are not playing.';
    const word = String(move?.word ?? '').trim().toLowerCase();
    if (word.length < 3) return 'Words need at least three letters.';
    if (!/^[a-z]+$/.test(word)) return 'Letters only.';
    const pool = [...s.letters.toLowerCase()];
    for (const ch of word) {
      const i = pool.indexOf(ch);
      if (i < 0) return 'Use only the letters on the board.';
      pool.splice(i, 1);
    }
    if (s.mode === 'unscramble') {
      if (s.solved.includes(player)) return 'You already solved this one.';
      if (word.length !== s.letters.length) return `Use all ${s.letters.length} letters.`;
      return s.answers.includes(word) ? null : 'Not quite. Try again.';
    }
    if (s.found[player]?.includes(word)) return 'You already found that word.';
    return s.answers.includes(word) ? null : 'Not in our dictionary.';
  },
  apply(s, player, move, { now }) {
    const word = move.word.trim().toLowerCase();
    if (s.mode === 'unscramble') {
      const place = s.solved.length;
      const timeBonus = Math.round(150 * Math.max(0, (s.deadline - now) / (s.seconds * 1000)));
      const points = (UNSCRAMBLE_POINTS[place] ?? 100) + timeBonus;
      const solved = [...s.solved, player];
      const n: WordState = {
        ...s,
        solved,
        scores: { ...s.scores, [player]: s.scores[player] + points },
        feed: [...s.feed.slice(-11), { by: player, text: place === 0 ? 'solved it first' : `solved it, place ${place + 1}`, points }]
      };
      // The round ends when everyone has solved it, or a few seconds after the first solver.
      if (solved.length === s.players.length) return closeRound(n, now);
      if (place === 0) return { ...n, deadline: Math.min(n.deadline, now + 8000) };
      return n;
    }
    const points = huntPoints(word.length) + (word.length === 7 ? 400 : 0);
    return {
      ...s,
      found: { ...s.found, [player]: [...s.found[player], word] },
      scores: { ...s.scores, [player]: s.scores[player] + points },
      feed: [...s.feed.slice(-11), { by: player, text: word.length >= 6 ? `found a ${word.length} letter word` : 'found a word', points }]
    };
  },
  deadline(s) {
    return s.phase === 'over' ? null : s.deadline;
  },
  tick(s, { now, rng }) {
    if (s.phase === 'over' || now < s.deadline) return null;
    if (s.phase === 'play') return closeRound(s, now);
    return deal({ ...s, round: s.round + 1 }, rng, now);
  },
  result(s) {
    if (s.phase !== 'over') return null;
    const order = [...s.players].sort((a, b) => s.scores[b] - s.scores[a]);
    const ranking: PlayerId[][] = [];
    for (const p of order) {
      const last = ranking[ranking.length - 1];
      if (last && s.scores[last[0]] === s.scores[p]) last.push(p);
      else ranking.push([p]);
    }
    return { ranking, scores: s.scores, draw: ranking[0].length > 1, summary: s.mode === 'hunt' ? 'Most points from words found.' : 'Fastest unscrambler wins.' } satisfies MatchResult;
  },
  view(full, viewer) {
    // Upcoming puzzles would give the answers away.
    const s = { ...full, queue: [] };
    if (s.phase !== 'play') return s;
    const mine = viewer ? s.found[viewer] ?? [] : [];
    return {
      ...s,
      answers: s.mode === 'hunt' ? s.answers.map((w) => (mine.includes(w) ? w : w.length)) : [],
      found: Object.fromEntries(Object.entries(s.found).map(([p, words]) => [p, p === viewer ? words : words.length]))
    };
  },
  bot(s, player, level, { now }) {
    if (s.phase !== 'play') return null;
    const elapsed = (now - s.start) / (s.seconds * 1000);
    if (s.mode === 'unscramble') {
      if (s.solved.includes(player)) return null;
      const plan = botPlan(`${s.letters}:${player}`, level, s.letters.length > 6 ? 1.2 : 1);
      return plan.correct && elapsed >= plan.when ? { type: 'guess', word: s.answers[0] } : null;
    }
    // Word Hunt: the bot finds words gradually, preferring shorter ones on lower levels.
    const pace = { easy: 0.25, medium: 0.45, hard: 0.7 }[level];
    const target = Math.floor(s.answers.length * pace * Math.min(1, elapsed * 1.15));
    const mine = s.found[player] ?? [];
    if (mine.length >= target) return null;
    const pool = [...s.answers].sort((a, b) => (level === 'hard' ? b.length - a.length : a.length - b.length));
    const next = pool.find((w) => !mine.includes(w) && hash01(`${w}:${player}`) < (level === 'easy' && w.length > 5 ? 0.2 : 0.9));
    return next ? { type: 'guess', word: next } : null;
  }
};
