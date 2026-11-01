import { describe, expect, it } from 'vitest';
import {
  highlights,
  inSync,
  makePersona,
  personaAnswer,
  PERSONA_NOISE,
  planKinds,
  roundPoints,
  syncTitle,
  type InSyncConfig,
  type InSyncState,
  type Kind,
  type Prompt
} from '~/engine/games/in-sync';
import { createRng } from '~/engine/rng';
import type { BotLevel, PlayerInfo } from '~/engine/types';
import { outcomeFor } from '~/lib/stats';

const shards = import.meta.glob('../app/engine/data/in-sync/*.json', { import: 'default', eager: true }) as Record<string, [string, string, string, ...string[]][]>;
const allRows = Object.values(shards).flat();

const couple: PlayerInfo[] = [
  { id: 'a', name: 'Ada' },
  { id: 'b', name: 'Bayo' }
];
const config = (patch: Partial<InSyncConfig> = {}): InSyncConfig => ({ ...inSync.defaultConfig, ...patch });

async function start(patch: Partial<InSyncConfig> = {}, players = couple, seed = 1, avoid = new Set<string>()) {
  const c = config(patch);
  await inSync.prepare!(c, avoid);
  return inSync.setup(players, c, { rng: createRng(seed), now: 1000, avoid });
}

/** The current round, swapped for a prompt of the given kind. */
function withKind(s: InSyncState, kind: Kind, subject: string | null = null): InSyncState {
  const prompt: Prompt =
    kind === 'tot'
      ? { id: 'test-t', kind, vibe: 'cute', text: '', options: ['Jollof rice', 'Fried rice'] }
      : kind === 'scale'
        ? { id: 'test-s', kind, vibe: 'cute', text: 'How spicy?', options: ['Mild', 'Fire'] }
        : kind === 'likely'
          ? { id: 'test-l', kind, vibe: 'cute', text: 'burn the rice', options: [] }
          : { id: `test-${kind}`, kind, vibe: 'deep', text: 'Ideal Saturday', options: ['Sleep', 'Brunch', 'Market', 'Party'] };
  return { ...s, prompt, subject: kind === 'mind' ? (subject ?? 'a') : null, answers: {}, phase: 'answer' };
}

const ctx = (now = 2000) => ({ rng: createRng(9), now });
const play = (s: InSyncState, who: string, choice: number, guess?: number) => {
  const move = { type: 'answer' as const, choice, guess };
  expect(inSync.validate(s, who, move)).toBeNull();
  return inSync.apply(s, who, move, ctx());
};

describe('in sync prompt pool', () => {
  it('has at least 1,500 distinct prompts with unique ids', () => {
    expect(allRows.length).toBeGreaterThanOrEqual(1500);
    expect(new Set(allRows.map((r) => r[0])).size).toBe(allRows.length);
    expect(new Set(allRows.map((r) => `${r[1]}:${r.slice(2).join('|').toLowerCase()}`)).size).toBe(allRows.length);
  });

  it('has every round type in every vibe, in small shards', () => {
    for (const vibe of ['cute', 'deep', 'flirty']) {
      const rows = Object.entries(shards)
        .filter(([path]) => path.includes(`/${vibe}-`))
        .flatMap(([, r]) => r);
      expect(rows.length, vibe).toBeGreaterThan(400);
      for (const k of ['t', 'm', 'f', 's', 'l']) expect(rows.filter((r) => r[1] === k).length, `${vibe} ${k}`).toBeGreaterThan(40);
    }
    for (const rows of Object.values(shards)) expect(JSON.stringify(rows).length).toBeLessThan(16_000);
  });

  it('has well formed rows', () => {
    for (const [id, kind, text, ...options] of allRows) {
      expect(id).toBeTruthy();
      if (kind === 't') expect(options).toHaveLength(2);
      if (kind === 'm' || kind === 'f') expect(options.length).toBeGreaterThanOrEqual(3);
      if (kind === 's') expect(options).toHaveLength(2);
      if (kind !== 't') expect(text).toBeTruthy();
    }
  });
});

describe('no repeats', () => {
  for (const vibe of ['mix', 'cute', 'deep', 'flirty'] as const) {
    it(`never repeats a prompt across 30 ${vibe} games`, async () => {
      const seen = new Set<string>();
      for (let g = 0; g < 30; g++) {
        let s = await start({ vibe }, couple, g + 11, seen);
        const shown: string[] = [];
        for (;;) {
          shown.push(...inSync.seen!(inSync.view(s, 'a')));
          if (s.round >= s.total) break;
          s = inSync.tick!({ ...s, phase: 'reveal', deadline: 0 }, ctx())!;
        }
        // Read My Mind pairs show one prompt twice in a game, and that is the only sharing.
        const ids = [...new Set(shown)];
        for (const id of ids) expect(seen.has(id), `game ${g} repeated ${id}`).toBe(false);
        for (const id of ids) seen.add(id);
      }
      expect(seen.size).toBeGreaterThan(30 * 8);
    }, 60_000);
  }
});

describe('a game of in sync', () => {
  it('mixes round types, with Read My Mind in swapped pairs', async () => {
    const s = await start({ rounds: 16 });
    const kinds = s.queue.map((q) => q.prompt.kind);
    expect(new Set(kinds).size).toBe(5);
    expect(kinds[0]).not.toBe('mind');
    for (let i = 0; i < kinds.length; i++) {
      if (kinds[i] !== 'mind') continue;
      const j = kinds.slice(0, i).filter((k) => k === 'mind').length % 2 === 0 ? i + 1 : i - 1;
      expect(s.queue[j].prompt.id).toBe(s.queue[i].prompt.id);
      expect(s.queue[j].subject).not.toBe(s.queue[i].subject);
    }
    for (const n of [8, 12, 16]) expect(planKinds(n, createRng(n))).toHaveLength(n);
  });

  it('mix games warm up from cute to flirty', async () => {
    const s = await start({ vibe: 'mix', rounds: 12 });
    const vibes = s.queue.map((q) => q.prompt.vibe);
    expect(vibes[0]).toBe('cute');
    expect(vibes[11]).toBe('flirty');
  });

  it('hides answers until both are in, then reveals both', async () => {
    let s = withKind(await start(), 'tot');
    s = play(s, 'a', 1);
    const bView = inSync.view(s, 'b') as InSyncState;
    expect(bView.answers.a.choice).toBe(-1);
    expect((inSync.view(s, null) as InSyncState).answers.a.choice).toBe(-1);
    expect((inSync.view(s, 'a') as InSyncState).answers.a.choice).toBe(1);
    expect(inSync.actors(s)).toEqual(['b']);
    s = play(s, 'b', 1);
    expect(s.phase).toBe('reveal');
    const after = inSync.view(s, 'b') as InSyncState;
    expect(after.history.at(-1)!.answers.a!.choice).toBe(1);
    expect(after.history.at(-1)!.points).toBe(100);
  });

  it('hides scale guesses too', async () => {
    let s = withKind(await start(), 'scale');
    s = play(s, 'a', 4, 2);
    const v = inSync.view(s, 'b') as InSyncState;
    expect(v.answers.a).toEqual({ choice: -1, guess: -1, at: expect.any(Number) });
  });

  it('never sends the round list or a computer persona to players before the end', async () => {
    const s = await start({}, [couple[0], { id: 'cpu', name: 'Ada (bot)', bot: 'medium' }]);
    expect(s.queue).toHaveLength(12);
    expect(Object.keys(s.personas)).toEqual(['cpu']);
    const v = inSync.view(s, 'a') as InSyncState;
    expect(v.queue).toEqual([]);
    expect(v.personas).toEqual({});
    const over = inSync.view({ ...s, phase: 'over' }, 'a') as InSyncState;
    expect(over.personas.cpu.traits).toHaveLength(3);
  });

  it('rejects bad and repeated moves', async () => {
    let s = withKind(await start(), 'finish');
    expect(inSync.validate(s, 'a', { type: 'answer', choice: 4 })).not.toBeNull();
    expect(inSync.validate(s, 'z', { type: 'answer', choice: 0 })).not.toBeNull();
    expect(inSync.validate(s, 'a', { type: 'ready' })).not.toBeNull();
    s = play(s, 'a', 0);
    expect(inSync.validate(s, 'a', { type: 'answer', choice: 1 })).not.toBeNull();
    const sc = withKind(s, 'scale');
    expect(inSync.validate(sc, 'b', { type: 'answer', choice: 3 })).not.toBeNull();
    expect(inSync.validate(sc, 'b', { type: 'answer', choice: 6, guess: 2 })).not.toBeNull();
  });
});

describe('scoring', () => {
  const players = ['a', 'b'];
  const ans = (choice: number, guess = -1) => ({ choice, guess, at: 0 });

  it('This or That and Finish the Sentence score when both pick the same', () => {
    for (const k of ['tot', 'finish'] as const) {
      expect(roundPoints(k, players, null, { a: ans(0), b: ans(0) })).toBe(100);
      expect(roundPoints(k, players, null, { a: ans(0), b: ans(1) })).toBe(0);
    }
  });

  it("Who's More Likely scores when both point at the same person", () => {
    // a says "me", b says "my partner": both mean a.
    expect(roundPoints('likely', players, null, { a: ans(0), b: ans(1) })).toBe(100);
    expect(roundPoints('likely', players, null, { a: ans(1), b: ans(0) })).toBe(100);
    // Both say "me": a mismatch.
    expect(roundPoints('likely', players, null, { a: ans(0), b: ans(0) })).toBe(0);
  });

  it('Read My Mind scores when the guess matches the answer', () => {
    expect(roundPoints('mind', players, 'a', { a: ans(2), b: ans(2) })).toBe(100);
    expect(roundPoints('mind', players, 'b', { a: ans(1), b: ans(3) })).toBe(0);
  });

  it('Scale scores by how close each guess is', () => {
    expect(roundPoints('scale', players, null, { a: ans(4, 2), b: ans(2, 4) })).toBe(100);
    expect(roundPoints('scale', players, null, { a: ans(4, 3), b: ans(2, 4) })).toBe(80);
    expect(roundPoints('scale', players, null, { a: ans(4, 2), b: ans(1, 3) })).toBe(60);
    expect(roundPoints('scale', players, null, { a: ans(1, 1), b: ans(5, 5) })).toBe(0);
  });

  it('runs a full Read My Mind swap through the engine', async () => {
    let s = withKind(await start(), 'mind', 'a');
    s = play(s, 'a', 3);
    s = play(s, 'b', 3);
    expect(s.points).toBe(100);
    s = { ...withKind(s, 'mind', 'b'), history: s.history, points: s.points };
    s = play(s, 'b', 0);
    s = play(s, 'a', 1);
    expect(s.history.at(-1)!.points).toBe(0);
    expect(s.points).toBe(100);
  });

  it('gives playful titles from the sync score', () => {
    expect(syncTitle(95).title).toBe('Soulmates');
    expect(syncTitle(80).title).toBe('Same brain');
    expect(syncTitle(35).title).toBe('Still learning each other');
    expect(syncTitle(0).title).toBe('Opposites attract');
  });

  it('picks the funniest mismatches for the end screen', () => {
    const p = (kind: Kind, id: string): Prompt => ({ id, kind, vibe: 'cute', text: 'x', options: ['a', 'b', 'c'] });
    const hist = [
      { prompt: p('tot', '1'), subject: null, answers: { a: ans(0), b: ans(1) }, points: 0 },
      { prompt: p('likely', '2'), subject: null, answers: { a: ans(0), b: ans(0) }, points: 0 },
      { prompt: p('finish', '3'), subject: null, answers: { a: ans(0), b: ans(0) }, points: 100 },
      { prompt: p('scale', '4'), subject: null, answers: { a: ans(1, 1), b: ans(5, 5) }, points: 0 }
    ];
    const h = highlights(hist, players);
    expect(h.misses.map((r) => r.prompt.id)).toEqual(['4', '2', '1']);
    expect(h.matches.map((r) => r.prompt.id)).toEqual(['3']);
  });
});

describe('timeouts', () => {
  it('reveals when time runs out, and a missing answer is a miss', async () => {
    let s = withKind(await start(), 'tot');
    s = play(s, 'a', 0);
    expect(inSync.tick!(s, ctx(s.deadline - 1))).toBeNull();
    s = inSync.tick!(s, ctx(s.deadline))!;
    expect(s.phase).toBe('reveal');
    expect(s.history.at(-1)!.answers.b).toBeNull();
    expect(s.history.at(-1)!.points).toBe(0);
    // The reveal ends on its own, too.
    const round = s.round;
    s = inSync.tick!(s, ctx(s.deadline))!;
    expect(s.phase).toBe('answer');
    expect(s.round).toBe(round + 1);
  });

  it('moves on early when both tap next', async () => {
    let s = withKind(await start(), 'tot');
    s = play(s, 'a', 0);
    s = play(s, 'b', 0);
    s = inSync.apply(s, 'a', { type: 'ready' }, ctx());
    expect(s.phase).toBe('reveal');
    s = inSync.apply(s, 'b', { type: 'ready' }, ctx());
    expect(s.phase).toBe('answer');
  });

  it('a game nobody answers still ends, at 0%', async () => {
    let s = await start({ rounds: 8 });
    let now = 1000;
    while (!inSync.result(s)) {
      now = Math.max(now, s.deadline);
      s = inSync.tick!(s, ctx(now))!;
    }
    expect(inSync.result(s)!.scores).toEqual({ a: 0, b: 0 });
  });
});

describe('co-op result', () => {
  it('ranks both partners together with one shared score, so nobody loses', async () => {
    let s = await start({ rounds: 8 });
    let now = 1000;
    while (!inSync.result(s)) {
      if (s.phase === 'answer') {
        s = play(s, 'a', s.prompt.kind === 'scale' ? 3 : 0, s.prompt.kind === 'scale' ? 3 : undefined);
        s = play(s, 'b', s.prompt.kind === 'likely' ? 1 : s.prompt.kind === 'scale' ? 3 : 0, s.prompt.kind === 'scale' ? 3 : undefined);
      } else {
        now = s.deadline;
        s = inSync.tick!(s, ctx(now))!;
      }
    }
    const r = inSync.result(s)!;
    expect(r.ranking).toEqual([['a', 'b']]);
    expect(r.scores.a).toBe(r.scores.b);
    expect(r.scores.a).toBeGreaterThan(50);
    expect(outcomeFor(r, 'a')).toBe(outcomeFor(r, 'b'));
    expect(outcomeFor(r, 'a')).not.toBe('loss');
    expect(r.summary).toMatch(/% in sync/);
  });
});

describe('computer partner', () => {
  const prompts = allRows.slice(0, 400).map(([id, k, text, ...options]): Prompt => ({
    id,
    kind: ({ t: 'tot', m: 'mind', f: 'finish', s: 'scale', l: 'likely' } as const)[k as 't'],
    vibe: 'cute',
    text,
    options
  }));

  it('gives the same answer to the same prompt every time', () => {
    const p = makePersona(createRng(5), 'hard');
    for (const q of prompts) expect(personaAnswer(p, q)).toBe(personaAnswer({ ...p }, q));
  });

  it('is readable: easy partners stick to their personality, hard ones less so', () => {
    const onScript = (level: BotLevel) => {
      let hits = 0;
      let n = 0;
      for (let seed = 1; seed <= 12; seed++) {
        const p = makePersona(createRng(seed), level);
        expect(p.noise).toBe(PERSONA_NOISE[level]);
        for (const q of prompts) {
          const a = personaAnswer(p, q);
          const want = q.kind === 'scale' ? p.intensity : q.kind === 'likely' ? (p.owns ? 0 : 1) : Math.round(p.bold * (q.options.length - 1));
          if (a === want) hits++;
          n++;
        }
      }
      return hits / n;
    };
    const easy = onScript('easy');
    const hard = onScript('hard');
    expect(easy).toBeGreaterThan(0.88);
    expect(hard).toBeLessThan(easy - 0.2);
  });

  it('answers in game exactly as its persona says, and only after a short think', async () => {
    const players: PlayerInfo[] = [couple[0], { id: 'cpu', name: 'Ada (bot)', bot: 'easy' }];
    let s = await start({}, players, 3);
    const persona = s.personas.cpu;
    expect(inSync.bot(s, 'cpu', 'easy', ctx(s.start))).toBeNull();
    for (let i = 0; i < s.total; i++) {
      const move = inSync.bot(s, 'cpu', 'easy', ctx(s.deadline - 1));
      expect(move).not.toBeNull();
      if (move!.type === 'answer' && !(s.prompt.kind === 'mind' && s.subject !== 'cpu')) expect(move!.choice).toBe(personaAnswer(persona, s.prompt));
      s = inSync.apply(s, 'cpu', move!, ctx());
      s = inSync.tick!(s, ctx(s.deadline))!;
      if (inSync.result(s)) break;
      s = inSync.tick!(s, ctx(s.deadline))!;
      if (inSync.result(s)) break;
    }
  });

  it('two computer partners with the same persona agree on every prompt', async () => {
    const a = makePersona(createRng(77), 'medium');
    const b = makePersona(createRng(77), 'medium');
    for (const q of prompts) expect(personaAnswer(a, q)).toBe(personaAnswer(b, q));
  });
});

describe('bots self-play full games', () => {
  for (const vibe of ['mix', 'cute', 'deep', 'flirty'] as const) {
    it(`${vibe} games finish with only legal moves over 6 seeds`, async () => {
      for (let seed = 1; seed <= 6; seed++) {
        const levels: BotLevel[] = ['easy', 'medium', 'hard'];
        const players: PlayerInfo[] = [
          { id: 'p0', name: 'P0', bot: levels[seed % 3] },
          { id: 'p1', name: 'P1', bot: levels[(seed + 1) % 3] }
        ];
        const c = config({ vibe, rounds: [8, 12, 16][seed % 3] });
        await inSync.prepare!(c, new Set());
        const rng = createRng(seed * 7919);
        let now = 1_000_000;
        let s = inSync.setup(players, c, { rng, now });
        let steps = 0;
        while (!inSync.result(s)) {
          if (++steps > 5000) throw new Error('did not finish');
          let moved = false;
          for (const id of inSync.actors(s)) {
            const p = players.find((x) => x.id === id)!;
            const move = inSync.bot(s, id, p.bot!, { rng, now });
            if (!move) continue;
            expect(inSync.validate(s, id, move), JSON.stringify(move)).toBeNull();
            s = inSync.apply(s, id, move, { rng, now });
            moved = true;
            break;
          }
          if (!moved) {
            now += 500;
            s = inSync.tick!(s, { rng, now }) ?? s;
          }
        }
        const r = inSync.result(s)!;
        expect(r.ranking).toEqual([['p0', 'p1']]);
        expect(s.history).toHaveLength(c.rounds);
        // Bots always answer, so no round is lost to the clock.
        expect(s.history.every((h) => h.answers.p0 && h.answers.p1)).toBe(true);
      }
    }, 60_000);
  }
});
