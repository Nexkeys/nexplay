import type { GameMeta } from '../catalog';

export const ARENA: GameMeta = {
  id: 'arena',
  name: 'Arena',
  tagline: 'Pick a fighter. Read your rival. Strike.',
  blurb: 'A quick battle for two to eight. Choose a Warrior, Mage, Rogue or Cleric, then everyone picks a move at the same moment: strike, block, charge or unleash a special. Read your rivals, and be the last one standing.',
  players: [2, 8],
  minutes: '3 to 8',
  family: 'party',
  colour: '#b5462a',
  isNew: true,
  settings: [
    {
      key: 'length',
      label: 'Match length',
      help: 'Shorter matches start with less HP, and the arena shrinks sooner.',
      type: 'choice',
      options: [
        { value: 'short', label: 'Short' },
        { value: 'normal', label: 'Normal' },
        { value: 'long', label: 'Long' }
      ]
    },
    { key: 'seconds', label: 'Seconds to pick a move', type: 'choice', options: [6, 10, 15, 20].map((n) => ({ value: n, label: `${n}s` })) }
  ],
  rules: [
    {
      title: 'How it works',
      body: [
        'Everyone picks a fighter, then each round every fighter secretly picks one move at the same moment. Moves are sealed until everyone is in, so nobody can wait and counter.',
        'Tap a fighter to target them, then pick a move. You can change your mind until the round locks. Too slow? You block automatically.'
      ]
    },
    {
      title: 'The four moves',
      body: [
        'Strike: hit your target.',
        'Block: a fresh block stops strikes completely, hits the striker back for 6 and gains you 1 energy. It halves specials. Block again the very next round and it only halves strikes; a third block in a row breaks and does nothing.',
        'Charge: gain energy (up to 5). Anyone who hits you while you charge deals 50% more.',
        'Special: spend energy on your class move.',
        'Strike beats Charge, Block beats Strike, Charge beats Block, and Specials break the cycle.'
      ]
    },
    {
      title: 'The fighters',
      body: [
        'Warrior (72 HP, strikes for 11). Cleave, 3 energy: 22 to your target and 5 to every other foe. Blocks cannot stop it, and a charging target is stunned.',
        'Mage (68 HP, strikes for 9). Charging gives the Mage 3 energy. Fireball, 3 energy: 20 damage, then the target burns for 4 a round for 2 rounds. A fresh block halves it and stops the burn.',
        'Rogue (66 HP, strikes for 11, crits a quarter of the time). Backstab, 2 energy: 26 damage that can crit. If the target blocks fresh, it misses and the Rogue is stunned.',
        'Cleric (70 HP, strikes for 11). Mend, 3 energy: heal 18 before any hits land, put out a burn, and guard like a fresh block.'
      ]
    },
    {
      title: 'Crits, burns and stuns',
      body: ['Any single hit can crit for 50% more. Burning fighters lose HP at the end of each round. Stunned fighters sit out the next round, with no guard.']
    },
    {
      title: 'Sudden death',
      body: ['From round 10 (8 in a short match, 15 in a long one) the arena shrinks: everyone takes 2 damage, then 4, then 6 and so on, whatever they do. Every match ends.']
    },
    {
      title: 'Winning',
      body: ['Last fighter standing wins. Everyone else is ranked by how long they lasted, and fighters who fall in the same round are split by the HP they had going in. If the last fighters fall together, they share the win. Scores show damage dealt.']
    }
  ],
  tips: [
    "Each card shows that fighter's last three moves. People repeat their favourites.",
    'Glowing energy pips mean that fighter can afford their special. Block it, or hit them first.',
    'Two blocks in a row is a tired guard. Hit them hard on the second one.',
    'Charging is safest when everyone else is busy with someone else.'
  ],
  keywords: ['turn based fighting game online', 'rpg battle game multiplayer', 'multiplayer arena battle browser game', 'party fighting game with friends']
};
