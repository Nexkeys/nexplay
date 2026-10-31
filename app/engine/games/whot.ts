import type { BotLevel, Ctx, GameDef, PlayerId } from '../types';

export type Shape = 'circle' | 'triangle' | 'cross' | 'square' | 'star' | 'whot';
export const SHAPES: Exclude<Shape, 'whot'>[] = ['circle', 'triangle', 'cross', 'square', 'star'];

export interface Card {
  id: string;
  shape: Shape;
  n: number;
}

/** The Nigerian 54 card pack (Pagat, Wikipedia). */
const NUMBERS: Record<Exclude<Shape, 'whot'>, number[]> = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8]
};

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const shape of SHAPES) for (const n of NUMBERS[shape]) deck.push({ id: `${shape}-${n}`, shape, n });
  for (let i = 1; i <= 5; i++) deck.push({ id: `whot-${i}`, shape: 'whot', n: 20 });
  return deck;
}

export interface WhotConfig extends Record<string, unknown> {
  handSize: number;
  /** A pick two can be blocked with a 2, a pick three with a 5. Stacks add up. */
  defendPicks: boolean;
  pickThree: boolean;
  generalMarket: boolean;
  holdOn: boolean;
  suspension: boolean;
  starEightDouble: boolean;
  /** Players must call "last card" (and "semi last card") or draw two. */
  callRule: boolean;
  semiLastCard: boolean;
  /** 2 and 5 reverse the direction of play. */
  changeDirection: boolean;
  /** When the market runs out, everyone counts their cards and the lowest total wins. */
  tender: boolean;
}

export const WHOT_DEFAULTS: WhotConfig = {
  handSize: 6,
  defendPicks: true,
  pickThree: true,
  generalMarket: true,
  holdOn: true,
  suspension: true,
  starEightDouble: false,
  callRule: true,
  semiLastCard: true,
  changeDirection: false,
  tender: true
};

export interface WhotLog {
  by: number;
  text: string;
  card?: Card;
}

export interface WhotState {
  config: WhotConfig;
  players: PlayerId[];
  hands: Card[][];
  market: Card[];
  pile: Card[];
  turn: number;
  dir: 1 | -1;
  called: Exclude<Shape, 'whot'> | null;
  pending: { n: 2 | 5; cards: number } | null;
  log: WhotLog[];
  passes: number;
  winner: number | null;
  over: boolean;
  seq: number;
  /** How many times the pile has been shuffled back into the market. */
  reshuffles?: number;
}

export type WhotMove =
  | { type: 'play'; card: string; call?: Exclude<Shape, 'whot'>; declare?: 'last' | 'semi' | null }
  | { type: 'draw' };

export const cardValue = (c: Card) => (c.shape === 'whot' ? 20 : c.shape === 'star' ? c.n * 2 : c.n);
const isSpecial = (c: Card, cfg: WhotConfig) =>
  c.shape === 'whot' ||
  (c.n === 1 && cfg.holdOn) ||
  c.n === 2 ||
  (c.n === 5 && cfg.pickThree) ||
  (c.n === 8 && cfg.suspension) ||
  (c.n === 14 && cfg.generalMarket);

export const SHAPE_NAME: Record<Shape, string> = {
  circle: 'circles',
  triangle: 'triangles',
  cross: 'crosses',
  square: 'squares',
  star: 'stars',
  whot: 'Whot'
};

export function canPlay(state: Pick<WhotState, 'pile' | 'called' | 'pending' | 'config'>, card: Card): boolean {
  const top = state.pile[state.pile.length - 1];
  if (state.pending) return state.config.defendPicks && card.shape !== 'whot' && card.n === state.pending.n;
  if (card.shape === 'whot') return true;
  if (state.called) return card.shape === state.called;
  return card.shape === top.shape || card.n === top.n;
}

const nextIndex = (state: WhotState, from: number, steps = 1) => {
  const n = state.players.length;
  return (((from + state.dir * steps) % n) + n) % n;
};

/** A game can never run longer than this many moves. */
const MAX_MOVES = 1200;

function refill(state: WhotState, rng: Ctx['rng']): void {
  if (state.market.length > 0 || state.pile.length <= 1) return;
  // With tender on, the pile goes back into the market once. The next time it finishes, everyone counts.
  if (state.config.tender && (state.reshuffles ?? 0) >= 1) return;
  const top = state.pile.pop()!;
  state.market = rng.shuffle(state.pile);
  state.pile = [top];
  state.reshuffles = (state.reshuffles ?? 0) + 1;
  state.log.push({ by: -1, text: state.config.tender ? 'Market reshuffled. When it finishes again, everyone tenders.' : 'Market reshuffled from the pile.' });
}

function draw(state: WhotState, who: number, count: number, rng: Ctx['rng']): number {
  let got = 0;
  for (let i = 0; i < count; i++) {
    refill(state, rng);
    const c = state.market.pop();
    if (!c) break;
    state.hands[who].push(c);
    got++;
  }
  return got;
}

const clone = (s: WhotState): WhotState => ({
  ...s,
  hands: s.hands.map((h) => [...h]),
  market: [...s.market],
  pile: [...s.pile],
  log: [...s.log]
});

function pushLog(s: WhotState, entry: WhotLog) {
  s.log.push(entry);
  if (s.log.length > 14) s.log.splice(0, s.log.length - 14);
}

function endIfStuck(s: WhotState): void {
  // Nobody can draw and nobody can play: lowest hand wins.
  if (s.passes >= s.players.length * 2) {
    s.over = true;
    pushLog(s, { by: -1, text: 'Market is empty and nobody can play. Lowest hand wins.' });
  }
}

/** Tender: the market has finished, so everyone counts. Also ends any game that has gone on far too long. */
function endIfDone(s: WhotState): void {
  if (s.over) return;
  if (s.config.tender && s.market.length === 0 && ((s.reshuffles ?? 0) >= 1 || s.pile.length <= 1)) {
    s.over = true;
    pushLog(s, { by: -1, text: 'Market finished! Everyone tenders their cards.' });
  } else if (s.seq >= MAX_MOVES) {
    s.over = true;
    pushLog(s, { by: -1, text: 'That went on long enough. Everyone counts their cards.' });
  }
}

export const whot: GameDef<WhotState, WhotMove, WhotConfig> = {
  id: 'whot',
  minPlayers: 2,
  maxPlayers: 8,
  defaultConfig: WHOT_DEFAULTS,
  setup(players, config, { rng }) {
    const cfg = { ...WHOT_DEFAULTS, ...config };
    const maxHand = Math.floor((54 - 8) / players.length);
    cfg.handSize = Math.max(3, Math.min(cfg.handSize, maxHand, 8));
    const deck = rng.shuffle(makeDeck());
    const hands = players.map(() => deck.splice(0, cfg.handSize));
    // The starting call card is always a plain card.
    let idx = deck.findIndex((c) => !isSpecial(c, cfg));
    if (idx < 0) idx = 0;
    const [start] = deck.splice(idx, 1);
    return {
      config: cfg,
      players: players.map((p) => p.id),
      hands,
      market: deck,
      pile: [start],
      turn: 0,
      dir: 1,
      called: null,
      pending: null,
      log: [{ by: -1, text: `Call card: ${start.n} of ${SHAPE_NAME[start.shape]}.`, card: start }],
      passes: 0,
      winner: null,
      over: false,
      seq: 0,
      reshuffles: 0
    };
  },
  actors(state) {
    return state.over ? [] : [state.players[state.turn]];
  },
  validate(state, player, move) {
    if (state.over) return 'The game is over.';
    if (state.players[state.turn] !== player) return 'It is not your turn.';
    if (move?.type === 'draw') return null;
    if (move?.type !== 'play') return 'Unknown move.';
    const card = state.hands[state.turn].find((c) => c.id === move.card);
    if (!card) return 'You do not have that card.';
    if (!canPlay(state, card)) {
      if (state.pending) return state.config.defendPicks ? `Defend with a ${state.pending.n} or pick ${state.pending.cards}.` : `Pick ${state.pending.cards} from the market.`;
      if (state.called) return `Play a ${SHAPE_NAME[state.called].slice(0, -1)} or a Whot, or go to market.`;
      return 'Match the shape or the number.';
    }
    if (card.shape === 'whot' && (!move.call || !(SHAPES as string[]).includes(move.call))) return 'Choose a shape to call.';
    return null;
  },
  apply(prev, _player, move, { rng }) {
    const s = clone(prev);
    s.seq += 1;
    const me = s.turn;
    const cfg = s.config;

    if (move.type === 'draw') {
      if (s.pending) {
        const got = draw(s, me, s.pending.cards, rng);
        pushLog(s, { by: me, text: `picked ${got} from the market.` });
        s.pending = null;
      } else {
        const got = draw(s, me, 1, rng);
        pushLog(s, { by: me, text: got ? 'went to market.' : 'could not draw, the market is empty.' });
        s.passes = got ? 0 : s.passes + 1;
      }
      s.turn = nextIndex(s, me);
      endIfStuck(s);
      endIfDone(s);
      return s;
    }

    const hand = s.hands[me];
    const card = hand.splice(hand.findIndex((c) => c.id === move.card), 1)[0];
    s.pile.push(card);
    s.passes = 0;
    s.called = null;

    // Check up: the last card always ends the game, whatever it is.
    if (hand.length === 0) {
      pushLog(s, { by: me, text: 'Check up!', card });
      s.winner = me;
      s.over = true;
      return s;
    }

    const label = card.shape === 'whot' ? `Whot, calls ${SHAPE_NAME[move.call!]}` : `${card.n} of ${SHAPE_NAME[card.shape]}`;
    let next = nextIndex(s, me);
    let text = `played ${label}.`;

    if (card.shape === 'whot') {
      s.called = move.call!;
    } else if (card.n === 2 || (card.n === 5 && cfg.pickThree)) {
      const add = card.n === 2 ? 2 : 3;
      s.pending = { n: card.n as 2 | 5, cards: (s.pending?.cards ?? 0) + add };
      text = `played ${label}: pick ${s.pending.cards}!`;
      if (cfg.changeDirection && s.players.length > 2) {
        s.dir = (s.dir * -1) as 1 | -1;
        next = nextIndex(s, me);
        text += ' Direction changed.';
      }
    } else if (card.n === 1 && cfg.holdOn) {
      next = me;
      text = `played ${label}: hold on!`;
    } else if (card.n === 8 && cfg.suspension) {
      const skips = cfg.starEightDouble && card.shape === 'star' ? 2 : 1;
      next = nextIndex(s, me, 1 + skips);
      text = `played ${label}: suspension!`;
    } else if (card.n === 14 && cfg.generalMarket) {
      for (let i = 0; i < s.players.length; i++) if (i !== me) draw(s, i, 1, rng);
      next = me;
      text = `played ${label}: general market!`;
    }
    pushLog(s, { by: me, text, card });

    // Calls: forgetting "last card" or "semi last card" costs two cards.
    if (cfg.callRule) {
      const needed = hand.length === 1 ? 'last' : hand.length === 2 && cfg.semiLastCard ? 'semi' : null;
      if (needed && move.declare !== needed) {
        const got = draw(s, me, 2, rng);
        pushLog(s, { by: me, text: `forgot to call ${needed === 'last' ? 'last card' : 'semi last card'} and picked ${got}.` });
      } else if (needed) {
        pushLog(s, { by: me, text: needed === 'last' ? 'Last card!' : 'Semi last card!' });
      }
    }

    s.turn = next;
    endIfDone(s);
    return s;
  },
  result(state) {
    if (!state.over) return null;
    const totals = state.hands.map((h) => h.reduce((a, c) => a + cardValue(c), 0));
    const order = state.players
      .map((id, i) => ({ id, i, pts: i === state.winner ? -1 : totals[i] }))
      .sort((a, b) => a.pts - b.pts);
    const ranking: PlayerId[][] = [];
    let prev: number | null = null;
    for (const o of order) {
      if (prev === o.pts) ranking[ranking.length - 1].push(o.id);
      else ranking.push([o.id]);
      prev = o.pts;
    }
    const scores = Object.fromEntries(state.players.map((id, i) => [id, totals[i]]));
    return {
      ranking,
      scores,
      draw: ranking[0].length > 1,
      summary: state.winner !== null ? 'Check up! First to empty their hand wins.' : state.config.tender && state.market.length === 0 ? 'Market finished. Lowest tender wins.' : 'Cards counted. Lowest hand wins.'
    };
  },
  view(state, viewer) {
    const me = viewer ? state.players.indexOf(viewer) : -1;
    return {
      ...state,
      hands: state.hands.map((h, i) => (i === me || state.over ? h : h.length)),
      market: state.market.length
    };
  },
  random(state, player, { rng }) {
    const hand = state.hands[state.players.indexOf(player)];
    const options: WhotMove[] = [{ type: 'draw' }, ...hand.filter((c) => canPlay(state, c)).map((c) => ({ type: 'play' as const, card: c.id, call: c.shape === 'whot' ? rng.pick(SHAPES) : undefined }))];
    return rng.pick(options);
  },
  bot(state, player, level: BotLevel, { rng }) {
    const me = state.players.indexOf(player);
    const hand = state.hands[me];
    const playable = hand.filter((c) => canPlay(state, c));
    if (!playable.length) return { type: 'draw' };
    if (level === 'easy' && state.pending && rng.next() < 0.4) return { type: 'draw' };

    const nextP = nextIndex(state, me);
    const threat = state.hands[nextP].length <= 2;
    const cfg = state.config;
    const score = (c: Card) => {
      let s = cardValue(c) * (level === 'hard' ? 0.6 : 0.2);
      if (c.shape === 'whot') s -= hand.length > 2 ? 30 : -10;
      if (c.n === 1 && cfg.holdOn) s += hand.some((h) => h !== c && h.shape === c.shape) ? 25 : -5;
      if (c.n === 14 && cfg.generalMarket) s += 18;
      if ((c.n === 2 || (c.n === 5 && cfg.pickThree)) && c.shape !== 'whot') s += threat ? 40 : level === 'hard' ? 4 : 12;
      if (c.n === 8 && cfg.suspension) s += threat ? 35 : 8;
      // Keep shapes you have many of so you can follow later.
      s += hand.filter((h) => h.shape === c.shape).length * (level === 'hard' ? 3 : 1);
      return s + rng.next() * (level === 'easy' ? 30 : 6);
    };
    const card = [...playable].sort((a, b) => score(b) - score(a))[0];
    const rest = hand.filter((c) => c.id !== card.id);
    let call: Exclude<Shape, 'whot'> | undefined;
    if (card.shape === 'whot') {
      const counts = SHAPES.map((sh) => [sh, rest.filter((c) => c.shape === sh).length] as const);
      call = counts.sort((a, b) => b[1] - a[1])[0][0];
    }
    const needed = rest.length === 1 ? 'last' : rest.length === 2 && cfg.semiLastCard ? 'semi' : null;
    const forgets = level === 'easy' && rng.next() < 0.25;
    return { type: 'play', card: card.id, call, declare: forgets ? null : needed };
  }
};
