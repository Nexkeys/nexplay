const HEART = 'M12 21.2s-7.6-4.7-9.7-9.4C.8 8.4 2.8 4.4 6.6 4c2.1-.2 3.9.9 5.4 2.8C13.5 4.9 15.3 3.8 17.4 4c3.8.4 5.8 4.4 4.3 7.8-2.1 4.7-9.7 9.4-9.7 9.4z';

/** Two answer cards, one from each partner, joined by a heart: the moment you find out you match. */
export function InSyncArt({ size = 150 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 150 90" aria-hidden="true">
      {/* her card */}
      <g transform="translate(18 18) rotate(-11 26 32)">
        <rect width="52" height="64" rx="11" fill="#c2345b" />
        <rect width="52" height="58" rx="11" fill="#ff5a7a" />
        <path d={HEART} transform="translate(13 9) scale(1.1)" fill="#fffaf0" />
        <rect x="10" y="40" width="32" height="4" rx="2" fill="#fffaf0" opacity=".75" />
        <rect x="15" y="48" width="22" height="4" rx="2" fill="#fffaf0" opacity=".45" />
      </g>
      {/* his card */}
      <g transform="translate(80 14) rotate(10 26 32)">
        <rect width="52" height="64" rx="11" fill="#e3c9a8" />
        <rect width="52" height="58" rx="11" fill="#fffaf0" />
        <path d={HEART} transform="translate(13 9) scale(1.1)" fill="#c2345b" />
        <rect x="10" y="40" width="32" height="4" rx="2" fill="#c2345b" opacity=".55" />
        <rect x="15" y="48" width="22" height="4" rx="2" fill="#c2345b" opacity=".3" />
      </g>
      {/* the match */}
      <circle cx="75" cy="50" r="17" fill="#17110c" />
      <path d={HEART} transform="translate(62.5 37.5) scale(1.04)" fill="#e3a63a" />
      <path d="M68 50.5l4.4 4.2 8.4-8.6" fill="none" stroke="#17110c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* sparkles */}
      <path d="M75 8l1.6 4.4L81 14l-4.4 1.6L75 20l-1.6-4.4L69 14l4.4-1.6z" fill="#e3a63a" />
      <circle cx="58" cy="80" r="2.4" fill="#ff5a7a" />
      <circle cx="96" cy="82" r="1.8" fill="#e3a63a" />
      <path d={HEART} transform="translate(130 4) scale(.55)" fill="#ff5a7a" />
      <path d={HEART} transform="translate(6 66) scale(.45)" fill="#e3a63a" />
    </svg>
  );
}
