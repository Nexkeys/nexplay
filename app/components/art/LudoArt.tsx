const C = ['#e5484d', '#2fa866', '#f0b429', '#3d7bf2'];
const D = ['#9e1f2a', '#17663c', '#a86d06', '#1d4cad'];

/** A small Ludo board with a die and two glossy seeds, in the flat card art style. */
export function LudoArt({ size = 150 }: { size?: number }) {
  // Board drawn on a 15 unit grid, scaled to 66px.
  const k = 66 / 15;
  const bases: [number, number][] = [
    [0, 0],
    [9, 0],
    [9, 9],
    [0, 9]
  ];
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 150 90" aria-hidden="true">
      <defs>
        <linearGradient id="la-die" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffdf6" />
          <stop offset="1" stopColor="#e6d6b6" />
        </linearGradient>
        {C.map((c, i) => (
          <radialGradient key={i} id={`la-tok-${i}`} cx=".36" cy=".3" r=".75">
            <stop offset="0" stopColor="#fff" stopOpacity=".7" />
            <stop offset=".3" stopColor={c} />
            <stop offset="1" stopColor={D[i]} />
          </radialGradient>
        ))}
      </defs>

      <g transform="translate(20 12) rotate(-7 33 33)">
        <rect x="-4" y="-2" width="74" height="74" rx="9" fill="#000" opacity=".22" />
        <rect x="-4" y="-4" width="74" height="74" rx="9" fill="#7a4a26" />
        <rect x="0" y="0" width="66" height="66" rx="4" fill="#fbf4e6" />
        <g transform={`scale(${k})`}>
          {bases.map(([x, y], i) => (
            <g key={i}>
              <rect x={x} y={y} width="6" height="6" fill={C[i]} rx={i === 0 ? 0.8 : 0} />
              <rect x={x + 1} y={y + 1} width="4" height="4" rx=".6" fill="#fffaf0" />
              {[
                [2, 2],
                [4, 2],
                [2, 4],
                [4, 4]
              ].map(([dx, dy], j) => (
                <circle key={j} cx={x + dx} cy={y + dy} r=".62" fill={C[i]} opacity=".35" />
              ))}
            </g>
          ))}
          {/* home columns */}
          <rect x="1" y="7" width="5" height="1" fill={C[0]} />
          <rect x="7" y="1" width="1" height="5" fill={C[1]} />
          <rect x="9" y="7" width="5" height="1" fill={C[2]} />
          <rect x="7" y="9" width="1" height="5" fill={C[3]} />
          {/* track lines */}
          <path
            d="M0 6H6M0 7H6M0 8H6M0 9H6M9 6H15M9 7H15M9 8H15M9 9H15M6 0V6M7 0V6M8 0V6M9 0V6M6 9V15M7 9V15M8 9V15M9 9V15"
            stroke="#3a2618"
            strokeOpacity=".22"
            strokeWidth=".1"
          />
          {/* centre */}
          <polygon points="6,6 6,9 7.5,7.5" fill={C[0]} />
          <polygon points="6,6 9,6 7.5,7.5" fill={C[1]} />
          <polygon points="9,6 9,9 7.5,7.5" fill={C[2]} />
          <polygon points="6,9 9,9 7.5,7.5" fill={C[3]} />
        </g>
        {/* two seeds racing on the track */}
        {[
          [3.5, 6.5, 0],
          [8.5, 11.5, 3]
        ].map(([x, y, c]) => (
          <g key={c} transform={`translate(${x * k} ${y * k})`}>
            <ellipse cx="0" cy="3.6" rx="4.6" ry="1.6" fill="#000" opacity=".3" />
            <circle cx="0" cy="1" r="4.6" fill={D[c]} />
            <circle cx="0" cy="0" r="4.6" fill={`url(#la-tok-${c})`} stroke="#fffaf0" strokeWidth="1" />
            <ellipse cx="-1.6" cy="-2" rx="1.6" ry=".9" fill="#fff" opacity=".6" transform="rotate(-28 -1.6 -2)" />
          </g>
        ))}
      </g>

      {/* the die */}
      <g transform="translate(106 40) rotate(14)">
        <rect x="-15" y="-12" width="30" height="30" rx="7" fill="#000" opacity=".22" />
        <rect x="-15" y="-14" width="30" height="30" rx="7" fill="#b9a27a" />
        <rect x="-15" y="-16" width="30" height="29" rx="7" fill="url(#la-die)" />
        {[
          [-7, -9],
          [7, -9],
          [-7, -1.5],
          [7, -1.5],
          [-7, 6],
          [7, 6]
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="#1d130c" />
        ))}
      </g>
      {/* a third seed resting beside the board */}
      <g transform="translate(128 72)">
        <ellipse cx="0" cy="4.4" rx="6" ry="2" fill="#000" opacity=".3" />
        <circle cx="0" cy="1.3" r="6" fill={D[2]} />
        <circle cx="0" cy="0" r="6" fill="url(#la-tok-2)" stroke="#fffaf0" strokeWidth="1.2" />
        <circle cx="0" cy="0" r="2.8" fill="none" stroke="#fffaf0" strokeOpacity=".5" strokeWidth=".8" />
        <ellipse cx="-2" cy="-2.6" rx="2" ry="1.1" fill="#fff" opacity=".6" transform="rotate(-28 -2 -2.6)" />
      </g>
    </svg>
  );
}
