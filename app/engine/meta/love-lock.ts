import type { GameMeta } from '../catalog';

export const LOVE_LOCK: GameMeta = {
  id: 'love-lock',
  name: 'Love Lock',
  tagline: 'Two halves of one code. Crack it together.',
  blurb: 'A co-op puzzle for two. Each of you sees half of the clues to a lock. Trade hints, open it before your hearts run out, and build a streak together.',
  players: [2, 2],
  minutes: '5 to 15',
  family: 'couples',
  colour: '#8e2f6b',
  isNew: true,
  settings: [
    {
      key: 'mode',
      label: 'Mode',
      type: 'choice',
      options: [
        { value: 'set', label: 'A set of locks' },
        { value: 'run', label: 'Heart run' }
      ],
      help: 'Open a set number of locks, or keep going until your hearts run out.'
    },
    { key: 'locks', label: 'Locks', help: 'In a heart run this is your goal. Keep going past it for a high score.', type: 'choice', options: [3, 5, 8].map((n) => ({ value: n, label: String(n) })) },
    { key: 'hearts', label: 'Hearts', help: 'Shared between you. A wrong try costs one.', type: 'choice', options: [3, 5, 7].map((n) => ({ value: n, label: String(n) })) },
    { key: 'seconds', label: 'Seconds per turn', help: 'Run out of time and your most useful clue is shared for you.', type: 'choice', options: [30, 60, 120].map((n) => ({ value: n, label: `${n}s` })) },
    {
      key: 'start',
      label: 'First lock',
      type: 'choice',
      options: [
        { value: 'gentle', label: 'Gentle' },
        { value: 'tricky', label: 'Tricky' },
        { value: 'fiendish', label: 'Fiendish' }
      ],
      help: 'Locks get harder as you go. Skip ahead if you are old hands.'
    }
  ],
  howTo: [
    'You and your partner each hold different clues to the same secret code.',
    'On your turn, share one of your clues or try a code. A wrong try costs a heart.',
    'Work it out together and open every lock before your hearts run out.'
  ],
  rules: [
    {
      title: 'Two halves of one code',
      body: [
        'Each lock hides a code of 3 to 5 slots, each one of 5 to 7 symbols: heart, star, moon, gem, flower, sun and note. Symbols can repeat.',
        'The clues are split between you. Your half alone is never enough, and neither is your partner\'s. Together they fit exactly one code.'
      ]
    },
    {
      title: 'Your turn',
      body: [
        'Take turns. On your turn, do one thing: share one of your clues so your partner can see it, or try a code.',
        'Sharing costs 10 points. A wrong try costs one of your shared hearts, and lights up the slots you got right, which is a clue too.',
        'Shared everything already? Hand the turn over and wait for your partner\'s clues.'
      ]
    },
    {
      title: 'Clues',
      body: [
        '"Slot 3 is a flower or a moon" and "Heart is not in slot 1" talk about one slot.',
        '"There is exactly one gem" and "There is no sun" count symbols across the whole code.',
        '"Slots 2 and 4 match" and "Slots 1 and 3 are different" compare slots.',
        '"A star is somewhere left of a moon" means at least one star comes before at least one moon. "A heart sits right next to a star" means they touch, either way round.',
        '"The code uses exactly three different symbols" counts how many kinds appear.'
      ]
    },
    {
      title: 'Getting harder',
      body: ['The first locks have 3 slots and 5 symbols. Each lock after adds a symbol or a slot, up to 5 slots and 7 symbols, and the clues get subtler: fewer direct ones, more about how slots relate.']
    },
    {
      title: 'Scoring',
      body: [
        'Each lock is worth 40 points per slot, plus up to 100 for speed, minus 10 for each clue shared and 30 for each wrong try.',
        'Open locks in a row without a wrong try for a streak bonus of up to 150. In a heart run, every third clean lock in a row wins a heart back.'
      ]
    },
    {
      title: 'Winning together',
      body: [
        'You win or lose as a team. In a set, open every lock before your hearts run out. In a heart run, reach your goal, then see how far you can go (the run ends after 30 locks).',
        'Each turn has a clock. Run out of time and your most useful clue is shared for you.'
      ]
    }
  ],
  tips: [
    'No voice chat needed: use the quick reactions to ask for a clue, or to say you think you know it.',
    'Share the clue that rules out the most codes, not the one that seems most obvious to you.',
    'Count codes in your head: if your clues plus your partner\'s shared ones leave only one, try it.',
    'A wrong try is not wasted. The glowing slots are right; the others are wrong.',
    'Clues about counts and pairs are often worth more to your partner than they look to you.'
  ],
  keywords: ['co-op puzzle game for two', 'couples puzzle game', 'logic puzzle for couples', 'two player cooperative game online']
};
