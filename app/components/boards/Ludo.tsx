import { AnimatePresence, motion } from 'motion/react';
import { memo, useEffect, useRef, useState } from 'react';
import { BASE, COLOUR_NAMES, HOME, LAST_TRACK, legalSeeds, mayEnterHome, seedsHome, target, trackSquare, type LudoEvent, type LudoState } from '~/engine/games/ludo';
import { buzz, play } from '~/lib/sound';
import type { StageProps } from '~/lib/stage';
import { firstName, seatOf } from '~/lib/stage';
import { PlayerChip } from '../game/common';
import '~/styles/games/ludo.css';

/* ------------------------------------------------------------------ geometry
 * The board is 15 by 15 cells. Canonically red's base is top left, green top right, yellow bottom
 * right, blue bottom left, and seeds run clockwise. Each colour's quarter is red's quarter turned
 * by a multiple of 90 degrees, so only red's is written out.
 */
type Pt = [number, number];

export const LUDO_COLOURS = ['#e5484d', '#2fa866', '#f0b429', '#3d7bf2'];
const DARK = ['#9e1f2a', '#17663c', '#a86d06', '#1d4cad'];
const LIGHT = ['#ff9a9a', '#8fe3b4', '#ffe08a', '#a9c6ff'];

/** Rotates a point on the board a quarter turn clockwise, q times. */
const rot = (pt: Pt, q: number): Pt => {
  let [x, y] = pt;
  for (let i = 0; i < ((q % 4) + 4) % 4; i++) [x, y] = [15 - y, x];
  return [x, y];
};
/** Red's 13 track cells (top left corner of each cell). */
const QUARTER: Pt[] = [[1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0]];
/** Centres of the 52 track squares, in track order. */
const TRACK_CENTRES: Pt[] = [0, 1, 2, 3].flatMap((q) => QUARTER.map(([x, y]) => rot([x + 0.5, y + 0.5], q)));
const BASE_SPOTS: Pt[] = [[1.95, 1.95], [4.05, 1.95], [1.95, 4.05], [4.05, 4.05]];
const HOME_SPOTS: Pt[] = [[6.42, 6.98], [6.42, 8.02], [6.88, 7.5], [6.42, 7.5]];

/** Centre of a seed on the canonical board. */
function seedCentre(colour: number, progress: number, index: number): Pt {
  if (progress === BASE) return rot(BASE_SPOTS[index], colour);
  if (progress === HOME) return rot(HOME_SPOTS[index], colour);
  if (progress > LAST_TRACK) return rot([progress - LAST_TRACK + 0.5, 7.5], colour);
  return TRACK_CENTRES[trackSquare(colour, progress)!];
}

/** The squares a seed passes through, one per hop. */
function hopPath(from: number, to: number): number[] {
  if (from === BASE) return [to];
  const out: number[] = [];
  const wraps = to < from; // went round again under the capture before home rule
  let cur = from;
  for (let guard = 0; cur !== to && guard < 7; guard++) {
    cur += 1;
    if (wraps && cur > LAST_TRACK) cur -= 52;
    out.push(cur);
  }
  return out;
}

const STACK: Record<number, Pt[]> = {
  2: [[-0.2, -0.08], [0.2, 0.08]],
  3: [[-0.2, -0.16], [0.2, -0.16], [0, 0.2]],
  4: [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]
};

/* ------------------------------------------------------------------ static board */

const STAR = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(3)},${(cy + Math.sin(a) * rr).toFixed(3)}`);
  }
  return pts.join(' ');
};

/** One colour's quarter: base, arm of track, home column, start square, star and centre triangle. */
function Quarter({ c, inPlay, locked }: { c: number; inPlay: boolean; locked: boolean }) {
  const col = LUDO_COLOURS[c];
  const cells: React.ReactNode[] = [];
  for (let x = 0; x < 6; x++) {
    for (let y = 6; y < 9; y++) {
      const coloured = (y === 7 && x > 0) || (y === 6 && x === 1);
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" className="lc" fill={coloured ? `url(#ludo-cell-${c})` : '#fffdf7'} />);
    }
  }
  return (
    <g transform={`rotate(${c * 90} 7.5 7.5)`}>
      {/* base */}
      <g opacity={inPlay ? 1 : 0.5}>
        <rect x="0" y="0" width="6" height="6" fill={`url(#ludo-base-${c})`} />
        <rect x="0.82" y="0.82" width="4.36" height="4.36" rx="0.55" fill="#000" opacity=".18" transform="translate(0 .1)" />
        <rect x="0.82" y="0.82" width="4.36" height="4.36" rx="0.55" fill="#fffaf0" />
        <rect x="0.82" y="0.82" width="4.36" height="4.36" rx="0.55" fill="none" stroke={DARK[c]} strokeOpacity=".25" strokeWidth=".06" />
        {BASE_SPOTS.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y + 0.05} r=".7" fill="#000" opacity=".12" />
            <circle cx={x} cy={y} r=".7" fill={`url(#ludo-spot-${c})`} stroke={col} strokeWidth=".08" />
          </g>
        ))}
      </g>
      {/* track arm with the home column */}
      {cells}
      {/* arrow on the start square, pointing the way round */}
      <path d="M1.2 6.5 h.56 M1.52 6.28 l.24 .22 -.24 .22" fill="none" stroke="#fffaf0" strokeWidth=".1" strokeLinejoin="round" strokeLinecap="round" />
      {/* arrow into the home column */}
      <path d="M.2 7.5 h.56 M.52 7.28 l.24 .22 -.24 .22" fill="none" stroke={col} strokeWidth=".1" strokeLinecap="round" strokeLinejoin="round" />
      {/* centre triangle */}
      <polygon points="6,6 6,9 7.5,7.5" fill={`url(#ludo-tri-${c})`} />
      {locked && (
        <g transform="translate(3.5 7.5)" opacity=".9">
          <path d="M-.17 -.05 v-.13 a.17 .17 0 0 1 .34 0 v.13" fill="none" stroke="#fffaf0" strokeWidth=".07" />
          <rect x="-.24" y="-.06" width=".48" height=".36" rx=".07" fill="#fffaf0" />
          <circle cx="0" cy=".1" r=".05" fill={DARK[c]} />
        </g>
      )}
    </g>
  );
}

const BoardArt = memo(function BoardArt({ q, turn, inPlay, locked }: { q: number; turn: number; inPlay: string; locked: string }) {
  return (
    <svg className="ludo-svg" viewBox="0 0 15 15" aria-hidden="true">
      <defs>
        {LUDO_COLOURS.map((col, c) => (
          <g key={c}>
            <linearGradient id={`ludo-base-${c}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={LIGHT[c]} stopOpacity=".55" />
              <stop offset=".25" stopColor={col} />
              <stop offset="1" stopColor={DARK[c]} />
            </linearGradient>
            <linearGradient id={`ludo-cell-${c}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={col} />
              <stop offset="1" stopColor={DARK[c]} stopOpacity=".85" />
            </linearGradient>
            <radialGradient id={`ludo-spot-${c}`} cx=".5" cy=".4" r=".6">
              <stop offset="0" stopColor="#fffaf0" />
              <stop offset=".75" stopColor={LIGHT[c]} stopOpacity=".55" />
              <stop offset="1" stopColor={col} stopOpacity=".5" />
            </radialGradient>
            <linearGradient id={`ludo-tri-${c}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={col} />
              <stop offset="1" stopColor={DARK[c]} />
            </linearGradient>
            {/* seed token shading, used by the seeds drawn over the board */}
            <radialGradient id={`ludo-tok-${c}`} cx=".36" cy=".3" r=".75">
              <stop offset="0" stopColor={LIGHT[c]} />
              <stop offset=".45" stopColor={col} />
              <stop offset="1" stopColor={DARK[c]} />
            </radialGradient>
          </g>
        ))}
        <radialGradient id="ludo-centre" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#f3e8d2" />
        </radialGradient>
      </defs>
      <rect width="15" height="15" fill="#fbf4e6" />
      <g transform={`rotate(${q * 90} 7.5 7.5)`}>
        {[0, 1, 2, 3].map((c) => (
          <Quarter key={c} c={c} inPlay={inPlay.includes(String(c))} locked={locked.includes(String(c))} />
        ))}
        {/* star safe squares, 8 squares past each start. Drawn after every quarter, because each
            star sits on the next colour's arm and would be painted over by its cells. */}
        {[0, 1, 2, 3].map((c) => (
          <polygon key={c} transform={`rotate(${c * 90} 7.5 7.5)`} points={STAR(6.5, 2.5, 0.36)} fill="#c9b897" stroke="#a38d64" strokeWidth=".04" strokeLinejoin="round" />
        ))}
      </g>
      {/* centre medallion and the active player's glow */}
      <polygon points="6,6 9,6 9,9 6,9" fill="none" stroke="#3a2618" strokeOpacity=".35" strokeWidth=".05" />
      <path d="M6 6 L9 9 M9 6 L6 9" stroke="#fffaf0" strokeOpacity=".55" strokeWidth=".05" />
      <circle cx="7.5" cy="7.5" r=".38" fill="url(#ludo-centre)" stroke={LUDO_COLOURS[turn] ?? '#e8b450'} strokeWidth=".09" className="ludo-hub" />
      <polygon points={STAR(7.5, 7.5, 0.22)} fill={LUDO_COLOURS[turn] ?? '#e8b450'} />
      <rect x=".02" y=".02" width="14.96" height="14.96" fill="none" stroke="#3a2618" strokeOpacity=".35" strokeWidth=".06" />
    </svg>
  );
});

/* ------------------------------------------------------------------ pieces */

/** A seed seen from above: a glossy domed token with a white rim and a soft shadow. */
function Token({ c }: { c: number }) {
  return (
    <svg viewBox="0 0 40 40" className="tok" aria-hidden="true">
      <ellipse cx="20" cy="32.5" rx="12.5" ry="4.2" fill="#000" opacity=".32" />
      <circle cx="20" cy="22" r="14" fill={DARK[c]} />
      <circle cx="20" cy="19" r="14" fill={`url(#ludo-tok-${c})`} />
      <circle cx="20" cy="19" r="13" fill="none" stroke="#fffaf0" strokeWidth="2.4" opacity=".92" />
      <circle cx="20" cy="19.6" r="6.6" fill={DARK[c]} opacity=".45" />
      <circle cx="20" cy="19" r="6.4" fill={`url(#ludo-tok-${c})`} />
      <ellipse cx="15" cy="12.6" rx="5.2" ry="2.8" transform="rotate(-28 15 12.6)" fill="#fff" opacity=".55" />
      <circle cx="17.6" cy="16.8" r="1.6" fill="#fff" opacity=".7" />
    </svg>
  );
}

const PIPS: Record<number, number[]> = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

/** An ivory die with real pips. */
function DieFace({ n }: { n: number }) {
  return (
    <svg viewBox="0 0 64 64" className="die-svg" aria-hidden="true">
      <defs>
        <linearGradient id="ludo-die" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffdf6" />
          <stop offset="1" stopColor="#e9dcc0" />
        </linearGradient>
        <radialGradient id="ludo-pip" cx=".4" cy=".35" r=".7">
          <stop offset="0" stopColor="#4a3424" />
          <stop offset="1" stopColor="#140d08" />
        </radialGradient>
      </defs>
      <rect x="3" y="6" width="58" height="56" rx="14" fill="#b9a27a" />
      <rect x="3" y="3" width="58" height="55" rx="14" fill="url(#ludo-die)" />
      <rect x="4.5" y="4.5" width="55" height="52" rx="12.5" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="1.5" />
      {(PIPS[n] ?? PIPS[6]).map((k) => {
        const cx = 17 + (k % 3) * 15;
        const cy = 15.5 + Math.floor(k / 3) * 15;
        return (
          <g key={k}>
            <circle cx={cx} cy={cy + 0.8} r="5.4" fill="#fff" opacity=".7" />
            <circle cx={cx} cy={cy} r="5.2" fill={n === 1 ? '#c8202f' : 'url(#ludo-pip)'} />
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ playback
 * Every update carries the event that made it. Events are replayed in order on a copy of the seeds:
 * the dice tumbles, the seed hops square by square, captured seeds fly home. If an event is missed
 * (a slow connection skipping updates) the board simply snaps to the latest state.
 */
interface Playback {
  shown: number[][];
  face: number;
  rolling: boolean;
  busy: boolean;
  current: LudoEvent | null;
  hop: { p: number; s: number; k: number } | null;
  knocked: string[];
  burst: { at: Pt; k: number } | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function usePlayback(view: LudoState) {
  const [pb, setPb] = useState<Playback>(() => ({
    shown: view.seeds,
    face: view.dice || 6,
    rolling: false,
    busy: false,
    current: null,
    hop: null,
    knocked: [],
    burst: null
  }));
  const set = (patch: Partial<Playback>) => alive.current && setPb((p) => ({ ...p, ...patch }));
  const queue = useRef<LudoEvent[]>([]);
  const running = useRef(false);
  const alive = useRef(true);
  const lastN = useRef(view.last?.n ?? 0);
  const latest = useRef(view);
  latest.current = view;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const snap = () => set({ shown: latest.current.seeds, face: latest.current.dice || 6, busy: false, rolling: false, hop: null, knocked: [], current: latest.current.last });

  async function playEvent(e: LudoEvent, fast: boolean) {
    const colour = latest.current.colours[e.p];
    set({ current: e });
    if (e.rolled) {
      set({ rolling: true });
      play('deal');
      await sleep(fast ? 280 : 560);
      set({ rolling: false, face: e.roll });
      play('tap');
      await sleep(fast ? 80 : e.seed >= 0 ? 220 : 380);
    }
    if (e.seed >= 0) {
      const path = hopPath(e.from, e.to);
      for (let k = 0; k < path.length && alive.current; k++) {
        setPb((pb) => {
          const shown = pb.shown.map((s) => [...s]);
          shown[e.p][e.seed] = path[k];
          return { ...pb, shown, hop: { p: e.p, s: e.seed, k: k + 1 } };
        });
        play('seed');
        await sleep(fast ? 90 : 165);
      }
      if (e.hit.length) {
        const at = seedCentre(colour, e.to, e.seed);
        setPb((pb) => {
          const shown = pb.shown.map((s) => [...s]);
          for (const [q, i] of e.hit) shown[q][i] = BASE;
          return { ...pb, shown, knocked: e.hit.map(([q, i]) => `${q}-${i}`), burst: { at, k: e.n } };
        });
        play('capture');
        buzz([20, 40, 30]);
        await sleep(fast ? 350 : 720);
        set({ knocked: [], burst: null });
      } else if (e.to === HOME) {
        play('correct');
        await sleep(fast ? 120 : 300);
      }
    }
    set({ hop: null });
  }

  async function pump() {
    if (running.current) return;
    running.current = true;
    set({ busy: true });
    while (queue.current.length && alive.current) {
      const e = queue.current.shift()!;
      await playEvent(e, queue.current.length > 0);
    }
    running.current = false;
    snap();
  }

  useEffect(() => {
    const e = view.last;
    if (!e || e.n < lastN.current) {
      // A new game, or a resumed one.
      lastN.current = e?.n ?? 0;
      queue.current = [];
      if (!running.current) snap();
      return;
    }
    if (e.n === lastN.current) {
      if (!running.current) snap();
      return;
    }
    if (e.n === lastN.current + 1) queue.current.push(e);
    else queue.current = []; // missed something: catch up in one go
    lastN.current = e.n;
    if (queue.current.length) pump();
    else if (!running.current) snap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  return pb;
}

/* ------------------------------------------------------------------ the board */

export default function LudoBoard({ view, me, seats, actors, send, turnDeadline, turnSeconds, now, result }: StageProps<LudoState>) {
  const s = view;
  const pb = usePlayback(s);
  const mine = me ? s.players.indexOf(me) : -1;
  const myColour = s.colours[mine >= 0 ? mine : 0];
  // Turn the board so the viewer's base sits bottom left.
  const q = (3 - myColour + 4) % 4;
  const view2 = (pt: Pt) => rot(pt, q);

  const [pending, setPending] = useState(false);
  const [face, setFace] = useState(pb.face);
  const rolling = pb.rolling || pending;
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(false), 2500);
    return () => clearTimeout(t);
  }, [pending]);
  useEffect(() => {
    if (pb.current?.rolled) setPending(false);
  }, [pb.current]);
  // Flicker random faces while the dice tumbles.
  useEffect(() => {
    if (!rolling) {
      setFace(pb.face);
      return;
    }
    const id = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 70);
    return () => clearInterval(id);
  }, [rolling, pb.face]);

  const idle = !pb.busy && !rolling && !result && !s.over;
  const myTurn = mine >= 0 && actors.includes(me!) && s.turn === mine;
  const canRoll = idle && myTurn && s.phase === 'roll';
  const legal = idle && myTurn && s.phase === 'move' ? legalSeeds(s, mine, s.dice) : [];

  const roll = () => {
    if (!canRoll) return;
    play('tap');
    buzz();
    setPending(true);
    send({ kind: 'roll' });
  };
  const moveSeed = (seed: number) => {
    play('tap');
    buzz();
    send({ kind: 'move', seed });
  };

  // Where every seed is drawn, stacked seeds fanned out a little.
  const seeds: { p: number; i: number; c: number; at: Pt; scale: number }[] = [];
  const groups = new Map<string, number[]>();
  s.players.forEach((_, p) => {
    const c = s.colours[p];
    (pb.shown[p] ?? []).forEach((progress, i) => {
      const at = seedCentre(c, progress, i);
      const scale = progress === HOME ? 0.52 : progress === BASE ? 1.12 : 1;
      const idx = seeds.push({ p, i, c, at, scale }) - 1;
      if (progress !== BASE && progress !== HOME) {
        const key = `${at[0]},${at[1]}`;
        groups.set(key, [...(groups.get(key) ?? []), idx]);
      }
    });
  });
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const offs = STACK[Math.min(members.length, 4)];
    members.forEach((idx, k) => {
      const [dx, dy] = offs[k % offs.length];
      const extra = k >= 4 ? 0.08 * Math.floor(k / 4) : 0;
      seeds[idx].at = [seeds[idx].at[0] + dx + extra, seeds[idx].at[1] + dy - extra];
      seeds[idx].scale = members.length === 2 ? 0.74 : 0.62;
    });
  }

  // Faint rings where your movable seeds would land.
  const targets: Pt[] = legal.map((i) => seedCentre(s.colours[mine], target(s, mine, s.seeds[mine][i], s.dice)!, i));

  const inPlay = s.colours.join('');
  const locked = s.rules.captureFirst ? s.colours.filter((_, p) => !mayEnterHome(s, p)).join('') : '';

  // Seats around the board, by the corner their base is shown in.
  const corner = (k: number) => {
    const p = s.colours.findIndex((c) => (c + q) % 4 === k);
    if (p < 0) return <span className="ludo-empty" key={k} />;
    const seat = seatOf(seats, s.players[p]);
    if (!seat) return <span className="ludo-empty" key={k} />;
    const home = seedsHome(s.seeds[p]);
    return (
      <div className={`ludo-seat${s.turn === p && !s.over ? ' on' : ''}`} key={k} style={{ ['--pc' as string]: LUDO_COLOURS[s.colours[p]] }}>
        <PlayerChip
          seat={seat}
          me={p === mine}
          align={k === 1 || k === 2 ? 'right' : 'left'}
          colour={LUDO_COLOURS[s.colours[p]]}
          active={actors.includes(s.players[p])}
          deadline={turnDeadline}
          total={turnSeconds}
          now={now}
          sub={<HomeDots c={s.colours[p]} n={home} />}
        />
      </div>
    );
  };

  const who = (p: number) => (p === mine ? 'You' : firstName(seatOf(seats, s.players[p])?.name ?? COLOUR_NAMES[s.colours[p]]));
  const e = pb.busy ? pb.current : s.last;
  let status = '';
  if (result) status = result.summary;
  else if (rolling) {
    const p = pb.busy && pb.current ? pb.current.p : s.turn;
    status = `${who(p)} ${p === mine ? 'are' : 'is'} rolling…`;
  } else if (pb.busy && e) status = `${who(e.p)} rolled ${e.roll}${e.hit.length ? '. Captured!' : e.to === HOME && e.seed >= 0 ? '. Home!' : '.'}`;
  else {
    const note =
      e && e.next === 'three'
        ? `${who(e.p)} rolled three sixes. `
        : e && e.next === 'pass' && e.seed < 0
          ? `${who(e.p)} rolled ${e.roll}, no move. `
          : '';
    if (myTurn && s.phase === 'roll') status = e && e.p === mine && e.next === 'again' ? (e.hit.length ? 'Captured! Roll again.' : e.to === HOME && e.seed >= 0 ? 'Home! Roll again.' : 'Six! Roll again.') : `${note}Your turn. Tap the dice.`;
    else if (myTurn) status = `You rolled ${s.dice}. Tap a glowing seed.`;
    else status = `${note}${who(s.turn)} ${s.phase === 'roll' ? 'to roll' : 'is choosing a seed'}…`;
  }

  const diceOwner = pb.busy && pb.current ? pb.current.p : s.turn;
  const diceColour = LUDO_COLOURS[s.colours[diceOwner]];
  const rules = [s.rules.safeSquares ? 'Safe squares' : 'No safe squares', s.rules.exactHome ? 'exact home' : 'any roll home', s.rules.threeSixes ? 'three sixes ends turn' : null, s.rules.captureFirst ? 'kill before home' : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="board-ludo">
      <div className="ludo-table">
        <div className="ludo-row">
          {corner(0)}
          {corner(1)}
        </div>

        <div className="ludo-frame">
          <div className="ludo-board" style={{ ['--turn' as string]: LUDO_COLOURS[s.colours[s.turn]] }}>
            <BoardArt q={q} turn={s.over ? -1 : s.colours[s.turn]} inPlay={inPlay} locked={locked} />
            <div className="ludo-layer">
              {targets.map((t, k) => {
                const [x, y] = view2(t);
                return <span key={`t${k}`} className="ludo-target" style={{ transform: `translate(${(x - 0.5) * 100}%, ${(y - 0.5) * 100}%)` }} />;
              })}
              {seeds.map(({ p, i, c, at, scale }) => {
                const [x, y] = view2(at);
                const can = p === mine && legal.includes(i);
                const id = `${p}-${i}`;
                const hopping = pb.hop && pb.hop.p === p && pb.hop.s === i;
                const knocked = pb.knocked.includes(id);
                return (
                  <motion.button
                    key={id}
                    className={`ludo-seed${can ? ' can' : ''}${knocked ? ' knocked' : ''}${hopping ? ' moving' : ''}`}
                    disabled={!can}
                    tabIndex={can ? 0 : -1}
                    aria-label={can ? `Move your ${COLOUR_NAMES[c].toLowerCase()} seed` : undefined}
                    aria-hidden={can ? undefined : true}
                    onClick={() => can && moveSeed(i)}
                    initial={false}
                    animate={{ x: `${(x - 0.5) * 100}%`, y: `${(y - 0.5) * 100}%`, scale }}
                    transition={
                      knocked
                        ? { type: 'spring', stiffness: 90, damping: 13, mass: 0.9 }
                        : hopping
                          ? { duration: 0.14, ease: 'easeOut' }
                          : { type: 'spring', stiffness: 320, damping: 30 }
                    }
                    style={{ zIndex: hopping || knocked ? 5 : can ? 4 : 2 }}
                  >
                    <span className="hop" key={hopping ? pb.hop!.k : 0}>
                      <Token c={c} />
                    </span>
                  </motion.button>
                );
              })}
              <AnimatePresence>
                {pb.burst && (
                  <motion.span
                    key={pb.burst.k}
                    className="ludo-burst"
                    style={{ left: `${(view2(pb.burst.at)[0] / 15) * 100}%`, top: `${(view2(pb.burst.at)[1] / 15) * 100}%` }}
                    initial={{ scale: 0.2, opacity: 1 }}
                    animate={{ scale: 2.6, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  >
                    <Burst />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="ludo-row bottom">
          {corner(3)}
          <button
            className={`ludo-dice${canRoll ? ' can' : ''}${rolling ? ' rolling' : ''}`}
            style={{ ['--dc' as string]: diceColour }}
            onClick={roll}
            disabled={!canRoll}
            aria-label={canRoll ? 'Roll the dice' : `Dice shows ${face}`}
          >
            <motion.span className="die" key={rolling ? 'r' : `f${pb.current?.n ?? 0}`} initial={rolling ? false : { scale: 1.3, rotate: -14 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 16 }}>
              <DieFace n={face} />
            </motion.span>
          </button>
          {corner(2)}
        </div>

        <motion.p key={status} className="ludo-status" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} aria-live="polite">
          {status}
        </motion.p>
        <p className="ludo-meta mono">{rules}</p>
      </div>
    </div>
  );
}

/** Four little tokens under a player's name: filled for each seed home. */
function HomeDots({ c, n }: { c: number; n: number }) {
  return (
    <span className="ludo-dots" aria-label={`${n} of 4 seeds home`}>
      <svg viewBox="0 0 44 10" width="44" height="10" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} cx={5 + i * 11} cy="5" r="3.6" fill={i < n ? LUDO_COLOURS[c] : 'none'} stroke={i < n ? '#fffaf0' : 'rgba(245,236,217,.35)'} strokeWidth="1.3" />
        ))}
      </svg>
      <b>{n}/4</b>
    </span>
  );
}

/** A small starburst for captures. */
function Burst() {
  return (
    <svg viewBox="-10 -10 20 20" aria-hidden="true">
      {Array.from({ length: 8 }, (_, k) => {
        const a = (k * Math.PI) / 4;
        return <line key={k} x1={Math.cos(a) * 3.5} y1={Math.sin(a) * 3.5} x2={Math.cos(a) * 8.5} y2={Math.sin(a) * 8.5} stroke="#fffaf0" strokeWidth="1.6" strokeLinecap="round" />;
      })}
      <circle r="2.6" fill="#ffd25e" />
    </svg>
  );
}
