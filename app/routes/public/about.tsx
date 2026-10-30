import { Link } from 'react-router';
import { GameArt } from '~/components/GameArt';
import { Icon } from '~/components/Icon';
import { Reveal } from '~/components/fx/Reveal';
import { Split } from '~/components/fx/Split';
import { AGENCY_URL, seo } from '~/lib/seo';

export function meta() {
  return seo({ title: 'About · NexPlay', description: 'Why we built NexPlay: the games we grew up with, made for phones and group chats. Made by NexKeys Agency.', path: '/about' });
}

const VALUES = [
  { h: 'Rules people actually play', p: 'Families play Whot and Ayo differently, so we did not pick one. The host switches house rules on and off, and both common Ayo rule sets are built in.' },
  { h: 'Fair by design', p: 'In card games nobody sees your hand, not even in the page code. Rock Paper Scissors picks are sealed before they are revealed, so nobody can wait and counter.' },
  { h: 'Light on data', p: 'No downloads, no heavy video, no ads. Sounds are generated on your phone, so a game uses very little data.' },
  { h: 'Open to everyone', p: 'Play as a guest in one tap. Sign in only if you want your level to follow you to another device.' }
];

export default function About() {
  return (
    <div className="page-p about">
      <header className="ph">
        <span className="eyebrow">About NexPlay</span>
        <Split text="The games we grew up with, ready for the group chat." className="ph-h" highlight="grew" />
      </header>

      <section className="about-story">
        <Reveal className="story-art">
          <div className="art-stack">
            <span style={{ ['--tint' as string]: '#7a4a26' }}>
              <GameArt id="ayo" size={260} />
            </span>
            <span style={{ ['--tint' as string]: '#8e1b2b' }}>
              <GameArt id="whot" size={200} />
            </span>
          </div>
        </Reveal>
        <div className="story-copy">
          <p className="big-p">
            Everybody has a Whot story. The uncle who invents a new rule mid game. The cousin who never says last card. The Ayo board at grandma's that only the old people were allowed to touch.
          </p>
          <p>
            NexPlay brings those games, and a few party favourites, to any phone or laptop. You open a room, send a five letter code to the group chat, and everyone is at the same table in seconds. Moves land on every screen at the same moment, and if someone's network drops, the game waits and carries on.
          </p>
          <p>
            We researched the rules properly. Whot! uses the 54 card deck with every special card, Ayo has both complete fours and capture opposite, and the computer players are built to think ahead, not just pick moves at random.
          </p>
        </div>
      </section>

      <section className="sec">
        <Split as="h2" text="What we care about." className="sec-h" />
        <div className="values">
          {VALUES.map((v, i) => (
            <Reveal key={v.h} className="value" delay={i * 0.06}>
              <span className="num">0{i + 1}</span>
              <h3>{v.h}</h3>
              <p>{v.p}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="maker">
        <div>
          <span className="eyebrow light">Who made this</span>
          <h2>Made by NexKeys Agency.</h2>
          <p>NexKeys Agency designs and builds websites, apps and products. NexPlay is our love letter to game night: built from scratch, with every game engine, rule and computer player written in house.</p>
        </div>
        <div className="maker-cta">
          <a href={AGENCY_URL} target="_blank" rel="noopener" className="pbtn big ghost light">
            Visit NexKeys Agency
          </a>
          <Link to="/play" className="pbtn big brass">
            Play now <Icon name="arrow" />
          </Link>
        </div>
      </section>

      <section className="sec credits">
        <h2 className="sec-h small">Credits</h2>
        <ul>
          <li>General knowledge, science, history, geography, music, film, animals and sport trivia questions come from the Open Trivia Database (opentdb.com), used under CC BY-SA 4.0.</li>
          <li>Word lists are built from SCOWL (Spell Checker Oriented Word Lists) by Kevin Atkinson.</li>
          <li>Typefaces: Bricolage Grotesque, Inter and JetBrains Mono, all under the SIL Open Font License.</li>
        </ul>
      </section>
    </div>
  );
}
