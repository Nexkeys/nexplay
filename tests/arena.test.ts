import { describe as group, expect, it } from 'vitest';
import { createRng } from '~/engine/rng';
import type { BotLevel, PlayerInfo, Rng } from '~/engine/types';
import {
  arena,
  botPick,
  CLASSES,
  checkPick,
  commitHash,
  describe as describeLog,
  legalPicks,
  LENGTHS,
  resolve,
  RULES,
  standings,
  stormDamage,
  type Action,
  type ArenaPick,
  type ArenaState,
  type ArenaView,
  type ClassId
} from '~/engine/games/arena';
import { ARENA } from '~/engine/meta/arena';

/** An rng that always returns the same number: 0.99 means no crits, 0 means every hit crits. */
const fixed = (v: number): Rng => ({ next: () => v, int: () => 0, pick: (a) => a[0], shuffle: (a) => [...a] });
const noCrit = { rng: fixed(0.99), now: 1000 };

const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** A fight that has started, with the given classes, all human players. */
function fight(classes: ClassId[], config: Record<string, unknown> = {}): ArenaState {
  const players = classes.map((_, i) => ({ id: ids[i], name: ids[i].toUpperCase() }));
  let s = arena.setup(players, { ...arena.defaultConfig, ...config }, noCrit);
  classes.forEach((cls, i) => {
    expect(arena.validate(s, ids[i], { type: 'class', cls })).toBeNull();
    s = arena.apply(s, ids[i], { type: 'class', cls }, noCrit);
  });
  expect(s.phase).toBe('choose');
  return s;
}

type Plan = Record<string, [Action, string?]>;

/** Plays one round the way real players do: everyone seals a pick, then reveals it. */
function round(s: ArenaState, plan: Plan, ctx = noCrit): ArenaState {
  const salts: Record<string, string> = {};
  for (const [p, [action, target]] of Object.entries(plan)) {
    salts[p] = `salt-${p}-${s.round}`;
    const move = { type: 'commit' as const, hash: commitHash(action, target ?? null, salts[p]) };
    expect(arena.validate(s, p, move)).toBeNull();
    s = arena.apply(s, p, move, ctx);
  }
  if (s.phase === 'choose') {
    // Somebody did not pick: let the clock run out.
    s = arena.tick!(s, { ...ctx, now: s.deadline })!;
  }
  for (const [p, [action, target]] of Object.entries(plan)) {
    if (s.phase !== 'reveal') break;
    const move = { type: 'reveal' as const, action, target: target ?? null, salt: salts[p] };
    expect(arena.validate(s, p, move)).toBeNull();
    s = arena.apply(s, p, move, ctx);
  }
  return s;
}

/** On to the next round once the result has been shown. */
const next = (s: ArenaState) => (s.phase === 'result' ? arena.tick!(s, { ...noCrit, now: s.deadline })! : s);

group('Arena setup and picks', () => {
  it('starts with a timed class pick and gives a random class to anyone too slow', () => {
    const players = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
    let s = arena.setup(players, arena.defaultConfig, noCrit);
    expect(s.phase).toBe('class');
    expect(arena.actors(s)).toEqual(['a', 'b']);
    s = arena.apply(s, 'a', { type: 'class', cls: 'mage' }, noCrit);
    expect(arena.validate(s, 'a', { type: 'class', cls: 'rogue' })).toMatch(/already/);
    expect(arena.tick!(s, { ...noCrit, now: s.deadline - 1 })).toBeNull();
    s = arena.tick!(s, { ...noCrit, now: s.deadline })!;
    expect(s.phase).toBe('choose');
    expect(s.round).toBe(1);
    expect(s.fighters.a.cls).toBe('mage');
    expect(s.fighters.b.cls).not.toBeNull();
    expect(s.fighters.a.hp).toBe(CLASSES.mage.hp);
    expect(s.fighters.a.energy).toBe(RULES.startEnergy);
  });

  it('scales HP with the match length', () => {
    expect(fight(['warrior', 'mage'], { length: 'short' }).fighters.a.hp).toBe(Math.round(CLASSES.warrior.hp * LENGTHS.short.hp));
    expect(fight(['warrior', 'mage'], { length: 'long' }).fighters.a.hp).toBe(Math.round(CLASSES.warrior.hp * LENGTHS.long.hp));
    const s = fight(['warrior', 'mage'], { length: 'short' });
    expect(s.suddenDeath).toBe(LENGTHS.short.suddenDeath);
  });

  it('keeps every pick hidden until the round resolves', () => {
    let s = fight(['warrior', 'mage', 'rogue']);
    s = arena.apply(s, 'a', { type: 'commit', hash: commitHash('strike', 'b', 'x') }, noCrit);
    s = arena.apply(s, 'b', { type: 'commit', hash: commitHash('charge', null, 'y') }, noCrit);
    s = arena.apply(s, 'c', { type: 'commit', hash: commitHash('block', null, 'z') }, noCrit);
    expect(s.phase).toBe('reveal');
    s = arena.apply(s, 'a', { type: 'reveal', action: 'strike', target: 'b', salt: 'x' }, noCrit);
    s = arena.apply(s, 'b', { type: 'reveal', action: 'charge', salt: 'y' }, noCrit);

    const forB = arena.view(s, 'b') as ArenaView;
    expect(Object.keys(forB.picks)).toEqual(['b']);
    expect(JSON.stringify(forB)).not.toContain('strike');
    expect(forB.locked.sort()).toEqual(['a', 'b', 'c']);
    expect(forB.myCommit).toBe(commitHash('charge', null, 'y'));
    expect(JSON.stringify(forB)).not.toContain(commitHash('strike', 'b', 'x'));
    const watcher = arena.view(s, null) as ArenaView;
    expect(watcher.picks).toEqual({});
    expect(watcher.myCommit).toBeNull();
    expect('commits' in watcher).toBe(false);

    s = arena.apply(s, 'c', { type: 'reveal', action: 'block', salt: 'z' }, noCrit);
    expect(s.phase).toBe('result');
    const after = arena.view(s, 'b') as ArenaView;
    expect(after.played.a).toMatchObject({ a: 'strike', t: 'b' });
    expect(after.played.c).toMatchObject({ a: 'block' });
  });

  it('hides computer picks too: the bot move itself carries nothing', () => {
    const players: PlayerInfo[] = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B', bot: 'hard' }];
    let s = arena.setup(players, arena.defaultConfig, noCrit);
    s = arena.apply(s, 'a', { type: 'class', cls: 'warrior' }, noCrit);
    s = arena.apply(s, 'b', { type: 'class', cls: 'rogue' }, noCrit);
    // Bots wait a human-like moment before locking in.
    expect(arena.bot(s, 'b', 'hard', { ...noCrit, now: s.start })).toBeNull();
    const move = arena.bot(s, 'b', 'hard', { ...noCrit, now: s.deadline - 1 });
    expect(move).toEqual({ type: 'bot' });
    s = arena.apply(s, 'b', move!, noCrit);
    expect(s.picks.b).toBeDefined();
    const forA = arena.view(s, 'a') as ArenaView;
    expect(forA.picks).toEqual({});
    expect(forA.locked).toEqual(['b']);
    expect(arena.validate(s, 'a', { type: 'bot' })).toMatch(/sealed/);
  });

  it('checks seals, reveal timing and targets', () => {
    let s = fight(['warrior', 'mage']);
    expect(arena.validate(s, 'a', { type: 'commit', hash: 'short' })).toMatch(/seal/i);
    expect(arena.validate(s, 'z', { type: 'commit', hash: commitHash('block', null, 'q') })).toMatch(/not playing/);
    s = arena.apply(s, 'a', { type: 'commit', hash: commitHash('block', null, 'q') }, noCrit);
    expect(arena.validate(s, 'a', { type: 'reveal', action: 'block', salt: 'q' })).toMatch(/reveal/i);
    // A new seal replaces the old one while the round is open.
    s = arena.apply(s, 'a', { type: 'commit', hash: commitHash('strike', 'b', 'q2') }, noCrit);
    s = arena.apply(s, 'b', { type: 'commit', hash: commitHash('block', null, 'r') }, noCrit);
    expect(s.phase).toBe('reveal');
    expect(arena.validate(s, 'a', { type: 'reveal', action: 'block', salt: 'q' })).toMatch(/match/);
    expect(arena.validate(s, 'a', { type: 'reveal', action: 'strike', target: 'b', salt: 'wrong' })).toMatch(/match/);
    expect(arena.validate(s, 'a', { type: 'reveal', action: 'strike', target: 'b', salt: 'q2' })).toBeNull();
    expect(checkPick(s, 'a', 'strike', 'a')).toMatch(/target/);
    expect(checkPick(s, 'a', 'strike', null)).toMatch(/target/);
    expect(checkPick(s, 'a', 'block')).toBeNull();
  });
});

group('Arena moves', () => {
  it('Strike hits for the class number, and crits for 50% more', () => {
    let s = round(fight(['warrior', 'mage']), { a: ['strike', 'b'], b: ['strike', 'a'] });
    expect(s.fighters.b.hp).toBe(CLASSES.mage.hp - CLASSES.warrior.strike);
    expect(s.fighters.a.hp).toBe(CLASSES.warrior.hp - CLASSES.mage.strike);
    s = round(fight(['rogue', 'mage']), { a: ['strike', 'b'], b: ['block'] }, { rng: fixed(0), now: 1000 });
    // A fresh block stops strikes even when they crit.
    expect(s.fighters.b.hp).toBe(CLASSES.mage.hp);
    s = round(fight(['rogue', 'mage']), { a: ['strike', 'b'], b: ['strike', 'a'] }, { rng: fixed(0), now: 1000 });
    expect(s.fighters.b.hp).toBe(CLASSES.mage.hp - Math.round(CLASSES.rogue.strike * 1.5));
    expect(s.log.some((e) => e.k === 'hit' && e.crit)).toBe(true);
  });

  it('Charge gains energy but takes 50% more damage', () => {
    const s = round(fight(['warrior', 'mage']), { a: ['strike', 'b'], b: ['charge'] });
    expect(s.fighters.b.energy).toBe(RULES.startEnergy + CLASSES.mage.charge);
    expect(s.fighters.b.hp).toBe(CLASSES.mage.hp - Math.round(CLASSES.warrior.strike * RULES.openMult));
    const w = round(fight(['warrior', 'mage']), { a: ['charge'], b: ['block'] });
    expect(w.fighters.a.energy).toBe(RULES.startEnergy + CLASSES.warrior.charge);
    // Energy caps at the maximum.
    let c = fight(['warrior', 'cleric']);
    for (let i = 0; i < 4; i++) c = next(round(c, { a: ['charge'], b: ['charge'] }));
    expect(c.fighters.a.energy).toBe(RULES.maxEnergy);
  });

  it('a fresh Block parries and counters, a second only halves, a third breaks', () => {
    let s = fight(['warrior', 'cleric']);
    s = round(s, { a: ['strike', 'b'], b: ['block'] });
    expect(s.fighters.b.hp).toBe(CLASSES.cleric.hp);
    expect(s.fighters.a.hp).toBe(CLASSES.warrior.hp - RULES.counter);
    expect(s.fighters.b.energy).toBe(RULES.startEnergy + RULES.parryEnergy);
    expect(s.log).toContainEqual({ k: 'parry', by: 'b', from: 'a', via: 'strike' });

    s = next(s);
    s = round(s, { a: ['strike', 'b'], b: ['block'] });
    expect(s.fighters.b.hp).toBe(CLASSES.cleric.hp - Math.round(CLASSES.warrior.strike / 2));
    expect(s.fighters.a.hp).toBe(CLASSES.warrior.hp - RULES.counter);

    s = next(s);
    const before = s.fighters.b.hp;
    s = round(s, { a: ['strike', 'b'], b: ['block'] });
    expect(s.fighters.b.hp).toBe(before - CLASSES.warrior.strike);
    expect(s.log).toContainEqual({ k: 'broken', by: 'b' });

    // Doing anything else resets the guard.
    s = next(round(next(s), { a: ['block'], b: ['charge'] }));
    s = round(s, { a: ['strike', 'b'], b: ['block'] });
    expect(s.log.some((e) => e.k === 'parry')).toBe(true);
  });

  it('a fresh Block halves specials', () => {
    let s = fight(['mage', 'cleric']);
    s = next(round(s, { a: ['charge'], b: ['charge'] }));
    s = round(s, { a: ['special', 'b'], b: ['block'] });
    expect(s.fighters.b.hp).toBe(CLASSES.cleric.hp - RULES.fireball / 2);
    expect(s.fighters.b.burn).toBe(0);
  });

  it('Fireball costs 3, hits hard and burns for two rounds', () => {
    let s = fight(['mage', 'warrior']);
    expect(arena.validate(s, 'a', { type: 'commit', hash: commitHash('special', 'b', 's') })).toBeNull();
    expect(checkPick(s, 'a', 'special', 'b')).toMatch(/energy/);
    s = next(round(s, { a: ['charge'], b: ['block'] }));
    expect(s.fighters.a.energy).toBe(4);
    s = round(s, { a: ['special', 'b'], b: ['charge'] });
    expect(s.fighters.a.energy).toBe(1);
    const hp = CLASSES.warrior.hp - RULES.fireball * RULES.openMult;
    expect(s.fighters.b.hp).toBe(hp);
    expect(s.fighters.b.burn).toBe(RULES.burnRounds);
    expect(describeLog(s.log.find((e) => e.k === 'hit')!, (id) => (id === 'a' ? 'Ada' : 'Bayo'), s)).toBe(
      `Ada's Fireball hit Bayo for ${hp > 0 ? RULES.fireball * RULES.openMult : 0} (caught charging, burning)`
    );
    s = next(round(next(s), { a: ['block'], b: ['block'] }));
    expect(s.fighters.b.hp).toBe(hp - RULES.burn);
    s = round(s, { a: ['charge'], b: ['charge'] });
    expect(s.fighters.b.hp).toBe(hp - RULES.burn * 2);
    expect(s.fighters.b.burn).toBe(0);
    s = round(next(s), { a: ['block'], b: ['block'] });
    expect(s.fighters.b.hp).toBe(hp - RULES.burn * 2);
  });

  it('Backstab hits hard, but a fresh block makes it miss and stuns the rogue', () => {
    let s = fight(['rogue', 'warrior']);
    s = next(round(s, { a: ['charge'], b: ['charge'] }));
    s = round(s, { a: ['special', 'b'], b: ['strike', 'a'] });
    expect(s.fighters.b.hp).toBe(CLASSES.warrior.hp - RULES.backstab);
    expect(s.fighters.a.energy).toBe(1);

    s = fight(['rogue', 'warrior']);
    s = next(round(s, { a: ['charge'], b: ['charge'] }));
    s = round(s, { a: ['special', 'b'], b: ['block'] });
    expect(s.fighters.b.hp).toBe(CLASSES.warrior.hp);
    expect(s.fighters.a.stunned).toBe(true);
    expect(s.log).toContainEqual({ k: 'stun', to: 'a' });
    s = next(s);
    // A stunned fighter sits out: not asked to pick, cannot seal, and has no guard.
    expect(arena.actors(s)).toEqual(['b']);
    expect(arena.validate(s, 'a', { type: 'commit', hash: commitHash('block', null, 'x') })).toMatch(/stunned/);
    s = round(s, { b: ['strike', 'a'] });
    expect(s.played.a.a).toBe('stunned');
    expect(s.fighters.a.hp).toBe(CLASSES.rogue.hp - CLASSES.warrior.strike);
    expect(s.fighters.a.stunned).toBe(false);
  });

  it('Cleave smashes through blocks, splashes everyone and stuns a charging target', () => {
    let s = fight(['warrior', 'mage', 'rogue', 'cleric']);
    s = next(round(s, { a: ['charge'], b: ['block'], c: ['block'], d: ['block'] }));
    s = round(s, { a: ['special', 'b'], b: ['charge'], c: ['block'], d: ['block'] });
    expect(s.fighters.b.hp).toBe(CLASSES.mage.hp - RULES.cleave * RULES.openMult);
    expect(s.fighters.b.stunned).toBe(true);
    // c and d blocked twice in a row: half guard, but Cleave ignores guards anyway.
    expect(s.fighters.c.hp).toBe(CLASSES.rogue.hp - RULES.splash);
    expect(s.fighters.d.hp).toBe(CLASSES.cleric.hp - RULES.splash);
    expect(s.fighters.a.energy).toBe(0);

    let t = fight(['warrior', 'mage']);
    t = next(round(t, { a: ['charge'], b: ['charge'] }));
    t = round(t, { a: ['special', 'b'], b: ['block'] });
    expect(t.fighters.b.hp).toBe(CLASSES.mage.hp - RULES.cleave);
  });

  it('Mend heals before hits land, clears burns and guards', () => {
    let s = fight(['cleric', 'mage']);
    s = next(round(s, { a: ['charge'], b: ['charge'] }));
    s = next(round(s, { a: ['strike', 'b'], b: ['special', 'a'] }));
    expect(s.fighters.a.burn).toBe(RULES.burnRounds);
    const hp = s.fighters.a.hp;
    s = round(s, { a: ['special'], b: ['strike', 'a'] });
    // Healed (capped at max), the strike was parried and the burn put out.
    expect(s.fighters.a.hp).toBe(Math.min(CLASSES.cleric.hp, hp + RULES.heal));
    expect(s.fighters.a.burn).toBe(0);
    expect(s.log.some((e) => e.k === 'parry' && e.by === 'a')).toBe(true);
    expect(s.fighters.a.energy).toBe(0 + RULES.parryEnergy);
    // Mend does not tire the cleric's block.
    expect(s.fighters.a.streak).toBe(0);
  });

  it('anyone who does not pick in time blocks automatically', () => {
    let s = fight(['warrior', 'mage', 'rogue']);
    s = round(s, { a: ['strike', 'b'] });
    expect(s.phase).toBe('result');
    expect(s.played.b).toMatchObject({ a: 'block', auto: true });
    expect(s.played.c).toMatchObject({ a: 'block', auto: true });
    expect(s.log).toContainEqual({ k: 'auto', by: 'b' });
    expect(s.fighters.b.streak).toBe(1);
    expect(s.fighters.a.hp).toBe(CLASSES.warrior.hp - RULES.counter);

    // Sealed but never revealed counts the same.
    s = next(s);
    s = arena.apply(s, 'a', { type: 'commit', hash: commitHash('strike', 'b', 'k') }, noCrit);
    s = arena.apply(s, 'b', { type: 'commit', hash: commitHash('strike', 'a', 'k') }, noCrit);
    s = arena.apply(s, 'c', { type: 'commit', hash: commitHash('strike', 'a', 'k') }, noCrit);
    s = arena.apply(s, 'a', { type: 'reveal', action: 'strike', target: 'b', salt: 'k' }, noCrit);
    expect(s.phase).toBe('reveal');
    s = arena.tick!(s, { ...noCrit, now: s.deadline })!;
    expect(s.played.b.auto).toBe(true);
    expect(s.played.a.a).toBe('strike');
  });
});

group('Arena endings', () => {
  it('sudden death grows every round and ends even a match where nobody fights', () => {
    const s0 = fight(['warrior', 'cleric']);
    expect(stormDamage(s0, s0.suddenDeath - 1)).toBe(0);
    expect(stormDamage(s0, s0.suddenDeath)).toBe(RULES.storm);
    expect(stormDamage(s0, s0.suddenDeath + 3)).toBe(RULES.storm * 4);
    let s = s0;
    let rounds = 0;
    while (s.phase !== 'over') {
      // Nobody picks anything, ever.
      s = arena.tick!(s, { ...noCrit, now: s.deadline })!;
      rounds++;
      expect(rounds).toBeLessThan(200);
    }
    expect(s.log.some((e) => e.k === 'storm')).toBe(true);
    expect(arena.result(s)).not.toBeNull();
  });

  it('ranks by when fighters fell, then by HP, and shares places', () => {
    const s = fight(['warrior', 'mage', 'rogue', 'cleric', 'warrior']);
    const f = (id: string, alive: boolean, fell: number, hpBefore: number, hp = 0) => ({ ...s.fighters[id], alive, fell, hpBefore, hp });
    const won: ArenaState = { ...s, phase: 'over', fighters: { a: f('a', true, 0, 0, 12), b: f('b', false, 7, 10), c: f('c', false, 7, 10), d: f('d', false, 7, 3), e: f('e', false, 2, 40) } };
    expect(standings(won)).toEqual([['a'], ['b', 'c'], ['d'], ['e']]);
    const res = arena.result(won)!;
    expect(res.draw).toBe(false);
    expect(res.ranking).toEqual([['a'], ['b', 'c'], ['d'], ['e']]);

    // The last fighters fall together: they share first place whatever their HP.
    const tied: ArenaState = { ...won, fighters: { ...won.fighters, a: f('a', false, 9, 30), b: f('b', false, 9, 5) } };
    const r2 = arena.result(tied)!;
    expect(r2.draw).toBe(true);
    expect(r2.ranking[0].sort()).toEqual(['a', 'b']);
    expect(r2.ranking.flat().sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('ends the match when one fighter is left, with a real knockout', () => {
    let s = fight(['warrior', 'mage']);
    s = { ...s, fighters: { ...s.fighters, b: { ...s.fighters.b, hp: 5 } } };
    s = round(s, { a: ['strike', 'b'], b: ['strike', 'a'] });
    expect(s.phase).toBe('over');
    expect(s.log).toContainEqual({ k: 'ko', to: 'b' });
    const r = arena.result(s)!;
    expect(r.ranking).toEqual([['a'], ['b']]);
    expect(r.scores.a).toBe(CLASSES.warrior.strike);
    expect(arena.actors(s)).toEqual([]);
    expect(arena.deadline!(s)).toBeNull();
  });

  it('the round log reads like a story', () => {
    const name = (id: string) => ({ a: 'Ada', b: 'Bayo', c: 'Chidi', d: 'Efe' })[id] ?? id;
    const s = fight(['warrior', 'mage', 'rogue', 'cleric']);
    const t = (e: Parameters<typeof describeLog>[0]) => describeLog(e, name, s);
    expect(t({ k: 'hit', by: 'b', to: 'a', n: 18, via: 'fireball' })).toBe("Bayo's Fireball hit Ada for 18");
    expect(t({ k: 'parry', by: 'c', from: 'd', via: 'strike' })).toBe("Chidi blocked Efe's strike");
    expect(t({ k: 'hit', by: 'a', to: 'b', n: 17, via: 'strike', crit: true })).toBe('Ada struck Bayo for 17 (critical!)');
    expect(t({ k: 'storm', n: 6 })).toBe('The arena shrinks! Everyone takes 6');
    expect(t({ k: 'hit', by: null, to: 'a', n: 6, via: 'storm' })).toBeNull();
  });
});

/** Plays a whole match with computer players on a fake clock, the way the room runner does. */
function selfPlay(count: number, levels: BotLevel[], seed: number, config: Record<string, unknown> = {}) {
  const rng = createRng(seed);
  let now = 1_000_000;
  const players: PlayerInfo[] = Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot: levels[i % levels.length] }));
  let s = arena.setup(players, { ...arena.defaultConfig, ...config }, { rng, now });
  for (let step = 0; step < 20000; step++) {
    const res = arena.result(s);
    if (res) return { s, res };
    let moved = false;
    for (const id of arena.actors(s)) {
      const p = players.find((x) => x.id === id)!;
      const move = arena.bot(s, id, p.bot!, { rng, now });
      if (!move) continue;
      expect(arena.validate(s, id, move), `bot move ${JSON.stringify(move)} rejected`).toBeNull();
      // The pick a bot makes must itself be legal.
      if (move.type === 'bot') {
        const pick = botPick(s, id, p.bot!, () => 0.5);
        expect(checkPick(s, id, pick.action, pick.target)).toBeNull();
      }
      s = arena.apply(s, id, move, { rng, now });
      moved = true;
      break;
    }
    if (!moved) {
      now += 250;
      const ticked = arena.tick!(s, { rng, now });
      if (ticked) s = ticked;
    }
  }
  throw new Error('Arena did not finish');
}

group('Arena computer players', () => {
  for (const count of [2, 4, 8]) {
    it(`finish ${count} player matches with legal moves`, () => {
      for (let seed = 1; seed <= 6; seed++) {
        const { s, res } = selfPlay(count, ['easy', 'medium', 'hard'], seed * 7919, { length: seed % 2 ? 'normal' : 'short' });
        expect(res.ranking.flat().sort()).toEqual(Array.from({ length: count }, (_, i) => `p${i}`).sort());
        // Nobody was auto blocked: bots always lock in before the clock runs out.
        expect(Object.values(s.past).flat().some((h) => h.auto)).toBe(false);
        expect(s.round).toBeLessThan(40);
      }
    }, 60_000);
  }

  it('only ever offers legal picks', () => {
    const s = fight(['rogue', 'mage', 'cleric']);
    for (const p of legalPicks(s, 'a')) expect(checkPick(s, 'a', p.action, p.target)).toBeNull();
    expect(legalPicks(s, 'a').some((p) => p.action === 'special')).toBe(false);
  });

  /** One computer player against a fixed script, in quick 1v1 matches across every class pairing. */
  function versus(level: BotLevel, script: (s: ArenaState, me: string, rand: () => number) => ArenaPick, games = 64) {
    const classes: ClassId[] = ['warrior', 'mage', 'rogue', 'cleric'];
    let wins = 0;
    for (let g = 0; g < games; g++) {
      const rng = createRng(1000 + g);
      let s = fight([classes[g % 4], classes[Math.floor(g / 4) % 4]]);
      while (s.phase !== 'over') {
        const picks: Record<string, ArenaPick> = {};
        if (!s.fighters.a.stunned) picks.a = botPick(s, 'a', level, () => rng.next());
        if (!s.fighters.b.stunned) picks.b = script(s, 'b', () => rng.next());
        s = resolve({ ...s, picks }, rng, 0);
        if (s.phase === 'result') s = arena.tick!(s, { rng, now: s.deadline })!;
      }
      const r = arena.result(s)!;
      if (!r.draw && r.ranking[0][0] === 'a') wins++;
    }
    return wins / games;
  }

  it('no simple strategy dominates: bots beat always-block, always-strike and always-charge', () => {
    const always = (action: Action) => (s: ArenaState, me: string) => ({ action, target: action === 'strike' ? s.players.find((p) => p !== me) : null });
    for (const level of ['medium', 'hard'] as BotLevel[]) {
      expect(versus(level, always('block'))).toBeGreaterThan(0.8);
      expect(versus(level, always('strike'))).toBeGreaterThan(level === 'hard' ? 0.8 : 0.6);
      expect(versus(level, always('charge'))).toBeGreaterThan(0.8);
    }
    // Hard also beats random play and the easy bot most of the time.
    const random = (s: ArenaState, me: string, rand: () => number) => {
      const opts = legalPicks(s, me);
      return opts[Math.floor(rand() * opts.length)];
    };
    expect(versus('hard', random)).toBeGreaterThan(0.6);
    expect(versus('hard', (s, me, rand) => botPick(s, me, 'easy', rand))).toBeGreaterThan(0.6);
  }, 60_000);
});

group('Arena rules page', () => {
  it('quotes the same numbers the engine uses', () => {
    const text = ARENA.rules.flatMap((r) => r.body).join(' ');
    for (const c of Object.values(CLASSES)) {
      expect(text).toContain(`${c.name} (${c.hp} HP, strikes for ${c.strike}`);
      expect(text).toContain(`${c.special.name}, ${c.special.cost} energy`);
    }
    for (const n of [RULES.cleave, RULES.splash, RULES.fireball, RULES.burn, RULES.backstab, RULES.heal, RULES.counter]) expect(text).toContain(String(n));
    expect(text).toContain(`round ${LENGTHS.normal.suddenDeath}`);
    expect(ARENA.players).toEqual([2, 8]);
    expect(ARENA.family).toBe('party');
    expect(ARENA.settings.map((x) => x.key).sort()).toEqual(Object.keys(arena.defaultConfig).sort());
  });
});
