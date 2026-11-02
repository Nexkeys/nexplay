import type { Choice } from '~/engine/games/rps';

// Hand drawn hands for Rock Paper Scissors, pointing up like the classic glyphs so the board can
// turn them to face each other. Drawn on a 100 by 100 grid; sized with the surrounding font-size.

const SKIN = 'url(#rps-skin)';
const LINE = '#6b3f22';
const CUFF = '#e8b450';

const Defs = () => (
  <defs>
    <linearGradient id="rps-skin" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#f1bf8f" />
      <stop offset=".55" stopColor="#d9945f" />
      <stop offset="1" stopColor="#b8723f" />
    </linearGradient>
  </defs>
);

/** Rounded finger from (x, y) going up, `h` long. */
const Finger = ({ x, y, w = 11, h, r = 0, cx, cy }: { x: number; y: number; w?: number; h: number; r?: number; cx?: number; cy?: number }) => (
  <rect x={x} y={y} width={w} height={h} rx={w / 2} fill={SKIN} stroke={LINE} strokeWidth="2.4" transform={r ? `rotate(${r} ${cx ?? x + w / 2} ${cy ?? y + h})` : undefined} />
);

const Cuff = () => (
  <g>
    <rect x="33" y="82" width="34" height="14" rx="4" fill={CUFF} stroke="#9a6a1c" strokeWidth="2.4" />
    <path d="M38 88h24" stroke="#fff3d4" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
  </g>
);

/** A closed fist seen from the front: four curled knuckles over the palm, thumb across. */
function Fist({ knuckles = 4 }: { knuckles?: number }) {
  const xs = [26, 38, 50, 62].slice(4 - knuckles);
  return (
    <g>
      <rect x="25" y="40" width="50" height="46" rx="16" fill={SKIN} stroke={LINE} strokeWidth="2.4" />
      {xs.map((x) => (
        <rect key={x} x={x} y="32" width="12.5" height="24" rx="6.25" fill={SKIN} stroke={LINE} strokeWidth="2.4" />
      ))}
      {/* thumb tucked across the front */}
      <rect x="22" y="55" width="38" height="13" rx="6.5" fill={SKIN} stroke={LINE} strokeWidth="2.4" transform="rotate(-8 41 61)" />
      <path d="M30 74c8 4 26 4 38 0" fill="none" stroke={LINE} strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Rock() {
  return (
    <g>
      <Cuff />
      <Fist />
      <ellipse cx="40" cy="38" rx="5" ry="2.4" fill="#fff" opacity=".35" />
    </g>
  );
}

function Paper() {
  return (
    <g>
      <Cuff />
      {/* thumb out to the side */}
      <Finger x={15} y={44} w={12} h={30} r={-38} cx={27} cy={76} />
      <Finger x={27} y={14} h={52} />
      <Finger x={38.5} y={6} h={60} />
      <Finger x={50} y={9} h={57} />
      <Finger x={61.5} y={19} w={10.5} h={48} />
      <rect x="26" y="44" width="47" height="42" rx="15" fill={SKIN} stroke={LINE} strokeWidth="2.4" />
      {/* cover the finger bases so the palm reads as one shape */}
      <rect x="28.4" y="44" width="42" height="10" fill={SKIN} />
      <path d="M36 66c6 5 18 5 26 0" fill="none" stroke={LINE} strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="44" cy="12" rx="2.6" ry="1.6" fill="#fff" opacity=".4" />
    </g>
  );
}

function Scissors() {
  return (
    <g>
      <Cuff />
      {/* index and middle fingers in a V */}
      <Finger x={30} y={8} h={50} r={-14} cx={36} cy={58} />
      <Finger x={46} y={6} h={52} r={12} cx={52} cy={58} />
      <Fist knuckles={2} />
      <ellipse cx="27" cy="12" rx="2.4" ry="1.5" fill="#fff" opacity=".4" transform="rotate(-14 27 12)" />
    </g>
  );
}

function Lizard() {
  // A hand making a lizard's head: fingers together on top, thumb below, mouth open.
  return (
    <g>
      <Cuff />
      <path d="M30 86 C24 60 28 34 44 16 C52 8 64 8 70 14 C74 18 72 24 66 26 L50 34 C58 38 66 44 66 52 C66 58 60 60 54 56 L44 50 C42 62 46 74 58 86 Z" fill={SKIN} stroke={LINE} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M50 34 L44 50" stroke={LINE} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M56 16c4 0 8 2 10 5" fill="none" stroke={LINE} strokeOpacity=".4" strokeWidth="2" strokeLinecap="round" />
      <circle cx="56" cy="20" r="2.4" fill={LINE} />
      <circle cx="56.8" cy="19.2" r=".8" fill="#fff" />
    </g>
  );
}

function Spock() {
  // The Vulcan salute: fingers in two pairs with a gap, thumb out.
  return (
    <g>
      <Cuff />
      <Finger x={14} y={46} w={12} h={28} r={-36} cx={26} cy={76} />
      <Finger x={25} y={14} h={52} r={-10} cx={30} cy={66} />
      <Finger x={35.5} y={8} h={58} r={-10} cx={41} cy={66} />
      <Finger x={53} y={9} h={57} r={10} cx={58} cy={66} />
      <Finger x={63.5} y={17} w={10.5} h={49} r={10} cx={69} cy={66} />
      <rect x="26" y="44" width="47" height="42" rx="15" fill={SKIN} stroke={LINE} strokeWidth="2.4" />
      <rect x="28.4" y="44" width="42" height="10" fill={SKIN} />
      <path d="M36 66c6 5 18 5 26 0" fill="none" stroke={LINE} strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Hourglass() {
  return (
    <g fill="none" stroke="#d9ccb2" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M28 14h44M28 86h44" />
      <path d="M34 14c0 20 32 22 32 36S34 66 34 86M66 14c0 20-32 22-32 36s32 16 32 36" />
      <path d="M42 80h16l-8-12z" fill="#e8b450" stroke="none" />
    </g>
  );
}

export const HAND_SHAPES: Record<Choice, () => React.ReactElement> = { rock: Rock, paper: Paper, scissors: Scissors, lizard: Lizard, spock: Spock };

/** A hand sized by font-size (1em square). `choice` null draws an hourglass: no pick. */
export function Hand({ choice, label }: { choice: Choice | null; label?: string }) {
  const Shape = choice ? HAND_SHAPES[choice] : Hourglass;
  return (
    <svg className="rps-svg" width="1em" height="1em" viewBox="0 0 100 100" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <Defs />
      <Shape />
    </svg>
  );
}

/** The same shapes for use inside another SVG, such as the game card art. */
export function HandInSvg({ choice, x, y, size, rotate = 0 }: { choice: Choice; x: number; y: number; size: number; rotate?: number }) {
  const Shape = HAND_SHAPES[choice];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate} ${size / 2} ${size / 2}) scale(${size / 100})`}>
      <Defs />
      <Shape />
    </g>
  );
}
