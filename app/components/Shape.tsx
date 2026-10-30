import type { Shape as ShapeName } from '~/engine/games/whot';

/** The five Whot shapes, drawn on a 100 by 100 grid. */
export function Shape({ shape, size = 40, colour = 'currentColor' }: { shape: ShapeName; size?: number; colour?: string }) {
  const body = {
    circle: <circle cx="50" cy="50" r="34" />,
    triangle: <polygon points="50,14 88,84 12,84" />,
    cross: <path d="M37 12h26v25h25v26H63v25H37V63H12V37h25z" />,
    square: <rect x="17" y="17" width="66" height="66" rx="3" />,
    star: <polygon points="50,8 61,38 93,38 67,57 77,88 50,69 23,88 33,57 7,38 39,38" />,
    whot: null
  }[shape];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill={colour} aria-hidden="true">
      {body}
    </svg>
  );
}
