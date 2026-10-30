import { botPlan } from '../timed';
import type { GameDef, MatchResult, PlayerId, Rng } from '../types';

export type MathMode = 'sprint' | 'make24';
export type MathLevel = 'easy' | 'medium' | 'hard';

export interface MathConfig extends Record<string, unknown> {
  mode: MathMode;
  level: MathLevel;
  questions: number;
}

export interface MathState {
  mode: MathMode;
  level: MathLevel;
  players: PlayerId[];
  bots: Record<PlayerId, 'easy' | 'medium' | 'hard'>;
  q: number;
  total: number;
  seconds: number;
  phase: 'play' | 'result' | 'over';
  start: number;
  deadline: number;
  prompt: string;
  numbers: number[];
  /** Hidden until the question closes. */
  answer: string;
  answered: Record<PlayerId, { ok: boolean; at: number; points: number; value: string }>;
  streak: Record<PlayerId, number>;
  scores: Record<PlayerId, number>;
}

export type MathMove = { type: 'answer'; value: string };

const RESULT_MS = 1800;

// --- exact arithmetic for Make 24 ------------------------------------------
type Frac = [number, number];
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const norm = ([n, d]: Frac): Frac => {
  if (d === 0) throw new Error('Division by zero');
  const g = gcd(n, d) || 1;
  const s = d < 0 ? -1 : 1;
  return [(s * n) / g, (s * d) / g];
};
const ops: Record<string, (a: Frac, b: Frac) => Frac> = {
  '+': (a, b) => norm([a[0] * b[1] + b[0] * a[1], a[1] * b[1]]),
  '-': (a, b) => norm([a[0] * b[1] - b[0] * a[1], a[1] * b[1]]),
  '*': (a, b) => norm([a[0] * b[0], a[1] * b[1]]),
  '/': (a, b) => norm([a[0] * b[1], a[1] * b[0]])
};

/** Parses + - * / and brackets. Returns the value and the numbers used. */
export function evaluate(expr: string): { value: Frac; used: number[] } {
  const src = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
  if (!/^[\d+\-*/()]+$/.test(src)) throw new Error('Use numbers, + − × ÷ and brackets only.');
  let i = 0;
  const used: number[] = [];
  const peek = () => src[i];
  const parseExpr = (): Frac => {
    let v = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = src[i++];
      v = ops[op](v, parseTerm());
    }
    return v;
  };
  const parseTerm = (): Frac => {
    let v = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = src[i++];
      v = ops[op](v, parseFactor());
    }
    return v;
  };
  const parseFactor = (): Frac => {
    if (peek() === '(') {
      i++;
      const v = parseExpr();
      if (src[i++] !== ')') throw new Error('Check your brackets.');
      return v;
    }
    const m = /^\d+/.exec(src.slice(i));
    if (!m) throw new Error('Something is missing in that sum.');
    i += m[0].length;
    used.push(Number(m[0]));
    return [Number(m[0]), 1];
  };
  const value = parseExpr();
  if (i !== src.length) throw new Error('Check your sum.');
  return { value, used };
}

/** Finds one way to make 24, or null. */
export function solve24(nums: number[]): string | null {
  const go = (items: { v: Frac; e: string }[]): string | null => {
    if (items.length === 1) return items[0].v[0] === 24 && items[0].v[1] === 1 ? items[0].e : null;
    for (let a = 0; a < items.length; a++)
      for (let b = 0; b < items.length; b++) {
        if (a === b) continue;
        const rest = items.filter((_, k) => k !== a && k !== b);
        for (const op of ['+', '-', '*', '/']) {
          if ((op === '+' || op === '*') && a > b) continue;
          let v: Frac;
          try {
            v = ops[op](items[a].v, items[b].v);
          } catch {
            continue;
          }
          const sym = { '+': '+', '-': '−', '*': '×', '/': '÷' }[op];
          const found = go([...rest, { v, e: `(${items[a].e} ${sym} ${items[b].e})` }]);
          if (found) return found;
        }
      }
    return null;
  };
  const r = go(nums.map((n) => ({ v: [n, 1] as Frac, e: String(n) })));
  return r ? r.replace(/^\((.*)\)$/, '$1') : null;
}

// --- question generators ----------------------------------------------------
const r = (rng: Rng, a: number, b: number) => a + rng.int(b - a + 1);

function sprintQuestion(level: MathLevel, rng: Rng): { prompt: string; answer: number } {
  const kind = rng.int(level === 'hard' ? 6 : 4);
  if (level === 'easy') {
    if (kind === 0) { const a = r(rng, 2, 20), b = r(rng, 2, 20); return { prompt: `${a} + ${b}`, answer: a + b }; }
    if (kind === 1) { const a = r(rng, 8, 30), b = r(rng, 1, a - 1); return { prompt: `${a} − ${b}`, answer: a - b }; }
    if (kind === 2) { const a = r(rng, 2, 6), b = r(rng, 2, 10); return { prompt: `${a} × ${b}`, answer: a * b }; }
    const b = r(rng, 2, 5), q = r(rng, 2, 10); return { prompt: `${b * q} ÷ ${b}`, answer: q };
  }
  if (level === 'medium') {
    if (kind === 0) { const a = r(rng, 15, 99), b = r(rng, 15, 99); return { prompt: `${a} + ${b}`, answer: a + b }; }
    if (kind === 1) { const a = r(rng, 40, 150), b = r(rng, 11, a - 1); return { prompt: `${a} − ${b}`, answer: a - b }; }
    if (kind === 2) { const a = r(rng, 4, 12), b = r(rng, 6, 15); return { prompt: `${a} × ${b}`, answer: a * b }; }
    const b = r(rng, 3, 12), q = r(rng, 3, 15); return { prompt: `${b * q} ÷ ${b}`, answer: q };
  }
  if (kind === 0) { const a = r(rng, 12, 49), b = r(rng, 3, 9); return { prompt: `${a} × ${b}`, answer: a * b }; }
  if (kind === 1) { const a = r(rng, 3, 12), b = r(rng, 3, 12), c = r(rng, 5, 60); return { prompt: `${a} × ${b} + ${c}`, answer: a * b + c }; }
  if (kind === 2) { const a = r(rng, 11, 25); return { prompt: `${a}²`, answer: a * a }; }
  if (kind === 3) { const p = rng.pick([10, 20, 25, 50, 75]), base = rng.pick([40, 80, 120, 200, 360, 500]); return { prompt: `${p}% of ${base}`, answer: (p * base) / 100 }; }
  if (kind === 4) { const b = r(rng, 6, 19), q = r(rng, 7, 25); return { prompt: `${b * q} ÷ ${b}`, answer: q }; }
  const a = r(rng, 120, 999), b = r(rng, 101, a - 1); return { prompt: `${a} − ${b}`, answer: a - b };
}

function make24(rng: Rng, level: MathLevel): { numbers: number[]; answer: string } {
  const max = level === 'easy' ? 9 : 13;
  for (let tries = 0; tries < 500; tries++) {
    const nums = [r(rng, 1, max), r(rng, 1, max), r(rng, 1, max), r(rng, 1, max)];
    const sol = solve24(nums);
    if (!sol) continue;
    // Easy puzzles avoid fractions on the way.
    if (level === 'easy' && sol.includes('÷')) continue;
    if (level === 'hard' && !sol.includes('÷') && rng.next() < 0.7) continue;
    return { numbers: nums, answer: sol };
  }
  return { numbers: [3, 3, 8, 8], answer: '8 ÷ (3 − 8 ÷ 3)' };
}

function deal(s: MathState, rng: Rng, now: number): MathState {
  const base = { ...s, phase: 'play' as const, start: now, deadline: now + s.seconds * 1000, answered: {} };
  if (s.mode === 'make24') {
    const p = make24(rng, s.level);
    return { ...base, prompt: p.numbers.join('  '), numbers: p.numbers, answer: p.answer };
  }
  const q = sprintQuestion(s.level, rng);
  return { ...base, prompt: q.prompt, numbers: [], answer: String(q.answer) };
}

function close(s: MathState, now: number): MathState {
  const over = s.q >= s.total;
  const streak = { ...s.streak };
  for (const p of s.players) if (!s.answered[p]?.ok) streak[p] = 0;
  return { ...s, streak, phase: over ? 'over' : 'result', deadline: over ? 0 : now + RESULT_MS };
}

export const quickMath: GameDef<MathState, MathMove, MathConfig> = {
  id: 'quick-math',
  minPlayers: 1,
  maxPlayers: 8,
  selfTimed: true,
  defaultConfig: { mode: 'sprint', level: 'medium', questions: 15 },
  setup(players, config, { rng, now }) {
    const mode: MathMode = config.mode === 'make24' ? 'make24' : 'sprint';
    const level: MathLevel = (['easy', 'medium', 'hard'] as const).includes(config.level) ? config.level : 'medium';
    const total = mode === 'make24' ? Math.min(10, Math.max(3, Number(config.questions) || 5)) : Math.min(30, Math.max(5, Number(config.questions) || 15));
    const ids = players.map((p) => p.id);
    const base: MathState = {
      mode, level, players: ids,
      bots: Object.fromEntries(players.filter((p) => p.bot).map((p) => [p.id, p.bot!])),
      q: 1, total,
      seconds: mode === 'make24' ? (level === 'hard' ? 90 : 60) : level === 'easy' ? 12 : level === 'medium' ? 15 : 20,
      phase: 'play', start: 0, deadline: 0, prompt: '', numbers: [], answer: '',
      answered: {},
      streak: Object.fromEntries(ids.map((p) => [p, 0])),
      scores: Object.fromEntries(ids.map((p) => [p, 0]))
    };
    return deal(base, rng, now);
  },
  actors(s) {
    if (s.phase !== 'play') return [];
    return s.players.filter((p) => (s.mode === 'sprint' ? !s.answered[p] : !s.answered[p]?.ok));
  },
  validate(s, player, move) {
    if (s.phase !== 'play') return 'Wait for the next question.';
    if (!s.players.includes(player)) return 'You are not playing.';
    const value = String(move?.value ?? '').trim();
    if (!value) return 'Type an answer.';
    if (s.mode === 'sprint') return s.answered[player] ? 'You already answered.' : /^-?\d+(\.\d+)?$/.test(value) ? null : 'Numbers only.';
    if (s.answered[player]?.ok) return 'You already solved it.';
    try {
      const { value: v, used } = evaluate(value);
      if ([...used].sort((a, b) => a - b).join() !== [...s.numbers].sort((a, b) => a - b).join()) return 'Use each of the four numbers exactly once.';
      if (v[0] !== 24 || v[1] !== 1) return `That makes ${v[1] === 1 ? v[0] : `${v[0]}/${v[1]}`}, not 24.`;
    } catch (e) {
      return e instanceof Error ? e.message : 'That sum does not work.';
    }
    return null;
  },
  apply(s, player, move, { now }) {
    const value = String(move.value).trim();
    const left = Math.max(0, (s.deadline - now) / (s.seconds * 1000));
    const ok = s.mode === 'make24' ? true : Number(value) === Number(s.answer);
    const streak = ok ? s.streak[player] + 1 : 0;
    const mult = 1 + Math.min(streak - 1, 5) * 0.1;
    const solvedBefore = Object.values(s.answered).filter((a) => a.ok).length;
    const base = s.mode === 'make24' ? Math.max(150, 400 - solvedBefore * 75) : 100;
    const points = ok ? Math.round((base + Math.round((s.mode === 'make24' ? 300 : 100) * left)) * Math.max(1, mult)) : 0;
    const n: MathState = {
      ...s,
      answered: { ...s.answered, [player]: { ok, at: now, points, value } },
      streak: { ...s.streak, [player]: streak },
      scores: { ...s.scores, [player]: s.scores[player] + points }
    };
    const done = n.players.every((p) => (n.mode === 'sprint' ? n.answered[p] : n.answered[p]?.ok));
    return done ? close(n, now) : n;
  },
  deadline(s) {
    return s.phase === 'over' ? null : s.deadline;
  },
  tick(s, { now, rng }) {
    if (s.phase === 'over' || now < s.deadline) return null;
    if (s.phase === 'play') return close(s, now);
    return deal({ ...s, q: s.q + 1 }, rng, now);
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
    return { ranking, scores: s.scores, draw: ranking[0].length > 1, summary: s.mode === 'make24' ? 'Most points from puzzles solved.' : 'Speed and streaks decide it.' } satisfies MatchResult;
  },
  view(s, viewer) {
    if (s.phase !== 'play') return s;
    // While a question is open nobody sees the answer or what anyone else typed.
    const answered = Object.fromEntries(Object.entries(s.answered).map(([p, a]) => [p, p === viewer ? a : { ...a, value: '' }]));
    return { ...s, answer: '', answered };
  },
  bot(s, player, level, { now }) {
    if (s.phase !== 'play' || s.answered[player]) return null;
    const plan = botPlan(`${s.q}:${s.prompt}:${player}`, level, s.mode === 'make24' ? 1.3 : s.level === 'hard' ? 1.15 : 1);
    const elapsed = (now - s.start) / (s.seconds * 1000);
    if (elapsed < plan.when) return null;
    if (s.mode === 'make24') return plan.correct ? { type: 'answer', value: s.answer } : null;
    const wrong = String(Number(s.answer) + (plan.when > 0.5 ? 1 : -1) * (1 + Math.floor(plan.when * 10)));
    return { type: 'answer', value: plan.correct ? s.answer : wrong };
  }
};
