import { hash01 } from '../timed';
import type { BotLevel, GameDef, MatchResult, PlayerId, Rng } from '../types';

// In Sync: two partners answer the same prompt in secret, then see how in sync they are.
// It is co-op: both share one sync score and one result.

export type Kind = 'tot' | 'mind' | 'finish' | 'scale' | 'likely';
export type Vibe = 'cute' | 'deep' | 'flirty';
export type VibeSetting = Vibe | 'mix';

export interface Prompt {
  /** Stable id made from the prompt text. Players remember these to avoid repeats. */
  id: string;
  kind: Kind;
  vibe: Vibe;
  /** This or That: an optional lead ("Small chops"). Scale: the question. Likely: the rest of "Who is more likely to…". */
  text: string;
  /** This or That: the two picks. Mind and Finish: the answers. Scale: what 1 and 5 mean. Likely: none. */
  options: string[];
}

export interface Answer {
  /** The pick. Scale: your own number, 1 to 5. Likely: 0 means "me", 1 means "my partner". */
  choice: number;
  /** Scale only: your guess of your partner's number, 1 to 5. Otherwise -1. */
  guess: number;
  at: number;
}

export interface RoundRecord {
  prompt: Prompt;
  /** Read My Mind: whose answer is being guessed. */
  subject: PlayerId | null;
  answers: Record<PlayerId, Answer | null>;
  /** 0 to 100. */
  points: number;
}

export interface Persona {
  seed: number;
  /** 0 is cosy and classic, 1 is bold and adventurous. Options are written in that order. */
  bold: number;
  /** The number this persona usually gives on a scale. */
  intensity: number;
  /** Who's more likely: true means they usually say "me". */
  owns: boolean;
  /** How often they go off script: higher is harder to read. */
  noise: number;
  traits: string[];
}

export interface InSyncConfig extends Record<string, unknown> {
  vibe: VibeSetting;
  rounds: number;
  seconds: number;
}

export interface InSyncState {
  vibe: VibeSetting;
  players: [PlayerId, PlayerId];
  bots: Record<PlayerId, BotLevel>;
  /** Computer partners' hidden personalities. Only sent to players once the game is over. */
  personas: Record<PlayerId, Persona>;
  round: number;
  total: number;
  seconds: number;
  phase: 'answer' | 'reveal' | 'over';
  start: number;
  deadline: number;
  prompt: Prompt;
  /** Read My Mind: whose answer this round is about. */
  subject: PlayerId | null;
  /** This round's answers. Hidden from the other player until the reveal. */
  answers: Record<PlayerId, Answer>;
  /** Players who tapped "next" during the reveal. */
  ready: PlayerId[];
  /** Finished rounds, including the one being revealed. */
  history: RoundRecord[];
  /** Sum of every round's points. */
  points: number;
  /** Every round, picked at the start. Never sent to players. */
  queue: { prompt: Prompt; subject: 0 | 1 | null }[];
}

export type InSyncMove = { type: 'answer'; choice: number; guess?: number } | { type: 'ready' };

export const KIND_LABEL: Record<Kind, string> = {
  tot: 'This or That',
  mind: 'Read My Mind',
  finish: 'Finish the Sentence',
  scale: 'On a Scale',
  likely: "Who's More Likely"
};

export const VIBES: Vibe[] = ['cute', 'deep', 'flirty'];
const validVibe = (v: unknown): VibeSetting => (v === 'cute' || v === 'deep' || v === 'flirty' ? v : 'mix');

// ---------- prompts: shards of about 130 (scripts/build-in-sync.mjs), so a game downloads only a few ----------
type Row = [string, 't' | 'm' | 'f' | 's' | 'l', string, ...string[]];
const SHARD_FILES = import.meta.glob<Row[]>('../data/in-sync/*.json', { import: 'default' });
const SHARDS = Object.keys(SHARD_FILES).map((path) => {
  const key = path.slice(path.lastIndexOf('/') + 1, -'.json'.length);
  return { path, key, vibe: key.replace(/-\d+$/, '') as Vibe };
});
const KINDS: Record<Row[1], Kind> = { t: 'tot', m: 'mind', f: 'finish', s: 'scale', l: 'likely' };
const ALL_KINDS: Kind[] = ['tot', 'mind', 'finish', 'scale', 'likely'];

const loaded = new Map<string, Prompt[]>();
/** What `prepare` loaded for the next `setup`. */
let prepared: { vibe: VibeSetting | ''; prompts: Prompt[] } = { vibe: '', prompts: [] };
/** Fresh prompts wanted per round type and vibe before we stop downloading. */
const ENOUGH = 8;

async function loadShard(shard: (typeof SHARDS)[number]) {
  const have = loaded.get(shard.key);
  if (have) return have;
  const rows = await SHARD_FILES[shard.path]();
  const list = rows.map(([id, k, text, ...options]): Prompt => ({ id, kind: KINDS[k], vibe: shard.vibe, text, options }));
  loaded.set(shard.key, list);
  return list;
}

/**
 * Downloads one random shard per vibe, and more only when a round type is running low on prompts
 * nobody at the table has seen. Repeats come back only once a vibe's whole pool has been played.
 */
async function preparePrompts(config: InSyncConfig, avoid: ReadonlySet<string>, state?: InSyncState) {
  // A saved match carries its own prompts.
  if (state) return;
  const vibe = validVibe(config.vibe);
  const vibes = vibe === 'mix' ? VIBES : [vibe];
  const lists = await Promise.all(
    vibes.map(async (v) => {
      const shards = SHARDS.filter((s) => s.vibe === v)
        .map((s) => ({ s, r: Math.random() }))
        .sort((a, b) => a.r - b.r)
        .map((x) => x.s);
      const mine: Prompt[] = [];
      for (const s of shards) {
        mine.push(...(await loadShard(s)));
        const fresh = mine.filter((p) => !avoid.has(p.id));
        if (ALL_KINDS.every((k) => fresh.filter((p) => p.kind === k).length >= ENOUGH)) break;
      }
      return mine;
    })
  );
  prepared = { vibe, prompts: lists.flat() };
}

// ---------- the round plan ----------
/** Round types for a game: Read My Mind comes in pairs (same prompt, partners swap), the rest is a mix. */
export function planKinds(total: number, rng: Rng): Kind[] {
  const pairs = Math.max(1, Math.round(total / 8));
  const rest = total - pairs * 2;
  const share: [Kind, number][] = [
    ['tot', 0.32],
    ['likely', 0.24],
    ['scale', 0.22],
    ['finish', 0.22]
  ];
  const counts = share.map(([k, w]) => ({ k, n: Math.floor(rest * w), r: rest * w - Math.floor(rest * w) }));
  let left = rest - counts.reduce((a, c) => a + c.n, 0);
  for (const c of [...counts].sort((a, b) => b.r - a.r)) if (left-- > 0) c.n++;
  const units: Kind[][] = [...Array.from({ length: pairs }, (): Kind[] => ['mind', 'mind']), ...counts.flatMap((c) => Array.from({ length: c.n }, () => [c.k]))];
  // Shuffle until no type follows itself and the game opens with a quick pick.
  let best = units;
  let bestBad = Infinity;
  for (let i = 0; i < 80 && bestBad > 0; i++) {
    const order = rng.shuffle(units);
    let bad = order[0][0] === 'mind' ? 1 : 0;
    for (let j = 1; j < order.length; j++) if (order[j][0] === order[j - 1][0]) bad++;
    if (bad < bestBad) [best, bestBad] = [order, bad];
  }
  return best.flat();
}

function pickPrompts(kinds: Kind[], vibe: VibeSetting, pool: Prompt[], avoid: ReadonlySet<string> | undefined, rng: Rng): Prompt[] {
  const used = new Set<string>();
  const shuffled = rng.shuffle(pool);
  const out: Prompt[] = [];
  let minds = 0;
  for (let i = 0; i < kinds.length; i++) {
    const kind = kinds[i];
    // Second half of a Read My Mind pair: the same prompt, about the other partner.
    if (kind === 'mind' && minds++ % 2 === 1) {
      out.push(out[i - 1]);
      continue;
    }
    // Mix warms up: cute first, then deep, then flirty.
    const want: Vibe | null = vibe === 'mix' ? VIBES[Math.min(2, Math.floor((i * 3) / kinds.length))] : null;
    const ok = (p: Prompt, fresh: boolean, sameVibe: boolean) => p.kind === kind && !used.has(p.id) && (!fresh || !avoid?.has(p.id)) && (!sameVibe || !want || p.vibe === want);
    const p = shuffled.find((x) => ok(x, true, true)) ?? shuffled.find((x) => ok(x, true, false)) ?? shuffled.find((x) => ok(x, false, true)) ?? shuffled.find((x) => ok(x, false, false));
    if (!p) throw new Error('In Sync prompts are not loaded yet.');
    used.add(p.id);
    out.push(p);
  }
  return out;
}

// ---------- scoring ----------
const SCALE_POINTS = [100, 60, 25, 0, 0];
/** Points for a scale guess: spot on 100, one away 60, two away 25. */
export const scaleCloseness = (guess: number, actual: number) => (guess < 1 || actual < 1 ? 0 : (SCALE_POINTS[Math.abs(guess - actual)] ?? 0));

/** Who a "Who's more likely" answer points at. */
export const likelyTarget = (players: PlayerId[], by: PlayerId, choice: number) => (choice === 0 ? by : players.find((p) => p !== by)!);

/** How in sync one round was, from 0 to 100. A missing answer never matches. */
export function roundPoints(kind: Kind, players: PlayerId[], subject: PlayerId | null, answers: Record<PlayerId, Answer | null | undefined>): number {
  const [a, b] = players;
  const x = answers[a];
  const y = answers[b];
  if (!x || !y) return 0;
  if (kind === 'scale') return Math.round((scaleCloseness(x.guess, y.choice) + scaleCloseness(y.guess, x.choice)) / 2);
  if (kind === 'likely') return likelyTarget(players, a, x.choice) === likelyTarget(players, b, y.choice) ? 100 : 0;
  if (kind === 'mind' && !subject) return 0;
  return x.choice === y.choice ? 100 : 0;
}

export const syncPercent = (s: Pick<InSyncState, 'points' | 'history'>) => (s.history.length ? Math.round(s.points / s.history.length) : 0);

export const SYNC_TITLES: { min: number; title: string; line: string }[] = [
  { min: 90, title: 'Soulmates', line: 'One heart, two phones. You barely need to talk.' },
  { min: 75, title: 'Same brain', line: 'You finish each other’s sentences, and each other’s plates.' },
  { min: 60, title: 'Jollof and plantain', line: 'A proper pair. Different, but better together.' },
  { min: 45, title: 'Sweet chemistry', line: 'Plenty in common, and just enough surprises.' },
  { min: 30, title: 'Still learning each other', line: 'Every miss is something new to ask about tonight.' },
  { min: 0, title: 'Opposites attract', line: 'Two different worlds. Imagine the stories.' }
];
export const syncTitle = (pct: number) => SYNC_TITLES.find((t) => pct >= t.min)!;

/** The funniest, most telling misses of a game (best first) and a couple of the sweetest matches. */
export function highlights(history: RoundRecord[], players: PlayerId[]) {
  const [a, b] = players;
  const scored = history.map((r, i) => {
    const x = r.answers[a];
    const y = r.answers[b];
    let fun = 0;
    if (x && y && r.points < 50) {
      if (r.prompt.kind === 'likely') fun = 4;
      else if (r.prompt.kind === 'scale') fun = 1 + Math.max(Math.abs(x.guess - y.choice), Math.abs(y.guess - x.choice));
      else if (r.prompt.kind === 'mind') fun = 3;
      else fun = 2;
      fun += hash01(`${r.prompt.id}:${i}`) * 0.5;
    }
    return { r, fun };
  });
  const misses = scored.filter((x) => x.fun > 0).sort((p, q) => q.fun - p.fun);
  const matches = scored.filter((x) => x.r.points === 100).sort((p, q) => hash01(q.r.prompt.id) - hash01(p.r.prompt.id));
  return { misses: misses.slice(0, 3).map((x) => x.r), matches: matches.slice(0, 2).map((x) => x.r) };
}

// ---------- computer partner ----------
/** How often the computer goes off script. Easy partners are very readable, hard ones keep you guessing. */
export const PERSONA_NOISE: Record<BotLevel, number> = { easy: 0.08, medium: 0.25, hard: 0.45 };

export function makePersona(rng: Rng, level: BotLevel): Persona {
  const bold = rng.pick([0.05, 0.3, 0.7, 0.95]);
  const intensity = rng.pick([1, 2, 4, 5]);
  const owns = rng.next() < 0.5;
  const traits = [
    bold < 0.2 ? 'A cosy homebody' : bold < 0.5 ? 'Sweet and steady' : bold < 0.8 ? 'Up for a little fun' : 'A bold adventurer',
    intensity >= 4 ? 'Feels everything strongly' : 'Cool, calm and collected',
    owns ? 'Owns up to everything' : 'Always points at you'
  ];
  return { seed: rng.int(1_000_000_000), bold, intensity, owns, noise: PERSONA_NOISE[level], traits };
}

/** A persona's own answer to a prompt. The same persona always gives the same answer to the same prompt. */
export function personaAnswer(p: Persona, prompt: Prompt): number {
  const key = `${p.seed}:${prompt.id}`;
  const off = hash01(`${key}:off`) < p.noise;
  if (prompt.kind === 'scale') {
    if (!off) return p.intensity;
    const step = hash01(`${key}:step`) < 0.5 ? -1 : 1;
    const size = p.noise > 0.3 && hash01(`${key}:size`) < 0.5 ? 2 : 1;
    const v = p.intensity + step * size;
    return v < 1 || v > 5 ? p.intensity - step * size : v;
  }
  const n = prompt.kind === 'likely' ? 2 : prompt.options.length;
  const target = prompt.kind === 'likely' ? (p.owns ? 0 : 1) : Math.round(p.bold * (n - 1));
  if (!off) return target;
  const others = Array.from({ length: n }, (_, i) => i).filter((i) => i !== target);
  return others[Math.floor(hash01(`${key}:alt`) * others.length)];
}

/** The computer's read of its partner, from what they have answered so far. */
function readPartner(s: InSyncState, partner: PlayerId) {
  const picks: number[] = [];
  const scales: number[] = [];
  for (const r of s.history) {
    const a = r.answers[partner];
    if (!a) continue;
    const k = r.prompt.kind;
    if (k === 'scale') scales.push(a.choice);
    else if ((k === 'tot' || k === 'finish' || (k === 'mind' && r.subject === partner)) && r.prompt.options.length > 1) picks.push(a.choice / (r.prompt.options.length - 1));
  }
  const avg = (xs: number[]) => xs.reduce((p, q) => p + q, 0) / xs.length;
  return { bold: picks.length ? avg(picks) : null, scale: scales.length ? Math.round(avg(scales)) : null };
}

function botMove(s: InSyncState, me: PlayerId, level: BotLevel): InSyncMove {
  const persona = s.personas[me] ?? { seed: Math.floor(hash01(me) * 1e9), bold: 0.5, intensity: 3, owns: true, noise: PERSONA_NOISE[level], traits: [] };
  const partner = s.players.find((p) => p !== me)!;
  const read = readPartner(s, partner);
  const key = `${persona.seed}:${s.prompt.id}:${s.round}`;
  const sloppy = hash01(`${key}:guess`) < persona.noise;
  const { kind, options } = s.prompt;
  if (kind === 'scale') {
    let guess = read.scale ?? 3;
    if (sloppy) guess = guess >= 5 ? 4 : guess <= 1 ? 2 : guess + (hash01(`${key}:g`) < 0.5 ? -1 : 1);
    return { type: 'answer', choice: personaAnswer(persona, s.prompt), guess };
  }
  if (kind === 'mind' && s.subject !== me) {
    const n = options.length;
    let pick = read.bold === null ? Math.floor(hash01(`${key}:first`) * n) : Math.round(read.bold * (n - 1));
    if (sloppy) pick = Math.floor(hash01(`${key}:g`) * n);
    return { type: 'answer', choice: pick };
  }
  return { type: 'answer', choice: personaAnswer(persona, s.prompt) };
}

// ---------- state machine ----------
const REVEAL_MS = 7000;
/** Read My Mind and Scale ask a little more of you, so they get five extra seconds. */
export const secondsFor = (s: Pick<InSyncState, 'seconds' | 'prompt'>) => s.seconds + (s.prompt.kind === 'scale' || s.prompt.kind === 'mind' ? 5 : 0);

function ask(s: InSyncState, now: number): InSyncState {
  const item = s.queue[s.round - 1];
  const next: InSyncState = { ...s, phase: 'answer', prompt: item.prompt, subject: item.subject === null ? null : s.players[item.subject], answers: {}, ready: [] };
  return { ...next, start: now, deadline: now + secondsFor(next) * 1000 };
}

function reveal(s: InSyncState, now: number): InSyncState {
  const answers = Object.fromEntries(s.players.map((p) => [p, s.answers[p] ?? null]));
  const points = roundPoints(s.prompt.kind, s.players, s.subject, answers);
  const history = [...s.history, { prompt: s.prompt, subject: s.subject, answers, points }];
  return { ...s, history, points: s.points + points, phase: 'reveal', ready: [], deadline: now + REVEAL_MS };
}

function advance(s: InSyncState, now: number): InSyncState {
  if (s.round >= s.total) return { ...s, phase: 'over', deadline: 0, ready: [] };
  return ask({ ...s, round: s.round + 1 }, now);
}

const optionCount = (p: Prompt) => (p.kind === 'likely' ? 2 : p.options.length);
const isScaleValue = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 5;

export const inSync: GameDef<InSyncState, InSyncMove, InSyncConfig> = {
  id: 'in-sync',
  minPlayers: 2,
  maxPlayers: 2,
  selfTimed: true,
  defaultConfig: { vibe: 'mix', rounds: 12, seconds: 20 },
  prepare: preparePrompts,
  seen(view) {
    const v = view as Partial<InSyncState> | null;
    const ids = (v?.history ?? []).map((r) => r.prompt.id);
    if (v?.prompt?.id) ids.push(v.prompt.id);
    return [...new Set(ids)];
  },
  setup(players, config, { rng, now, avoid }) {
    const vibe = validVibe(config.vibe);
    if (prepared.vibe !== vibe || !prepared.prompts.length) throw new Error('In Sync prompts are not loaded yet.');
    const total = [8, 12, 16].includes(Number(config.rounds)) ? Number(config.rounds) : 12;
    const seconds = Math.min(45, Math.max(10, Number(config.seconds) || 20));
    const kinds = planKinds(total, rng);
    const prompts = pickPrompts(kinds, vibe, prepared.prompts, avoid, rng);
    let nextSubject: 0 | 1 = rng.next() < 0.5 ? 0 : 1;
    const queue = kinds.map((k, i) => {
      if (k !== 'mind') return { prompt: prompts[i], subject: null };
      const subject = nextSubject;
      nextSubject = subject === 0 ? 1 : 0;
      return { prompt: prompts[i], subject };
    });
    const bots: Record<PlayerId, BotLevel> = Object.fromEntries(players.filter((p) => p.bot).map((p) => [p.id, p.bot!]));
    const base: InSyncState = {
      vibe,
      players: [players[0].id, players[1].id],
      bots,
      personas: Object.fromEntries(Object.entries(bots).map(([id, level]) => [id, makePersona(rng, level)])),
      round: 1,
      total,
      seconds,
      phase: 'answer',
      start: 0,
      deadline: 0,
      prompt: queue[0].prompt,
      subject: null,
      answers: {},
      ready: [],
      history: [],
      points: 0,
      queue
    };
    return ask(base, now);
  },
  actors(s) {
    if (s.phase === 'answer') return s.players.filter((p) => !s.answers[p]);
    if (s.phase === 'reveal') return s.players.filter((p) => !s.ready.includes(p));
    return [];
  },
  validate(s, player, move) {
    if (!s.players.includes(player)) return 'You are not playing.';
    if (move?.type === 'ready') return s.phase === 'reveal' && !s.ready.includes(player) ? null : 'Nothing to skip.';
    if (move?.type !== 'answer') return 'Unknown move.';
    if (s.phase !== 'answer') return 'Wait for the next prompt.';
    if (s.answers[player]) return 'You already answered.';
    if (s.prompt.kind === 'scale') return isScaleValue(move.choice) && isScaleValue(move.guess) ? null : 'Pick your number and your guess.';
    return Number.isInteger(move.choice) && move.choice >= 0 && move.choice < optionCount(s.prompt) ? null : 'Pick an answer.';
  },
  apply(s, player, move, { now }) {
    if (move.type === 'ready') {
      const n = { ...s, ready: [...s.ready, player] };
      return s.players.every((p) => n.ready.includes(p)) ? advance(n, now) : n;
    }
    const answer: Answer = { choice: move.choice, guess: s.prompt.kind === 'scale' ? move.guess! : -1, at: now };
    const n = { ...s, answers: { ...s.answers, [player]: answer } };
    return n.players.every((p) => n.answers[p]) ? reveal(n, now) : n;
  },
  deadline(s) {
    return s.phase === 'over' ? null : s.deadline;
  },
  tick(s, { now }) {
    if (s.phase === 'over' || now < s.deadline) return null;
    return s.phase === 'answer' ? reveal(s, now) : advance(s, now);
  },
  result(s) {
    if (s.phase !== 'over') return null;
    const pct = syncPercent(s);
    // Co-op: one shared place and one shared score, so nobody ever loses to their partner.
    return {
      ranking: [[...s.players]],
      scores: Object.fromEntries(s.players.map((p) => [p, pct])),
      draw: false,
      summary: `${pct}% in sync. ${syncTitle(pct).title}!`,
      coop: { won: true }
    } satisfies MatchResult;
  },
  view(full, viewer) {
    // Nobody needs the round list, and a computer partner's personality stays secret until the end.
    const s = { ...full, queue: [], personas: full.phase === 'over' ? full.personas : {} };
    if (s.phase !== 'answer') return s;
    return {
      ...s,
      answers: Object.fromEntries(Object.entries(s.answers).map(([p, a]) => [p, p === viewer ? a : { choice: -1, guess: -1, at: a.at }]))
    };
  },
  bot(s, player, level, { now }) {
    if (s.phase === 'reveal') return s.ready.includes(player) ? null : { type: 'ready' };
    if (s.phase !== 'answer' || s.answers[player]) return null;
    // Answer after a short, human feeling think that is the same on every host.
    const when = 0.12 + 0.4 * hash01(`${s.round}:${s.prompt.id}:${player}:t`);
    if ((now - s.start) / (secondsFor(s) * 1000) < when) return null;
    return botMove(s, player, level);
  }
};
