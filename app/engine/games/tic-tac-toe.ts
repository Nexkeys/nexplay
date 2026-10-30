import type { BotLevel, Ctx, GameDef, PlayerId } from '../types';

export type TttMode = 'classic' | 'ultimate' | 'vanishing';

export interface TttConfig extends Record<string, unknown> {
  mode: TttMode;
}

export interface TttState {
  mode: TttMode;
  players: [PlayerId, PlayerId];
  /** classic and vanishing: 9 cells. ultimate: 81 cells, board b holds cells b*9 to b*9+8. 0 empty, 1 X, 2 O. */
  cells: number[];
  /** ultimate only: winner of each small board. 0 open, 1 X, 2 O, 3 drawn. */
  boards: number[];
  /** ultimate only: the board the next move must be in, or -1 for anywhere. */
  active: number;
  /** vanishing only: placement order per player, oldest first. */
  order: [number[], number[]];
  turn: 0 | 1;
  last: number | null;
  winLine: number[] | null;
  winner: 0 | 1 | null;
  draw: boolean;
  moves: number;
}

export type TttMove = { cell: number };

export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const lineOf = (cells: ArrayLike<number>, offset = 0): { who: number; line: number[] } | null => {
  for (const l of LINES) {
    const a = cells[offset + l[0]];
    if (a && a !== 3 && a === cells[offset + l[1]] && a === cells[offset + l[2]]) return { who: a, line: l.map((i) => offset + i) };
  }
  return null;
};

function legalCells(s: TttState): number[] {
  if (s.mode !== 'ultimate') return s.cells.flatMap((v, i) => (v ? [] : [i]));
  const out: number[] = [];
  for (let b = 0; b < 9; b++) {
    if (s.boards[b] !== 0) continue;
    if (s.active !== -1 && s.active !== b) continue;
    for (let k = 0; k < 9; k++) if (!s.cells[b * 9 + k]) out.push(b * 9 + k);
  }
  return out;
}

function play(s: TttState, cell: number): TttState {
  const who = s.turn + 1;
  const cells = [...s.cells];
  const order: [number[], number[]] = [[...s.order[0]], [...s.order[1]]];
  let boards = s.boards;
  let active = s.active;
  cells[cell] = who;
  const n: TttState = { ...s, cells, order, turn: (1 - s.turn) as 0 | 1, last: cell, moves: s.moves + 1 };

  if (s.mode === 'vanishing') {
    order[s.turn].push(cell);
    if (order[s.turn].length > 3) cells[order[s.turn].shift()!] = 0;
    const w = lineOf(cells);
    if (w) return { ...n, winner: s.turn, winLine: w.line };
    if (n.moves >= 80) return { ...n, draw: true };
    return n;
  }
  if (s.mode === 'classic') {
    const w = lineOf(cells);
    if (w) return { ...n, winner: s.turn, winLine: w.line };
    if (cells.every(Boolean)) return { ...n, draw: true };
    return n;
  }
  // Ultimate
  boards = [...boards];
  const b = Math.floor(cell / 9);
  const local = lineOf(cells, b * 9);
  if (local) boards[b] = who;
  else if (cells.slice(b * 9, b * 9 + 9).every(Boolean)) boards[b] = 3;
  const target = cell % 9;
  active = boards[target] === 0 ? target : -1;
  n.boards = boards;
  n.active = active;
  const big = lineOf(boards);
  if (big) return { ...n, winner: s.turn, winLine: big.line };
  if (boards.every(Boolean)) {
    // Every board is decided without three in a row: most small boards wins, otherwise a draw.
    const x = boards.filter((v) => v === 1).length, o = boards.filter((v) => v === 2).length;
    if (x !== o) return { ...n, winner: x > o ? 0 : 1, winLine: null };
    return { ...n, draw: true };
  }
  return n;
}

// --- computer -------------------------------------------------------------

const memo = new Map<string, number>();
function perfect(cells: number[], turn: 1 | 2): number {
  const key = cells.join('') + turn;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const w = lineOf(cells);
  let v: number;
  if (w) v = w.who === turn ? 10 : -10;
  else if (cells.every(Boolean)) v = 0;
  else {
    v = -Infinity;
    for (let i = 0; i < 9; i++)
      if (!cells[i]) {
        cells[i] = turn;
        v = Math.max(v, -perfect(cells, (3 - turn) as 1 | 2) * 0.9);
        cells[i] = 0;
      }
  }
  memo.set(key, v);
  return v;
}

function evalUltimate(s: TttState, me: number): number {
  const opp = 3 - me;
  let score = 0;
  for (let b = 0; b < 9; b++) {
    const weight = b === 4 ? 1.5 : [0, 2, 6, 8].includes(b) ? 1.2 : 1;
    if (s.boards[b] === me) score += 100 * weight;
    else if (s.boards[b] === opp) score -= 100 * weight;
    else if (s.boards[b] === 0) {
      for (const l of LINES) {
        const vals = l.map((k) => s.cells[b * 9 + k]);
        const m = vals.filter((v) => v === me).length, o = vals.filter((v) => v === opp).length;
        if (m === 2 && !o) score += 8 * weight;
        if (o === 2 && !m) score -= 8 * weight;
      }
    }
  }
  for (const l of LINES) {
    const vals = l.map((k) => s.boards[k]);
    const m = vals.filter((v) => v === me).length, o = vals.filter((v) => v === opp).length;
    if (m === 2 && !o && !vals.includes(3)) score += 150;
    if (o === 2 && !m && !vals.includes(3)) score -= 150;
  }
  if (s.active === -1) score += s.turn + 1 === me ? 20 : -20;
  return score;
}

function search(s: TttState, depth: number, me: number, alpha: number, beta: number, evalFn: (s: TttState, me: number) => number): number {
  if (s.winner !== null) return s.winner + 1 === me ? 100000 + depth : -100000 - depth;
  if (s.draw) return 0;
  if (depth === 0) return evalFn(s, me);
  const moves = legalCells(s);
  const maximize = s.turn + 1 === me;
  let best = maximize ? -Infinity : Infinity;
  for (const c of moves) {
    const v = search(play(s, c), depth - 1, me, alpha, beta, evalFn);
    if (maximize) {
      best = Math.max(best, v);
      alpha = Math.max(alpha, v);
    } else {
      best = Math.min(best, v);
      beta = Math.min(beta, v);
    }
    if (alpha >= beta) break;
  }
  return best;
}

function evalVanishing(s: TttState, me: number): number {
  let score = 0;
  for (const l of LINES) {
    const vals = l.map((k) => s.cells[k]);
    const m = vals.filter((v) => v === me).length, o = vals.filter((v) => v === 3 - me).length;
    if (m === 2 && !o) score += 10;
    if (o === 2 && !m) score -= 12;
  }
  return score + (s.cells[4] === me ? 3 : 0);
}

function chooseBot(s: TttState, me: number, level: BotLevel, ctx: Ctx): number | null {
  const moves = legalCells(s);
  if (!moves.length) return null;
  // Winning now, or blocking a win, is something every level does most of the time.
  for (const c of moves) if (play(s, c).winner === s.turn) return c;
  const randomChance = level === 'easy' ? 0.55 : level === 'medium' ? 0.15 : 0;
  if (ctx.rng.next() < randomChance) return ctx.rng.pick(moves);
  if (s.mode === 'classic') {
    let best = moves[0], bestV = -Infinity;
    for (const c of ctx.rng.shuffle(moves)) {
      const cells = [...s.cells];
      cells[c] = me;
      const v = -perfect(cells, (3 - me) as 1 | 2);
      if (v > bestV) {
        bestV = v;
        best = c;
      }
    }
    return best;
  }
  const depth = s.mode === 'ultimate' ? (level === 'hard' ? 4 : level === 'medium' ? 2 : 1) : level === 'hard' ? 6 : 3;
  const evalFn = s.mode === 'ultimate' ? evalUltimate : evalVanishing;
  let best = moves[0], bestV = -Infinity;
  for (const c of ctx.rng.shuffle(moves)) {
    const v = search(play(s, c), depth - 1, me, -Infinity, Infinity, evalFn);
    if (v > bestV) {
      bestV = v;
      best = c;
    }
  }
  return best;
}

export const ticTacToe: GameDef<TttState, TttMove, TttConfig> = {
  id: 'tic-tac-toe',
  minPlayers: 2,
  maxPlayers: 2,
  defaultConfig: { mode: 'classic' },
  setup(players, config) {
    const mode = (['classic', 'ultimate', 'vanishing'] as const).includes(config.mode) ? config.mode : 'classic';
    return {
      mode,
      players: [players[0].id, players[1].id],
      cells: Array(mode === 'ultimate' ? 81 : 9).fill(0),
      boards: Array(9).fill(0),
      active: -1,
      order: [[], []],
      turn: 0,
      last: null,
      winLine: null,
      winner: null,
      draw: false,
      moves: 0
    };
  },
  actors(s) {
    return s.winner !== null || s.draw ? [] : [s.players[s.turn]];
  },
  validate(s, player, move) {
    if (s.winner !== null || s.draw) return 'The game is over.';
    if (s.players[s.turn] !== player) return 'It is not your turn.';
    if (!move || !Number.isInteger(move.cell)) return 'Pick a square.';
    if (!legalCells(s).includes(move.cell)) return s.mode === 'ultimate' && s.active !== -1 ? 'You have to play in the highlighted board.' : 'That square is taken.';
    return null;
  },
  apply(s, _p, move) {
    return play(s, move.cell);
  },
  result(s) {
    if (s.winner === null && !s.draw) return null;
    const [a, b] = s.players;
    if (s.draw) return { ranking: [[a, b]], scores: { [a]: 0, [b]: 0 }, draw: true, summary: 'Nobody got three in a row.' };
    const w = s.players[s.winner!], l = s.players[1 - s.winner!];
    return { ranking: [[w], [l]], scores: { [w]: 1, [l]: 0 }, draw: false, summary: s.mode === 'ultimate' ? 'Took the big board.' : 'Three in a row.' };
  },
  view(s) {
    return s;
  },
  random(s, _player, { rng }) {
    const cells = legalCells(s);
    return cells.length ? { cell: rng.pick(cells) } : null;
  },
  bot(s, player, level, ctx) {
    const cell = chooseBot(s, s.players.indexOf(player) + 1, level, ctx);
    return cell === null ? null : { cell };
  }
};
