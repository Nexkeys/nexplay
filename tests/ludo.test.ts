import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createRng } from '~/engine/rng';
import type { BotLevel, Ctx, PlayerInfo, Rng } from '~/engine/types';
import LudoBoard from '~/components/boards/Ludo';
import type { Seat, StageProps } from '~/lib/stage';
import { BASE, HOME, ludo, trackSquare, type LudoConfig, type LudoMove, type LudoState } from '~/engine/games/ludo';

/** A context whose dice always roll `d`. */
function dice(d: number): Ctx {
  const rng: Rng = { next: () => 0, int: () => d - 1, pick: (a) => a[0], shuffle: (a) => [...a] };
  return { rng, now: 0 };
}

const players = (n: number): PlayerInfo[] => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));

function fresh(n = 2, config: Partial<LudoConfig> = {}): LudoState {
  return ludo.setup(players(n), { ...ludo.defaultConfig, ...config }, { rng: createRng(1), now: 0 });
}

/** Two players, red (p0) and yellow (p1), with the given seeds. */
function withSeeds(red: number[], yellow: number[], config: Partial<LudoConfig> = {}): LudoState {
  return { ...fresh(2, config), seeds: [red, yellow] };
}

function play(state: LudoState, player: string, move: LudoMove, ctx: Ctx = dice(1)): LudoState {
  const err = ludo.validate(state, player, move);
  expect(err, `${JSON.stringify(move)} rejected`).toBeNull();
  return ludo.apply(state, player, move, ctx);
}

/** Yellow's progress for a given track square. */
const yellowAt = (square: number) => (square - 26 + 52) % 52;

describe('Ludo setup', () => {
  it('seats two players on opposite colours and everyone starts in base', () => {
    expect(fresh(2).colours).toEqual([0, 2]);
    expect(fresh(3).colours).toEqual([0, 1, 2]);
    expect(fresh(4).colours).toEqual([0, 1, 2, 3]);
    expect(fresh(4).seeds.flat().every((s) => s === BASE)).toBe(true);
    expect(ludo.actors(fresh(2))).toEqual(['p0']);
  });
});

describe('leaving base', () => {
  it('needs a six', () => {
    let s = fresh();
    s = play(s, 'p0', { kind: 'roll' }, dice(5));
    expect(s.seeds[0]).toEqual([BASE, BASE, BASE, BASE]);
    expect(s.turn).toBe(1);
    expect(s.last?.next).toBe('pass');
  });

  it('a six brings a seed out on its own and gives another roll', () => {
    let s = fresh();
    s = play(s, 'p0', { kind: 'roll' }, dice(6));
    // All four seeds in base are the same move, so it is played for you.
    expect(s.seeds[0].filter((x) => x === 0)).toHaveLength(1);
    expect(s.turn).toBe(0);
    expect(s.phase).toBe('roll');
    expect(s.last).toMatchObject({ rolled: true, from: BASE, to: 0, next: 'again' });
  });

  it('rejects moving a based seed without a six', () => {
    let s = withSeeds([5, 9, BASE, BASE], [BASE, BASE, BASE, BASE]);
    s = play(s, 'p0', { kind: 'roll' }, dice(3));
    expect(s.phase).toBe('move');
    expect(ludo.validate(s, 'p0', { kind: 'move', seed: 2 })).toMatch(/six/);
    expect(ludo.validate(s, 'p1', { kind: 'move', seed: 0 })).toMatch(/turn/);
    expect(ludo.validate(s, 'p0', { kind: 'roll' })).not.toBeNull();
    s = play(s, 'p0', { kind: 'move', seed: 1 });
    expect(s.seeds[0]).toEqual([5, 12, BASE, BASE]);
    expect(s.turn).toBe(1);
  });

  it('with a six and seeds out, you choose between coming out and moving', () => {
    let s = withSeeds([10, BASE, BASE, BASE], [BASE, BASE, BASE, BASE]);
    s = play(s, 'p0', { kind: 'roll' }, dice(6));
    expect(s.phase).toBe('move');
    s = play(s, 'p0', { kind: 'move', seed: 2 });
    expect(s.seeds[0]).toEqual([10, BASE, 0, BASE]);
    expect(s.phase).toBe('roll');
    expect(s.turn).toBe(0);
  });
});

describe('capturing', () => {
  it('sends the rival home and gives an extra roll', () => {
    let s = withSeeds([3, BASE, BASE, BASE], [yellowAt(5), 20, BASE, BASE]);
    s = play(s, 'p0', { kind: 'roll' }, dice(2));
    expect(s.seeds[0][0]).toBe(5);
    expect(s.seeds[1]).toEqual([BASE, 20, BASE, BASE]);
    expect(s.captures[0]).toBe(1);
    expect(s.turn).toBe(0);
    expect(s.phase).toBe('roll');
    expect(s.last).toMatchObject({ next: 'again', hit: [[1, 0, yellowAt(5)]] });
  });

  it('cannot happen on a star or start square when safe squares are on', () => {
    const star = withSeeds([6, BASE, BASE, BASE], [yellowAt(8), BASE, BASE, BASE]);
    const s = play(star, 'p0', { kind: 'roll' }, dice(2));
    expect(trackSquare(0, s.seeds[0][0])).toBe(8);
    expect(s.seeds[1][0]).toBe(yellowAt(8));
    expect(s.turn).toBe(1);

    // Yellow sitting on its own start square cannot be hit either.
    const start = withSeeds([24, BASE, BASE, BASE], [0, BASE, BASE, BASE]);
    const s2 = play(start, 'p0', { kind: 'roll' }, dice(2));
    expect(s2.seeds[1][0]).toBe(0);
  });

  it('happens anywhere when safe squares are off', () => {
    const star = withSeeds([6, BASE, BASE, BASE], [yellowAt(8), BASE, BASE, BASE], { safeSquares: false });
    const s = play(star, 'p0', { kind: 'roll' }, dice(2));
    expect(s.seeds[1][0]).toBe(BASE);
    expect(s.turn).toBe(0);
  });

  it('never touches seeds in a home column', () => {
    const s0 = withSeeds([40, BASE, BASE, BASE], [52, BASE, BASE, BASE]);
    const s = play(s0, 'p0', { kind: 'roll' }, dice(2));
    expect(s.seeds[1][0]).toBe(52);
  });
});

describe('getting home', () => {
  it('needs the exact roll by default', () => {
    let s = withSeeds([53, HOME, HOME, BASE], [BASE, BASE, BASE, BASE]);
    s = play(s, 'p0', { kind: 'roll' }, dice(4));
    expect(s.seeds[0][0]).toBe(53);
    expect(s.turn).toBe(1);

    s = { ...s, turn: 0 };
    s = play(s, 'p0', { kind: 'roll' }, dice(3));
    expect(s.seeds[0][0]).toBe(HOME);
    // Reaching home earns another roll.
    expect(s.turn).toBe(0);
    expect(s.last?.next).toBe('again');
  });

  it('any roll that gets there is enough with exact roll off', () => {
    let s = withSeeds([53, BASE, BASE, BASE], [BASE, BASE, BASE, BASE], { exactHome: false });
    s = play(s, 'p0', { kind: 'roll' }, dice(5));
    expect(s.seeds[0][0]).toBe(HOME);
  });

  it('turns into the home column after one lap', () => {
    let s = withSeeds([48, BASE, BASE, BASE], [BASE, BASE, BASE, BASE]);
    s = play(s, 'p0', { kind: 'roll' }, dice(4));
    expect(s.seeds[0][0]).toBe(52);
    expect(trackSquare(0, 52)).toBeNull();
  });

  it('the last seed home wins the game', () => {
    let s = withSeeds([HOME, HOME, HOME, 54], [10, BASE, BASE, BASE]);
    s = play(s, 'p0', { kind: 'roll' }, dice(2));
    expect(s.over).toBe(true);
    const r = ludo.result(s)!;
    expect(r.ranking).toEqual([['p0'], ['p1']]);
    expect(r.scores).toEqual({ p0: 4, p1: 0 });
    expect(ludo.actors(s)).toEqual([]);
  });

  it('ranks the others by seeds home, then progress', () => {
    const s: LudoState = { ...fresh(4), seeds: [[HOME, HOME, HOME, HOME], [HOME, 3, BASE, BASE], [HOME, 30, BASE, BASE], [HOME, HOME, BASE, BASE]], over: true, winner: 0 };
    expect(ludo.result(s)!.ranking).toEqual([['p0'], ['p3'], ['p2'], ['p1']]);
  });
});

describe('three sixes', () => {
  it('ends the turn on the third six', () => {
    let s = withSeeds([10, BASE, BASE, BASE], [BASE, BASE, BASE, BASE]);
    s = play(s, 'p0', { kind: 'roll' }, dice(6));
    s = play(s, 'p0', { kind: 'move', seed: 0 });
    s = play(s, 'p0', { kind: 'roll' }, dice(6));
    s = play(s, 'p0', { kind: 'move', seed: 0 });
    expect(s.sixes).toBe(2);
    expect(s.turn).toBe(0);
    const before = s.seeds[0];
    s = play(s, 'p0', { kind: 'roll' }, dice(6));
    expect(s.turn).toBe(1);
    expect(s.sixes).toBe(0);
    expect(s.seeds[0]).toEqual(before);
    expect(s.last?.next).toBe('three');
  });

  it('lets you keep rolling sixes when the rule is off', () => {
    let s = withSeeds([10, BASE, BASE, BASE], [BASE, BASE, BASE, BASE], { threeSixes: false });
    s = { ...s, sixes: 2 };
    s = play(s, 'p0', { kind: 'roll' }, dice(6));
    expect(s.turn).toBe(0);
    expect(s.phase).toBe('move');
  });

  it('counts only sixes in a row', () => {
    let s = withSeeds([10, BASE, BASE, BASE], [BASE, BASE, BASE, BASE]);
    s = { ...s, sixes: 2 };
    s = play(s, 'p0', { kind: 'roll' }, dice(4));
    expect(s.sixes).toBe(0);
  });
});

describe('capture before home (Naija rule)', () => {
  it('sends seeds round again until you have captured', () => {
    let s = withSeeds([48, BASE, BASE, BASE], [BASE, BASE, BASE, BASE], { captureFirst: true });
    s = play(s, 'p0', { kind: 'roll' }, dice(4));
    // 48 + 4 passes the home turn, so the seed lands back on its start square.
    expect(s.seeds[0][0]).toBe(0);
    expect(trackSquare(0, s.seeds[0][0])).toBe(0);
  });

  it('can land on the square just before the start', () => {
    let s = withSeeds([48, BASE, BASE, BASE], [BASE, BASE, BASE, BASE], { captureFirst: true });
    s = play(s, 'p0', { kind: 'roll' }, dice(3));
    expect(trackSquare(0, s.seeds[0][0])).toBe(51);
    // and keeps going from there
    s = { ...s, turn: 0 };
    s = play(s, 'p0', { kind: 'roll' }, dice(5));
    expect(trackSquare(0, s.seeds[0][0])).toBe(4);
  });

  it('opens the home column after a capture', () => {
    let s = withSeeds([44, 3, BASE, BASE], [yellowAt(5), BASE, BASE, BASE], { captureFirst: true });
    s = play(s, 'p0', { kind: 'roll' }, dice(2));
    s = play(s, 'p0', { kind: 'move', seed: 1 });
    expect(s.captures[0]).toBe(1);
    s = play(s, 'p0', { kind: 'roll' }, dice(6));
    s = play(s, 'p0', { kind: 'move', seed: 0 });
    expect(s.seeds[0][0]).toBe(50);
    s = play(s, 'p0', { kind: 'roll' }, dice(6));
    s = play(s, 'p0', { kind: 'move', seed: 0 });
    expect(s.seeds[0][0]).toBe(HOME);
  });

  it('does not apply when the rule is off', () => {
    let s = withSeeds([48, BASE, BASE, BASE], [BASE, BASE, BASE, BASE]);
    s = play(s, 'p0', { kind: 'roll' }, dice(4));
    expect(s.seeds[0][0]).toBe(52);
  });
});

describe('random and bot moves', () => {
  const configs: Partial<LudoConfig>[] = [{}, { captureFirst: true }, { safeSquares: false, exactHome: false, threeSixes: false }];

  it('random() is always legal and finishes games', () => {
    for (const config of configs) {
      for (const n of [2, 3, 4]) {
        const rng = createRng(n * 101);
        let s = fresh(n, config);
        let moves = 0;
        while (!ludo.result(s)) {
          const id = ludo.actors(s)[0];
          const move = ludo.random!(s, id, { rng, now: 0 });
          expect(move).not.toBeNull();
          expect(ludo.validate(s, id, move!)).toBeNull();
          s = ludo.apply(s, id, move!, { rng, now: 0 });
          expect(++moves).toBeLessThan(20000);
        }
        expect(ludo.random!(s, 'p0', { rng, now: 0 })).toBeNull();
      }
    }
  });

  it('bots self play complete games for 2, 3 and 4 players without illegal moves', () => {
    const levels: BotLevel[][] = [
      ['easy', 'medium', 'hard', 'hard'],
      ['hard', 'easy', 'medium', 'easy'],
      ['medium', 'hard', 'easy', 'medium']
    ];
    for (const config of configs) {
      for (const n of [2, 3, 4]) {
        for (let seed = 1; seed <= 6; seed++) {
          const rng = createRng(seed * 7919 + n);
          const lv = levels[seed % levels.length];
          let s = fresh(n, config);
          let moves = 0;
          while (!ludo.result(s)) {
            const id = ludo.actors(s)[0];
            const p = s.players.indexOf(id);
            const move = ludo.bot(s, id, lv[p], { rng, now: 0 });
            expect(move, 'bot found no move').not.toBeNull();
            expect(ludo.validate(s, id, move!), `${JSON.stringify(move)} rejected`).toBeNull();
            s = ludo.apply(s, id, move!, { rng, now: 0 });
            expect(++moves).toBeLessThan(20000);
          }
          const r = ludo.result(s)!;
          expect(s.winner).toBeGreaterThanOrEqual(0);
          expect(r.ranking.flat().sort()).toEqual(s.players.slice().sort());
          expect(r.scores[s.players[s.winner]]).toBe(4);
          // Every seed is somewhere real.
          for (const seeds of s.seeds) for (const x of seeds) expect(x === BASE || (x >= -1 && x <= HOME)).toBe(true);
        }
      }
    }
  }, 120_000);

  it('medium and hard bots take a capture when they can', () => {
    for (const level of ['medium', 'hard'] as BotLevel[]) {
      let s = withSeeds([3, 20, BASE, BASE], [yellowAt(5), BASE, BASE, BASE]);
      s = play(s, 'p0', { kind: 'roll' }, dice(2));
      expect(ludo.bot(s, 'p0', level, { rng: createRng(3), now: 0 })).toEqual({ kind: 'move', seed: 0 });
    }
  });

  it('hard bots beat easy bots more often than not', () => {
    let hardWins = 0;
    const games = 40;
    for (let g = 0; g < games; g++) {
      const rng = createRng(g * 31 + 5);
      let s = fresh(2);
      const level = (p: number): BotLevel => ((p + g) % 2 === 0 ? 'hard' : 'easy');
      while (!ludo.result(s)) {
        const id = ludo.actors(s)[0];
        const move = ludo.bot(s, id, level(s.players.indexOf(id)), { rng, now: 0 })!;
        s = ludo.apply(s, id, move, { rng, now: 0 });
      }
      if (level(s.winner) === 'hard') hardWins++;
    }
    expect(hardWins).toBeGreaterThan(games / 2);
  }, 60_000);
});

describe('the board', () => {
  const seats: Seat[] = ['p0', 'p1', 'p2', 'p3'].map((id, i) => ({ id, name: `Player ${i}`, avatar: '#9be8d9', bot: null, connected: true, seat: i, wins: 0 }));
  const stage = (view: LudoState, me: string | null): StageProps<LudoState> => ({
    view,
    me,
    seats: seats.slice(0, view.players.length),
    actors: ludo.actors(view),
    deadline: 0,
    turnDeadline: 0,
    turnSeconds: 0,
    lastMove: null,
    result: ludo.result(view),
    rev: 1,
    send: () => {},
    now: () => 0
  });

  it('renders every seat, seed and the dice, with movable seeds marked', () => {
    let s: LudoState = { ...fresh(4), seeds: [[10, BASE, BASE, 30], [HOME, 52, BASE, BASE], [5, 5, BASE, BASE], [BASE, BASE, BASE, BASE]] };
    s = play(s, 'p0', { kind: 'roll' }, dice(6));
    expect(s.phase).toBe('move');
    const html = renderToString(createElement(LudoBoard, stage(s, 'p0')));
    expect(html.match(/class="ludo-seed/g)).toHaveLength(16);
    expect(html.match(/ludo-seed can/g)).toHaveLength(4);
    expect(html.match(/class="ludo-seat/g)).toHaveLength(4);
    expect(html).toContain('ludo-dice');
    expect(html).toContain('Tap a glowing seed');
  });

  it('renders for a spectator and a finished two player game', () => {
    const s: LudoState = { ...withSeeds([HOME, HOME, HOME, HOME], [3, BASE, BASE, BASE]), over: true, winner: 0 };
    const html = renderToString(createElement(LudoBoard, stage(s, null)));
    expect(html.match(/class="ludo-seed/g)).toHaveLength(8);
    expect(html).toContain('brought all four seeds home');
  });
});
