import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Seat } from '~/lib/stage';
import { firstName } from '~/lib/stage';
import { play } from '~/lib/sound';
import { Avatar } from '../Avatar';

/** Re-renders on an interval and returns the current (server) time. */
export function useClock(now: () => number, every = 200, on = true) {
  const [t, setT] = useState(now);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setT(now()), every);
    return () => clearInterval(id);
  }, [now, every, on]);
  return t;
}

/** Runs a callback when a value changes (not on first render). */
export function useChange<T>(value: T, fn: (prev: T, next: T) => void) {
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) fn(prev.current, value);
    prev.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}

export function PlayerChip({
  seat,
  sub,
  active,
  deadline,
  total,
  now,
  score,
  me,
  align = 'left',
  colour
}: {
  seat: Seat;
  sub?: React.ReactNode;
  active?: boolean;
  deadline?: number;
  total?: number;
  now?: () => number;
  score?: React.ReactNode;
  me?: boolean;
  align?: 'left' | 'right';
  colour?: string;
}) {
  const t = useClock(now ?? Date.now, 250, !!(active && deadline));
  const left = active && deadline && total ? Math.max(0, Math.min(1, (deadline - t) / (total * 1000))) : 1;
  const secs = active && deadline ? Math.max(0, Math.ceil((deadline - t) / 1000)) : null;
  // Last five seconds of your own turn: a soft tick so you notice.
  useEffect(() => {
    if (me && secs !== null && secs > 0 && secs <= 5) play('tick');
  }, [me, secs]);
  return (
    <div className={`chip-player${active ? ' on' : ''}${align === 'right' ? ' r' : ''}`} style={colour ? ({ ['--pc' as string]: colour } as React.CSSProperties) : undefined}>
      <span className="ring" style={{ background: active ? `conic-gradient(var(--pc, var(--brass)) ${left * 360}deg, rgba(255,255,255,.08) 0)` : undefined }}>
        <Avatar name={seat.name} colour={seat.avatar} size={40} bot={!!seat.bot} off={!seat.connected} />
      </span>
      <span className="who">
        <b>
          {firstName(seat.name)}
          {me && <em> you</em>}
        </b>
        <small>
          {!seat.connected ? 'reconnecting…' : sub}
          {secs !== null && <span className={`clock${secs <= 10 ? ' hurry' : ''}`}>{secs}s</span>}
        </small>
      </span>
      {score !== undefined && <span className="pts">{score}</span>}
    </div>
  );
}

/** A thin bar that empties as a deadline approaches. */
export function TimeBar({ start, deadline, now, tone }: { start: number; deadline: number; now: () => number; tone?: string }) {
  const t = useClock(now, 100, deadline > 0);
  const total = Math.max(1, deadline - start);
  const pct = deadline ? Math.max(0, Math.min(1, (deadline - t) / total)) : 0;
  return (
    <div className="timebar" aria-hidden="true">
      <i style={{ transform: `scaleX(${pct})`, background: pct < 0.25 ? 'var(--coral)' : tone ?? 'var(--brass)' }} />
    </div>
  );
}

export function Countdown({ deadline, now }: { deadline: number; now: () => number }) {
  const t = useClock(now, 200, deadline > 0);
  const s = Math.max(0, Math.ceil((deadline - t) / 1000));
  return <span className={`countdown${s <= 5 ? ' low' : ''}`}>{s}</span>;
}

/** Live ranking for the party games. */
export function Scoreboard({ seats, scores, me, extra }: { seats: Seat[]; scores: Record<string, number>; me: string | null; extra?: (id: string) => React.ReactNode }) {
  const order = [...seats].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  return (
    <ol className="scoreboard">
      {order.map((s, i) => (
        <motion.li layout key={s.id} className={s.id === me ? 'me' : ''} transition={{ type: 'spring', stiffness: 400, damping: 34 }}>
          <span className="rank">{i + 1}</span>
          <Avatar name={s.name} colour={s.avatar} size={30} bot={!!s.bot} off={!s.connected} />
          <span className="nm">{firstName(s.name)}</span>
          {extra?.(s.id)}
          <motion.b key={scores[s.id] ?? 0} initial={{ scale: 1.35, color: '#e8b450' }} animate={{ scale: 1, color: '#f5ecd9' }}>
            {(scores[s.id] ?? 0).toLocaleString()}
          </motion.b>
        </motion.li>
      ))}
    </ol>
  );
}

export const turnLabel = (mine: boolean, name: string) => (mine ? 'Your turn' : `${firstName(name)} is thinking…`);
