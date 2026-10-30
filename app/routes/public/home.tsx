import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { motion } from 'motion/react';
import { useRef } from 'react';
import { Link } from 'react-router';
import { GameArt } from '~/components/GameArt';
import { Icon } from '~/components/Icon';
import { CountUp } from '~/components/fx/CountUp';
import { Marquee } from '~/components/fx/Marquee';
import { Reveal } from '~/components/fx/Reveal';
import { Split } from '~/components/fx/Split';
import { GAMES } from '~/engine/catalog';
import { SITE, seo } from '~/lib/seo';

export function meta() {
  return seo({
    title: 'NexPlay · Play Whot, Ayo and party games online with friends',
    description: 'Free multiplayer games in your browser. Play Whot, Ayo, Connect Four, Trivia and more with friends using a room code, against the computer, or in a quick match.',
    path: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'NexPlay',
      url: SITE,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'NGN' },
      description: 'Real time multiplayer Nigerian classics and party games.'
    }
  });
}

const FAQ = [
  ['Is NexPlay free?', 'Yes. Every game is free to play, with no download and no sign up. Just open the site and play.'],
  ['How do I play with my friends?', 'Tap Start a game, pick a game and you get a five letter room code. Send the code or the invite link to your friends. They type it in and you are at the same table.'],
  ['Do I need an account?', 'No. You play as a guest straight away. If you want to keep your level and stats across devices, sign in with Google from your profile. Your guest progress comes with you.'],
  ['Which Whot rules do you use?', 'The room host decides. Pick two, pick three, hold on, suspension, general market and the last card call can each be switched on or off before the game.'],
  ['Which Ayo rules do you use?', 'Both of the common ones. Complete fours (Ọta and Ọpẹ, where you win houses of four) is the default. Capture opposite (Ayoayo) is one tap away in the lobby.'],
  ['What if someone leaves mid game?', 'They can come back with the same link. If the host drops, another player takes over the table automatically and the game carries on.']
];

export default function Home() {
  const hero = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.from('.sticker', { y: -140, rotate: () => gsap.utils.random(-40, 40), opacity: 0, duration: 1.1, ease: 'back.out(1.6)', stagger: 0.09, delay: 0.15 });
      gsap.to('.sticker', { y: '+=10', duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: { each: 0.4, from: 'random' }, delay: 1.4 });
    },
    { scope: hero }
  );

  return (
    <>
      <section className="hero" ref={hero}>
        <div className="hero-copy">
          <span className="eyebrow">Free · No download · Phone or laptop</span>
          <Split text="Game night without the travel." className="hero-h" highlight="without" />
          <motion.p className="lede" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}>
            Ayo, Whot! and six other games, played live with your friends or anyone online. Send a code, pull up a chair, talk your talk.
          </motion.p>
          <motion.div className="hero-cta" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.7 }}>
            <Link to="/play" className="pbtn big coral">
              Start a game <Icon name="arrow" />
            </Link>
            <Link to="/play" className="pbtn big ghost">
              Join with a code
            </Link>
          </motion.div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <svg className="sticker s-card" viewBox="0 0 230 320">
            <rect width="230" height="320" rx="24" fill="#fffaf0" />
            <rect x="7" y="7" width="216" height="306" rx="19" fill="none" stroke="#e9dcc0" strokeWidth="2" />
            <text x="22" y="58" fontFamily="var(--display)" fontWeight="800" fontSize="46" fill="#8e1b2b">
              20
            </text>
            <text x="115" y="186" textAnchor="middle" fontFamily="var(--display)" fontWeight="800" fontSize="54" fill="#8e1b2b">
              WHOT
            </text>
            <text x="208" y="292" textAnchor="end" fontFamily="var(--display)" fontWeight="800" fontSize="46" fill="#8e1b2b" transform="rotate(180 185 278)">
              20
            </text>
          </svg>
          <div className="sticker s-ayo">
            <GameArt id="ayo" size={380} />
          </div>
          <svg className="sticker s-chip" viewBox="0 0 190 190">
            <circle cx="95" cy="95" r="90" fill="#ff5a3c" />
            <circle cx="95" cy="95" r="64" fill="none" stroke="#ffffff55" strokeWidth="10" />
          </svg>
          <svg className="sticker s-chip2" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="56" fill="#e3a63a" />
            <circle cx="60" cy="60" r="38" fill="none" stroke="#ffffff66" strokeWidth="8" />
          </svg>
          <div className="sticker s-ttt">
            <GameArt id="tic-tac-toe" size={270} />
          </div>
        </div>
      </section>

      <Marquee items={GAMES.map((g) => g.name)} />

      <section className="sec how" id="how">
        <Split as="h2" text="Three taps to the table." className="sec-h" />
        <div className="steps">
          {[
            { n: '01', h: 'Pick a game', p: 'Eight games, from Whot and Ayo to trivia for up to eight players. Set the house rules your way.' },
            { n: '02', h: 'Share the code', p: 'Every room gets a short code and an invite link. Drop it in the group chat.', code: true },
            { n: '03', h: 'Play live', p: 'Moves land instantly on every screen. Talk trash with reactions and run it back with one tap.' }
          ].map((s, i) => (
            <Reveal key={s.n} className="step" delay={i * 0.08}>
              <b>{s.n}</b>
              <div>
                {s.code && (
                  <span className="code" aria-hidden="true">
                    K7QPM
                  </span>
                )}
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="sec-row">
          <Split as="h2" text="Pick your table." className="sec-h" />
          <Link to="/games" className="pbtn ghost">
            All games and rules
          </Link>
        </div>
        <div className="ggrid">
          {GAMES.map((g, i) => (
            <Reveal key={g.id} delay={(i % 4) * 0.06}>
              <Link to={`/games/${g.id}`} className="gcard-p">
                <span className="art" style={{ ['--tint' as string]: g.colour }}>
                  <GameArt id={g.id} size={160} />
                </span>
                <span className="b">
                  <h3>{g.name}</h3>
                  <p>{g.tagline}</p>
                  <span className="tags">
                    {g.isNew && <span className="tag new">New</span>}
                    <span className="tag">{g.players[0] === g.players[1] ? `${g.players[0]} players` : `${Math.max(2, g.players[0])} to ${g.players[1]} players`}</span>
                    <span className="tag">{g.minutes} min</span>
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="classics">
        <div className="adire" aria-hidden="true" />
        <div className="classics-copy">
          <span className="eyebrow light">Made for Naija</span>
          <Split as="h2" text="The classics, done properly." />
          <p>Whot! with every house rule your family argues about. Ayo with both ways of playing, complete fours and capture opposite, and seeds you can watch being sown one by one.</p>
          <p>Plus Naija, Afrobeats, Nollywood and football trivia written by us.</p>
          <div className="hero-cta">
            <Link to="/games/whot" className="pbtn big light">
              Whot! rules
            </Link>
            <Link to="/games/ayo" className="pbtn big ghost light">
              Ayo rules
            </Link>
          </div>
        </div>
        <Reveal className="classics-art" y={40}>
          <div className="fan">
            {[
              { n: 2, s: 'cross', r: -16 },
              { n: 14, s: 'circle', r: -3 },
              { n: 20, s: 'whot', r: 11 }
            ].map((c) => (
              <span key={c.n} className="fan-card" style={{ rotate: `${c.r}deg` }}>
                <b>{c.n}</b>
                {c.s === 'whot' ? <em>WHOT</em> : c.s === 'cross' ? <i className="sh-cross" /> : <i className="sh-circle" />}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="sec">
        <div className="stats">
          <div className="stat">
            <b>
              <CountUp to={GAMES.length} />
            </b>
            <span>games, two of them Nigerian classics</span>
          </div>
          <div className="stat">
            <b>
              <CountUp to={8} />
            </b>
            <span>players at one table for the party games</span>
          </div>
          <div className="stat">
            <b>
              <CountUp to={1000} suffix="+" />
            </b>
            <span>trivia questions across 14 packs</span>
          </div>
          <div className="stat">
            <b>
              <CountUp to={0} />
            </b>
            <span>downloads or sign ups needed</span>
          </div>
        </div>
      </section>

      <section className="sec modes">
        <Split as="h2" text="Three ways to play." className="sec-h" />
        <div className="mode-grid">
          {[
            { icon: 'users' as const, h: 'With friends', p: 'Private rooms for 2 to 8 players. You are the host: choose the game, the rules, the turn timer, and add computer players to fill seats.', tone: 'sky' },
            { icon: 'bolt' as const, h: 'Quick match', p: 'No friends online? We pair you with the next player who picks the same game.', tone: 'coral' },
            { icon: 'bot' as const, h: 'Vs computer', p: 'Three levels for every game. The hard Ayo and Connect Four players search moves ahead, so bring your best.', tone: 'teal' }
          ].map((m, i) => (
            <Reveal key={m.h} className={`mode ${m.tone}`} delay={i * 0.08}>
              <span className="mode-ico">
                <Icon name={m.icon} size={26} />
              </span>
              <h3>{m.h}</h3>
              <p>{m.p}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="sec faq">
        <div>
          <Split as="h2" text="Questions, answered." className="sec-h" />
          <p className="muted-p">
            Still stuck? The <Link to="/guide">user guide</Link> walks through everything.
          </p>
        </div>
        <div className="qa">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="final">
        <Split as="h2" text="Your table is ready." />
        <p>Free, live, and ready on whatever phone your guys have.</p>
        <Link to="/play" className="pbtn big brass">
          Start a game <Icon name="arrow" />
        </Link>
      </section>
    </>
  );
}
