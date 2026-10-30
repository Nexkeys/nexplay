import { Link } from 'react-router';
import { Icon, type IconName } from '~/components/Icon';
import { Reveal } from '~/components/fx/Reveal';
import { Split } from '~/components/fx/Split';
import { seo } from '~/lib/seo';

export function meta() {
  return seo({
    title: 'User guide · NexPlay',
    description: 'How to start a room, invite friends with a code, set house rules, use quick match, play the computer, earn XP and fix common problems on NexPlay.',
    path: '/guide'
  });
}

interface Chapter {
  id: string;
  icon: IconName;
  title: string;
  lead: string;
  steps?: string[];
  notes?: { h: string; p: string }[];
  visual?: React.ReactNode;
}

const CHAPTERS: Chapter[] = [
  {
    id: 'start',
    icon: 'play',
    title: 'Start in one tap',
    lead: 'There is nothing to install and no form to fill. Open NexPlay and tap Play now. You get a guest name like Swift Falcon, which you can change any time.',
    steps: ['Tap Play now on any page.', 'Open Me (or your name at the top right) to change your name and colour.', 'That is it. You are ready to play.'],
    visual: (
      <div className="gv gv-name">
        <span className="gv-av">S</span>
        <span className="gv-field">Swift Falcon</span>
        <span className="gv-btn">Save</span>
      </div>
    )
  },
  {
    id: 'room',
    icon: 'plus',
    title: 'Create a room',
    lead: 'A room is a private table for your group. Whoever creates it is the host.',
    steps: ['On the Play screen, tap Create a room.', 'Pick a game. You can switch to another game later in the lobby.', 'You land in the lobby with a five letter room code.'],
    visual: (
      <div className="gv gv-code">
        <small>Room code</small>
        <b>K7QPM</b>
      </div>
    )
  },
  {
    id: 'invite',
    icon: 'share',
    title: 'Invite your friends',
    lead: 'Codes skip letters that look alike (no O and 0, no I and 1), so they are easy to read out on a call.',
    steps: ['Tap Invite to send the link through WhatsApp or any app, or Copy to copy the code.', 'Friends open the link, or go to Play and type the code into the box next to Create a room.', 'Late arrivals can watch a game in progress and take a seat when the next game starts.']
  },
  {
    id: 'lobby',
    icon: 'users',
    title: 'The lobby',
    lead: 'Everyone gathers here before the game. The host runs the table.',
    notes: [
      { h: 'Ready up', p: 'Players tap I am ready. The host can start once everyone is ready and there are enough players.' },
      { h: 'House rules', p: 'The host picks the mode and switches special rules on or off, like pick three in Whot or the Ayo rule set.' },
      { h: 'Computer players', p: 'Short of players? The host can fill empty seats with computer players at easy, medium or hard.' },
      { h: 'Seats and timer', p: 'Party games take up to eight players. Turn based games always have a turn timer of 15, 30 or 60 seconds, so nobody is kept waiting.' }
    ]
  },
  {
    id: 'playing',
    icon: 'bolt',
    title: 'During a game',
    lead: 'Moves appear on every screen instantly. A golden ring around a player shows whose turn it is, and it empties as their time runs down.',
    notes: [
      { h: 'Rules at hand', p: 'Tap the book icon at the top of any game to read the rules without leaving.' },
      { h: 'Reactions', p: 'Send a quick emoji to the table from the bar at the bottom.' },
      { h: 'Turn timer', p: 'Your seconds count down next to your name. Run out of time and a random move is played for you, so stay at the table.' },
      { h: 'Sound', p: 'Tap the speaker icon to mute. Your choice is remembered.' },
      { h: 'Play again', p: 'When the game ends the host can start a rematch in one tap, or take everyone back to the lobby. Wins are counted for the whole session.' }
    ]
  },
  {
    id: 'quick',
    icon: 'bolt',
    title: 'Quick match',
    lead: 'Want a game with someone new? Quick match pairs you with the next person who picks the same game.',
    steps: ['Pick a game and tap Quick match.', 'Wait a moment while we find a player. You can cancel any time.', 'Once paired, the game starts on its own. If it is quiet, play the computer while you wait.']
  },
  {
    id: 'computer',
    icon: 'bot',
    title: 'Playing the computer',
    lead: 'Every game has a computer opponent at three levels. Easy makes mistakes. Hard thinks several moves ahead in Ayo, Connect Four and Tic Tac Toe, and reads your habits in Rock Paper Scissors.',
    steps: ['Pick a game and tap Vs computer.', 'Choose the level, the number of computer players (for Whot and party games) and the house rules.', 'Tap Start. Games against the computer work even on a weak connection.']
  },
  {
    id: 'xp',
    icon: 'trophy',
    title: 'XP, levels and the daily challenge',
    lead: 'Every game you finish earns XP: 100 for a win, 50 for a draw and 30 for playing it out. Games where every opponent is a computer earn less.',
    notes: [
      { h: 'Levels', p: 'Levels get a little further apart each time. Your level shows next to your name and on the leaderboard.' },
      { h: 'Daily challenge', p: 'Each day one game is picked for everyone. Win a game of it for a bonus 50 XP and a tick on your streak.' },
      { h: 'Leaderboard', p: 'The top 50 players by XP, updated live.' }
    ]
  },
  {
    id: 'account',
    icon: 'user',
    title: 'Guest or Google account',
    lead: 'As a guest, your progress is saved on this device. Sign in with Google from your profile to keep it safe and use it on any device. Your guest XP and stats come with you when you sign in, unless that Google account already has its own NexPlay progress, in which case you continue with that one.',
    steps: ['Open Me.', 'Tap Continue with Google.', 'Choose your account. Done.']
  },
  {
    id: 'install',
    icon: 'home',
    title: 'Add NexPlay to your home screen',
    lead: 'NexPlay works like an app. On Android, open the browser menu and tap Add to Home screen. On iPhone, tap Share in Safari, then Add to Home Screen.'
  },
  {
    id: 'help',
    icon: 'info',
    title: 'If something goes wrong',
    lead: 'Most problems fix themselves within a few seconds.',
    notes: [
      { h: 'My network dropped', p: 'Open the same room link again. Your seat is kept. While you are away, the game plays a quick move for you when your turn comes, so others are not stuck.' },
      { h: 'The host left', p: 'After a few seconds the next player takes over as host automatically and the game carries on from the same position.' },
      { h: 'Room not found or expired', p: 'An invite code closes after 15 minutes if nobody joins, and a room closes 5 minutes after everyone has left. Ask the host for a fresh code.' },
      { h: 'This room is full', p: 'Every seat is taken. Ask the host to remove a computer player or raise the number of seats.' },
      { h: 'My move did not count', p: 'A short message tells you why, for example it was not your turn or the card does not match. Try again.' }
    ]
  }
];

export default function Guide() {
  return (
    <div className="page-p guide">
      <header className="ph">
        <span className="eyebrow">User guide</span>
        <Split text="Everything you need to run the table." className="ph-h" highlight="table" />
        <p className="lede">From your first game to hosting a room of eight. For the rules of each game, see the game pages.</p>
        <div className="guide-chips">
          {CHAPTERS.map((c) => (
            <a key={c.id} href={`#${c.id}`}>
              {c.title}
            </a>
          ))}
        </div>
      </header>

      <div className="chapters">
        {CHAPTERS.map((c, i) => (
          <Reveal key={c.id}>
            <section id={c.id} className={`chapter${c.visual ? ' has-visual' : ''}`}>
              <div className="ch-num">
                <span>{String(i + 1).padStart(2, '0')}</span>
                <i>
                  <Icon name={c.icon} size={22} />
                </i>
              </div>
              <div className="ch-body">
                <h2>{c.title}</h2>
                <p className="ch-lead">{c.lead}</p>
                {c.steps && (
                  <ol className="ch-steps">
                    {c.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                )}
                {c.notes && (
                  <div className="ch-notes">
                    {c.notes.map((n) => (
                      <div key={n.h}>
                        <b>{n.h}</b>
                        <p>{n.p}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {c.visual && <div className="ch-visual">{c.visual}</div>}
            </section>
          </Reveal>
        ))}
      </div>

      <section className="final small">
        <h2>Ready to host?</h2>
        <Link to="/play" className="pbtn big brass">
          Start a game <Icon name="arrow" />
        </Link>
      </section>
    </div>
  );
}
