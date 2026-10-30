import { motion } from 'motion/react';
import type { TttState } from '~/engine/games/tic-tac-toe';
import { buzz, play } from '~/lib/sound';
import type { StageProps } from '~/lib/stage';
import { firstName, seatOf } from '~/lib/stage';
import { PlayerChip, useChange } from '../game/common';

function Mark({ v, fading, big }: { v: number; fading?: boolean; big?: boolean }) {
  const draw = { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.28, ease: 'easeOut' as const } };
  return (
    <svg viewBox="0 0 100 100" className={`mark${fading ? ' fading' : ''}${big ? ' big' : ''}`} aria-hidden="true">
      {v === 1 ? (
        <g stroke="var(--coral)" strokeWidth={big ? 12 : 13} strokeLinecap="round" fill="none">
          <motion.path d="M24 24L76 76" {...draw} />
          <motion.path d="M76 24L24 76" {...draw} transition={{ ...draw.transition, delay: 0.12 }} />
        </g>
      ) : v === 2 ? (
        <motion.circle cx="50" cy="50" r="27" stroke="var(--brass)" strokeWidth={big ? 12 : 13} fill="none" {...draw} />
      ) : null}
    </svg>
  );
}

export default function TicTacToeBoard({ view, me, seats, actors, send, turnDeadline, turnSeconds, now, result }: StageProps<TttState>) {
  const s = view;
  const mine = me ? s.players.indexOf(me) : -1;
  const myTurn = mine >= 0 && actors.includes(me!) && !result;
  useChange(s.moves, () => play('tap'));
  const win = new Set(s.winLine ?? []);

  const tap = (cell: number) => {
    if (!myTurn) return;
    buzz();
    send({ cell });
  };

  // Vanishing: the mark that will disappear on the player's next move.
  const fadingCell = s.mode === 'vanishing' && s.order[s.turn].length >= 3 ? s.order[s.turn][0] : -1;

  const small = (cells: number[], offset: number, enabled: boolean) =>
    cells.map((v, k) => {
      const idx = offset + k;
      return (
        <button
          key={idx}
          className={`ttt-cell${v ? ' full' : ''}${win.has(idx) && s.mode !== 'ultimate' ? ' win' : ''}${s.last === idx ? ' last' : ''}`}
          disabled={!enabled || v !== 0}
          onClick={() => tap(idx)}
          aria-label={v ? (v === 1 ? 'X' : 'O') : `Empty square ${k + 1}`}
        >
          {v !== 0 && <Mark v={v} fading={idx === fadingCell} />}
          {v === 0 && enabled && <span className="ghost">{mine === 0 ? '×' : '○'}</span>}
        </button>
      );
    });

  const seatFor = (i: number) => seatOf(seats, s.players[i])!;
  const status = result
    ? result.summary
    : myTurn
      ? s.mode === 'ultimate'
        ? s.active === -1
          ? 'Your turn. Play in any open board.'
          : 'Your turn. Play in the glowing board.'
        : s.mode === 'vanishing' && fadingCell >= 0
          ? 'Your turn. Your faded mark goes when you play.'
          : 'Your turn.'
      : `${firstName(seatFor(s.turn).name)} is thinking…`;

  return (
    <div className={`board-ttt mode-${s.mode}`}>
      <div className="duel">
        {[0, 1].map((i) => (
          <PlayerChip
            key={i}
            seat={seatFor(i)}
            me={i === mine}
            colour={i ? 'var(--brass)' : 'var(--coral)'}
            align={i ? 'right' : 'left'}
            sub={i ? 'plays O' : 'plays X'}
            active={s.turn === i && !result}
            deadline={turnDeadline}
            total={turnSeconds}
            now={now}
            score={s.mode === 'ultimate' ? s.boards.filter((b) => b === i + 1).length : undefined}
          />
        ))}
      </div>

      {s.mode === 'ultimate' ? (
        <div className="uttt">
          {Array.from({ length: 9 }, (_, b) => {
            const owner = s.boards[b];
            const open = owner === 0 && (s.active === -1 || s.active === b);
            return (
              <div key={b} className={`mini${open && myTurn ? ' live' : ''}${open && !myTurn && !result ? ' next' : ''}${owner ? ' done' : ''}${win.has(b) ? ' win' : ''}`}>
                <div className="mini-grid">{small(s.cells.slice(b * 9, b * 9 + 9), b * 9, myTurn && open)}</div>
                {owner === 1 || owner === 2 ? (
                  <motion.div className="claim" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Mark v={owner} big />
                  </motion.div>
                ) : owner === 3 ? (
                  <div className="claim drawn">=</div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ttt">{small(s.cells, 0, myTurn)}</div>
      )}

      <motion.p key={status} className="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {status}
      </motion.p>
    </div>
  );
}
