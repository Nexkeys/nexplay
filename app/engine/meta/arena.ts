import type { GameMeta } from '../catalog';

export const ARENA: GameMeta = {
  id: 'arena',
  name: 'Arena',
  tagline: 'Pick a fighter. Read your rival. Strike.',
  blurb: 'A turn based battle for up to eight. Choose a Warrior, Mage or Rogue, then everyone picks a move at the same moment: strike, block, charge or unleash a special.',
  players: [2, 8],
  minutes: '3 to 8',
  family: 'party',
  colour: '#b5462a',
  isNew: true,
  settings: [],
  rules: [{ title: 'How it works', body: ['Everyone picks a move at the same time. Last fighter standing wins.'] }],
  tips: [],
  keywords: ['turn based fighting game online', 'rpg battle game multiplayer']
};
