import type { BotLevel, Ctx, GameDef, MatchResult, PlayerId } from '../types';

/**
 * Ayo (Ayo Olopon), the Yoruba mancala. Two rule sets:
 *  - "fours": relay sowing, a house is won when the last seed makes it hold exactly four (default, Ota and Ope).
 *  - "opposite": relay sowing, ending in an empty pit on your own side captures the pit opposite (Ayoayo).
 * Pits 0 to 5 belong to the first player, 6 to 11 to the second. Higher index is anticlockwise.
 */
export type AyoRules = 'fours' | 'opposite';

export interface AyoConfig extends Record<string, unknown> {
  rules: AyoRules;
}

export interface AyoStep {
  /** Pit a seed was dropped into, or a pickup marker. */
  pit: number;
  kind: 'drop' | 'pickup' | 'capture';
  count?: number;
}

export interface AyoState {
  rules: AyoRules;
  players: [PlayerId, PlayerId];
  pits: number[];
  turn: 0 | 1;
  /** Houses won (fours rules). */
  houses: [number, number];
  /** Seeds captured. */
  seeds: [number, number];
  last: { by: 0 | 1; from: number; steps: AyoStep[] } | null;
  over: boolean;
  endNote: string;
  turns: number;
}

export type AyoMove = { pit: number };

const MAX_STEPS = 2000;
const MAX_TURNS = 400;

const side = (pit: number): 0 | 1 => (pit < 6 ? 0 : 1);
const ownPits = (p: 0 | 1) => (p === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11]);
const seedsOn = (pits: number[], p: 0 | 1) => ownPits(p).reduce((sum, i) => sum + pits[i], 0);
const total = (pits: number[]) => pits.reduce((a, b) => a + b, 0);

interface SowOutcome {
  pits: number[];
  houses: [number, number];
  seeds: [number, number];
  steps: AyoStep[];
  endedGame: boolean;
}

/** Plays one move without any validation. Pure, used by both the engine and the computer. */
export function sow(state: Pick<AyoState, 'rules' | 'pits' | 'houses' | 'seeds'>, player: 0 | 1, start: number): SowOutcome {
  const pits = [...state.pits];
  const houses: [number, number] = [...state.houses];
  const seeds: [number, number] = [...state.seeds];
  const steps: AyoStep[] = [];
  let endedGame = false;

  let pos = start;
  let hand = pits[pos];
  pits[pos] = 0;
  let origin = pos;
  steps.push({ pit: pos, kind: 'pickup', count: hand });
  let guard = 0;

  while (hand > 0 && guard++ < MAX_STEPS) {
    pos = (pos + 1) % 12;
    // Ayoayo skips the pit the seeds came from on long laps.
    if (state.rules === 'opposite' && pos === origin) continue;
    pits[pos] += 1;
    hand -= 1;
    steps.push({ pit: pos, kind: 'drop' });
    if (hand > 0) continue;

    // The last seed of this lap has landed.
    const count = pits[pos];
    if (state.rules === 'fours') {
      if (count === 4) {
        const endgame = total(pits) <= 8;
        pits[pos] = 0;
        houses[player] += 1;
        seeds[player] += 4;
        steps.push({ pit: pos, kind: 'capture', count: 4 });
        if (endgame) {
          // Traditional finish: whoever takes the first four of the last eight takes the rest too.
          const rest = total(pits);
          for (let i = 0; i < 12; i++) pits[i] = 0;
          seeds[player] += rest;
          houses[player] += Math.floor(rest / 4);
          endedGame = true;
        }
        break;
      }
      if (count === 1) break; // landed in an empty house
      hand = count; // relay
      pits[pos] = 0;
      origin = pos;
      steps.push({ pit: pos, kind: 'pickup', count });
    } else {
      if (count === 1) {
        const opposite = 11 - pos;
        if (side(pos) === player && pits[opposite] > 0) {
          const taken = pits[opposite];
          pits[opposite] = 0;
          seeds[player] += taken;
          steps.push({ pit: opposite, kind: 'capture', count: taken });
        }
        break;
      }
      hand = count;
      pits[pos] = 0;
      origin = pos;
      steps.push({ pit: pos, kind: 'pickup', count });
    }
  }
  return { pits, houses, seeds, steps, endedGame };
}

/** Legal pits for a player, including the Ayoayo duty to feed an opponent who has nothing. */
export function legalPits(state: Pick<AyoState, 'rules' | 'pits' | 'houses' | 'seeds'>, player: 0 | 1): number[] {
  const mine = ownPits(player).filter((i) => state.pits[i] > 0);
  if (state.rules !== 'opposite') return mine;
  const opp = (1 - player) as 0 | 1;
  if (seedsOn(state.pits, opp) > 0) return mine;
  const feeding = mine.filter((i) => seedsOn(sow(state, player, i).pits, opp) > 0);
  return feeding.length ? feeding : mine;
}

function finish(state: AyoState, note: string): AyoState {
  return { ...state, over: true, endNote: note };
}

/** Called before a player's turn: ends the game when nobody can move. */
function settle(state: AyoState): AyoState {
  const p = state.turn;
  const opp = (1 - p) as 0 | 1;
  const pits = [...state.pits];
  const houses: [number, number] = [...state.houses];
  const seeds: [number, number] = [...state.seeds];
  const left = total(pits);

  if (state.rules === 'fours' && left < 4) {
    return finish({ ...state, pits: pits.map(() => 0) }, 'Too few seeds left to make a four.');
  }
  if (state.turns >= MAX_TURNS) return finish(state, 'Move limit reached.');

  if (seedsOn(pits, p) === 0) {
    // The player to move is out of seeds: the opponent sweeps what is left.
    for (let i = 0; i < 12; i++) pits[i] = 0;
    seeds[opp] += left;
    if (state.rules === 'fours') houses[opp] += Math.floor(left / 4);
    return finish({ ...state, pits, houses, seeds }, 'A player ran out of seeds. The rest were swept.');
  }
  if (state.rules === 'opposite' && seedsOn(pits, opp) === 0) {
    const canFeed = ownPits(p).some((i) => pits[i] > 0 && seedsOn(sow(state, p, i).pits, opp) > 0);
    if (!canFeed) {
      for (let i = 0; i < 12; i++) pits[i] = 0;
      seeds[p] += left;
      return finish({ ...state, pits, seeds }, 'No move could feed the empty side. The rest were swept.');
    }
  }
  return state;
}

function evaluate(state: AyoState, me: 0 | 1): number {
  const opp = 1 - me;
  if (state.rules === 'fours') return (state.houses[me] - state.houses[opp]) * 10 + (state.seeds[me] - state.seeds[opp]) * 0.1;
  return state.seeds[me] - state.seeds[opp] + (seedsOn(state.pits, me) - seedsOn(state.pits, opp as 0 | 1)) * 0.05;
}

function step(state: AyoState, pit: number): AyoState {
  const out = sow(state, state.turn, pit);
  let next: AyoState = {
    ...state,
    pits: out.pits,
    houses: out.houses,
    seeds: out.seeds,
    last: { by: state.turn, from: pit, steps: out.steps.slice(0, 600) },
    turn: (1 - state.turn) as 0 | 1,
    turns: state.turns + 1
  };
  if (out.endedGame) return finish(next, 'The first four of the last eight took the rest.');
  next = settle(next);
  return next;
}

function search(state: AyoState, depth: number, me: 0 | 1, alpha: number, beta: number): number {
  if (depth === 0 || state.over) return evaluate(state, me);
  const moves = legalPits(state, state.turn);
  if (!moves.length) return evaluate(state, me);
  if (state.turn === me) {
    let best = -Infinity;
    for (const m of moves) {
      best = Math.max(best, search(step(state, m), depth - 1, me, alpha, beta));
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    best = Math.min(best, search(step(state, m), depth - 1, me, alpha, beta));
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

const DEPTH: Record<BotLevel, number> = { easy: 1, medium: 3, hard: 6 };

export const ayo: GameDef<AyoState, AyoMove, AyoConfig> = {
  id: 'ayo',
  minPlayers: 2,
  maxPlayers: 2,
  defaultConfig: { rules: 'fours' },
  setup(players, config) {
    return {
      rules: config.rules === 'opposite' ? 'opposite' : 'fours',
      players: [players[0].id, players[1].id],
      pits: Array(12).fill(4),
      turn: 0,
      houses: [0, 0],
      seeds: [0, 0],
      last: null,
      over: false,
      endNote: '',
      turns: 0
    };
  },
  actors(state) {
    return state.over ? [] : [state.players[state.turn]];
  },
  validate(state, player, move) {
    if (state.over) return 'The game is over.';
    if (state.players[state.turn] !== player) return 'It is not your turn.';
    if (!Number.isInteger(move?.pit) || move.pit < 0 || move.pit > 11) return 'Pick one of your pits.';
    if (side(move.pit) !== state.turn) return 'You can only sow from your own row.';
    if (state.pits[move.pit] === 0) return 'That pit is empty.';
    if (!legalPits(state, state.turn).includes(move.pit)) return 'Your opponent has no seeds. You must play a pit that feeds them.';
    return null;
  },
  apply(state, _player, move) {
    return step(state, move.pit);
  },
  result(state) {
    if (!state.over) return null;
    const [a, b] = state.players;
    const score = state.rules === 'fours' ? state.houses : state.seeds;
    let diff = score[0] - score[1];
    if (diff === 0 && state.rules === 'fours') diff = state.seeds[0] - state.seeds[1];
    const scores = { [a]: score[0], [b]: score[1] };
    const unit = state.rules === 'fours' ? 'houses' : 'seeds';
    if (diff === 0) return { ranking: [[a, b]], scores, draw: true, summary: `A draw, ${score[0]} ${unit} each.` } satisfies MatchResult;
    const ranking = diff > 0 ? [[a], [b]] : [[b], [a]];
    return { ranking, scores, draw: false, summary: `${Math.max(...score)} ${unit} to ${Math.min(...score)}. ${state.endNote}`.trim() };
  },
  view(state) {
    return state; // nothing is hidden in Ayo
  },
  bot(state, player, level, ctx: Ctx) {
    const me = state.players.indexOf(player) as 0 | 1;
    const moves = legalPits(state, me);
    if (!moves.length) return null;
    if (level === 'easy' && ctx.rng.next() < 0.5) return { pit: ctx.rng.pick(moves) };
    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of ctx.rng.shuffle(moves)) {
      const s = search(step(state, m), DEPTH[level] - 1, me, -Infinity, Infinity);
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    }
    return { pit: best };
  }
};
