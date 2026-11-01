import type { GameMeta } from '../catalog';

export const LOVE_LOCK: GameMeta = {
  id: 'love-lock',
  name: 'Love Lock',
  tagline: 'Two halves of one code. Crack it together.',
  blurb: 'A co-op puzzle for two. Each of you sees half of the clues to a lock. Trade hints, open it before your tries run out, and build a streak together.',
  players: [2, 2],
  minutes: '5 to 15',
  family: 'couples',
  colour: '#8e2f6b',
  isNew: true,
  settings: [],
  rules: [{ title: 'How it works', body: ['You each see half of the clues. Work together to open the lock.'] }],
  tips: [],
  keywords: ['co-op puzzle game for two', 'couples puzzle game']
};
