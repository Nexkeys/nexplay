import { Link } from 'react-router';
import { GameArt } from '~/components/GameArt';
import { Reveal } from '~/components/fx/Reveal';
import { Split } from '~/components/fx/Split';
import { GAMES } from '~/engine/catalog';
import { seo } from '~/lib/seo';

export function meta() {
  return seo({
    title: 'All games · NexPlay',
    description: 'Whot, Ayo, Connect Four, Tic Tac Toe, Rock Paper Scissors, Word Race, Quick Math and Trivia. Rules, tips and how to play each one online.',
    path: '/games'
  });
}

const GROUPS = [
  { id: 'classic', title: 'Naija classics', text: 'The games of every compound, school break and family gathering.' },
  { id: 'board', title: 'Board games', text: 'Two players, one board, no luck. Just you and your head.' },
  { id: 'party', title: 'Party games', text: 'Up to eight players racing on the same clock. Great for group calls.' }
] as const;

export default function Games() {
  return (
    <div className="page-p">
      <header className="ph">
        <span className="eyebrow">Eight games · rules for every one</span>
        <Split text="Every game on the table." className="ph-h" highlight="table" />
        <p className="lede">Tap a game for the full rules, tips and the house rules you can change. Then pull up a chair.</p>
      </header>
      {GROUPS.map((grp) => (
        <section key={grp.id} className="sec tight">
          <div className="group-head">
            <h2>{grp.title}</h2>
            <p>{grp.text}</p>
          </div>
          <div className="glist">
            {GAMES.filter((g) => g.family === grp.id).map((g, i) => (
              <Reveal key={g.id} delay={i * 0.06}>
                <Link to={`/games/${g.id}`} className="grow">
                  <span className="art" style={{ ['--tint' as string]: g.colour }}>
                    <GameArt id={g.id} size={150} />
                  </span>
                  <span className="b">
                    <h3>
                      {g.name} {g.isNew && <span className="tag new">New</span>}
                    </h3>
                    <p>{g.blurb}</p>
                    <span className="tags">
                      <span className="tag">{g.players[0] === g.players[1] ? `${g.players[0]} players` : `${Math.max(2, g.players[0])} to ${g.players[1]} players`}</span>
                      <span className="tag">{g.minutes} min</span>
                      {g.settings.find((s) => s.key === 'mode') && <span className="tag">{g.settings.find((s) => s.key === 'mode')!.options!.length} modes</span>}
                    </span>
                  </span>
                  <span className="go" aria-hidden="true">
                    →
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
