import { seo } from '~/lib/seo';
import { Legal } from './legal';

export function meta() {
  return seo({ title: 'Terms · NexPlay', description: 'The simple rules for using NexPlay.', path: '/terms' });
}

export default function Terms() {
  return (
    <Legal title="Terms of use" updated="30 October 2026">
      <p>These terms cover your use of NexPlay, a free games website run by NexKeys Agency. By playing you agree to them. They are short on purpose.</p>

      <h2>Playing fair</h2>
      <ul>
        <li>Be decent to the people you play with. Pick a display name that is not offensive or pretending to be someone else.</li>
        <li>Do not try to cheat, break the games, read other players' hidden information, or interfere with other people's rooms.</li>
        <li>Do not use bots or scripts to farm XP or climb the leaderboard.</li>
      </ul>
      <p>We may remove names, leaderboard entries or access for anyone who breaks these rules.</p>

      <h2>No money involved</h2>
      <p>NexPlay is for fun. There are no stakes, prizes or purchases, and XP has no cash value. Do not use NexPlay for gambling.</p>

      <h2>The service</h2>
      <p>
        We work hard to keep NexPlay running smoothly, but it is provided as it is, without guarantees. Games can be interrupted by network problems, and we may change, add or remove games and features at any time. To the extent the law allows, NexKeys Agency is not liable for losses from using or not being able to use NexPlay.
      </p>

      <h2>Content and credits</h2>
      <p>
        The NexPlay name, design and code belong to NexKeys Agency. Whot, Ayo and the other games are traditional or public domain games; NexPlay is not affiliated with any company that sells physical versions of them. Some trivia questions come from the Open Trivia Database and are used under the Creative Commons Attribution ShareAlike 4.0 licence.
      </p>

      <h2>Privacy</h2>
      <p>
        How we handle your data is explained on the <a href="/privacy">privacy page</a>.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. The date at the top shows the latest version. Continuing to play means you accept the updated terms.</p>
    </Legal>
  );
}
