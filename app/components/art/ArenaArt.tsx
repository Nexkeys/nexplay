import { useId } from 'react';
import type { Action, ClassId } from '~/engine/games/arena';

// Hand drawn, flat illustrations for Arena: class portraits, action and status icons, hit effects
// and the catalog card. Everything is inline SVG so it stays sharp on any phone and costs nothing.

export const CLASS_COLOURS: Record<ClassId, { bg: string; deep: string }> = {
  warrior: { bg: '#b5462a', deep: '#7c2b17' },
  mage: { bg: '#5b3fa8', deep: '#38246e' },
  rogue: { bg: '#1f6a52', deep: '#103d2f' },
  cleric: { bg: '#d29a35', deep: '#94661a' }
};

/** Small four point sparkle, used on hats, halos and bursts. */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`;

function Warrior() {
  return (
    <g>
      {/* cape and pauldrons */}
      <path d="M6 64 C8 50 18 45 32 45 C46 45 56 50 58 64 Z" fill="#5e2414" />
      <path d="M11 64 C12 53 20 48 32 48 C44 48 52 53 53 64 Z" fill="#8a96a1" />
      <ellipse cx="15" cy="52" rx="8" ry="5.5" fill="#a9b4be" />
      <ellipse cx="49" cy="52" rx="8" ry="5.5" fill="#a9b4be" />
      <path d="M26 64 L32 52 L38 64 Z" fill="#6f7b86" />
      {/* face */}
      <ellipse cx="32" cy="35" rx="10.5" ry="11.5" fill="#8d5a3b" />
      <path d="M21.5 35 C21.5 47 27 53 32 53 C37 53 42.5 47 42.5 35 C40 40.5 36.5 42 32 42 C27.5 42 24 40.5 21.5 35 Z" fill="#241510" />
      <path d="M28 43.5 Q32 45.5 36 43.5" stroke="#5a3424" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <rect x="25.5" y="31.5" width="4.2" height="2.4" rx="1.2" fill="#1a0f0a" />
      <rect x="34.3" y="31.5" width="4.2" height="2.4" rx="1.2" fill="#1a0f0a" />
      {/* helmet with horns */}
      <path d="M19 23 C11 21 7.5 14 8.5 7 C11.5 13 15.5 16.5 21.5 17.5 Z" fill="#f1e3c4" />
      <path d="M45 23 C53 21 56.5 14 55.5 7 C52.5 13 48.5 16.5 42.5 17.5 Z" fill="#f1e3c4" />
      <path d="M18 31 C18 18 24 10.5 32 10.5 C40 10.5 46 18 46 31 L41.5 31 L41.5 28.5 L22.5 28.5 L22.5 31 Z" fill="#b3bdc6" />
      <path d="M32 10.5 C36 10.5 39.5 12.5 42 16 C38 14.5 35 14.2 32 14.2 Z" fill="#dfe5ea" />
      <rect x="18" y="26.5" width="28" height="3" fill="#7f8a95" />
      <rect x="30.4" y="27" width="3.2" height="11" rx="1.2" fill="#8b96a0" />
      <circle cx="21" cy="28" r="1" fill="#dfe5ea" />
      <circle cx="43" cy="28" r="1" fill="#dfe5ea" />
    </g>
  );
}

function Mage() {
  return (
    <g>
      <path d="M8 64 C10 51 20 46 32 46 C44 46 54 51 56 64 Z" fill="#2d1d63" />
      <path d="M24 64 L32 49 L40 64 Z" fill="#e8b450" opacity=".9" />
      {/* face and beard */}
      <ellipse cx="32" cy="36" rx="10" ry="11" fill="#c68a5e" />
      <path d="M21.5 37 C21.5 50 27 58 32 60.5 C37 58 42.5 50 42.5 37 C38.5 42.5 25.5 42.5 21.5 37 Z" fill="#ece6f5" />
      <path d="M26 41 Q32 38.5 38 41 Q35 43 32 42.5 Q29 43 26 41Z" fill="#d9d1e8" />
      <path d="M25 31.2 Q27.5 29.8 30 31.2" stroke="#ece6f5" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M34 31.2 Q36.5 29.8 39 31.2" stroke="#ece6f5" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="27.5" cy="34" r="1.5" fill="#1f1236" />
      <circle cx="36.5" cy="34" r="1.5" fill="#1f1236" />
      {/* hat */}
      <ellipse cx="32" cy="28" rx="19" ry="4.2" fill="#24165a" />
      <path d="M19.5 28 C23.5 20 27 9 41 3 C36.5 11 38.5 20 44.5 28 Z" fill="#43309a" />
      <path d="M41 3 C36.5 11 38.5 20 44.5 28 L40 28 C35 21 34 12 41 3Z" fill="#35257f" />
      <path d="M20.5 25.6 C28 27.4 36 27.4 43.5 25.6 L44.3 28 C36 29.8 28 29.8 19.7 28 Z" fill="#e8b450" />
      <path d={sparkle(29, 17, 2.6)} fill="#ffd98c" />
      <path d={sparkle(35.5, 10.5, 1.8)} fill="#ffd98c" />
      {/* flame orb */}
      <circle cx="51" cy="51" r="7" fill="#ff6a3d" opacity=".35" />
      <path d="M51 43.5 C52.5 47 56 48 56 52 A5 5 0 0 1 46 52 C46 49.5 48 48.5 48.5 46.5 C49.5 47.8 50 48.8 50 50 C51.2 48.4 51.6 46.4 51 43.5 Z" fill="#ff8a3d" />
      <path d="M51 48 C51.8 50 53.4 50.6 53.4 52.6 A2.4 2.4 0 0 1 48.6 52.6 C48.6 51.2 50 50.6 51 48 Z" fill="#ffd27a" />
    </g>
  );
}

function Rogue() {
  return (
    <g>
      <path d="M12 64 C12 39 17 13 32 9 C47 13 52 39 52 64 Z" fill="#26342d" />
      <path d="M32 9 C42 12 48 26 50.5 44 C45 30 39 21 32 18.5 Z" fill="#1b2621" />
      <path d="M19.5 54 C19.5 35 24 22.5 32 20.5 C40 22.5 44.5 35 44.5 54 Z" fill="#0f1713" />
      <ellipse cx="32" cy="36" rx="8.6" ry="10" fill="#6e4630" />
      <path d="M23.5 36.5 Q32 41 40.5 36.5 L40.2 45 Q32 50.5 23.8 45 Z" fill="#33433b" />
      <path d="M23.8 40 Q32 44 40.3 40" stroke="#26342d" strokeWidth="1" fill="none" />
      <path d="M25.2 32.8 Q27.8 30.9 30.4 32.8 Q27.8 33.9 25.2 32.8Z" fill="#ffd98c" />
      <path d="M33.6 32.8 Q36.2 30.9 38.8 32.8 Q36.2 33.9 33.6 32.8Z" fill="#ffd98c" />
      <path d="M24.5 30 L30.5 31.2" stroke="#1b120c" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M39.5 30 L33.5 31.2" stroke="#1b120c" strokeWidth="1.4" strokeLinecap="round" />
      {/* dagger */}
      <path d="M45 58.5 L58.5 41 L60 42.4 L47.4 60.5 Z" fill="#e6ecef" />
      <path d="M58.5 41 L60 42.4 L52 54 Z" fill="#b9c4ca" />
      <path d="M41.8 55.2 L48.6 61.6" stroke="#e8b450" strokeWidth="3" strokeLinecap="round" />
      <circle cx="43" cy="61.5" r="2" fill="#e8b450" />
    </g>
  );
}

function Cleric() {
  return (
    <g>
      <circle cx="32" cy="22" r="15.5" fill="none" stroke="#fff3c4" strokeWidth="2.4" opacity=".95" />
      <path d={sparkle(14.5, 13, 2.4)} fill="#fff3c4" />
      <path d={sparkle(50, 11, 1.8)} fill="#fff3c4" />
      <path d="M14 64 C14 41 19.5 17.5 32 14.5 C44.5 17.5 50 41 50 64 Z" fill="#f4ecd8" />
      <path d="M32 14.5 C41 17 46.5 33 48.5 50 C43 33 38 24 32 22 Z" fill="#ddd2b8" />
      <path d="M20.5 51 C20.5 34.5 25 25 32 23.5 C39 25 43.5 34.5 43.5 51 Z" fill="#5b3a22" />
      <ellipse cx="32" cy="37" rx="9" ry="10.5" fill="#a86d47" />
      <path d="M26.3 35.6 Q28.3 37.4 30.3 35.6" stroke="#2e1a0e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M33.7 35.6 Q35.7 37.4 37.7 35.6" stroke="#2e1a0e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M29.3 42 Q32 44 34.7 42" stroke="#5a2e1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M21 64 L21 56 Q32 50 43 56 L43 64 Z" fill="#e8dcc0" />
      <path d="M30 51.5 h4 v4 h4 v4 h-4 v4.5 h-4 v-4.5 h-4 v-4 h4 z" fill="#e8b450" />
    </g>
  );
}

const FACES: Record<ClassId, () => React.JSX.Element> = { warrior: Warrior, mage: Mage, rogue: Rogue, cleric: Cleric };

/** A round class portrait. `ring` adds the player's colour around it. */
export function ClassPortrait({ cls, size = 48, ring }: { cls: ClassId; size?: number; ring?: string }) {
  return (
    <svg className="ar-portrait" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <ClassPortraitInner cls={cls} />
      {ring && <circle cx="32" cy="32" r="30.5" fill="none" stroke={ring} strokeWidth="3" />}
    </svg>
  );
}

/** An empty seat silhouette while someone is still choosing. */
export function UnknownPortrait({ size = 48 }: { size?: number }) {
  return (
    <svg className="ar-portrait" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="#2a1f18" />
      <path d="M12 64 C13 50 21 45 32 45 C43 45 51 50 52 64 Z" fill="#4a3a2d" />
      <circle cx="32" cy="30" r="11" fill="#4a3a2d" />
      <path d="M28.5 27 Q28.5 23.5 32 23.5 Q35.5 23.5 35.5 27 Q35.5 29.5 32 30.5 L32 32.5" stroke="#9a8b77" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="36" r="1.5" fill="#9a8b77" />
    </svg>
  );
}

const SPECIAL_ICON: Record<ClassId, React.JSX.Element> = {
  warrior: (
    <g>
      <path d="M5 21 L16 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M13.2 3.2 C18.8 2.6 22.2 6.6 21.4 12.2 C19 10.6 16.6 10.2 14.4 9.6 L12.4 7.8 C12.8 6.2 12.9 4.8 13.2 3.2 Z" fill="currentColor" />
    </g>
  ),
  mage: (
    <path d="M12 2.5 C13 6.5 18.5 8.6 18.5 14.2 A6.5 6.5 0 0 1 5.5 14.2 C5.5 10.6 8.2 9 8.8 6.4 C10.4 8 11 9.6 11 11.2 C12.6 9.2 12.9 6.1 12 2.5 Z M12 12.5 C12.6 14 14.4 14.7 14.4 16.6 A2.4 2.4 0 0 1 9.6 16.6 C9.6 15.1 11 14.4 12 12.5 Z" fill="currentColor" fillRule="evenodd" />
  ),
  rogue: (
    <g>
      <path d="M20.5 3 L10.4 14.6 L12.6 16.6 L21.6 4.2 Z" fill="currentColor" />
      <path d="M7.4 12.6 L14.2 19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9.6 17.4 L4.6 21.6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </g>
  ),
  cleric: (
    <g>
      <path d="M10 3.5 h4 v6.5 h6.5 v4 h-6.5 v6.5 h-4 v-6.5 h-6.5 v-4 h6.5 z" fill="currentColor" />
      <path d={sparkle(19.5, 4.5, 2.2)} fill="currentColor" />
    </g>
  )
};

/** Icons for the four actions. Special draws the class's own move. */
export function ActionIcon({ action, cls, size = 24 }: { action: Action | 'stunned'; cls?: ClassId | null; size?: number }) {
  return (
    <svg className="ar-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {action === 'strike' && (
        <g>
          <path d="M20.5 3.5 L9.5 14.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M20.5 3.5 L16.6 4.2 L19.8 7.4 Z" fill="currentColor" />
          <path d="M6.2 11.6 L12.4 17.8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M8.6 15.4 L4.4 19.6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="3.9" cy="20.1" r="1.6" fill="currentColor" />
        </g>
      )}
      {action === 'block' && (
        <g>
          <path d="M12 2.5 L19.8 5.6 V11.4 C19.8 16.2 16.5 19.7 12 21.5 C7.5 19.7 4.2 16.2 4.2 11.4 V5.6 Z" fill="currentColor" />
          <path d="M12 5.4 L17 7.4 V11.4 C17 14.6 15 17.2 12 18.6 Z" fill="#000" opacity=".22" />
        </g>
      )}
      {action === 'charge' && <path d="M13.8 2 L4.8 13.6 H11 L9.4 22 L19.2 9.8 H12.9 Z" fill="currentColor" />}
      {action === 'special' && SPECIAL_ICON[cls ?? 'warrior']}
      {action === 'stunned' && <StunGlyph />}
    </svg>
  );
}

function StunGlyph() {
  return (
    <g>
      <ellipse cx="12" cy="13" rx="8.5" ry="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d={sparkle(5.5, 9.5, 3)} fill="currentColor" />
      <path d={sparkle(16.5, 7.5, 2.6)} fill="currentColor" />
      <path d={sparkle(14, 16.6, 2.2)} fill="currentColor" />
    </g>
  );
}

/** Small status badges: burning, stunned, tired guard and energy. */
export function StatusIcon({ kind, size = 16 }: { kind: 'burn' | 'stun' | 'tired' | 'broken' | 'energy'; size?: number }) {
  return (
    <svg className={`ar-status s-${kind}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {kind === 'burn' && (
        <g>
          <path d="M12 2 C13.2 6.4 19 8.6 19 14.6 A7 7 0 0 1 5 14.6 C5 10.8 7.8 9.1 8.5 6.4 C10.2 8.1 10.8 9.8 10.8 11.4 C12.6 9.3 12.9 6 12 2 Z" fill="#ff7a3d" />
          <path d="M12 11.5 C12.9 13.6 15.2 14.4 15.2 16.8 A3.2 3.2 0 0 1 8.8 16.8 C8.8 14.9 10.6 14.1 12 11.5 Z" fill="#ffd27a" />
        </g>
      )}
      {kind === 'stun' && (
        <g color="#ffd98c">
          <StunGlyph />
        </g>
      )}
      {(kind === 'tired' || kind === 'broken') && (
        <g>
          <path d="M12 2.5 L19.8 5.6 V11.4 C19.8 16.2 16.5 19.7 12 21.5 C7.5 19.7 4.2 16.2 4.2 11.4 V5.6 Z" fill={kind === 'broken' ? '#ff6a4d' : '#9a8b77'} />
          <path d="M12.6 3 L10.6 9 L13.6 11.4 L10.8 16.6 L12.4 21" stroke="#130e0a" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
        </g>
      )}
      {kind === 'energy' && <path d="M13.8 2 L4.8 13.6 H11 L9.4 22 L19.2 9.8 H12.9 Z" fill="#e8b450" />}
    </svg>
  );
}

/** A spiky impact star drawn behind damage numbers. */
export function HitBurst({ size = 56, colour = '#ff6a4d' }: { size?: number; colour?: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const r = i % 2 ? 13 : 23 + (i % 4 === 0 ? 4 : 0);
    pts.push(`${(32 + Math.cos(a) * r).toFixed(1)},${(32 + Math.sin(a) * r).toFixed(1)}`);
  }
  return (
    <svg className="ar-burst" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <polygon points={pts.join(' ')} fill={colour} />
      <circle cx="32" cy="32" r="10" fill="#fff3c4" opacity=".55" />
    </svg>
  );
}

/** Knocked out: a cracked skull stamp over the fighter card. */
export function KoMark({ size = 44 }: { size?: number }) {
  return (
    <svg className="ar-ko" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#130e0a" opacity=".75" />
      <path d="M24 9 C32.5 9 38 14.6 38 21.6 C38 26 35.8 29 33 30.6 V35 H15 V30.6 C12.2 29 10 26 10 21.6 C10 14.6 15.5 9 24 9 Z" fill="#f5ecd9" />
      <ellipse cx="18.2" cy="22.5" rx="3.8" ry="4.2" fill="#130e0a" />
      <ellipse cx="29.8" cy="22.5" rx="3.8" ry="4.2" fill="#130e0a" />
      <path d="M24 26.5 L22 30 H26 Z" fill="#130e0a" />
      <path d="M19 35 V38.5 M24 35 V38.5 M29 35 V38.5" stroke="#f5ecd9" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M25 9.5 L23 14 L26 16.5 L24.4 19" stroke="#130e0a" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

/** Catalog card: a warrior and a mage squaring up across the sand, sparks flying between them. */
export function ArenaArt({ size = 150 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 150 90" aria-hidden="true">
      <ellipse cx="75" cy="76" rx="70" ry="12" fill="#e3a63a" opacity=".35" />
      <ellipse cx="75" cy="76" rx="52" ry="8" fill="#e3a63a" opacity=".35" />
      <g transform="translate(6 12) scale(0.95)">
        <ClassPortraitInner cls="warrior" />
      </g>
      <g transform="translate(83 12) scale(0.95)">
        <ClassPortraitInner cls="mage" />
      </g>
      <g transform="translate(75 40)">
        <polygon points="0,-17 4,-6 15,-9 7,0 15,9 4,6 0,17 -4,6 -15,9 -7,0 -15,-9 -4,-6" fill="#ff5a3c" />
        <polygon points="0,-9 2,-3 8,-4 4,0 8,4 2,3 0,9 -2,3 -8,4 -4,0 -8,-4 -2,-3" fill="#fff3c4" />
      </g>
      <path d={sparkle(62, 20, 3)} fill="#ffd98c" />
      <path d={sparkle(90, 62, 2.4)} fill="#ffd98c" />
    </svg>
  );
}

/** Portrait without its own <svg>, for composing into bigger pictures. */
function ClassPortraitInner({ cls }: { cls: ClassId }) {
  const c = CLASS_COLOURS[cls];
  const Face = FACES[cls];
  const id = `arena-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="32" fill={c.deep} />
      <circle cx="32" cy="30" r="29" fill={c.bg} />
      <circle cx="22" cy="18" r="14" fill="#fff" opacity=".08" />
      <g clipPath={`url(#${id})`}>
        <Face />
      </g>
    </g>
  );
}
