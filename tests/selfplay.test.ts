import { describe, expect, it } from 'vitest';
import { createRng } from '~/engine/rng';
import type { AnyGame, BotLevel, PlayerInfo } from '~/engine/types';
import { ayo } from '~/engine/games/ayo';
import { whot } from '~/engine/games/whot';
import { connectFour } from '~/engine/games/connect-four';
import { ticTacToe } from '~/engine/games/tic-tac-toe';
import { rps } from '~/engine/games/rps';
import { wordRace } from '~/engine/games/word-race';
import { quickMath } from '~/engine/games/quick-math';
import { trivia } from '~/engine/games/trivia';

/** Plays a full game with bots only, advancing a fake clock, and checks every bot move is legal. */
function selfPlay(game: AnyGame, config: Record<string, unknown>, count: number, levels: BotLevel[], seed: number) {
  const rng = createRng(seed);
  let now = 1_000_000;
  const players: PlayerInfo[] = Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot: levels[i % levels.length] }));
  let state = game.setup(players, { ...game.defaultConfig, ...config }, { rng, now });
  for (let step = 0; step < 5000; step++) {
    if (game.result(state)) return { state, result: game.result(state)!, steps: step };
    let moved = false;
    for (const id of game.actors(state)) {
      const p = players.find((x) => x.id === id)!;
      const move = game.bot(state, id, p.bot!, { rng, now });
      if (!move) continue;
      const err = game.validate(state, id, move);
      expect(err, `${game.id} bot move ${JSON.stringify(move)} rejected`).toBeNull();
      state = game.apply(state, id, move, { rng, now });
      moved = true;
      break;
    }
    if (!moved) {
      now += 500;
      const ticked = game.tick?.(state, { rng, now });
      if (ticked) state = ticked;
    }
  }
  throw new Error(`${game.id} did not finish`);
}

const cases: [AnyGame, Record<string, unknown>, number][] = [
  [ayo, { rules: 'fours' }, 2],
  [ayo, { rules: 'opposite' }, 2],
  [whot, {}, 2],
  [whot, {}, 4],
  [whot, { changeDirection: true, starEightDouble: true }, 8],
  [connectFour, { mode: 'classic' }, 2],
  [connectFour, { mode: 'popout' }, 2],
  [connectFour, { mode: 'five' }, 2],
  [ticTacToe, { mode: 'classic' }, 2],
  [ticTacToe, { mode: 'ultimate' }, 2],
  [ticTacToe, { mode: 'vanishing' }, 2],
  [rps, { mode: 'classic', bestOf: 5 }, 2],
  [rps, { mode: 'lizard-spock', bestOf: 3 }, 2],
  [wordRace, { mode: 'unscramble', rounds: 5 }, 4],
  [wordRace, { mode: 'hunt', seconds: 60 }, 3],
  [quickMath, { mode: 'sprint', level: 'hard', questions: 10 }, 5],
  [quickMath, { mode: 'make24', level: 'medium', questions: 4 }, 3],
  [trivia, { pack: 'naija', questions: 8 }, 6],
  [trivia, { pack: 'mixed', questions: 10 }, 2]
];

describe('every game finishes with legal bot moves', () => {
  for (const [game, config, count] of cases) {
    it(`${game.id} ${JSON.stringify(config)} with ${count} players`, async () => {
      for (let seed = 1; seed <= 6; seed++) {
        // Trivia and Word Race download their questions before a match, as the app does.
        await game.prepare?.({ ...game.defaultConfig, ...config }, new Set());
        const { result } = selfPlay(game, config, count, ['easy', 'medium', 'hard'], seed * 7919);
        expect(result.ranking.flat().sort()).toEqual(Array.from({ length: count }, (_, i) => `p${i}`).sort());
      }
    }, 120_000);
  }
});
