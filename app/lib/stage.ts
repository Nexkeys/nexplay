import type { BotLevel, MatchResult } from '~/engine/types';

export interface Seat {
  id: string;
  name: string;
  avatar: string;
  bot: BotLevel | null;
  connected: boolean;
  seat: number;
  wins: number;
  ready?: boolean;
}

/** Everything a game board needs. Online rooms and games against the computer both produce this. */
export interface StageProps<V = unknown> {
  view: V;
  /** The viewer's player id, or null for a spectator. */
  me: string | null;
  seats: Seat[];
  actors: string[];
  deadline: number;
  turnDeadline: number;
  /** Length of a turn in seconds, 0 when there is no turn timer. */
  turnSeconds: number;
  lastMove: { by: string; move: unknown; auto?: boolean } | null;
  result: MatchResult | null;
  rev: number;
  send(move: unknown): void;
  now(): number;
}

export const seatOf = (seats: Seat[], id: string | null | undefined) => seats.find((s) => s.id === id);
export const firstName = (name: string) => name.replace(/\s*\(bot\)$/, '');
