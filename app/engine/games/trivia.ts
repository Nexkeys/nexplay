import { NAIJA_QUESTIONS } from '../data/trivia-naija';
import otdb from '../data/trivia-otdb.json';
import { botPlan, hash01 } from '../timed';
import type { GameDef, MatchResult, PlayerId, Rng } from '../types';

export interface TriviaQuestion {
  pack: string;
  difficulty: 'easy' | 'medium' | 'hard';
  q: string;
  a: string;
  wrong: string[];
  source: 'nexplay' | 'otdb';
}

export const TRIVIA_PACKS: { id: string; label: string }[] = [
  { id: 'mixed', label: 'Mixed bag' },
  { id: 'naija', label: 'Naija' },
  { id: 'afrobeats', label: 'Afrobeats' },
  { id: 'football', label: 'Football' },
  { id: 'nollywood', label: 'Nollywood' },
  { id: 'general', label: 'General knowledge' },
  { id: 'science', label: 'Science' },
  { id: 'tech', label: 'Tech' },
  { id: 'geography', label: 'Geography' },
  { id: 'history', label: 'History' },
  { id: 'music', label: 'Music' },
  { id: 'film', label: 'Film' },
  { id: 'animals', label: 'Animals' },
  { id: 'sport', label: 'Sport' }
];

export const ALL_QUESTIONS: TriviaQuestion[] = [...NAIJA_QUESTIONS, ...((otdb as { questions: TriviaQuestion[] }).questions ?? [])];

export interface TriviaConfig extends Record<string, unknown> {
  pack: string;
  questions: number;
  seconds: number;
}

export interface TriviaState {
  pack: string;
  players: PlayerId[];
  bots: Record<PlayerId, 'easy' | 'medium' | 'hard'>;
  n: number;
  total: number;
  seconds: number;
  phase: 'question' | 'reveal' | 'over';
  start: number;
  deadline: number;
  question: { text: string; pack: string; difficulty: TriviaQuestion['difficulty']; options: string[]; source: TriviaQuestion['source'] };
  /** Hidden until the reveal. */
  correct: number;
  queue: number[];
  answers: Record<PlayerId, { choice: number; at: number; points: number; ok: boolean }>;
  streak: Record<PlayerId, number>;
  scores: Record<PlayerId, number>;
}

export type TriviaMove = { type: 'answer'; choice: number };

const REVEAL_MS = 4200;

/** Kahoot style: up to 1000 for a correct answer, scaled by speed, plus a streak bonus capped at 500. */
export function triviaPoints(elapsedMs: number, limitMs: number, streak: number): number {
  const speed = elapsedMs < 500 ? 1000 : Math.round(1000 * (1 - elapsedMs / limitMs / 2));
  const bonus = streak >= 2 ? Math.min(500, (streak - 1) * 100) : 0;
  return Math.max(500, speed) + bonus;
}

function pool(pack: string): number[] {
  const ids: number[] = [];
  ALL_QUESTIONS.forEach((q, i) => {
    if (pack === 'mixed' || q.pack === pack || (pack === 'sport' && q.pack === 'football')) ids.push(i);
  });
  return ids;
}

function ask(s: TriviaState, rng: Rng, now: number): TriviaState {
  const id = s.queue[s.n - 1];
  const item = ALL_QUESTIONS[id];
  const options = rng.shuffle([item.a, ...item.wrong.slice(0, 3)]);
  return {
    ...s,
    phase: 'question',
    start: now,
    deadline: now + s.seconds * 1000,
    question: { text: item.q, pack: item.pack, difficulty: item.difficulty, options, source: item.source },
    correct: options.indexOf(item.a),
    answers: {}
  };
}

function reveal(s: TriviaState, now: number): TriviaState {
  const streak = { ...s.streak };
  for (const p of s.players) if (!s.answers[p]?.ok) streak[p] = 0;
  const over = s.n >= s.total;
  return { ...s, streak, phase: over ? 'over' : 'reveal', deadline: over ? 0 : now + REVEAL_MS };
}

export const trivia: GameDef<TriviaState, TriviaMove, TriviaConfig> = {
  id: 'trivia',
  minPlayers: 1,
  maxPlayers: 8,
  selfTimed: true,
  defaultConfig: { pack: 'mixed', questions: 10, seconds: 20 },
  setup(players, config, { rng, now }) {
    const pack = TRIVIA_PACKS.some((p) => p.id === config.pack) ? config.pack : 'mixed';
    let ids = pool(pack);
    if (ids.length < 5) ids = pool('mixed');
    // Mixed games lean on easy and medium questions with a few hard ones.
    const shuffled = rng.shuffle(ids);
    const total = Math.min(Math.max(5, Number(config.questions) || 10), 20, shuffled.length);
    const queue = shuffled
      .sort((a, b) => (ALL_QUESTIONS[a].difficulty === 'hard' ? 1 : 0) - (ALL_QUESTIONS[b].difficulty === 'hard' ? 1 : 0) + (rng.next() - 0.5) * 1.2)
      .slice(0, total);
    const ids2 = players.map((p) => p.id);
    const base: TriviaState = {
      pack,
      players: ids2,
      bots: Object.fromEntries(players.filter((p) => p.bot).map((p) => [p.id, p.bot!])),
      n: 1,
      total,
      seconds: Math.min(30, Math.max(10, Number(config.seconds) || 20)),
      phase: 'question',
      start: 0,
      deadline: 0,
      question: { text: '', pack, difficulty: 'easy', options: [], source: 'nexplay' },
      correct: -1,
      queue,
      answers: {},
      streak: Object.fromEntries(ids2.map((p) => [p, 0])),
      scores: Object.fromEntries(ids2.map((p) => [p, 0]))
    };
    return ask(base, rng, now);
  },
  actors(s) {
    return s.phase === 'question' ? s.players.filter((p) => !s.answers[p]) : [];
  },
  validate(s, player, move) {
    if (s.phase !== 'question') return 'Wait for the next question.';
    if (!s.players.includes(player)) return 'You are not playing.';
    if (s.answers[player]) return 'You already answered.';
    if (!Number.isInteger(move?.choice) || move.choice < 0 || move.choice >= s.question.options.length) return 'Pick an answer.';
    return null;
  },
  apply(s, player, move, { now }) {
    const ok = move.choice === s.correct;
    const streak = ok ? s.streak[player] + 1 : 0;
    const points = ok ? triviaPoints(now - s.start, s.seconds * 1000, streak) : 0;
    const n: TriviaState = {
      ...s,
      answers: { ...s.answers, [player]: { choice: move.choice, at: now, points, ok } },
      streak: { ...s.streak, [player]: streak },
      scores: { ...s.scores, [player]: s.scores[player] + points }
    };
    return n.players.every((p) => n.answers[p]) ? reveal(n, now) : n;
  },
  deadline(s) {
    return s.phase === 'over' ? null : s.deadline;
  },
  tick(s, { now, rng }) {
    if (s.phase === 'over' || now < s.deadline) return null;
    if (s.phase === 'question') return reveal(s, now);
    return ask({ ...s, n: s.n + 1 }, rng, now);
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
    return { ranking, scores: s.scores, draw: ranking[0].length > 1, summary: 'Right answers, answered fast.' } satisfies MatchResult;
  },
  view(s, viewer) {
    if (s.phase !== 'question') return s;
    // During the question nobody sees the answer or what others picked.
    return {
      ...s,
      correct: -1,
      answers: Object.fromEntries(Object.entries(s.answers).map(([p, a]) => [p, p === viewer ? { ...a, ok: false, points: 0 } : { choice: -1, at: a.at, points: 0, ok: false }]))
    };
  },
  bot(s, player, level, { now }) {
    if (s.phase !== 'question' || s.answers[player]) return null;
    const diff = { easy: 0.85, medium: 1, hard: 1.35 }[s.question.difficulty];
    const plan = botPlan(`${s.n}:${s.question.text}:${player}`, level, diff);
    if ((now - s.start) / (s.seconds * 1000) < plan.when) return null;
    if (plan.correct) return { type: 'answer', choice: s.correct };
    const wrong = [0, 1, 2, 3].filter((i) => i !== s.correct);
    return { type: 'answer', choice: wrong[Math.floor(hash01(`${s.n}:${player}:w`) * wrong.length)] };
  }
};
