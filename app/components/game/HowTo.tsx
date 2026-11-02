import type { GameMeta } from '~/engine/catalog';
import '~/styles/howto.css';

/**
 * The three step "How to play" summary, shown wherever a game is picked (setup against the computer,
 * the room lobby, the rules drawer and the public rules page) so nobody starts a game lost.
 */
export function HowTo({ meta, tone = 'dark', title = 'How to play' }: { meta: GameMeta; tone?: 'dark' | 'light'; title?: string }) {
  if (!meta.howTo.length) return null;
  return (
    <section className={`howto ${tone}`} style={{ ['--tint' as string]: meta.colour }} aria-label={`How to play ${meta.name}`}>
      <h2>{title}</h2>
      <ol>
        {meta.howTo.map((step, i) => (
          <li key={i}>
            <span className="n" aria-hidden="true">
              {i + 1}
            </span>
            <p>{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
