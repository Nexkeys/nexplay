import { motion } from 'motion/react';
import { useState } from 'react';
import type { C4State } from '~/engine/games/connect-four';
import { buzz, play } from '~/lib/sound';
import type { StageProps } from '~/lib/stage';
import { firstName, seatOf } from '~/lib/stage';
import { PlayerChip, useChange } from '../game/common';

const COLOURS = ['var(--coral)', 'var(--brass)'];

export default function ConnectFourBoard({ view, me, seats, actors, send, turnDeadline, now, result }: StageProps<C4State>) {
  const s = view;
  const mine = me ? s.players.indexOf(me) : -1;
  const myTurn = mine >= 0 && actors.includes(me!) && !result;
  const [hover, setHover] = useState<number | null>(null);
  const [popMode, setPopMode] = useState(false);
  useChange(s.moves, () => {
    play('drop');
    buzz(15);
  });

  const cell = (r: number, c: number) => s.cells[r * s.cols + c];
  const topFree = (c: number) => {
    for (let r = s.rows - 1; r >= 0; r--) if (cell(r, c) === 0) return r;
    return -1;
  };
  const canPop = (c: number) => s.mode === 'popout' && cell(s.rows - 1, c) === mine + 1;
  const act = (c: number) => {
    if (!myTurn) return;
    if (popMode) {
      if (!canPop(c)) return play('error');
      send({ type: 'pop', col: c });
      setPopMode(false);
    } else {
      if (topFree(c) < 0) return play('error');
      send({ type: 'drop', col: c });
    }
  };

  const win = new Set(s.winLine ?? []);
  const seatFor = (i: number) => seatOf(seats, s.players[i])!;
  const status = result
    ? result.summary
    : myTurn
      ? popMode
        ? 'Tap one of your discs on the bottom row to pop it out.'
        : 'Your turn. Drop a disc.'
      : `${firstName(seatFor(s.turn).name)} is thinking…`;

  return (
    <div className="board-c4">
      <div className="duel">
        {[0, 1].map((i) => (
          <PlayerChip
            key={i}
            seat={seatFor(i)}
            me={i === mine}
            colour={COLOURS[i]}
            align={i ? 'right' : 'left'}
            sub={<span className="disc-dot" style={{ background: COLOURS[i] }} />}
            active={s.turn === i && !result}
            deadline={turnDeadline}
            total={30}
            now={now}
          />
        ))}
      </div>

      <div className="c4-frame" style={{ ['--cols' as string]: s.cols, ['--rows' as string]: s.rows }} onMouseLeave={() => setHover(null)}>
        <div className="c4-cols">
          {Array.from({ length: s.cols }, (_, c) => (
            <button
              key={c}
              className={`c4-col${hover === c && myTurn ? ' hover' : ''}`}
              onMouseEnter={() => setHover(c)}
              onClick={() => act(c)}
              disabled={!myTurn}
              aria-label={`Column ${c + 1}`}
            >
            </button>
          ))}
        </div>
        <div className="c4-grid">
          {Array.from({ length: s.rows * s.cols }, (_, i) => {
            const r = Math.floor(i / s.cols);
            const c = i % s.cols;
            const v = s.cells[i];
            const isLast = s.last && s.last.col === c && s.last.row === r && s.last.type === 'drop';
            return (
              <span
                key={i}
                className={`hole${win.has(i) ? ' win' : ''}${popMode && myTurn && r === s.rows - 1 && canPop(c) ? ' poppable' : ''}${myTurn && !popMode && hover === c && topFree(c) === r ? ' preview' : ''}`}
                style={myTurn ? ({ ['--me' as string]: COLOURS[mine] } as React.CSSProperties) : undefined}
              >
                {v > 0 && (
                  <motion.i
                    key={`${i}-${v}-${s.moves}-${isLast ? 'l' : ''}`}
                    className="disc"
                    style={{ background: COLOURS[v - 1] }}
                    initial={isLast ? { y: `${-(r + 1) * 112}%` } : false}
                    animate={{ y: 0 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 26, mass: 0.9 }}
                  />
                )}
              </span>
            );
          })}
        </div>
      </div>

      <div className="c4-foot">
        <motion.p key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="status">
          {status}
        </motion.p>
        {s.mode === 'popout' && myTurn && (
          <button className={`toggle${popMode ? ' on' : ''}`} onClick={() => setPopMode(!popMode)}>
            {popMode ? 'Cancel pop' : 'Pop a disc'}
          </button>
        )}
        <span className="mono">{s.mode === 'five' ? 'Five in a row' : s.mode === 'popout' ? 'Pop Out' : 'Classic'}</span>
      </div>
    </div>
  );
}
