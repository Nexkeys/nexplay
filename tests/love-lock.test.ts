import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LoveLockBoard from '~/components/boards/LoveLock';
import {
  bestShare,
  candidates,
  clueRange,
  clueText,
  holds,
  knownClues,
  lockPoints,
  loveLock,
  makeLock,
  MAX_TIER,
  MIN_LEFT,
  OPEN_MS,
  partnerMove,
  REACTIONS,
  RUN_CAP,
  tierFor,
  TIERS,
  unsharedOf,
  type Clue,
  type LoveLockConfig,
  type LoveLockMove,
  type LoveLockState,
  type LoveLockView
} from '~/engine/games/love-lock';
import { createRng } from '~/engine/rng';
import type { BotLevel, PlayerInfo } from '~/engine/types';
import { outcomeFor } from '~/lib/stats';

const T0 = 1_000_000;
const people: PlayerInfo[] = [
  { id: 'a', name: 'Ada' },
  { id: 'b', name: 'Bayo' }
];

function start(config: Partial<LoveLockConfig> = {}, seed = 1): LoveLockState {
  return loveLock.setup(people, { ...loveLock.defaultConfig, ...config }, { rng: createRng(seed), now: T0 });
}

/** Applies a move after checking it is legal. */
function play(s: LoveLockState, player: string, move: LoveLockMove, now = T0 + 1000): LoveLockState {
  const err = loveLock.validate(s, player, move);
  expect(err, `${player} ${JSON.stringify(move)}`).toBeNull();
  return loveLock.apply(s, player, move, { rng: createRng(99), now });
}

const turnOf = (s: LoveLockState) => s.players[s.turn];
const otherOf = (s: LoveLockState) => s.players[1 - s.turn];
const wrongCode = (s: LoveLockState) => s.lock.code.map((v) => (v + 1) % s.lock.k);

describe('Love Lock generator', () => {
  it('tiers grow in slots and symbols', () => {
    for (let t = 1; t < MAX_TIER; t++) {
      const a = TIERS[t - 1];
      const b = TIERS[t];
      expect(b.n * 10 + b.k).toBeGreaterThan(a.n * 10 + a.k);
    }
    expect(tierFor(1, 1)).toBe(1);
    expect(tierFor(4, 1)).toBe(4);
    expect(tierFor(3, 3)).toBe(5);
    expect(tierFor(40, 1)).toBe(MAX_TIER);
  });

  for (let tier = 1; tier <= MAX_TIER; tier++) {
    it(`tier ${tier}: one answer together, several for each half alone (200 seeds)`, () => {
      const { n, k } = TIERS[tier - 1];
      const [fewest, most] = clueRange(n);
      for (let seed = 1; seed <= 200; seed++) {
        const lock = makeLock(createRng(seed * 7919 + tier), tier);
        expect(lock.n).toBe(n);
        expect(lock.k).toBe(k);
        expect(lock.code).toHaveLength(n);
        expect(lock.clues.length).toBeGreaterThanOrEqual(fewest);
        expect(lock.clues.length).toBeLessThanOrEqual(most);
        expect(lock.owner).toHaveLength(lock.clues.length);
        expect(lock.shared.every((x) => !x)).toBe(true);
        for (const c of lock.clues) expect(holds(c, lock.code, 0, n), clueText(c)).toBe(true);
        // (a) all clues together leave exactly the code
        expect(candidates(n, k, lock.clues)).toEqual([lock.code]);
        // (b) each half alone leaves several codes, and has at least two clues
        for (const who of [0, 1]) {
          const half = lock.clues.filter((_, i) => lock.owner[i] === who);
          expect(half.length).toBeGreaterThanOrEqual(2);
          expect(candidates(n, k, half, [], MIN_LEFT).length).toBe(MIN_LEFT);
        }
      }
    }, 120_000);
  }

  it('is deterministic for a seed', () => {
    expect(makeLock(createRng(5), 4)).toEqual(makeLock(createRng(5), 4));
  });

  it('later tiers use subtler clues', () => {
    const count = (tier: number) => {
      let at = 0;
      let rel = 0;
      let all = 0;
      for (let seed = 1; seed <= 60; seed++)
        for (const c of makeLock(createRng(seed), tier).clues) {
          all++;
          if (c.t === 'at') at++;
          if (c.t === 'left' || c.t === 'next' || c.t === 'same' || c.t === 'diff') rel++;
        }
      return { at: at / all, rel: rel / all };
    };
    const early = count(1);
    const late = count(MAX_TIER);
    expect(late.at).toBe(0);
    expect(early.at).toBeGreaterThan(0);
    expect(late.rel).toBeGreaterThan(early.rel);
  });

  it('describes every clue type in words', () => {
    const clues: Clue[] = [
      { t: 'at', i: 0, s: 0 },
      { t: 'not', i: 0, s: 0 },
      { t: 'either', i: 2, a: 4, b: 2 },
      { t: 'count', s: 3, m: 1 },
      { t: 'count', s: 3, m: 0 },
      { t: 'same', i: 1, j: 3 },
      { t: 'diff', i: 0, j: 2 },
      { t: 'left', a: 1, b: 2 },
      { t: 'next', a: 0, b: 1 },
      { t: 'distinct', m: 3 }
    ];
    expect(clues.map(clueText)).toEqual([
      'Slot 1 is heart',
      'heart is not in slot 1',
      'Slot 3 is flower or moon',
      'There is exactly one gem',
      'There is no gem',
      'Slots 2 and 4 match',
      'Slots 1 and 3 are different',
      'A star is somewhere left of a moon',
      'A heart sits right next to a star',
      'The code uses exactly three different symbols'
    ]);
    // ★ left of ☾ means some star comes before some moon.
    expect(holds(clues[7], [1, 0, 2], 0, 3)).toBe(true);
    expect(holds(clues[7], [2, 1, 0], 0, 3)).toBe(false);
  });
});

describe('Love Lock views', () => {
  it('each player sees only their own clues plus shared ones, and nobody sees the code', () => {
    let s = start();
    const check = () => {
      for (const [viewer, who] of [
        ['a', 0],
        ['b', 1],
        [null, -1]
      ] as const) {
        const v = loveLock.view(s, viewer) as LoveLockView;
        expect(v.lock.code).toEqual([]);
        v.lock.clues.forEach((c, i) => {
          const visible = s.lock.shared[i] || s.lock.owner[i] === who;
          expect(c).toEqual(visible ? s.lock.clues[i] : null);
        });
      }
    };
    check();
    s = play(s, turnOf(s), { type: 'share', clue: unsharedOf(s, s.turn)[0] });
    expect(s.lock.shared.filter(Boolean)).toHaveLength(1);
    check();
    // The partner now sees the shared clue.
    const sharedIdx = s.lock.shared.indexOf(true);
    expect((loveLock.view(s, turnOf(s)) as LoveLockView).lock.clues[sharedIdx]).toEqual(s.lock.clues[sharedIdx]);
  });

  it('reveals the code only once the lock is open', () => {
    let s = start();
    s = play(s, turnOf(s), { type: 'try', code: s.lock.code });
    expect(s.phase).toBe('opened');
    expect((loveLock.view(s, 'a') as LoveLockView).reveal).toEqual(s.reveal);
  });
});

describe('Love Lock rules', () => {
  it('only the player whose turn it is may share or try, and only their own unshared clues', () => {
    let s = start();
    const me = turnOf(s);
    const partner = otherOf(s);
    const mine = unsharedOf(s, s.turn);
    const theirs = unsharedOf(s, 1 - s.turn);
    expect(loveLock.actors(s)).toEqual([me]);
    expect(loveLock.validate(s, partner, { type: 'share', clue: theirs[0] })).toMatch(/partner's turn/);
    expect(loveLock.validate(s, me, { type: 'share', clue: theirs[0] })).toMatch(/your clues/);
    expect(loveLock.validate(s, me, { type: 'share', clue: 99 })).toMatch(/your clues/);
    expect(loveLock.validate(s, me, { type: 'try', code: [0] })).toMatch(/Fill every slot/);
    expect(loveLock.validate(s, me, { type: 'try', code: s.lock.code.map(() => s.lock.k) })).toMatch(/Fill every slot/);
    expect(loveLock.validate(s, me, { type: 'pass' })).toMatch(/Share a clue/);
    expect(loveLock.validate(s, 'zed', { type: 'pass' })).toMatch(/not playing/);

    s = play(s, me, { type: 'share', clue: mine[0] });
    expect(s.lockShares).toBe(1);
    expect(turnOf(s)).toBe(partner);
    expect(s.turnStart).toBe(T0 + 1000);
    expect(s.turnEnd).toBe(T0 + 1000 + s.seconds * 1000);
    // Back to me: that clue cannot be shared twice.
    s = play(s, partner, { type: 'share', clue: theirs[0] });
    expect(loveLock.validate(s, me, { type: 'share', clue: mine[0] })).toMatch(/already shared/);
  });

  it('passing is only allowed with nothing left to share', () => {
    let s = start();
    while (unsharedOf(s, s.turn).length) s = play(s, turnOf(s), { type: 'share', clue: unsharedOf(s, s.turn)[0] });
    expect(loveLock.validate(s, turnOf(s), { type: 'pass' })).toBeNull();
  });

  it('a wrong try costs a heart, shows which slots were right and passes the turn', () => {
    let s = start();
    const me = turnOf(s);
    const guess = s.lock.code.slice();
    guess[0] = (guess[0] + 1) % s.lock.k;
    s = play(s, me, { type: 'try', code: guess });
    expect(s.hearts).toBe(4);
    expect(s.tries).toEqual([{ by: 1 - s.turn, code: guess, hits: guess.map((_, i) => i !== 0) }]);
    expect(turnOf(s)).not.toBe(me);
    expect(s.phase).toBe('play');
    expect(s.streak).toBe(0);
    // The partner's view shows the hints too, and they narrow the codes.
    const v = loveLock.view(s, turnOf(s)) as LoveLockView;
    expect(v.tries[0].hits).toEqual(guess.map((_, i) => i !== 0));
  });

  it('opening a lock scores, celebrates, then brings a harder lock', () => {
    let s = start({}, 3);
    const opener = s.turn;
    s = play(s, turnOf(s), { type: 'share', clue: unsharedOf(s, s.turn)[0] }, T0 + 2000);
    s = play(s, turnOf(s), { type: 'try', code: s.lock.code }, T0 + 4000);
    expect(s.phase).toBe('opened');
    expect(s.opened).toBe(1);
    const pts = lockPoints(3, 4000, 1, 0, 1);
    expect(s.score).toBe(pts.total);
    expect(s.gain?.total).toBe(pts.total);
    expect(s.streak).toBe(1);
    expect(loveLock.actors(s)).toEqual([]);
    expect(loveLock.validate(s, 'a', { type: 'pass' })).toMatch(/next lock/);
    expect(loveLock.deadline!(s)).toBe(T0 + 4000 + OPEN_MS);
    expect(loveLock.tick!(s, { rng: createRng(1), now: T0 + 4000 + OPEN_MS - 1 })).toBeNull();
    const next = loveLock.tick!(s, { rng: createRng(1), now: T0 + 4000 + OPEN_MS })!;
    expect(next.phase).toBe('play');
    expect(next.lockNo).toBe(2);
    expect(next.lock.tier).toBe(2);
    expect(next.lock.k).toBe(6);
    expect(next.tries).toEqual([]);
    // The partner who did not open the last lock starts this one... which is whoever followed the opener.
    expect(next.turn).toBe(opener);
  });

  it('scores speed, few shares, few wrong tries and streaks', () => {
    expect(lockPoints(4, 0, 0, 0, 1).total).toBeGreaterThan(lockPoints(4, 60_000, 0, 0, 1).total);
    expect(lockPoints(4, 0, 0, 0, 1).total).toBeGreaterThan(lockPoints(4, 0, 3, 0, 1).total);
    expect(lockPoints(4, 0, 0, 0, 1).total).toBeGreaterThan(lockPoints(4, 0, 0, 1, 1).total);
    expect(lockPoints(4, 0, 0, 0, 3).total).toBeGreaterThan(lockPoints(4, 0, 0, 0, 1).total);
    expect(lockPoints(5, 999_999, 20, 5, 0).total).toBe(20);
  });

  it('reactions can be sent any time, but not too fast', () => {
    let s = start();
    const idle = otherOf(s);
    expect(loveLock.validate(s, idle, { type: 'react', r: REACTIONS.length })).toMatch(/Unknown/);
    s = play(s, idle, { type: 'react', r: 0 }, T0 + 100);
    expect(s.reacts[idle]).toEqual({ r: 0, at: T0 + 100 });
    expect(turnOf(s)).not.toBe(idle);
    const same = loveLock.apply(s, idle, { type: 'react', r: 2 }, { rng: createRng(1), now: T0 + 300 });
    expect(same.reacts[idle].r).toBe(0);
    s = play(s, idle, { type: 'react', r: 2 }, T0 + 1200);
    expect(s.reacts[idle].r).toBe(2);
  });
});

describe('Love Lock hearts, timer and results', () => {
  it('running out of hearts ends the run as a shared loss', () => {
    let s = start({ hearts: 2 });
    s = play(s, turnOf(s), { type: 'try', code: wrongCode(s) });
    expect(loveLock.result(s)).toBeNull();
    s = play(s, turnOf(s), { type: 'try', code: wrongCode(s) });
    expect(s.hearts).toBe(0);
    expect(s.phase).toBe('over');
    expect(s.reveal).toEqual(s.lock.code);
    expect(loveLock.deadline!(s)).toBeNull();
    expect(loveLock.actors(s)).toEqual([]);
    expect(loveLock.validate(s, 'a', { type: 'react', r: 0 })).toMatch(/over/);
    const res = loveLock.result(s)! as ReturnType<typeof loveLock.result> & { coop: { won: boolean } };
    expect(res.ranking).toEqual([['a', 'b']]);
    expect(res.draw).toBe(true);
    expect(res.coop).toEqual({ won: false });
    expect(res.summary).toBe('0 of 5 locks opened together');
    expect(res.scores.a).toBe(res.scores.b);
    expect(outcomeFor(res, 'a')).toBe(outcomeFor(res, 'b'));
    expect(outcomeFor(res, 'a')).not.toBe('win');
  });

  it('opening every lock in a set is a shared win for both partners', () => {
    let s = start({ locks: 3 }, 8);
    let now = T0;
    while (s.phase !== 'over') {
      now += 1000;
      if (s.phase === 'opened') s = loveLock.tick!(s, { rng: createRng(now), now: s.phaseEnd })!;
      else s = play(s, turnOf(s), { type: 'try', code: s.lock.code }, now);
    }
    expect(s.opened).toBe(3);
    const res = loveLock.result(s)! as ReturnType<typeof loveLock.result> & { coop: { won: boolean } };
    expect(res.ranking).toEqual([['a', 'b']]);
    expect(res.draw).toBe(false);
    expect(res.coop).toEqual({ won: true });
    expect(res.scores).toEqual({ a: s.score, b: s.score });
    expect(res.summary).toBe('All 3 locks opened together!');
    // Neither partner beats the other, and neither loses.
    expect(outcomeFor(res, 'a')).toBe(outcomeFor(res, 'b'));
    expect(outcomeFor(res, 'a')).not.toBe('loss');
  });

  it('a heart run wins back a heart every third clean lock and counts the goal', () => {
    let s = start({ mode: 'run', locks: 2, hearts: 3 }, 4);
    s = play(s, turnOf(s), { type: 'try', code: wrongCode(s) });
    expect(s.hearts).toBe(2);
    for (let i = 0; i < 3; i++) {
      s = play(s, turnOf(s), { type: 'try', code: s.lock.code });
      s = loveLock.tick!(s, { rng: createRng(i), now: s.phaseEnd })!;
    }
    // The first lock had a wrong try, so the clean streak is two.
    expect(s.opened).toBe(3);
    expect(s.streak).toBe(2);
    expect(s.hearts).toBe(2);
    s = play(s, turnOf(s), { type: 'try', code: s.lock.code });
    expect(s.streak).toBe(3);
    expect(s.gain?.heart).toBe(true);
    expect(s.hearts).toBe(3);
    s = loveLock.tick!(s, { rng: createRng(9), now: s.phaseEnd })!;
    s = play(s, turnOf(s), { type: 'try', code: wrongCode(s) });
    s = play(s, turnOf(s), { type: 'try', code: wrongCode(s) });
    s = play(s, turnOf(s), { type: 'try', code: wrongCode(s) });
    expect(s.phase).toBe('over');
    const res = loveLock.result(s)! as ReturnType<typeof loveLock.result> & { coop: { won: boolean } };
    expect(res.coop).toEqual({ won: true });
    expect(res.summary).toBe('4 locks opened together!');
  });

  it('a heart run stops at the cap', () => {
    let s = start({ mode: 'run' }, 2);
    while (s.phase !== 'over') {
      s = play(s, turnOf(s), { type: 'try', code: s.lock.code });
      if (s.phase === 'opened') s = loveLock.tick!(s, { rng: createRng(s.opened), now: s.phaseEnd })!;
    }
    expect(s.opened).toBe(RUN_CAP);
    expect(s.outcome).toBe('won');
  }, 60_000);

  it('when the turn timer runs out, the most useful clue is shared for that player', () => {
    let s = start({ seconds: 30 });
    const who = s.turn;
    expect(loveLock.deadline!(s)).toBe(T0 + 30_000);
    expect(loveLock.tick!(s, { rng: createRng(1), now: T0 + 29_999 })).toBeNull();
    const best = bestShare(s, who);
    s = loveLock.tick!(s, { rng: createRng(1), now: T0 + 30_000 })!;
    expect(best).not.toBeNull();
    expect(s.lock.shared[best!]).toBe(true);
    expect(s.log.at(-1)).toEqual({ k: 'share', by: who, clue: best, auto: true });
    expect(s.turn).toBe(1 - who);
    expect(s.turnEnd).toBe(T0 + 60_000);
    // With nothing left to share, the turn is handed over.
    while (unsharedOf(s, s.turn).length) s = play(s, turnOf(s), { type: 'share', clue: unsharedOf(s, s.turn)[0] }, s.turnStart + 10);
    const stuck = s.turn;
    s = loveLock.tick!(s, { rng: createRng(1), now: s.turnEnd })!;
    expect(s.log.at(-1)).toEqual({ k: 'pass', by: stuck, auto: true });
    expect(s.turn).toBe(1 - stuck);
  });

  it('the best share is the one that narrows the shared picture most', () => {
    const s = start({}, 11);
    const who = s.turn;
    const best = bestShare(s, who)!;
    const left = (ci: number) => candidates(s.lock.n, s.lock.k, [s.lock.clues[ci]]).length;
    for (const ci of unsharedOf(s, who)) expect(left(best)).toBeLessThanOrEqual(left(ci));
  });
});

describe('Love Lock computer partner', () => {
  it('reasons only from what it may see', () => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = start({}, seed);
      for (let step = 0; step < 4 && s.phase === 'play'; step++) {
        for (const level of ['easy', 'medium', 'hard'] as BotLevel[]) {
          const fromView = partnerMove(loveLock.view(s, turnOf(s)) as LoveLockView, s.turn, level);
          expect(fromView).toEqual(partnerMove(s, s.turn, level));
        }
        s = play(s, turnOf(s), partnerMove(s, s.turn, 'hard'));
      }
    }
  });

  it('tries the code once its clues pin it down', () => {
    let s = start({}, 6);
    // Share everything, then the computer knows every clue.
    while (unsharedOf(s, s.turn).length || unsharedOf(s, 1 - s.turn).length) {
      const mine = unsharedOf(s, s.turn);
      s = play(s, turnOf(s), mine.length ? { type: 'share', clue: mine[0] } : { type: 'pass' });
    }
    expect(candidates(s.lock.n, s.lock.k, knownClues(s, s.turn))).toHaveLength(1);
    for (const level of ['easy', 'medium', 'hard'] as BotLevel[]) expect(partnerMove(s, s.turn, level)).toEqual({ type: 'try', code: s.lock.code });
  });

  it('waits a moment before moving, longer when easier', () => {
    const s = start({}, 2);
    const id = turnOf(s);
    expect(loveLock.bot(s, id, 'hard', { rng: createRng(1), now: T0 + 500 })).toBeNull();
    expect(loveLock.bot(s, id, 'hard', { rng: createRng(1), now: T0 + 3000 })).not.toBeNull();
    expect(loveLock.bot(s, id, 'easy', { rng: createRng(1), now: T0 + 3000 })).toBeNull();
    expect(loveLock.bot(s, otherOf(s), 'hard', { rng: createRng(1), now: T0 + 9000 })).toBeNull();
  });

  /** Plays a whole run with two computer partners on a fake clock, checking every move is legal. */
  function selfPlay(config: Partial<LoveLockConfig>, levels: [BotLevel, BotLevel], seed: number) {
    const rng = createRng(seed);
    let now = T0;
    const players: PlayerInfo[] = [
      { id: 'p0', name: 'P0', bot: levels[0] },
      { id: 'p1', name: 'P1', bot: levels[1] }
    ];
    let s = loveLock.setup(players, { ...loveLock.defaultConfig, ...config }, { rng, now });
    for (let step = 0; step < 60_000; step++) {
      const res = loveLock.result(s);
      if (res) return { s, res };
      let moved = false;
      for (const id of loveLock.actors(s)) {
        const level = players.find((p) => p.id === id)!.bot!;
        const move = loveLock.bot(s, id, level, { rng, now });
        if (!move) continue;
        expect(loveLock.validate(s, id, move), `${level} ${JSON.stringify(move)}`).toBeNull();
        s = loveLock.apply(s, id, move, { rng, now });
        moved = true;
      }
      if (!moved) {
        now += 500;
        s = loveLock.tick!(s, { rng, now }) ?? s;
      }
    }
    throw new Error('Love Lock run did not finish');
  }

  const pairs: [BotLevel, BotLevel][] = [
    ['easy', 'easy'],
    ['easy', 'hard'],
    ['medium', 'medium'],
    ['medium', 'hard'],
    ['hard', 'hard']
  ];
  for (const pair of pairs) {
    it(`${pair.join(' + ')} play full runs of five locks with legal moves`, () => {
      let wins = 0;
      for (let seed = 1; seed <= 6; seed++) {
        const { s, res } = selfPlay({ mode: 'set', locks: 5 }, pair, seed * 7919);
        expect(res.ranking).toEqual([['p0', 'p1']]);
        if (s.outcome === 'won') wins++;
        if (pair[0] === 'hard' && pair[1] === 'hard') {
          // Hard partners never guess, so they never lose a heart.
          expect(s.wrongTotal).toBe(0);
        }
      }
      if (pair[0] === 'hard' && pair[1] === 'hard') expect(wins).toBe(6);
      if (pair.includes('hard')) expect(wins).toBeGreaterThanOrEqual(4);
    }, 120_000);
  }

  it('heart runs finish, starting tricky', () => {
    // Two hard partners never slip and play to the cap (covered above); easier ones run out of hearts.
    for (let seed = 1; seed <= 6; seed++) {
      const level = (['easy', 'medium'] as BotLevel[])[seed % 2];
      const { s } = selfPlay({ mode: 'run', start: 'tricky', hearts: 3 }, [level, 'easy'], seed * 104729);
      expect(s.phase).toBe('over');
      expect(s.opened).toBeLessThanOrEqual(RUN_CAP);
    }
  }, 120_000);
});

describe('Love Lock board', () => {
  it('renders for each partner and a spectator, showing only the clues each may see', () => {
    let s = start({}, 12);
    const seats = people.map((p, i) => ({ id: p.id, name: p.name, avatar: '#ff7a8a', bot: null, connected: true, seat: i, wins: 0 }));
    const render = (viewer: string | null) =>
      renderToString(
        createElement(LoveLockBoard, {
          view: loveLock.view(s, viewer) as LoveLockView,
          me: viewer,
          seats,
          actors: loveLock.actors(s),
          deadline: 0,
          turnDeadline: 0,
          turnSeconds: 0,
          lastMove: null,
          result: loveLock.result(s),
          rev: 1,
          send: () => {},
          now: () => T0 + 500
        })
      );
    const label = (i: number) => `aria-label="${clueText(s.lock.clues[i])}"`;
    for (const [viewer, who] of [
      ['a', 0],
      ['b', 1]
    ] as const) {
      const html = render(viewer);
      s.lock.clues.forEach((_, i) => expect(html.includes(label(i))).toBe(s.lock.owner[i] === who));
    }
    expect(render(null)).not.toContain('Your clues');
    s = play(s, turnOf(s), { type: 'try', code: s.lock.code });
    expect(render('a')).toContain('Opened together');
  });
});
