import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { legalPits, type AyoState } from '~/engine/games/ayo';
import { buzz, play } from '~/lib/sound';
import type { StageProps } from '~/lib/stage';
import { firstName, seatOf } from '~/lib/stage';
import { PlayerChip } from '../game/common';

/** Seed positions inside a pit, as percentages, so piles look natural but never jump around. */
const SPOTS = Array.from({ length: 16 }, (_, i) => {
  const a = i * 2.39996;
  const r = 9 + 25 * Math.sqrt((i + 0.5) / 16);
  return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r];
});

function Seeds({ n }: { n: number }) {
  return (
    <>
      {SPOTS.slice(0, Math.min(n, 16)).map(([x, y], i) => (
        <motion.i
          key={i}
          className={`seed${i % 5 === 3 ? ' d' : ''}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 600, damping: 22 }}
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      ))}
    </>
  );
}

export default function AyoBoard({ view, me, seats, actors, send, turnDeadline, now, result }: StageProps<AyoState>) {
  const s = view;
  const mine = me ? s.players.indexOf(me) : -1;
  const side = (mine === 1 ? 1 : 0) as 0 | 1;
  const opp = (1 - side) as 0 | 1;
  const bottom = side === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];
  const top = side === 0 ? [11, 10, 9, 8, 7, 6] : [5, 4, 3, 2, 1, 0];

  // Replay the last move seed by seed.
  const [shown, setShown] = useState<number[]>(s.pits);
  const [hot, setHot] = useState<number | null>(null);
  const [hand, setHand] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const prevPits = useRef(s.pits);
  const prevTurns = useRef(s.turns);

  useEffect(() => {
    if (s.turns === prevTurns.current) {
      setShown(s.pits);
      prevPits.current = s.pits;
      return;
    }
    prevTurns.current = s.turns;
    const steps = s.last?.steps ?? [];
    const pits = [...prevPits.current];
    prevPits.current = s.pits;
    if (!steps.length) {
      setShown(s.pits);
      return;
    }
    setBusy(true);
    const delay = Math.max(45, Math.min(150, 4200 / steps.length));
    let i = 0;
    let carried = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const st = steps[i++];
      if (!st) {
        setShown(s.pits);
        setHot(null);
        setHand(0);
        setBusy(false);
        return;
      }
      if (st.kind === 'pickup') {
        carried = pits[st.pit];
        pits[st.pit] = 0;
        play('tap');
      } else if (st.kind === 'drop') {
        pits[st.pit] += 1;
        carried = Math.max(0, carried - 1);
        play('seed');
      } else {
        pits[st.pit] = 0;
        setFlash(st.pit);
        play('capture');
        buzz(20);
        setTimeout(() => setFlash(null), 500);
      }
      setHand(carried);
      setHot(st.pit);
      setShown([...pits]);
      timer = setTimeout(tick, st.kind === 'capture' ? 380 : delay);
    };
    tick();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.turns]);

  const myTurn = mine >= 0 && actors.includes(me!) && !busy && !result;
  const legal = myTurn ? legalPits(s, mine as 0 | 1) : [];
  const fours = s.rules === 'fours';
  const seatFor = (p: 0 | 1) => seatOf(seats, s.players[p])!;
  const score = (p: 0 | 1) => (fours ? s.houses[p] : s.seeds[p]);
  const label = fours ? 'houses' : 'seeds';
  const onBoard = shown.reduce((a, b) => a + b, 0);

  const pit = (i: number, row: 'top' | 'bottom') => {
    const n = shown[i];
    const can = legal.includes(i);
    return (
      <button
        key={i}
        className={`pit${can ? ' can' : ''}${hot === i ? ' hot' : ''}${flash === i ? ' won' : ''}${n === 3 && fours ? ' three' : ''}`}
        disabled={!can}
        onClick={() => {
          play('tap');
          buzz();
          send({ pit: i });
        }}
        aria-label={`${row === 'bottom' ? 'Your' : 'Opponent'} pit with ${n} seeds`}
      >
        <AnimatePresence>
          <Seeds n={n} />
        </AnimatePresence>
        <em className={n === 4 && fours ? 'four' : ''}>{n}</em>
      </button>
    );
  };

  const turnSeat = actors[0] ? seatOf(seats, actors[0]) : null;
  const status = result
    ? result.summary
    : busy
      ? hand > 0
        ? `Sowing… ${hand} in hand`
        : 'Sowing…'
      : myTurn
        ? legal.length < bottom.filter((p) => shown[p] > 0).length
          ? 'Your opponent is out of seeds. Feed them.'
          : 'Your turn. Pick a pit to sow from.'
        : turnSeat
          ? `${firstName(turnSeat.name)} is counting seeds…`
          : '';

  return (
    <div className="board-ayo">
      <div className="seat-row top">
        <PlayerChip seat={seatFor(opp)} sub={`${score(opp)} ${label}`} active={actors.includes(s.players[opp])} deadline={turnDeadline} total={30} now={now} score={score(opp)} />
      </div>

      <div className="ayo-wrap">
        <div className="ayo-board">
          <div className="store" aria-label="Opponent store">
            <Heap n={fours ? s.houses[opp] * 4 : s.seeds[opp]} />
            <b>{score(opp)}</b>
          </div>
          <div className="pits">
            {top.map((i) => pit(i, 'top'))}
            {bottom.map((i) => pit(i, 'bottom'))}
          </div>
          <div className="store" aria-label="Your store">
            <Heap n={fours ? s.houses[side] * 4 : s.seeds[side]} />
            <b>{score(side)}</b>
          </div>
          <span className="flow" aria-hidden="true">
            sowing goes anticlockwise ↻
          </span>
        </div>
        <motion.p key={status} className="ayo-status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          {status}
        </motion.p>
        <p className="ayo-meta mono">
          {fours ? 'Complete fours' : 'Capture opposite'} · {onBoard} seeds on the board
        </p>
      </div>

      <div className="seat-row bottom">
        <PlayerChip seat={seatFor(side)} me={mine >= 0} sub={`${score(side)} ${label}`} active={actors.includes(s.players[side])} deadline={turnDeadline} total={30} now={now} score={score(side)} />
      </div>
    </div>
  );
}

function Heap({ n }: { n: number }) {
  const shown = Math.min(n, 24);
  return (
    <span className="heap" aria-hidden="true">
      {Array.from({ length: shown }, (_, i) => {
        const a = i * 2.39996;
        const r = 6 + 30 * Math.sqrt((i + 0.5) / 24);
        return <i key={i} className={`seed${i % 4 === 1 ? ' d' : ''}`} style={{ left: `${50 + Math.cos(a) * r * 0.7}%`, top: `${50 + Math.sin(a) * r}%` }} />;
      })}
    </span>
  );
}
