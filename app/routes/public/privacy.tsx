import { seo } from '~/lib/seo';
import { Legal } from './legal';

export function meta() {
  return seo({ title: 'Privacy · NexPlay', description: 'What NexPlay stores about you, why, and how to remove it.', path: '/privacy' });
}

export default function Privacy() {
  return (
    <Legal title="Privacy" updated="30 October 2026">
      <p>NexPlay is a free games website run by NexKeys Agency. This page explains what we store when you play, and why. We keep it to the minimum the games need.</p>

      <h2>What we store</h2>
      <ul>
        <li>
          <b>A player ID.</b> When you open the app we sign you in as an anonymous guest through Firebase Authentication. This gives your device a random ID so your moves and stats can be told apart from other players.
        </li>
        <li>
          <b>Your display name and colour.</b> These are shown to the people you play with and, if you finish games, on the public leaderboard.
        </li>
        <li>
          <b>Game statistics.</b> Games played, wins, XP, level and daily challenge results. Only you can read your full statistics. Your name, colour, XP, wins and level appear on the public leaderboard.
        </li>
        <li>
          <b>Room data.</b> While you are in a room we store your seat, whether you are connected, your moves and any reactions you send. This is needed to run the game and is not used for anything else.
        </li>
        <li>
          <b>Google account details, only if you choose to sign in with Google.</b> Google shares your name, email address and profile photo address with Firebase. We use the email only to show you which account you are signed in with.
        </li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not show ads or use advertising trackers.</li>
        <li>We do not sell or share your data with anyone for marketing.</li>
        <li>We do not ask for your phone number, location or contacts.</li>
      </ul>

      <h2>On your device</h2>
      <p>We save your display name, colour and sound setting in your browser's local storage so they are remembered next time. Clearing your browser data removes them.</p>

      <h2>Who processes the data</h2>
      <p>
        Data is stored with Google Firebase (Authentication and Realtime Database), and the website is hosted on Vercel. Both act on our behalf and follow their own security and privacy terms. Vercel may keep standard server logs such as IP addresses for a short time to keep the service running.
      </p>

      <h2>How long we keep it</h2>
      <p>Room data is only useful while a room is open, and rooms are cleared when everyone leaves. Statistics and leaderboard entries are kept until you ask us to delete them.</p>

      <h2>Your choices</h2>
      <ul>
        <li>You can change your display name at any time from your profile.</li>
        <li>You can ask us to delete your statistics and leaderboard entry by contacting NexKeys Agency and telling us your display name.</li>
        <li>If you signed in with Google you can remove NexPlay's access from your Google account settings.</li>
      </ul>

      <h2>Children</h2>
      <p>NexPlay is a general audience site and does not knowingly collect personal information from children under 13 beyond the anonymous guest ID needed to play.</p>

      <h2>Changes</h2>
      <p>If this policy changes we will update this page and the date at the top.</p>
    </Legal>
  );
}
