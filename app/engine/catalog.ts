import type { AnyGame, GameId } from './types';

export interface Option {
  value: string | number | boolean;
  label: string;
}

export interface Setting {
  key: string;
  label: string;
  help?: string;
  type: 'choice' | 'toggle';
  options?: Option[];
  /** Only show this setting when another setting has a given value. */
  when?: { key: string; value: unknown };
}

export interface RuleSection {
  title: string;
  body: string[];
}

export interface GameMeta {
  id: GameId;
  name: string;
  tagline: string;
  blurb: string;
  players: [number, number];
  minutes: string;
  family: 'classic' | 'board' | 'party';
  colour: string;
  isNew?: boolean;
  settings: Setting[];
  rules: RuleSection[];
  tips: string[];
  keywords: string[];
}

export const GAMES: GameMeta[] = [
  {
    id: 'ayo',
    name: 'Ayo',
    tagline: 'Sow, relay, capture. The Yoruba classic.',
    blurb: 'Ayo Olopon is the mancala game of the Yoruba people. Two rows of six houses, forty eight seeds, and a lot of counting ahead.',
    players: [2, 2],
    minutes: '10 to 15',
    family: 'classic',
    colour: '#7a4a26',
    isNew: true,
    settings: [
      {
        key: 'rules',
        label: 'Rule set',
        type: 'choice',
        options: [
          { value: 'fours', label: 'Complete fours (Ọta)' },
          { value: 'opposite', label: 'Capture opposite (Ayoayo)' }
        ],
        help: 'Families play Ayo differently. Pick the one you grew up with.'
      }
    ],
    rules: [
      { title: 'The board', body: ['Each player owns the six houses on their side. Every house starts with four seeds, forty eight in all.'] },
      {
        title: 'Your turn',
        body: [
          'Pick up every seed from one of your houses and sow them one by one, anticlockwise, into the houses that follow.',
          'Relay: if your last seed lands in a house that already had seeds, pick all of them up and keep sowing. Your turn only ends when your last seed drops into an empty house.'
        ]
      },
      {
        title: 'Complete fours (default)',
        body: [
          'Whenever your last seed makes a house hold exactly four, on either side, you win that house and its four seeds.',
          'When only eight seeds are left, the first player to win a house takes the last four as well.',
          'Most houses wins. The winner is Ọta, the loser is Ọpẹ. Equal houses? Most seeds breaks the tie.'
        ]
      },
      {
        title: 'Capture opposite (Ayoayo)',
        body: [
          'Long laps skip the house you started from.',
          'If your relay ends in an empty house on your own side, you capture all the seeds in the house directly opposite.',
          'If your opponent has no seeds, you must play a house that gives them some. If you cannot, you sweep the rest. Most seeds wins.'
        ]
      }
    ],
    tips: ['Count before you sow. A long relay can swing the whole board.', 'Houses with three seeds are targets. Do not leave them for your opponent.'],
    keywords: ['ayo olopon online', 'ayoayo', 'mancala nigeria', 'yoruba board game']
  },
  {
    id: 'whot',
    name: 'Whot!',
    tagline: 'Pick two, hold on, general market.',
    blurb: 'Nigeria\'s national card game. Match the shape or the number, empty your hand first, and never forget to say last card.',
    players: [2, 8],
    minutes: '8 to 15',
    family: 'classic',
    colour: '#8e1b2b',
    isNew: true,
    settings: [
      { key: 'handSize', label: 'Cards per hand', type: 'choice', options: [4, 5, 6, 7].map((n) => ({ value: n, label: String(n) })) },
      { key: 'defendPicks', label: 'Defend pick two and pick three', help: 'Block a 2 with a 2, a 5 with a 5. The pick stacks up.', type: 'toggle' },
      { key: 'pickThree', label: 'Pick three (5)', type: 'toggle' },
      { key: 'holdOn', label: 'Hold on (1)', type: 'toggle' },
      { key: 'suspension', label: 'Suspension (8)', type: 'toggle' },
      { key: 'starEightDouble', label: 'Star 8 suspends two players', type: 'toggle' },
      { key: 'generalMarket', label: 'General market (14)', type: 'toggle' },
      { key: 'callRule', label: 'Must call last card', help: 'Forget and you pick two.', type: 'toggle' },
      { key: 'semiLastCard', label: 'Must call semi last card too', type: 'toggle', when: { key: 'callRule', value: true } },
      { key: 'changeDirection', label: '2 and 5 change direction', type: 'toggle' }
    ],
    rules: [
      { title: 'The deck', body: ['54 cards in five shapes: circles, triangles, crosses, squares and stars, numbered 1 to 14 with some numbers missing, plus five Whot cards numbered 20.'] },
      {
        title: 'Your turn',
        body: [
          'Everyone gets six cards. Play one card that matches the shape or the number of the card on top of the pile.',
          'Cannot or do not want to play? Go to market: take one card and your turn ends.'
        ]
      },
      {
        title: 'Special cards',
        body: [
          '1 Hold on: you play again.',
          '2 Pick two: the next player picks two, or defends with another 2 and passes on four.',
          '5 Pick three: the same, with threes.',
          '8 Suspension: the next player misses a turn.',
          '14 General market: everyone else picks one and you play again.',
          'Whot 20: play it on anything and call the shape the next player must follow.'
        ]
      },
      { title: 'Last card and check up', body: ['With two cards left say semi last card, with one left say last card. Forget and you pick two. Play your last card and you win: check up!'] },
      { title: 'House rules', body: ['The room host can switch every special card on or off before the game, so you can play exactly the way your family does.'] },
      { title: 'Scoring', body: ['The first player out wins. Everyone else is ranked by the cards left in hand: stars count double, Whot cards count 20.'] }
    ],
    tips: ['Keep a 2 or a 5 to defend yourself.', 'Save your Whot for when you are stuck, then call the shape you hold most of.'],
    keywords: ['whot online', 'naija whot', 'whot card game', 'play whot with friends']
  },
  {
    id: 'connect-four',
    name: 'Connect Four',
    tagline: 'Drop, block, four in a row.',
    blurb: 'Drop your discs, block your opponent, and line up four before they do. Play the classic, Pop Out, or the bigger Five in a Row.',
    players: [2, 2],
    minutes: '3 to 8',
    family: 'board',
    colour: '#2f63c9',
    settings: [
      {
        key: 'mode',
        label: 'Mode',
        type: 'choice',
        options: [
          { value: 'classic', label: 'Classic 7 × 6' },
          { value: 'popout', label: 'Pop Out' },
          { value: 'five', label: 'Five in a row 9 × 7' }
        ]
      }
    ],
    rules: [
      { title: 'Classic', body: ['Take turns dropping a disc into a column. It falls to the lowest free space. Four in a row across, down or diagonally wins. A full board is a draw.'] },
      { title: 'Pop Out', body: ['On your turn you can drop a disc, or pull one of your own discs out from the bottom row so the column slides down. If a pop makes four for both players, the player who popped wins.'] },
      { title: 'Five in a row', body: ['A wider 9 by 7 board where you need five in a row.'] }
    ],
    tips: ['The middle column is the most valuable square on the board.', 'Build two threats at once. They can only block one.'],
    keywords: ['connect four online', 'connect 4 with friends', 'four in a row game']
  },
  {
    id: 'tic-tac-toe',
    name: 'Tic Tac Toe',
    tagline: 'Classic, Ultimate and Vanishing.',
    blurb: 'Three ways to play noughts and crosses: the classic, the nine board Ultimate version, and Vanishing, where your oldest mark fades.',
    players: [2, 2],
    minutes: '1 to 10',
    family: 'board',
    colour: '#2a2a2e',
    settings: [
      {
        key: 'mode',
        label: 'Mode',
        type: 'choice',
        options: [
          { value: 'classic', label: 'Classic' },
          { value: 'ultimate', label: 'Ultimate' },
          { value: 'vanishing', label: 'Vanishing' }
        ]
      }
    ],
    rules: [
      { title: 'Classic', body: ['Three in a row across, down or diagonally wins. A full board is a draw.'] },
      {
        title: 'Ultimate',
        body: [
          'Nine small boards make one big board. Win a small board to claim that square of the big one, and three big squares in a row wins.',
          'The square you play in decides which small board your opponent must play next. Sent to a board that is already decided? Play anywhere.',
          'If every board is decided with no line, whoever won more small boards wins.'
        ]
      },
      { title: 'Vanishing', body: ['You only keep three marks. Placing a fourth removes your oldest one, so the board never fills up and someone always wins.'] }
    ],
    tips: ['In Ultimate, think about where you are sending your opponent before you think about your own move.'],
    keywords: ['ultimate tic tac toe', 'tic tac toe online multiplayer']
  },
  {
    id: 'rps',
    name: 'Rock Paper Scissors',
    tagline: 'Best of five mind games.',
    blurb: 'Sealed picks mean nobody can peek. Play the classic or add lizard and Spock.',
    players: [2, 2],
    minutes: '1 to 3',
    family: 'party',
    colour: '#4a2b6b',
    settings: [
      {
        key: 'mode',
        label: 'Mode',
        type: 'choice',
        options: [
          { value: 'classic', label: 'Classic' },
          { value: 'lizard-spock', label: 'Lizard Spock' }
        ]
      },
      { key: 'bestOf', label: 'Best of', type: 'choice', options: [1, 3, 5, 7].map((n) => ({ value: n, label: String(n) })) },
      { key: 'seconds', label: 'Seconds to pick', type: 'choice', options: [5, 8, 12].map((n) => ({ value: n, label: `${n}s` })) }
    ],
    rules: [
      { title: 'How it works', body: ['Both players pick at the same time. Rock crushes scissors, scissors cut paper, paper covers rock.', 'Picks are sealed with a fingerprint first and revealed together, so nobody can wait and counter.'] },
      { title: 'Lizard Spock', body: ['Scissors cut paper, paper covers rock, rock crushes lizard, lizard poisons Spock, Spock smashes scissors, scissors decapitate lizard, lizard eats paper, paper disproves Spock, Spock vaporizes rock, and rock crushes scissors.'] },
      { title: 'Time', body: ['Run out of time and you lose the round.'] }
    ],
    tips: ['People repeat themselves when they win and switch when they lose. The Hard computer knows it.'],
    keywords: ['rock paper scissors online', 'rock paper scissors lizard spock']
  },
  {
    id: 'word-race',
    name: 'Word Race',
    tagline: 'Unscramble first, or find the most words.',
    blurb: 'Two word games for up to eight players: race to unscramble the word, or hunt for every word hiding in seven letters.',
    players: [1, 8],
    minutes: '3 to 6',
    family: 'party',
    colour: '#19615a',
    settings: [
      {
        key: 'mode',
        label: 'Mode',
        type: 'choice',
        options: [
          { value: 'unscramble', label: 'Unscramble' },
          { value: 'hunt', label: 'Word Hunt' }
        ]
      },
      { key: 'rounds', label: 'Rounds', type: 'choice', options: [5, 8, 12].map((n) => ({ value: n, label: String(n) })), when: { key: 'mode', value: 'unscramble' } },
      { key: 'seconds', label: 'Seconds', type: 'choice', options: [60, 90, 120].map((n) => ({ value: n, label: `${n}s` })), when: { key: 'mode', value: 'hunt' } }
    ],
    rules: [
      { title: 'Unscramble', body: ['Everyone sees the same scrambled word. Use every letter. The first solver scores most, later solvers score less, and faster is always better. Once someone solves it, the others have eight seconds left.'] },
      { title: 'Word Hunt', body: ['Seven letters, one clock. Make as many words of three letters or more as you can. Longer words score more, and finding the full seven letter word earns a big bonus.'] },
      { title: 'Dictionary', body: ['Words are checked against an English word list built from the SCOWL project. Names and offensive words are left out.'] }
    ],
    tips: ['In Word Hunt, look for common endings like -ER, -ED and -ING first.'],
    keywords: ['word race game', 'unscramble words multiplayer', 'word hunt online']
  },
  {
    id: 'quick-math',
    name: 'Quick Math',
    tagline: 'Sprint sums and Make 24.',
    blurb: 'Speed arithmetic for up to eight players. Sprint through sums with streak bonuses, or crack Make 24 puzzles.',
    players: [1, 8],
    minutes: '3 to 6',
    family: 'party',
    colour: '#7a3c18',
    settings: [
      {
        key: 'mode',
        label: 'Mode',
        type: 'choice',
        options: [
          { value: 'sprint', label: 'Sprint' },
          { value: 'make24', label: 'Make 24' }
        ]
      },
      {
        key: 'level',
        label: 'Difficulty',
        type: 'choice',
        options: [
          { value: 'easy', label: 'Easy' },
          { value: 'medium', label: 'Medium' },
          { value: 'hard', label: 'Hard' }
        ]
      },
      { key: 'questions', label: 'Questions', type: 'choice', options: [10, 15, 20].map((n) => ({ value: n, label: String(n) })), when: { key: 'mode', value: 'sprint' } }
    ],
    rules: [
      { title: 'Sprint', body: ['Everyone gets the same sum at the same time and one try to answer. Correct answers score 100 plus up to 100 for speed. Answer several in a row for a streak multiplier of up to ×1.5.'] },
      { title: 'Make 24', body: ['Use all four numbers exactly once with + − × ÷ and brackets to make 24. Every puzzle has at least one answer. The first solver scores most, and you can keep trying until time runs out.'] }
    ],
    tips: ['In Make 24, look for 3 × 8, 4 × 6 and 2 × 12 first.'],
    keywords: ['quick math game', 'make 24 game online', 'math race multiplayer']
  },
  {
    id: 'trivia',
    name: 'Trivia',
    tagline: 'Naija, Afrobeats, football and more.',
    blurb: 'Fast four option trivia for up to eight players. Faster correct answers earn more points, and streaks earn bonuses.',
    players: [1, 8],
    minutes: '5 to 8',
    family: 'party',
    colour: '#16a08a',
    settings: [
      { key: 'pack', label: 'Pack', type: 'choice', options: [{ value: 'mixed', label: 'Mixed bag' }, { value: 'naija', label: 'Naija' }, { value: 'afrobeats', label: 'Afrobeats' }, { value: 'football', label: 'Football' }, { value: 'nollywood', label: 'Nollywood' }, { value: 'general', label: 'General knowledge' }, { value: 'science', label: 'Science' }, { value: 'tech', label: 'Tech' }, { value: 'geography', label: 'Geography' }, { value: 'history', label: 'History' }, { value: 'music', label: 'Music' }, { value: 'film', label: 'Film' }, { value: 'animals', label: 'Animals' }, { value: 'sport', label: 'Sport' }] },
      { key: 'questions', label: 'Questions', type: 'choice', options: [5, 10, 15].map((n) => ({ value: n, label: String(n) })) },
      { key: 'seconds', label: 'Seconds per question', type: 'choice', options: [15, 20, 30].map((n) => ({ value: n, label: `${n}s` })) }
    ],
    rules: [
      { title: 'How it works', body: ['Everyone sees the same question with four answers. Pick one before the timer runs out.'] },
      { title: 'Scoring', body: ['A correct answer is worth up to 1,000 points: the faster you answer, the more you get. Two or more correct answers in a row add a streak bonus of up to 500.'] },
      { title: 'Packs', body: ['Naija, Afrobeats, Football, Nollywood and Tech packs are written by NexPlay. General knowledge, science, geography, history, music, film and animals questions come from the Open Trivia Database (opentdb.com), licensed CC BY-SA 4.0.'] }
    ],
    tips: ['Speed matters, but a wrong answer breaks your streak.'],
    keywords: ['naija trivia', 'afrobeats quiz', 'nigerian quiz game online']
  }
];

export const gameIds = GAMES.map((g) => g.id);
/** Games played in turns. These get a turn timer; the others run on their own round clocks. */
export const isTurnBased = (id: GameId) => id === 'ayo' || id === 'whot' || id === 'connect-four' || id === 'tic-tac-toe';
/** Turn timer choices, in seconds. */
export const TURN_TIMERS = [15, 30, 60];
export const gameMeta = (id: string) => GAMES.find((g) => g.id === id);

/** Loads a game's engine on demand so each game ships as its own chunk. */
export async function loadGame(id: GameId): Promise<AnyGame> {
  switch (id) {
    case 'ayo':
      return (await import('./games/ayo')).ayo;
    case 'whot':
      return (await import('./games/whot')).whot;
    case 'connect-four':
      return (await import('./games/connect-four')).connectFour;
    case 'tic-tac-toe':
      return (await import('./games/tic-tac-toe')).ticTacToe;
    case 'rps':
      return (await import('./games/rps')).rps;
    case 'word-race':
      return (await import('./games/word-race')).wordRace;
    case 'quick-math':
      return (await import('./games/quick-math')).quickMath;
    case 'trivia':
      return (await import('./games/trivia')).trivia;
  }
}
