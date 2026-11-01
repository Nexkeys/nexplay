import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { clueParts, clueText, REACTIONS, SYMBOL_NAMES, type Clue, type LogItem, type LoveLockView } from '~/engine/games/love-lock';
import { buzz, play } from '~/lib/sound';
import type { Seat, StageProps } from '~/lib/stage';
import { firstName, seatOf } from '~/lib/stage';
import '~/styles/games/love-lock.css';
import { Avatar } from '../Avatar';
import { HeartIcon, ReactIcon, Sym } from '../art/LoveLockArt';
import { useChange, useClock } from '../game/common';

const BUBBLE_MS = 3200;

export default function LoveLockBoard({ view: s, me, seats, send, now, result }: StageProps<LoveLockView>) {
  const who = me ? s.players.indexOf(me) : -1;
  const playing = who >= 0;
  const mineIdx = playing ? who : 0;
  const partnerIdx = 1 - mineIdx;
  const seat = (i: number) => seatOf(seats, s.players[i]);
  const name = (i: number) => (i === who ? 'You' : firstName(seat(i)?.name ?? 'Partner'));
  const { n, k } = s.lock;
  const live = s.phase === 'play' && !result;
  const myTurn = playing && live && s.turn === who;
  const t = useClock(now, 250, s.phase !== 'over');

  // The code being put together. Each partner drafts on their own device.
  const [draft, setDraft] = useState<(number | null)[]>(() => Array(n).fill(null));
  const [cursor, setCursor] = useState(0);
  useEffect(() => {
    setDraft(Array(n).fill(null));
    setCursor(0);
  }, [s.lockNo, n]);
  const cells = draft.length === n ? draft : Array<number | null>(n).fill(null);
  const full = cells.every((c) => c !== null);

  const last: LogItem | undefined = s.log[s.log.length - 1];
  const lastTry = s.tries[s.tries.length - 1];
  const opened = !!s.reveal && !!lastTry?.hits.every(Boolean);

  useChange(`${s.lockNo}:${s.log.length}:${s.phase}`, () => {
    if (opened) {
      play('correct');
      buzz(30);
    } else if (last?.k === 'try') {
      play('wrong');
      buzz(60);
    } else if (last?.k === 'share') play('card');
    if (myTurn && last) play('turn');
  });

  const pick = (sym: number) => {
    if (!playing || !live) return;
    play('tap');
    const next = cells.slice();
    next[cursor] = sym;
    setDraft(next);
    // Move on to the next empty slot, if any.
    for (let step = 1; step <= n; step++) {
      const i = (cursor + step) % n;
      if (next[i] === null) {
        setCursor(i);
        return;
      }
    }
    setCursor(Math.min(n - 1, cursor + 1));
  };

  const tapSlot = (i: number) => {
    if (!playing || !live) return;
    if (i === cursor && cells[i] !== null) {
      const next = cells.slice();
      next[i] = null;
      setDraft(next);
    }
    setCursor(i);
  };

  const tryCode = () => {
    if (!myTurn || !full) return;
    send({ type: 'try', code: cells });
  };

  const mine = s.lock.owner.flatMap((o, i) => (o === mineIdx ? [i] : []));
  const mineOrdered = [...mine.filter((i) => !s.lock.shared[i]), ...mine.filter((i) => s.lock.shared[i])];
  const fromPartner = s.lock.owner.flatMap((o, i) => (o === partnerIdx && s.lock.shared[i] ? [i] : []));
  const partnerHidden = s.lock.owner.filter((o, i) => o === partnerIdx && !s.lock.shared[i]).length;
  const nothingToShare = playing && mine.every((i) => s.lock.shared[i]);

  const secs = live ? Math.max(0, Math.ceil((s.turnEnd - t) / 1000)) : null;

  return (
    <div className="board-lovelock">
      <div className="ll-left">
        <header className="ll-top">
          <div className="ll-hearts" aria-label={`${s.hearts} of ${s.maxHearts} hearts left`}>
            {Array.from({ length: s.maxHearts }, (_, i) => (
              <motion.span key={i} animate={{ scale: i < s.hearts ? 1 : 0.82 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
                <HeartIcon full={i < s.hearts} size={18} />
              </motion.span>
            ))}
          </div>
          <div className="ll-together" aria-live="polite">
            <motion.b key={s.opened} initial={{ scale: 1.5, color: '#ff8fae' }} animate={{ scale: 1, color: '#f5ecd9' }}>
              {s.opened}
            </motion.b>
            <span>
              lock{s.opened === 1 ? '' : 's'} opened
              <br />
              together
            </span>
          </div>
          <div className="ll-score">
            <b>{s.score.toLocaleString()}</b>
            <small>{s.streak >= 2 ? `streak ×${s.streak}` : 'points'}</small>
          </div>
        </header>

        <div className="ll-progress mono">
          <span>
            Lock {s.lockNo}
            {s.mode === 'set' ? ` of ${s.goal}` : ` · goal ${s.goal}`}
          </span>
          <span className="ll-dots" aria-hidden="true">
            {s.mode === 'set'
              ? Array.from({ length: s.goal }, (_, i) => <i key={i} className={i < s.opened ? 'on' : i === s.opened && s.phase === 'play' ? 'now' : ''} />)
              : Array.from({ length: Math.min(12, Math.max(s.goal, s.opened + 1)) }, (_, i) => <i key={i} className={i < s.opened ? 'on' : i < s.goal ? '' : 'extra'} />)}
          </span>
          <span>
            {n} slots · {k} symbols
          </span>
        </div>

        <div className="ll-duo">
          {[mineIdx, partnerIdx].map((i) => (
            <PartnerChip
              key={i}
              seat={seat(i)}
              label={name(i)}
              me={i === who}
              active={live && s.turn === i}
              secs={live && s.turn === i ? secs : null}
              fraction={live && s.turn === i ? Math.max(0, Math.min(1, (s.turnEnd - t) / (s.seconds * 1000))) : 0}
              react={s.reacts[s.players[i]]}
              t={t}
            />
          ))}
        </div>

        <section className={`ll-stage${opened ? ' open' : ''}${s.phase === 'over' && !opened ? ' failed' : ''}`}>
          <Padlock open={opened} lockKey={s.lockNo}>
            <div className="ll-slots" style={{ ['--n' as string]: n }}>
              {Array.from({ length: n }, (_, i) => {
                const shown = s.reveal ? s.reveal[i] : cells[i];
                const sel = playing && live && cursor === i;
                return (
                  <motion.button
                    key={`${s.lockNo}:${i}`}
                    className={`ll-slot${sel ? ' sel' : ''}${shown !== null && shown !== undefined ? ' filled' : ''}`}
                    onClick={() => tapSlot(i)}
                    disabled={!playing || !live}
                    aria-label={`Slot ${i + 1}: ${shown !== null && shown !== undefined ? SYMBOL_NAMES[shown] : 'empty'}${sel ? ', selected' : ''}`}
                    animate={opened ? { y: [0, -8, 0] } : { y: 0 }}
                    transition={{ delay: opened ? i * 0.07 : 0, duration: 0.4 }}
                  >
                    <span className="ll-slot-no">{i + 1}</span>
                    <AnimatePresence mode="popLayout">
                      {shown !== null && shown !== undefined && (
                        <motion.span key={shown} className="ll-slot-sym" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 24 }}>
                          <Sym s={shown} size={30} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </Padlock>
          <News s={s} who={who} name={name} last={last} opened={opened} myTurn={myTurn} />
        </section>

        {playing && s.phase !== 'over' && (
          <div className="ll-controls">
            <div className="ll-picker" role="group" aria-label="Symbols" style={{ ['--k' as string]: k }}>
              {Array.from({ length: k }, (_, sym) => (
                <motion.button key={sym} className="ll-pick" onClick={() => pick(sym)} disabled={!live} aria-label={`Put a ${SYMBOL_NAMES[sym]} in slot ${cursor + 1}`} whileTap={{ scale: 0.88 }}>
                  <Sym s={sym} size={26} />
                </motion.button>
              ))}
            </div>
            <div className="ll-actions">
              <button
                className="ll-clear"
                onClick={() => {
                  setDraft(Array(n).fill(null));
                  setCursor(0);
                }}
                disabled={!live || cells.every((c) => c === null)}
                aria-label="Clear the slots"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 5h10.5A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5H9l-6-7z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M11.5 9.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
              {nothingToShare && myTurn && (
                <button className="ll-pass" onClick={() => send({ type: 'pass' })}>
                  Hand over
                </button>
              )}
              <motion.button className="ll-try" onClick={tryCode} disabled={!myTurn || !full} whileTap={{ scale: 0.96 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="8" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
                  <path d="M12.5 12H21m-3 0v3.5m-3-3.5v2.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                {myTurn ? (full ? 'Try this code' : `Fill ${cells.filter((c) => c === null).length} more`) : 'Try code'}
              </motion.button>
            </div>
          </div>
        )}
      </div>

      <div className="ll-right">
        <section className="ll-hand" aria-label={playing ? 'Your clues' : `${name(0)}'s shared clues`}>
          <h3>
            {playing ? 'Your clues' : `${name(0)}'s clues`}
            <small>{playing ? 'Only you can see these. Sharing costs 10 points.' : 'Shared so far'}</small>
          </h3>
          <ul>
            {(playing ? mineOrdered : mine.filter((i) => s.lock.shared[i])).map((i) => (
              <ClueCard key={`${s.lockNo}:${i}`} clue={s.lock.clues[i]} shared={s.lock.shared[i]} canShare={myTurn && !s.lock.shared[i]} onShare={() => send({ type: 'share', clue: i })} tone="mine" />
            ))}
            {!playing && mine.every((i) => !s.lock.shared[i]) && <li className="ll-empty">Nothing shared yet.</li>}
          </ul>
        </section>

        <section className="ll-hand partner" aria-label={`Clues ${name(partnerIdx)} shared`}>
          <h3>
            {playing ? `From ${name(partnerIdx)}` : `${name(partnerIdx)}'s clues`}
            <small>{partnerHidden ? `${partnerHidden} more still hidden` : 'Every clue is on the table'}</small>
          </h3>
          <ul>
            <AnimatePresence initial={false}>
              {fromPartner.map((i) => (
                <ClueCard key={`${s.lockNo}:${i}`} clue={s.lock.clues[i]} shared tone="partner" />
              ))}
            </AnimatePresence>
            {Array.from({ length: partnerHidden }, (_, i) => (
              <li key={`h${i}`} className="ll-clue back" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <rect x="4" y="3" width="16" height="18" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M12 16.2c-.2 0-.3 0-.4-.1-1.5-1.2-4.1-3.2-4.1-5.6 0-1.4 1-2.4 2.4-2.4.8 0 1.6.4 2.1 1.1.5-.7 1.3-1.1 2.1-1.1 1.4 0 2.4 1 2.4 2.4 0 2.4-2.6 4.4-4.1 5.6-.1.1-.2.1-.4.1z" fill="currentColor" />
                </svg>
                <span>A clue only {name(partnerIdx)} can see</span>
              </li>
            ))}
          </ul>
        </section>

        {s.tries.length > 0 && (
          <section className="ll-tries" aria-label="Tries on this lock">
            <h3>
              Tries
              <small>Glowing slots were right</small>
            </h3>
            <ol>
              {s.tries.map((tr, x) => (
                <motion.li key={`${s.lockNo}:${x}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
                  <span className="ll-tries-by">{name(tr.by)}</span>
                  <span className="ll-tries-code">
                    {tr.code.map((sym, i) => (
                      <span key={i} className={`ll-mini${tr.hits[i] ? ' hit' : ''}`} aria-label={`${SYMBOL_NAMES[sym]} ${tr.hits[i] ? 'right' : 'wrong'}`}>
                        <Sym s={sym} size={18} />
                      </span>
                    ))}
                  </span>
                  <span className="ll-tries-res">{tr.hits.every(Boolean) ? 'open!' : `${tr.hits.filter(Boolean).length}/${n}`}</span>
                </motion.li>
              ))}
            </ol>
          </section>
        )}

        {playing && s.phase !== 'over' && (
          <div className="ll-react" role="group" aria-label="Quick reactions">
            {REACTIONS.map((label, r) => (
              <motion.button key={r} onClick={() => send({ type: 'react', r })} aria-label={label} title={label} whileTap={{ scale: 0.85 }}>
                <ReactIcon r={r} size={18} />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** The padlock: a shackle that springs open with a burst of hearts, over a rose body holding the slots. */
function Padlock({ open, lockKey, children }: { open: boolean; lockKey: number; children: React.ReactNode }) {
  return (
    <div className="ll-lock">
      <motion.div className="ll-shackle" animate={open ? { y: -16, rotate: -22 } : { y: 0, rotate: 0 }} transition={open ? { type: 'spring', stiffness: 260, damping: 11, delay: 0.15 } : { duration: 0.3 }}>
        <svg viewBox="0 0 120 50" aria-hidden="true">
          <defs>
            <linearGradient id="ll-shackle-metal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#b9862e" />
              <stop offset=".3" stopColor="#ffe3a3" />
              <stop offset=".55" stopColor="#e8b450" />
              <stop offset="1" stopColor="#9c6e22" />
            </linearGradient>
          </defs>
          <path d="M24 50V34a36 28 0 0 1 72 0v16" fill="none" stroke="url(#ll-shackle-metal)" strokeWidth="13" strokeLinecap="round" />
          <path d="M24 46V34a36 28 0 0 1 15.4-22.9" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="3" strokeLinecap="round" transform="translate(-3 0)" />
        </svg>
      </motion.div>
      <div className="ll-body">
        <span className="ll-rivet l" />
        <span className="ll-rivet r" />
        {children}
        <svg className="ll-keyhole" width="22" height="26" viewBox="0 0 24 28" aria-hidden="true">
          <path d="M12 15.6c-.2 0-.4-.1-.6-.2C9.3 13.7 5.5 10.8 5.5 7.4c0-2 1.5-3.5 3.4-3.5 1.2 0 2.3.6 3.1 1.6.8-1 1.9-1.6 3.1-1.6 1.9 0 3.4 1.5 3.4 3.5 0 3.4-3.8 6.3-5.9 8-.2.1-.4.2-.6.2z" fill="#4d1029" />
          <rect x="10.4" y="15" width="3.2" height="9" rx="1.6" fill="#4d1029" />
        </svg>
      </div>
      <AnimatePresence>{open && <HeartBurst key={lockKey} />}</AnimatePresence>
    </div>
  );
}

const BURST = Array.from({ length: 16 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 16 + (i % 2 ? 0.2 : -0.1);
  const d = 80 + ((i * 37) % 60);
  return { x: Math.cos(a) * d * 1.25, y: Math.sin(a) * d * 0.85 - 30, size: 14 + ((i * 7) % 12), rot: ((i * 53) % 60) - 30, delay: (i % 5) * 0.04 };
});

function HeartBurst() {
  return (
    <div className="ll-burst" aria-hidden="true">
      {BURST.map((b, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, scale: 0.2, opacity: 0, rotate: 0 }}
          animate={{ x: b.x, y: b.y, scale: 1, opacity: [0, 1, 1, 0], rotate: b.rot }}
          transition={{ duration: 1.5, delay: 0.25 + b.delay, ease: [0.22, 1, 0.36, 1] }}
        >
          {i % 4 === 3 ? <Sym s={1} size={b.size - 2} /> : <HeartIcon size={b.size} />}
        </motion.span>
      ))}
    </div>
  );
}

function PartnerChip({
  seat,
  label,
  me,
  active,
  secs,
  fraction,
  react,
  t
}: {
  seat: Seat | undefined;
  label: string;
  me: boolean;
  active: boolean;
  secs: number | null;
  fraction: number;
  react?: { r: number; at: number };
  t: number;
}) {
  const showBubble = !!react && t - react.at < BUBBLE_MS && t >= react.at - 1000;
  useEffect(() => {
    if (me && active && secs !== null && secs > 0 && secs <= 5) play('tick');
  }, [me, active, secs]);
  return (
    <div className={`ll-chip${active ? ' on' : ''}${me ? ' me' : ''}`}>
      <span className="ll-ring" style={active ? { background: `conic-gradient(var(--ll-rose) ${fraction * 360}deg, rgba(255,255,255,.08) 0)` } : undefined}>
        {seat ? <Avatar name={seat.name} colour={seat.avatar} size={34} bot={!!seat.bot} off={!seat.connected} /> : null}
      </span>
      <span className="ll-who">
        <b>{label}</b>
        <small>
          {seat && !seat.connected ? 'reconnecting…' : active ? (me ? 'your turn' : 'thinking…') : 'waiting'}
          {secs !== null && <em className={secs <= 10 ? 'hurry' : ''}>{secs}s</em>}
        </small>
      </span>
      <AnimatePresence>
        {showBubble && (
          <motion.span key={react!.at} className="ll-bubble" initial={{ opacity: 0, y: 8, scale: 0.7 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }}>
            <ReactIcon r={react!.r} size={14} />
            {REACTIONS[react!.r]}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClueCard({ clue, shared, canShare, onShare, tone }: { clue: Clue | null; shared: boolean; canShare?: boolean; onShare?: () => void; tone: 'mine' | 'partner' }) {
  if (!clue) return null;
  return (
    <motion.li
      layout
      className={`ll-clue ${tone}${shared ? ' shared' : ''}`}
      initial={tone === 'partner' ? { opacity: 0, y: -10, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
    >
      <span className="ll-clue-text" aria-label={clueText(clue)}>
        {clueParts(clue).map((p, i) =>
          typeof p === 'number' ? (
            <span key={i} className="ll-inline-sym">
              <Sym s={p} size={18} />
            </span>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </span>
      {tone === 'mine' &&
        (shared ? (
          <span className="ll-tag">shared</span>
        ) : (
          <button className="ll-share" onClick={onShare} disabled={!canShare}>
            Share
          </button>
        ))}
    </motion.li>
  );
}

function News({ s, who, name, last, opened, myTurn }: { s: LoveLockView; who: number; name: (i: number) => string; last: LogItem | undefined; opened: boolean; myTurn: boolean }) {
  let text: React.ReactNode;
  let tone = '';
  if (s.phase === 'over') {
    tone = opened || s.outcome === 'won' ? 'good' : 'bad';
    if (opened && s.mode === 'set') text = 'Every lock is open. What a team.';
    else if (s.outcome === 'won') text = `Out of hearts, but you passed your goal of ${s.goal}.`;
    else text = 'Out of hearts. The code is shown above.';
  } else if (opened && s.gain) {
    tone = 'good';
    const g = s.gain;
    text = (
      <>
        <b>Opened together! +{g.total}</b>
        <span className="ll-gain">
          <i>lock {g.base}</i>
          {g.speed > 0 && <i>speed +{g.speed}</i>}
          {g.cost > 0 && <i className="minus">clues and tries −{g.cost}</i>}
          {g.streak > 0 && <i>streak +{g.streak}</i>}
          {g.heart && (
            <i className="heart">
              <HeartIcon size={12} /> +1
            </i>
          )}
        </span>
      </>
    );
  } else if (last) {
    const by = name(last.by);
    const mineMove = last.by === who;
    if (last.k === 'share') text = last.auto ? (mineMove ? "Time's up, so one of your clues was shared." : `${by} ran out of time, so a clue was shared.`) : mineMove ? 'You shared a clue.' : `${by} shared a clue with you.`;
    else if (last.k === 'pass') text = last.auto ? `${by} ran out of time.` : `${by} handed the turn over.`;
    else {
      const tr = s.tries[s.tries.length - 1];
      tone = 'bad';
      text = `${mineMove ? 'Not quite' : `${by} tried a code`}: ${tr.hits.filter(Boolean).length} of ${s.lock.n} slots right. One heart lost.`;
    }
  } else text = s.lockNo === 1 ? 'Together your clues fit exactly one code. Trade clues, then try it.' : `A new lock: ${s.lock.n} slots, ${s.lock.k} symbols.`;
  return (
    <p className={`ll-news ${tone}`} aria-live="polite">
      {text}
      {s.phase === 'play' && who >= 0 && <span className="ll-prompt">{myTurn ? 'Your turn: share a clue or try a code.' : `Waiting for ${name(1 - who)}…`}</span>}
    </p>
  );
}
