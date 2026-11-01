import type { GameDef } from '../types';

// Placeholder so the app compiles while this game is being built.
export const ludo: GameDef<{ players: string[] }, never, Record<string, unknown>> = {
  id: 'ludo',
  minPlayers: 2,
  maxPlayers: 2,
  defaultConfig: {},
  setup: (players) => ({ players: players.map((p) => p.id) }),
  actors: () => [],
  validate: () => 'Not ready yet.',
  apply: (s) => s,
  result: (s) => ({ ranking: [s.players], scores: {}, draw: true, summary: 'Coming soon.' }),
  view: (s) => s,
  bot: () => null
};
