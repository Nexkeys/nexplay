/*
 * Love Lock artwork, all hand drawn as inline SVG: the seven lock symbols, hearts for lives, the
 * reaction icons and the card illustration. Symbols are drawn in a 24 × 24 box.
 */

export const SYMBOL_COLOURS = ['#ff5f7e', '#f4c15a', '#b7a4ff', '#3ec7b0', '#ff8fc8', '#ff9a3c', '#7ab8ff'];

const star = (cx: number, cy: number, outer: number, inner: number, points = 5) =>
  Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / points) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');

const HEART = 'M12 20.6c-.3 0-.6-.1-.8-.3C8.3 17.9 3 13.8 3 9.1 3 6.3 5.1 4.2 7.8 4.2c1.7 0 3.2.9 4.2 2.3 1-1.4 2.5-2.3 4.2-2.3 2.7 0 4.8 2.1 4.8 4.9 0 4.7-5.3 8.8-8.2 11.2-.2.2-.5.3-.8.3z';
const STAR = star(12, 12.8, 10, 4.4);

/** One lock symbol as SVG shapes in a 24 × 24 box, for use inside another <svg>. */
export function SymbolShape({ s }: { s: number }) {
  const c = SYMBOL_COLOURS[s] ?? '#f5ecd9';
  switch (s) {
    case 0:
      return (
        <g>
          <path d={HEART} fill={c} />
          <path d="M7.4 7.2c-1.3.3-2.2 1.4-2.3 2.7" stroke="#fff" strokeOpacity=".55" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
      );
    case 1:
      return (
        <g>
          <polygon points={STAR} fill={c} stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="9.6" cy="10.4" r="1.1" fill="#fff" fillOpacity=".6" />
        </g>
      );
    case 2:
      return (
        <g>
          <path d="M20.6 14.2A8.9 8.9 0 1 1 9.8 3.4a7 7 0 0 0 10.8 10.8z" fill={c} />
          <circle cx="8.6" cy="14.6" r="1.2" fill="#fff" fillOpacity=".35" />
          <circle cx="12.4" cy="17.4" r=".8" fill="#fff" fillOpacity=".35" />
        </g>
      );
    case 3:
      return (
        <g>
          <path d="M7.2 3.6h9.6l4.6 5.8L12 21.2 2.6 9.4z" fill={c} stroke={c} strokeWidth="1" strokeLinejoin="round" />
          <path d="M2.8 9.4h18.4M9.4 3.8 7.6 9.4 12 20.8l4.4-11.4-1.8-5.6" stroke="#fff" strokeOpacity=".5" strokeWidth="1" strokeLinejoin="round" fill="none" />
          <path d="M7.6 9.4h8.8L12 20.8z" fill="#000" fillOpacity=".08" />
        </g>
      );
    case 4:
      return (
        <g>
          {[0, 1, 2, 3, 4].map((p) => {
            const a = (Math.PI * 2 * p) / 5 - Math.PI / 2;
            return <circle key={p} cx={12 + 5.2 * Math.cos(a)} cy={12.4 + 5.2 * Math.sin(a)} r="4.3" fill={c} />;
          })}
          <circle cx="12" cy="12.4" r="3.3" fill="#ffe08a" />
          <circle cx="11.1" cy="11.5" r="1" fill="#fff" fillOpacity=".7" />
        </g>
      );
    case 5:
      return (
        <g>
          <g stroke={c} strokeWidth="2.2" strokeLinecap="round">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((r) => {
              const a = (Math.PI / 4) * r;
              return <line key={r} x1={12 + 7.4 * Math.cos(a)} y1={12 + 7.4 * Math.sin(a)} x2={12 + 10 * Math.cos(a)} y2={12 + 10 * Math.sin(a)} />;
            })}
          </g>
          <circle cx="12" cy="12" r="5.2" fill={c} />
          <circle cx="10.4" cy="10.4" r="1.4" fill="#fff" fillOpacity=".5" />
        </g>
      );
    case 6:
      return (
        <g>
          <path d="M9.2 17.4V6.2l10.6-2.4v11.4" stroke={c} strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round" fill="none" />
          <path d="M9.2 6.2l10.6-2.4v3.6L9.2 9.8z" fill={c} />
          <ellipse cx="6.6" cy="17.6" rx="3.4" ry="2.7" fill={c} transform="rotate(-18 6.6 17.6)" />
          <ellipse cx="17.2" cy="15.4" rx="3.4" ry="2.7" fill={c} transform="rotate(-18 17.2 15.4)" />
        </g>
      );
    default:
      return null;
  }
}

/** A lock symbol as its own little picture. */
export function Sym({ s, size = 24, title }: { s: number; size?: number; title?: string }) {
  return (
    <svg className="ll-sym" width={size} height={size} viewBox="0 0 24 24" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <SymbolShape s={s} />
    </svg>
  );
}

/** A heart for the shared lives. Empty hearts are drawn as an outline. */
export function HeartIcon({ full = true, size = 20 }: { full?: boolean; size?: number }) {
  return (
    <svg className={`ll-heart${full ? '' : ' empty'}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {full ? (
        <>
          <path d={HEART} fill="#ff5f7e" />
          <path d="M12 20.6c-.3 0-.6-.1-.8-.3C8.3 17.9 3 13.8 3 9.1c0 4 6 8.4 9 10.4 3-2 9-6.4 9-10.4 0 4.7-5.3 8.8-8.2 11.2-.2.2-.5.3-.8.3z" fill="#c2345b" fillOpacity=".55" />
          <path d="M7.4 7.2c-1.3.3-2.2 1.4-2.3 2.7" stroke="#fff" strokeOpacity=".6" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <path d={HEART} fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.4 2" />
      )}
    </svg>
  );
}

/** Icons for the quick reactions: love, hmm, idea, a clue please, go for it. */
export function ReactIcon({ r, size = 16 }: { r: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {r === 0 && <path d={HEART} fill="#ff5f7e" />}
      {r === 1 && (
        <g fill="currentColor">
          <path d="M4 5.5C4 4.1 5.1 3 6.5 3h11C18.9 3 20 4.1 20 5.5v8c0 1.4-1.1 2.5-2.5 2.5H11l-4.5 4v-4h0C5.1 16 4 14.9 4 13.5z" fillOpacity=".22" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <circle cx="12" cy="9.5" r="1.5" />
          <circle cx="15.5" cy="9.5" r="1.5" />
        </g>
      )}
      {r === 2 && (
        <g>
          <path d="M12 2.5l2 5.6 5.6 2-5.6 2-2 5.6-2-5.6-5.6-2 5.6-2z" fill="#f4c15a" />
          <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="#f4c15a" fillOpacity=".8" />
        </g>
      )}
      {r === 3 && (
        <g>
          <rect x="5" y="3.5" width="12" height="16" rx="2.5" fill="#ff8fc8" fillOpacity=".3" stroke="#ff8fc8" strokeWidth="1.6" transform="rotate(-8 11 11.5)" />
          <path d="M11.5 9.3c0-1.2 1-2 2.1-2s2 .8 2 1.9c0 1.6-2 1.6-2 3.1M13.6 14.6v.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none" transform="rotate(-8 11 11.5) translate(-2.6 0)" />
        </g>
      )}
      {r === 4 && <path d="M4.5 12.5l4.5 4.5 10.5-10.5" stroke="#46d18a" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
    </svg>
  );
}

/** Card illustration: a rose padlock with a heart keyhole, its key, and lock symbols floating around. */
export function LoveLockArt({ size = 150 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 150 90" aria-hidden="true">
      <defs>
        <linearGradient id="lla-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff7a98" />
          <stop offset="1" stopColor="#c2345b" />
        </linearGradient>
        <linearGradient id="lla-shackle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c9963f" />
          <stop offset=".45" stopColor="#ffe3a3" />
          <stop offset="1" stopColor="#b9862e" />
        </linearGradient>
      </defs>
      {/* the shackle, sprung open on its left leg */}
      <path d="M58 44V30a17 17 0 0 1 34 0v4" fill="none" stroke="url(#lla-shackle)" strokeWidth="7" strokeLinecap="round" transform="rotate(-14 58 44) translate(0 -4)" />
      {/* the body */}
      <rect x="44" y="38" width="62" height="46" rx="12" fill="url(#lla-body)" />
      <rect x="44" y="38" width="62" height="46" rx="12" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="1.5" />
      <path d="M50 44h50" stroke="#fff" strokeOpacity=".28" strokeWidth="2.5" strokeLinecap="round" />
      {/* heart keyhole */}
      <g transform="translate(64 50) scale(.92)">
        <path d={HEART} fill="#5a1530" />
      </g>
      <rect x="73.2" y="64" width="3.6" height="9" rx="1.8" fill="#5a1530" />
      {/* the key */}
      <g transform="translate(112 52) rotate(28)">
        <circle cx="0" cy="0" r="7" fill="none" stroke="url(#lla-shackle)" strokeWidth="3.4" />
        <path d="M6.5 0h17M18 0v5M22 0v4" stroke="url(#lla-shackle)" strokeWidth="3.2" strokeLinecap="round" />
      </g>
      {/* floating symbols */}
      <g transform="translate(14 14) scale(.95) rotate(-12 12 12)">
        <SymbolShape s={1} />
      </g>
      <g transform="translate(18 52) scale(.8) rotate(8 12 12)">
        <SymbolShape s={2} />
      </g>
      <g transform="translate(108 8) scale(.85) rotate(10 12 12)">
        <SymbolShape s={4} />
      </g>
      <g transform="translate(96 26) scale(.5)">
        <SymbolShape s={0} />
      </g>
      <g transform="translate(36 22) scale(.42)">
        <SymbolShape s={0} />
      </g>
      <circle cx="130" cy="78" r="2" fill="#f4c15a" />
      <circle cx="10" cy="80" r="1.6" fill="#ff8fc8" />
    </svg>
  );
}
