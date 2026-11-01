import type { GameMeta } from '../catalog';

export const LUDO: GameMeta = {
  id: 'ludo',
  name: 'Ludo',
  tagline: 'Roll, race, capture, home.',
  blurb: 'The board game every Nigerian home knows. Roll a six to come out, race your four seeds round the board, knock rivals back to base and get everyone home first.',
  players: [2, 4],
  minutes: '15 to 30',
  family: 'classic',
  colour: '#2f6fe4',
  isNew: true,
  settings: [],
  rules: [{ title: 'How it works', body: ['Roll a six to bring a seed out. First to get all four seeds home wins.'] }],
  tips: [],
  keywords: ['ludo online multiplayer', 'play ludo with friends']
};
