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
  settings: [
    { key: 'safeSquares', label: 'Safe squares', help: 'Nobody can be captured on a start square or a star.', type: 'toggle' },
    { key: 'exactHome', label: 'Exact roll to get home', help: 'Off: any roll big enough takes a seed home.', type: 'toggle' },
    { key: 'threeSixes', label: 'Three sixes ends your turn', help: 'Roll a third six in a row and your turn is over.', type: 'toggle' },
    {
      key: 'captureFirst',
      label: 'Kill before you go home',
      help: 'You must capture at least one seed before any of yours can enter the home column. Until then they go round again.',
      type: 'toggle'
    }
  ],
  rules: [
    {
      title: 'The board',
      body: [
        'Two to four players, each with four seeds waiting in their coloured base. With two players you sit on opposite corners.',
        'Seeds race clockwise round the track, then turn into the home column of their own colour and finish in the triangle in the middle.'
      ]
    },
    {
      title: 'Your turn',
      body: [
        'Tap the dice to roll, then tap a glowing seed to move it that many squares. If only one move is possible it is played for you, and if none is possible the turn passes.',
        'You need a six to bring a seed out of base onto your start square.',
        'A six earns another roll. Roll three sixes in a row and your turn ends (the host can switch this off).'
      ]
    },
    {
      title: 'Capturing',
      body: [
        'Land on a rival seed and it goes back to its base. You roll again.',
        'Start squares and star squares are safe: nobody can be captured there. The host can switch safe squares off for a rougher game.',
        'Your own seeds can share a square.'
      ]
    },
    {
      title: 'Getting home',
      body: [
        'Seeds in your home column cannot be captured. You need the exact number to reach home (the host can relax this), and every seed that gets home earns another roll.',
        'Naija house rule, off by default: you must capture at least one rival seed before any of your seeds can enter the home column. Until you do, they keep going round.'
      ]
    },
    {
      title: 'Winning',
      body: ['The first player with all four seeds home wins. Everyone else is ranked by seeds home, then by how far their seeds have travelled.']
    }
  ],
  tips: [
    'Bring seeds out early. One seed alone on the board is easy to chase.',
    'Count six squares behind you. A rival within six can hit you, so park on a star when you can.',
    'A seed close to a rival is a threat. Sometimes the best move is to wait behind them and strike.',
    'Spread your risk: do not leave your most travelled seed sitting in the open.'
  ],
  keywords: ['ludo online multiplayer', 'play ludo with friends', 'naija ludo', 'ludo game online free', 'ludo board game nigeria']
};
