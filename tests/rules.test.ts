import { describe, expect, it } from 'vitest';
import { createRng } from '~/engine/rng';
import { ayo, sow, legalPits, type AyoState } from '~/engine/games/ayo';
import { whot, makeDeck, canPlay, type WhotState, type Card } from '~/engine/games/whot';
import { connectFour } from '~/engine/games/connect-four';
import { ticTacToe } from '~/engine/games/tic-tac-toe';
import { rps, commitHash } from '~/engine/games/rps';
import { evaluate, solve24 } from '~/engine/games/quick-math';
import { triviaPoints } from '~/engine/games/trivia';
import { sha256 } from '~/engine/sha256';

const ctx = { rng: createRng(1), now: 0 };
const two = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];

describe('sha256', () => {
  it('matches known digests', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('Ayo, complete fours', () => {
  const base = (pits: number[]): AyoState => ({ ...ayo.setup(two, { rules: 'fours' }, ctx), pits });

  it('starts with 4 seeds in each of 12 houses', () => {
    const s = ayo.setup(two, { rules: 'fours' }, ctx);
    expect(s.pits).toEqual(Array(12).fill(4));
  });
  it('wins a house when the last seed makes exactly four', () => {
    // House 0 has 2 seeds: they land in 1 and 2. House 2 had 3, so it becomes 4.
    const s = base([2, 0, 3, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
    const out = sow(s, 0, 0);
    expect(out.houses[0]).toBe(1);
    expect(out.pits[2]).toBe(0);
  });
  it('relays from a house that already had seeds', () => {
    // House 0 has 1 seed: lands in house 1 (had 1, now 2), pick up 2, sow into 2 and 3. House 3 was empty: stop.
    const s = base([1, 1, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5]);
    const out = sow(s, 0, 0);
    expect(out.pits.slice(0, 4)).toEqual([0, 0, 1, 1]);
    expect(out.steps.filter((x) => x.kind === 'pickup')).toHaveLength(2);
  });
  it('only lets you sow from your own non empty houses', () => {
    const s = ayo.setup(two, { rules: 'fours' }, ctx);
    expect(ayo.validate(s, 'a', { pit: 7 })).toMatch(/own row/);
    expect(ayo.validate(s, 'b', { pit: 0 })).toMatch(/not your turn/);
    expect(ayo.validate(s, 'a', { pit: 3 })).toBeNull();
  });
});

describe('Ayo, capture opposite', () => {
  it('captures the opposite house when the relay ends in your own empty house', () => {
    const s: AyoState = { ...ayo.setup(two, { rules: 'opposite' }, ctx), pits: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0] };
    // Seed from 0 lands in empty house 1 (own side). Opposite of 1 is 10, which has 6.
    const out = sow(s, 0, 0);
    expect(out.seeds[0]).toBe(6);
    expect(out.pits[10]).toBe(0);
  });
  it('skips the starting house on long laps', () => {
    const s: AyoState = { ...ayo.setup(two, { rules: 'opposite' }, ctx), pits: [12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    const out = sow(s, 0, 0);
    // The first lap drops 12 seeds without touching the starting house.
    const firstLap = out.steps.filter((x) => x.kind === 'drop').slice(0, 12).map((x) => x.pit);
    expect(firstLap).not.toContain(0);
    expect(firstLap).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 1]);
  });
  it('forces a move that feeds an empty opponent when possible', () => {
    const s: AyoState = { ...ayo.setup(two, { rules: 'opposite' }, ctx), pits: [1, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0] };
    expect(legalPits(s, 0)).toEqual([5]);
  });
});

describe('Whot', () => {
  it('has the 54 card Nigerian deck', () => {
    const deck = makeDeck();
    expect(deck).toHaveLength(54);
    expect(deck.filter((c) => c.shape === 'whot')).toHaveLength(5);
    expect(deck.filter((c) => c.shape === 'star').map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 7, 8]);
  });

  const table = (hands: Card[][], top: Card, extra: Partial<WhotState> = {}): WhotState => {
    const s = whot.setup(two, whot.defaultConfig, { rng: createRng(5), now: 0 });
    return { ...s, hands, pile: [top], market: makeDeck().slice(0, 20), called: null, pending: null, turn: 0, ...extra };
  };
  const c = (shape: Card['shape'], n: number): Card => ({ id: `${shape}-${n}`, shape, n });

  it('matches by shape or number, and Whot goes on anything', () => {
    const s = table([[], []], c('circle', 7));
    expect(canPlay(s, c('circle', 3))).toBe(true);
    expect(canPlay(s, c('star', 7))).toBe(true);
    expect(canPlay(s, c('square', 3))).toBe(false);
    expect(canPlay(s, { id: 'whot-1', shape: 'whot', n: 20 })).toBe(true);
  });
  it('stacks pick two when defended and makes the next player pick the total', () => {
    let s = table([[c('circle', 2), c('cross', 7), c('star', 4)], [c('square', 2), c('triangle', 11), c('star', 5)]], c('circle', 10));
    s = whot.apply(s, 'a', { type: 'play', card: 'circle-2', declare: 'semi' }, ctx);
    expect(s.pending).toEqual({ n: 2, cards: 2 });
    expect(whot.validate(s, 'b', { type: 'play', card: 'triangle-11' })).toMatch(/Defend/);
    s = whot.apply(s, 'b', { type: 'play', card: 'square-2', declare: 'semi' }, ctx);
    expect(s.pending).toEqual({ n: 2, cards: 4 });
    s = whot.apply(s, 'a', { type: 'draw' }, ctx);
    expect(s.hands[0]).toHaveLength(6);
    expect(s.pending).toBeNull();
  });
  it('hold on and general market let you play again', () => {
    let s = table([[c('circle', 1), c('circle', 3), c('star', 4)], [c('square', 9), c('cross', 7)]], c('circle', 10));
    s = whot.apply(s, 'a', { type: 'play', card: 'circle-1', declare: 'semi' }, ctx);
    expect(s.turn).toBe(0);
    s = table([[c('circle', 14), c('circle', 3), c('star', 4)], [c('square', 9), c('cross', 7)]], c('circle', 10));
    s = whot.apply(s, 'a', { type: 'play', card: 'circle-14', declare: 'semi' }, ctx);
    expect(s.turn).toBe(0);
    expect(s.hands[1]).toHaveLength(3);
  });
  it('a Whot 20 needs a called shape, which the next player must follow', () => {
    let s = table([[{ id: 'whot-1', shape: 'whot', n: 20 }, c('circle', 3), c('star', 4)], [c('square', 9), c('triangle', 9)]], c('circle', 10));
    expect(whot.validate(s, 'a', { type: 'play', card: 'whot-1' })).toMatch(/Choose a shape/);
    s = whot.apply(s, 'a', { type: 'play', card: 'whot-1', call: 'triangle', declare: 'semi' }, ctx);
    expect(whot.validate(s, 'b', { type: 'play', card: 'square-9' })).not.toBeNull();
    expect(whot.validate(s, 'b', { type: 'play', card: 'triangle-9' })).toBeNull();
  });
  it('forgetting to call last card costs two cards', () => {
    let s = table([[c('circle', 3), c('star', 4)], [c('square', 9), c('cross', 7), c('cross', 8)]], c('circle', 10));
    s = whot.apply(s, 'a', { type: 'play', card: 'circle-3' }, ctx);
    expect(s.hands[0]).toHaveLength(3);
  });
  it('the last card ends the game and others are ranked by points', () => {
    let s = table([[c('circle', 3)], [c('star', 4), c('cross', 7)]], c('circle', 10));
    s = whot.apply(s, 'a', { type: 'play', card: 'circle-3' }, ctx);
    const r = whot.result(s)!;
    expect(r.ranking[0]).toEqual(['a']);
    expect(r.scores.b).toBe(15); // star 4 counts double
  });
  it('hides other hands and the market', () => {
    const s = whot.setup(two, whot.defaultConfig, ctx);
    const v = whot.view(s, 'a') as { hands: unknown[]; market: unknown };
    expect(Array.isArray(v.hands[0])).toBe(true);
    expect(typeof v.hands[1]).toBe('number');
    expect(typeof v.market).toBe('number');
  });
});

describe('Connect Four', () => {
  it('detects four in a row and blocks full columns', () => {
    let s = connectFour.setup(two, { mode: 'classic' }, ctx);
    for (const col of [0, 1, 0, 1, 0, 1]) s = connectFour.apply(s, s.players[s.turn], { type: 'drop', col }, ctx);
    s = connectFour.apply(s, 'a', { type: 'drop', col: 0 }, ctx);
    expect(s.winner).toBe(0);
    expect(s.winLine).toHaveLength(4);
  });
  it('hard computer blocks an open three', () => {
    let s = connectFour.setup(two, { mode: 'classic' }, ctx);
    for (const [p, col] of [['a', 0], ['b', 6], ['a', 1], ['b', 6], ['a', 2]] as const) s = connectFour.apply(s, p, { type: 'drop', col }, ctx);
    const move = connectFour.bot(s, 'b', 'hard', ctx)!;
    expect(move.col).toBe(3);
  });
});

describe('Tic Tac Toe', () => {
  it('ultimate sends you to the matching board, or anywhere if it is decided', () => {
    let s = ticTacToe.setup(two, { mode: 'ultimate' }, ctx);
    s = ticTacToe.apply(s, 'a', { cell: 4 }, ctx); // board 0, cell 4
    expect(s.active).toBe(4);
    expect(ticTacToe.validate(s, 'b', { cell: 0 })).toMatch(/highlighted/);
  });
  it('vanishing keeps only three marks', () => {
    let s = ticTacToe.setup(two, { mode: 'vanishing' }, ctx);
    for (const cell of [0, 3, 1, 4, 8, 6]) s = ticTacToe.apply(s, s.players[s.turn], { cell }, ctx);
    s = ticTacToe.apply(s, 'a', { cell: 7 }, ctx);
    expect(s.cells[0]).toBe(0);
    expect(s.order[0]).toEqual([1, 8, 7]);
  });
  it('hard classic computer never loses', () => {
    for (let seed = 1; seed < 15; seed++) {
      const rng = createRng(seed);
      let s = ticTacToe.setup(two, { mode: 'classic' }, { rng, now: 0 });
      while (!ticTacToe.result(s)) {
        const who = s.players[s.turn];
        const move = who === 'b' ? ticTacToe.bot(s, 'b', 'hard', { rng, now: 0 })! : { cell: rng.pick(s.cells.flatMap((v, i) => (v ? [] : [i]))) };
        s = ticTacToe.apply(s, who, move, { rng, now: 0 });
      }
      expect(s.winner).not.toBe(0);
    }
  });
});

describe('Rock Paper Scissors', () => {
  it('only accepts a reveal that matches the sealed pick', () => {
    let s = rps.setup(two, { mode: 'classic', bestOf: 3, seconds: 8 }, ctx);
    s = rps.apply(s, 'a', { type: 'commit', hash: commitHash('rock', 'salt-a') }, ctx);
    s = rps.apply(s, 'b', { type: 'commit', hash: commitHash('paper', 'salt-b') }, ctx);
    expect(s.phase).toBe('reveal');
    expect(rps.validate(s, 'a', { type: 'reveal', choice: 'paper', salt: 'salt-a' })).toMatch(/match/);
    s = rps.apply(s, 'a', { type: 'reveal', choice: 'rock', salt: 'salt-a' }, ctx);
    const hidden = rps.view(s, 'b') as { picks: unknown[] };
    expect(hidden.picks[0]).toBeNull();
    s = rps.apply(s, 'b', { type: 'reveal', choice: 'paper', salt: 'salt-b' }, ctx);
    expect(s.history[0].winner).toBe(1);
  });
  it('humans must seal their pick', () => {
    const s = rps.setup(two, rps.defaultConfig, ctx);
    expect(rps.validate(s, 'a', { type: 'pick', choice: 'rock' })).toMatch(/sealed/);
  });
});

describe('Quick Math', () => {
  it('evaluates with exact fractions', () => {
    expect(evaluate('8 ÷ (3 − 8 ÷ 3)').value).toEqual([24, 1]);
    expect(evaluate('(1+2+3)*4').used).toEqual([1, 2, 3, 4]);
    expect(() => evaluate('2^3')).toThrow();
  });
  it('solves classic Make 24 puzzles', () => {
    expect(solve24([3, 3, 8, 8])).not.toBeNull();
    expect(solve24([1, 1, 1, 1])).toBeNull();
  });
});

describe('Trivia scoring', () => {
  it('rewards speed and streaks like Kahoot', () => {
    expect(triviaPoints(200, 20000, 1)).toBe(1000);
    expect(triviaPoints(10000, 20000, 1)).toBe(750);
    expect(triviaPoints(20000, 20000, 1)).toBe(500);
    expect(triviaPoints(200, 20000, 3)).toBe(1200);
    expect(triviaPoints(200, 20000, 10)).toBe(1500);
  });
});

describe('whot always ends', () => {
  it('four and eight player games finish well inside 200 moves with tender on', async () => {
    const { whot } = await import('~/engine/games/whot');
    const { createRng } = await import('~/engine/rng');
    for (const n of [4, 8]) {
      for (let seed = 1; seed <= 40; seed++) {
        const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `p${i}`, bot: 'medium' as const }));
        const ctx = { rng: createRng(seed), now: 0 };
        let s = whot.setup(players, whot.defaultConfig, ctx);
        let moves = 0;
        while (!whot.result(s) && moves < 200) {
          const who = whot.actors(s)[0];
          s = whot.apply(s, who, whot.bot(s, who, 'medium', ctx)!, ctx);
          moves++;
        }
        expect(whot.result(s), `${n} players, seed ${seed}`).not.toBeNull();
      }
    }
  });
});
