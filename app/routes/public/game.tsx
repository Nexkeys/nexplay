import { Link, useParams } from 'react-router';
import { GameArt } from '~/components/GameArt';
import { Icon } from '~/components/Icon';
import { Reveal } from '~/components/fx/Reveal';
import { GAMES, gameMeta } from '~/engine/catalog';
import { seo } from '~/lib/seo';
import NotFound from '../not-found';

export function meta({ params }: { params: { id?: string } }) {
  const g = gameMeta(params.id ?? '');
  if (!g) return [{ title: 'Game not found · NexPlay' }];
  return seo({
    title: `${g.name} rules and how to play online · NexPlay`,
    description: `${g.blurb} Free to play online with friends, in a quick match or against the computer.`,
    path: `/games/${g.id}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Game',
      name: g.name,
      description: g.blurb,
      numberOfPlayers: { '@type': 'QuantitativeValue', minValue: Math.max(1, g.players[0]), maxValue: g.players[1] },
      keywords: g.keywords.join(', ')
    }
  });
}

const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function GamePage() {
  const { id } = useParams();
  const g = gameMeta(id ?? '');
  if (!g) return <NotFound />;
  const others = GAMES.filter((x) => x.id !== g.id).slice(0, 3);
  const houseRules = g.settings;

  return (
    <div className="page-p">
      <section className="gp-hero">
        <div>
          <p className="crumb">
            <Link to="/games">Games</Link> / {g.name}
          </p>
          <h1>{g.name}</h1>
          <p className="lede">{g.blurb}</p>
          <div className="facts">
            <div>
              <b>{g.players[0] === g.players[1] ? g.players[0] : `${Math.max(1, g.players[0])} to ${g.players[1]}`}</b>
              <span>players</span>
            </div>
            <div>
              <b>{g.minutes}</b>
              <span>minutes</span>
            </div>
            <div>
              <b>3</b>
              <span>computer levels</span>
            </div>
          </div>
          <div className="hero-cta">
            <Link to="/play" className="pbtn big coral">
              Play {g.name} <Icon name="arrow" />
            </Link>
            <Link to={`/solo/${g.id}`} className="pbtn big ghost">
              Practise vs computer
            </Link>
          </div>
        </div>
        <div className="gp-art" style={{ ['--tint' as string]: g.colour }}>
          <GameArt id={g.id} size={360} />
        </div>
      </section>

      <section className="rules">
        <nav className="toc" aria-label="On this page">
          <span className="eyebrow">On this page</span>
          {g.rules.map((r) => (
            <a key={r.title} href={`#${slug(r.title)}`}>
              {r.title}
            </a>
          ))}
          {houseRules.length > 0 && <a href="#house-rules">House rules</a>}
          {g.tips.length > 0 && <a href="#tips">Tips</a>}
        </nav>
        <div className="rule-body">
          {g.rules.map((r) => (
            <Reveal key={r.title}>
              <article id={slug(r.title)}>
                <h2>{r.title}</h2>
                {r.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </article>
            </Reveal>
          ))}
          {houseRules.length > 0 && (
            <article id="house-rules">
              <h2>House rules you can change</h2>
              <p>The room host sets these in the lobby before the game starts.</p>
              <div className="house">
                {houseRules.map((s) => (
                  <div key={s.key} className="hr">
                    <b>{s.label}</b>
                    <span>{s.type === 'toggle' ? 'On or off' : s.options!.map((o) => o.label).join(' · ')}</span>
                    {s.help && <small>{s.help}</small>}
                  </div>
                ))}
              </div>
            </article>
          )}
          {g.tips.length > 0 && (
            <article id="tips" className="tips-box">
              <h2>Tips</h2>
              <ul>
                {g.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </article>
          )}
        </div>
      </section>

      <section className="sec tight">
        <h2 className="sec-h small">More games</h2>
        <div className="ggrid three">
          {others.map((o) => (
            <Link key={o.id} to={`/games/${o.id}`} className="gcard-p">
              <span className="art" style={{ ['--tint' as string]: o.colour }}>
                <GameArt id={o.id} size={140} />
              </span>
              <span className="b">
                <h3>{o.name}</h3>
                <p>{o.tagline}</p>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
