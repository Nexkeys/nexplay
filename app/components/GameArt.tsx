import type { GameId } from '~/engine/types';

/** Flat illustrations for each game, used on cards in both the public site and the app. */
export function GameArt({ id, size = 150 }: { id: GameId; size?: number }) {
  const w = size;
  switch (id) {
    case 'ayo':
      return (
        <svg width={w} height={w * 0.55} viewBox="0 0 200 110" aria-hidden="true">
          <defs>
            <radialGradient id="ga-pit" cx=".5" cy=".38">
              <stop offset="0" stopColor="#2b1609" />
              <stop offset=".8" stopColor="#4a2a12" />
            </radialGradient>
          </defs>
          <rect x="4" y="14" width="192" height="82" rx="41" fill="#9a6036" />
          <rect x="4" y="14" width="192" height="82" rx="41" fill="none" stroke="#c88a55" strokeOpacity=".5" strokeWidth="2" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i}>
              <circle cx={42 + i * 23.2} cy={40} r={10} fill="url(#ga-pit)" />
              <circle cx={42 + i * 23.2} cy={70} r={10} fill="url(#ga-pit)" />
            </g>
          ))}
          {[
            [40, 38],
            [45, 42],
            [86, 36],
            [112, 72],
            [108, 67],
            [158, 40],
            [154, 44],
            [62, 70]
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3.6" fill="#efe2c8" />
          ))}
        </svg>
      );
    case 'whot':
      return (
        <svg width={w} height={w * 0.72} viewBox="0 0 160 115" aria-hidden="true">
          <g transform="translate(22 22) rotate(-13)">
            <rect width="62" height="88" rx="9" fill="#fffaf0" />
            <text x="8" y="20" fontFamily="var(--display)" fontWeight="800" fontSize="15" fill="#8e1b2b">
              2
            </text>
            <circle cx="31" cy="48" r="15" fill="#8e1b2b" />
          </g>
          <g transform="translate(72 12) rotate(9)">
            <rect width="62" height="88" rx="9" fill="#fffaf0" />
            <text x="8" y="20" fontFamily="var(--display)" fontWeight="800" fontSize="15" fill="#8e1b2b">
              20
            </text>
            <text x="31" y="54" textAnchor="middle" fontFamily="var(--display)" fontWeight="800" fontSize="15" fill="#8e1b2b">
              WHOT
            </text>
          </g>
        </svg>
      );
    case 'connect-four':
      return (
        <svg width={w * 0.9} height={w * 0.64} viewBox="0 0 140 100" aria-hidden="true">
          <rect x="10" y="6" width="120" height="88" rx="12" fill="#2f63c9" />
          {Array.from({ length: 12 }, (_, i) => {
            const fill = ['#0f2c70', '#0f2c70', '#ff5a3c', '#0f2c70', '#e3a63a', '#ff5a3c', '#e3a63a', '#0f2c70', '#ff5a3c', '#e3a63a', '#ff5a3c', '#e3a63a'][i];
            return <circle key={i} cx={32 + (i % 4) * 25} cy={26 + Math.floor(i / 4) * 25} r="9.5" fill={fill} />;
          })}
        </svg>
      );
    case 'tic-tac-toe':
      return (
        <svg width={w * 0.62} height={w * 0.62} viewBox="0 0 100 100" aria-hidden="true">
          <rect width="100" height="100" rx="18" fill="#17110c" />
          <g stroke="#fbf4e6" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round">
            <path d="M37 14v72M63 14v72M14 37h72M14 63h72" />
          </g>
          <path d="M19 19l12 12M31 19L19 31M69 69l12 12M81 69L69 81" stroke="#ff5a3c" strokeWidth="6" strokeLinecap="round" />
          <circle cx="50" cy="50" r="7.5" fill="none" stroke="#e3a63a" strokeWidth="5.5" />
          <circle cx="75" cy="25" r="7.5" fill="none" stroke="#e3a63a" strokeWidth="5.5" />
        </svg>
      );
    case 'rps':
      return (
        <svg width={w * 0.9} height={w * 0.6} viewBox="0 0 150 100" aria-hidden="true">
          <circle cx="45" cy="52" r="34" fill="#7d4fb3" />
          <circle cx="105" cy="52" r="34" fill="#ff5a3c" />
          <text x="45" y="64" textAnchor="middle" fontSize="34">
            ✊
          </text>
          <text x="105" y="64" textAnchor="middle" fontSize="34">
            ✌️
          </text>
        </svg>
      );
    case 'word-race':
      return (
        <svg width={w} height={w * 0.5} viewBox="0 0 180 90" aria-hidden="true">
          {'RACE'.split('').map((ch, i) => (
            <g key={i} transform={`translate(${14 + i * 40} ${18 + (i % 2) * 8}) rotate(${[-6, 4, -3, 7][i]})`}>
              <rect width="34" height="40" rx="7" fill={i === 2 ? '#16a08a' : '#fffaf0'} />
              <rect y="34" width="34" height="6" rx="3" fill="#000" opacity=".12" />
              <text x="17" y="28" textAnchor="middle" fontFamily="var(--display)" fontWeight="800" fontSize="22" fill={i === 2 ? '#fff' : '#17110c'}>
                {ch}
              </text>
            </g>
          ))}
        </svg>
      );
    case 'quick-math':
      return (
        <svg width={w} height={w * 0.55} viewBox="0 0 180 100" aria-hidden="true">
          <rect x="18" y="16" width="144" height="68" rx="16" fill="#17110c" />
          <text x="90" y="62" textAnchor="middle" fontFamily="var(--display)" fontWeight="800" fontSize="30" fill="#e3a63a">
            8 × 3 = 24
          </text>
        </svg>
      );
    case 'trivia':
      return (
        <svg width={w * 0.9} height={w * 0.6} viewBox="0 0 150 100" aria-hidden="true">
          {['#ff5a3c', '#2f6fe4', '#e3a63a', '#16a08a'].map((c, i) => (
            <rect key={c} x={18 + (i % 2) * 60} y={14 + Math.floor(i / 2) * 38} width="54" height="32" rx="9" fill={c} />
          ))}
          <text x="75" y="64" textAnchor="middle" fontFamily="var(--display)" fontWeight="800" fontSize="44" fill="#fffaf0" stroke="#17110c" strokeWidth="3" paintOrder="stroke">
            ?
          </text>
        </svg>
      );
  }
}
