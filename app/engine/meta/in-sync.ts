import type { GameMeta } from '../catalog';

export const IN_SYNC: GameMeta = {
  id: 'in-sync',
  name: 'In Sync',
  tagline: 'How well do you really know each other?',
  blurb:
    'A game for two. Answer this or that, rate yourselves, guess what your partner would say, and see how in sync you really are. Over 1,600 prompts from cute to deep to flirty, and no repeats until you have played them all.',
  players: [2, 2],
  minutes: '5 to 10',
  family: 'couples',
  colour: '#c2345b',
  isNew: true,
  settings: [
    {
      key: 'vibe',
      label: 'Vibe',
      type: 'choice',
      options: [
        { value: 'mix', label: 'Mix' },
        { value: 'cute', label: 'Cute' },
        { value: 'deep', label: 'Deep' },
        { value: 'flirty', label: 'Flirty' }
      ],
      help: 'Mix starts cute, gets deep, then ends flirty. Flirty is playful and romantic, never explicit.'
    },
    { key: 'rounds', label: 'Rounds', type: 'choice', options: [8, 12, 16].map((n) => ({ value: n, label: String(n) })) },
    {
      key: 'seconds',
      label: 'Seconds to answer',
      type: 'choice',
      options: [15, 20, 30].map((n) => ({ value: n, label: `${n}s` })),
      help: 'Read My Mind and Scale rounds get five seconds more.'
    }
  ],
  howTo: [
    'You and your partner see the same question.',
    'Each of you answers in secret. Some rounds ask you to guess what your partner picked.',
    'Every match raises your sync score. Aim for 100% together.'
  ],
  rules: [
    {
      title: 'How it works',
      body: [
        'You both see the same prompt and answer in secret. Neither of you can see the other’s answer until you are both in, or the time runs out.',
        'Then both answers flip over side by side. The closer you are, the more the sync heart fills up.',
        'It is a team game: you share one sync score, and you win or lose together.'
      ]
    },
    {
      title: 'The rounds',
      body: [
        'This or That: Jollof or fried rice? Pick the same and you are in sync.',
        'Read My Mind: one of you answers about yourself while the other guesses what they said. Then you swap on the same question.',
        'On a Scale: rate yourself from 1 to 5, and guess your partner’s number. Spot on is a full match, one away still counts a lot.',
        'Who’s More Likely: tap yourself or your partner. You are in sync when you both point at the same person.',
        'Finish the Sentence: pick the ending you think suits the two of you. Match to score.'
      ]
    },
    {
      title: 'The sync score',
      body: [
        'Every round is worth up to 100. At the end your sync score is the average, from Opposites attract all the way up to Soulmates.',
        'The end screen shows your funniest mismatches. Those are the best bits to talk about afterwards.'
      ]
    },
    {
      title: 'Playing the computer',
      body: [
        'The computer partner gets a secret personality each game and sticks to it, so you can learn to read it. Easy partners are an open book, hard ones keep you guessing. Its personality is revealed at the end.'
      ]
    },
    { title: 'Fresh every time', body: ['There are over 1,600 prompts across three vibes. You will not see one again until you have played through the whole vibe.'] }
  ],
  tips: [
    'Answer honestly about yourself. Guessing what your partner wants to hear makes you harder to read.',
    'In Read My Mind, think about what they would really say, not what you would.',
    'Against the computer, watch its first few answers: its personality shows quickly.'
  ],
  keywords: ['couples game online', 'games for couples', 'how well do you know me', 'this or that for couples', 'couple quiz', 'questions for couples nigeria']
};
