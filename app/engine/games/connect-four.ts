import type { BotLevel, GameDef, PlayerId } from '../types';

export type C4Mode = 'classic' | 'popout' | 'five';

export interface C4Config extends Record<string, unknown> {
  mode: C4Mode;
}

export interface C4State {
  mode: C4Mode;
  rows: number;
  cols: number;
  need: number;
  players: [PlayerId, PlayerId];
  /** Row major, row 0 is the top. 0 empty, 1 first player, 2 second player. */
  cells: number[];
  turn: 0 | 1;
  last: { type: 'drop' | 'pop'; col: number; row: number } | null;
  winLine: number[] | null;
  winner: 0 | 1 | null;
  draw: boolean;
  moves: number;
}

export type C4Move = { type: 'drop' | 'pop'; col: number };

const SHAPE: Record<C4Mode, { rows: number; cols: number; need: number }> = {
  classic: { rows: 6, cols: 7, need: 4 },
  popout: { rows: 6, cols: 7, need: 4 },
  five: { rows: 7, cols: 9, need: 5 }
};

const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1]
];

export function findLine(cells: number[], rows: number, cols: number, need: number, who: number): number[] | null {
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (cells[r * cols + c] !== who) continue;
      for (const [dr, dc] of DIRS) {
        const line = [r * cols + c];
        for (let k = 1; k < need; k++) {
          const rr = r + dr * k, cc = c + dc * k;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols || cells[rr * cols + cc] !== who) break;
          line.push(rr * cols + cc);
        }
        if (line.length === need) return line;
      }
    }
  return null;
}

function legal(s: Pick<C4State, 'cells' | 'rows' | 'cols' | 'mode'>, who: 1 | 2): C4Move[] {
  const out: C4Move[] = [];
  const order = Array.from({ length: s.cols }, (_, i) => i).sort((a, b) => Math.abs(a - (s.cols - 1) / 2) - Math.abs(b - (s.cols - 1) / 2));
  for (const c of order) if (s.cells[c] === 0) out.push({ type: 'drop', col: c });
  if (s.mode === 'popout') for (const c of order) if (s.cells[(s.rows - 1) * s.cols + c] === who) out.push({ type: 'pop', col: c });
  return out;
}

function play(s: C4State, move: C4Move): C4State {
  const cells = [...s.cells];
  const who = s.turn + 1;
  let row = 0;
  if (move.type === 'drop') {
    row = s.rows - 1;
    while (row >= 0 && cells[row * s.cols + move.col] !== 0) row--;
    cells[row * s.cols + move.col] = who;
  } else {
    row = s.rows - 1;
    for (let r = s.rows - 1; r > 0; r--) cells[r * s.cols + move.col] = cells[(r - 1) * s.cols + move.col];
    cells[move.col] = 0;
  }
  const next: C4State = { ...s, cells, last: { type: move.type, col: move.col, row }, turn: (1 - s.turn) as 0 | 1, moves: s.moves + 1 };
  const mine = findLine(cells, s.rows, s.cols, s.need, who);
  const theirs = move.type === 'pop' ? findLine(cells, s.rows, s.cols, s.need, 3 - who) : null;
  // A pop that completes a line for both players goes to the player who popped.
  if (mine) return { ...next, winLine: mine, winner: s.turn };
  if (theirs) return { ...next, winLine: theirs, winner: (1 - s.turn) as 0 | 1 };
  const full = cells.every((v) => v !== 0);
  if ((full && s.mode !== 'popout') || next.moves >= s.rows * s.cols * 3) return { ...next, draw: true };
  return next;
}

/** Scores every window of `need` cells: open runs are worth a lot, blocked ones nothing. */
function heuristic(s: C4State, me: number): number {
  const opp = 3 - me;
  const { rows, cols, need, cells } = s;
  let score = 0;
  const centre = Math.floor(cols / 2);
  for (let r = 0; r < rows; r++) if (cells[r * cols + centre] === me) score += 3;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      for (const [dr, dc] of DIRS) {
        const er = r + dr * (need - 1), ec = c + dc * (need - 1);
        if (er < 0 || er >= rows || ec < 0 || ec >= cols) continue;
        let m = 0, o = 0;
        for (let k = 0; k < need; k++) {
          const v = cells[(r + dr * k) * cols + c + dc * k];
          if (v === me) m++;
          else if (v === opp) o++;
        }
        if (m && o) continue;
        if (m === need - 1) score += 50;
        else if (m === need - 2) score += 8;
        else if (m) score += 1;
        if (o === need - 1) score -= 60;
        else if (o === need - 2) score -= 8;
      }
  return score;
}

function negamax(s: C4State, depth: number, alpha: number, beta: number, deadline: number, stats: { nodes: number }): number {
  stats.nodes++;
  const who = (s.turn + 1) as 1 | 2;
  if (depth === 0 || (stats.nodes & 1023) === 0 && Date.now() > deadline) return heuristic(s, who);
  let best = -Infinity;
  for (const m of legal(s, who)) {
    const n = play(s, m);
    let v: number;
    if (n.winner !== null) v = n.winner === s.turn ? 100000 + depth : -100000 - depth;
    else if (n.draw) v = 0;
    else v = -negamax(n, depth - 1, -beta, -alpha, deadline, stats);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best === -Infinity ? 0 : best;
}

const LEVEL: Record<BotLevel, { depth: number; ms: number; noise: number }> = {
  easy: { depth: 2, ms: 150, noise: 0.35 },
  medium: { depth: 5, ms: 500, noise: 0.08 },
  hard: { depth: 10, ms: 1200, noise: 0 }
};

export const connectFour: GameDef<C4State, C4Move, C4Config> = {
  id: 'connect-four',
  minPlayers: 2,
  maxPlayers: 2,
  defaultConfig: { mode: 'classic' },
  setup(players, config) {
    const mode = (['classic', 'popout', 'five'] as const).includes(config.mode) ? config.mode : 'classic';
    const { rows, cols, need } = SHAPE[mode];
    return { mode, rows, cols, need, players: [players[0].id, players[1].id], cells: Array(rows * cols).fill(0), turn: 0, last: null, winLine: null, winner: null, draw: false, moves: 0 };
  },
  actors(s) {
    return s.winner !== null || s.draw ? [] : [s.players[s.turn]];
  },
  validate(s, player, move) {
    if (s.winner !== null || s.draw) return 'The game is over.';
    if (s.players[s.turn] !== player) return 'It is not your turn.';
    if (!move || !Number.isInteger(move.col) || move.col < 0 || move.col >= s.cols) return 'Pick a column.';
    if (move.type === 'drop') return s.cells[move.col] === 0 ? null : 'That column is full.';
    if (move.type === 'pop') {
      if (s.mode !== 'popout') return 'Popping is only allowed in Pop Out.';
      return s.cells[(s.rows - 1) * s.cols + move.col] === s.turn + 1 ? null : 'You can only pop your own disc from the bottom.';
    }
    return 'Unknown move.';
  },
  apply(s, _p, move) {
    return play(s, move);
  },
  result(s) {
    if (s.winner === null && !s.draw) return null;
    const [a, b] = s.players;
    if (s.draw) return { ranking: [[a, b]], scores: { [a]: 0, [b]: 0 }, draw: true, summary: 'The board filled up. A draw.' };
    const w = s.players[s.winner!], l = s.players[1 - s.winner!];
    return { ranking: [[w], [l]], scores: { [w]: 1, [l]: 0 }, draw: false, summary: `${s.need} in a row.` };
  },
  view(s) {
    return s;
  },
  random(s, player, { rng }) {
    const moves = legal(s, (s.players.indexOf(player) + 1) as 1 | 2);
    return moves.length ? rng.pick(moves) : null;
  },
  bot(s, player, level, { rng }) {
    const who = (s.players.indexOf(player) + 1) as 1 | 2;
    const moves = legal(s, who);
    if (!moves.length) return null;
    const cfg = LEVEL[level];
    // Always take a win and always block an immediate loss, even on easy.
    for (const m of moves) if (play(s, m).winner === s.turn) return m;
    if (level !== 'easy' || rng.next() < 0.6) {
      const opp: C4State = { ...s, turn: (1 - s.turn) as 0 | 1 };
      for (const m of legal(opp, (3 - who) as 1 | 2)) if (m.type === 'drop' && play(opp, m).winner === opp.turn) return m;
    }
    if (rng.next() < cfg.noise) return rng.pick(moves);
    const deadline = Date.now() + cfg.ms;
    let best = moves[0];
    // Iterative deepening: keep the best move of the deepest finished search.
    for (let d = 1; d <= cfg.depth; d++) {
      let bestHere = moves[0], bestScore = -Infinity;
      const stats = { nodes: 0 };
      for (const m of moves) {
        const n = play(s, m);
        const v = n.winner !== null ? 1e6 : n.draw ? 0 : -negamax(n, d - 1, -Infinity, Infinity, deadline, stats);
        if (v > bestScore) {
          bestScore = v;
          bestHere = m;
        }
      }
      if (Date.now() > deadline && d > 1) break;
      best = bestHere;
      if (bestScore >= 100000) break;
    }
    return best;
  }
};
