import type { GameId } from '~/engine/types';

// Remembers which questions and words this device has been shown, so new games pick fresh ones.
// Kept on the device: it is a convenience, and losing it only means the odd repeat.

/** Plenty for hundreds of games, and small enough to read and write quickly. */
const MAX = 6000;
/** How many of the most recent ids a player shares with the room host. */
export const SHARE_MAX = 1200;

const key = (game: GameId) => `nexplay:seen:${game}`;
const cache = new Map<GameId, string[]>();

export function loadSeen(game: GameId): string[] {
  if (!cache.has(game)) {
    let ids: string[] = [];
    try {
      ids = (localStorage.getItem(key(game)) ?? '').split(' ').filter(Boolean);
    } catch {
      // Private mode or blocked storage: nothing remembered.
    }
    cache.set(game, ids);
  }
  return cache.get(game)!;
}

export function addSeen(game: GameId, ids: string[]) {
  if (!ids.length) return;
  const list = loadSeen(game);
  const have = new Set(list);
  const fresh = ids.filter((id) => !have.has(id));
  if (!fresh.length) return;
  const next = [...list, ...fresh].slice(-MAX);
  cache.set(game, next);
  try {
    localStorage.setItem(key(game), next.join(' '));
  } catch {
    // Storage full or blocked: still remembered for this visit.
  }
}

/** The most recent ids, as one string, for sending to the room host. */
export const sharedSeen = (game: GameId) => loadSeen(game).slice(-SHARE_MAX).join(' ');
