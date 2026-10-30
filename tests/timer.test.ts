import { describe, expect, it } from 'vitest';
import { ayo } from '~/engine/games/ayo';
import { connectFour } from '~/engine/games/connect-four';
import { ticTacToe } from '~/engine/games/tic-tac-toe';
import { whot } from '~/engine/games/whot';
import { createRng } from '~/engine/rng';
import type { AnyGame } from '~/engine/types';
import { MatchRunner } from '~/lib/runner';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' }
];

describe('random moves for timed out players', () => {
  const games: [string, AnyGame, Record<string, unknown>][] = [
    ['ayo fours', ayo, { rules: 'fours' }],
    ['ayo opposite', ayo, { rules: 'opposite' }],
    ['whot', whot, {}],
    ['connect four popout', connectFour, { mode: 'popout' }],
    ['ultimate tic tac toe', ticTacToe, { mode: 'ultimate' }],
    ['vanishing tic tac toe', ticTacToe, { mode: 'vanishing' }]
  ];
  for (const [name, game, config] of games) {
    it(`${name}: every random move is legal, all the way to the end`, () => {
      for (let seed = 1; seed <= 4; seed++) {
        const rng = createRng(seed);
        const ctx = { rng, now: 0 };
        let s = game.setup(players, { ...game.defaultConfig, ...config }, ctx);
        for (let turn = 0; turn < 600 && !game.result(s); turn++) {
          const who = game.actors(s)[0];
          const move = game.random!(s, who, ctx);
          expect(move).not.toBeNull();
          expect(game.validate(s, who, move)).toBeNull();
          s = game.apply(s, who, move, ctx);
        }
      }
    });
  }
});

describe('turn timer', () => {
  it('plays a random move for the player whose time ran out, and flags it', () => {
    let now = 1000;
    let last: unknown = null;
    const r = new MatchRunner(connectFour, players, { turnSeconds: 15, now: () => now, onUpdate: (s) => (last = s.lastMove) });
    r.start({});
    const first = r.snapshot();
    expect(first.turnDeadline).toBe(1000 + 15_000);
    now += 14_000;
    r.step();
    expect(r.snapshot().rev).toBe(first.rev);
    now += 2_000;
    r.step();
    expect(last).toMatchObject({ by: 'a', auto: true });
    // The other player now has a fresh 15 seconds.
    expect(r.snapshot().turnDeadline).toBe(now + 15_000);
    expect(r.snapshot().actors).toEqual(['b']);
  });
});
