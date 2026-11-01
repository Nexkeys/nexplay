export type PlayerId = string;
export type BotLevel = 'easy' | 'medium' | 'hard';

export type GameId = 'ayo' | 'whot' | 'connect-four' | 'tic-tac-toe' | 'rps' | 'word-race' | 'quick-math' | 'trivia';

export interface PlayerInfo {
  id: PlayerId;
  name: string;
  bot?: BotLevel | null;
}

export interface Rng {
  next(): number;
  int(max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

export interface Ctx {
  rng: Rng;
  now: number;
  /** Questions or words the players have already had, so setup can pick fresh ones. */
  avoid?: ReadonlySet<string>;
}

export interface MatchResult {
  /** Best first. Players sharing a place are grouped. */
  ranking: PlayerId[][];
  scores: Record<PlayerId, number>;
  draw: boolean;
  summary: string;
}

/**
 * A game is a pure state machine. The room host runs it; everyone else only ever sees `view`.
 * State must be plain JSON so it can be stored and sent as a string.
 */
export interface GameDef<S, M, C extends Record<string, unknown>> {
  id: GameId;
  minPlayers: number;
  maxPlayers: number;
  defaultConfig: C;
  setup(players: PlayerInfo[], config: C, ctx: Ctx): S;
  /** Players who are allowed to send a move right now. */
  actors(state: S): PlayerId[];
  /** Returns an error message, or null when the move is legal. */
  validate(state: S, player: PlayerId, move: M): string | null;
  apply(state: S, player: PlayerId, move: M, ctx: Ctx): S;
  /** Time based progress (rounds, reveals). Return null when nothing changed. */
  tick?(state: S, ctx: Ctx): S | null;
  /** When `tick` next needs to run, as a timestamp, or null. */
  deadline?(state: S): number | null;
  result(state: S): MatchResult | null;
  /** What a given player is allowed to see. null means a spectator. */
  view(state: S, viewer: PlayerId | null): unknown;
  bot(state: S, player: PlayerId, level: BotLevel, ctx: Ctx): M | null;
  /** Any legal move, picked at random. Played for someone whose turn timer runs out. */
  random?(state: S, player: PlayerId, ctx: Ctx): M | null;
  /** True when the game handles its own clock, so the room should not add a turn timer. */
  selfTimed?: boolean;
  /**
   * Downloads what setup needs (question packs, word lists) before a match starts. When resuming a
   * saved match, `state` is passed so the game can load what that match uses.
   */
  prepare?(config: C, avoid: ReadonlySet<string>, state?: S): Promise<void>;
  /** Ids of the questions or words a player has been shown, read from their view. Used to avoid repeats. */
  seen?(view: unknown): string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGame = GameDef<any, any, any>;
