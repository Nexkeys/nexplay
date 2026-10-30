import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { canPlay, SHAPE_NAME, SHAPES, type Card, type Shape as ShapeName, type WhotState } from '~/engine/games/whot';
import { buzz, play } from '~/lib/sound';
import type { StageProps } from '~/lib/stage';
import { firstName, seatOf } from '~/lib/stage';
import { Shape } from '../Shape';
import { PlayerChip, useChange } from '../game/common';

type View = Omit<WhotState, 'hands' | 'market'> & { hands: (Card[] | number)[]; market: number };

export function CardFace({ card, size = 'md' }: { card: Card; size?: 'sm' | 'md' | 'lg' }) {
  const whot = card.shape === 'whot';
  const px = size === 'sm' ? 22 : size === 'lg' ? 52 : 40;
  return (
    <span className={`wcard face ${size}${whot ? ' is-whot' : ''}`}>
      <span className="n">{card.n}</span>
      {whot ? <span className="whot-word">WHOT</span> : <Shape shape={card.shape} size={px} />}
      <span className="n n2">{card.n}</span>
    </span>
  );
}

export const CardBack = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => <span className={`wcard back ${size}`} />;

export default function WhotBoard({ view, me, seats, actors, send, turnDeadline, turnSeconds, now, result }: StageProps<View>) {
  const s = view;
  const mine = me ? s.players.indexOf(me) : -1;
  const hand = mine >= 0 && Array.isArray(s.hands[mine]) ? (s.hands[mine] as Card[]) : [];
  const myTurn = mine >= 0 && actors.includes(me!) && !result;
  const top = s.pile[s.pile.length - 1];
  const cfg = s.config;
  const [picked, setPicked] = useState<string | null>(null);
  const [asking, setAsking] = useState<Card | null>(null);
  const [declare, setDeclare] = useState(false);

  const needCall = cfg.callRule ? (hand.length === 2 ? 'last' : hand.length === 3 && cfg.semiLastCard ? 'semi' : null) : null;

  useEffect(() => {
    setPicked(null);
    setDeclare(false);
  }, [s.seq]);
  useChange(s.seq, () => play('card'));
  useChange(myTurn, (_, on) => {
    if (on) {
      play('turn');
      buzz([10, 40, 10]);
    }
  });

  const sorted = useMemo(() => {
    const order: ShapeName[] = ['whot', 'circle', 'triangle', 'cross', 'square', 'star'];
    return [...hand].sort((a, b) => order.indexOf(a.shape) - order.indexOf(b.shape) || a.n - b.n);
  }, [hand]);

  const playCard = (card: Card, call?: ShapeName) => {
    play('card');
    buzz();
    send({ type: 'play', card: card.id, call, declare: declare ? needCall : null });
    setPicked(null);
    setAsking(null);
  };

  const tapCard = (card: Card) => {
    if (!myTurn) return;
    if (!canPlay(s, card)) {
      play('error');
      setPicked(card.id);
      return;
    }
    if (picked !== card.id) {
      play('tap');
      setPicked(card.id);
      return;
    }
    if (card.shape === 'whot') setAsking(card);
    else playCard(card);
  };

  // Seats arranged so the player after you sits on your left, like a real table.
  const n = s.players.length;
  const others = Array.from({ length: n - 1 }, (_, k) => (Math.max(mine, 0) + k + 1) % n).filter((i) => i !== mine);
  const turnName = firstName(seatOf(seats, s.players[s.turn])?.name ?? '');
  const pickedCard = hand.find((c) => c.id === picked) ?? null;

  let banner = '';
  if (s.pending) banner = myTurn ? (cfg.defendPicks ? `Defend with a ${s.pending.n} or pick ${s.pending.cards}` : `Pick ${s.pending.cards}`) : `${turnName} must pick ${s.pending.cards}`;
  else if (s.called) banner = `${myTurn ? 'You need' : `${turnName} needs`} ${SHAPE_NAME[s.called]}`;

  return (
    <div className="board-whot">
      <div className="whot-opps" data-count={others.length}>
        {others.map((i) => {
          const seat = seatOf(seats, s.players[i]);
          const count = typeof s.hands[i] === 'number' ? (s.hands[i] as number) : (s.hands[i] as Card[]).length;
          if (!seat) return null;
          return (
            <div key={seat.id} className={`whot-opp${s.turn === i && !result ? ' on' : ''}`}>
              <PlayerChip seat={seat} sub={`${count} card${count === 1 ? '' : 's'}`} active={s.turn === i && !result} deadline={turnDeadline} total={turnSeconds} now={now} />
              <div className="mini-fan" aria-hidden="true">
                {Array.from({ length: Math.min(count, 9) }, (_, k) => (
                  <motion.span key={k} layout initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ rotate: (k - Math.min(count, 9) / 2) * 5 }}>
                    <CardBack size="sm" />
                  </motion.span>
                ))}
                <em className="count">{count}</em>
              </div>
              {count === 1 && <span className="alarm">Last card</span>}
              {count === 2 && <span className="alarm semi">Semi last</span>}
            </div>
          );
        })}
      </div>

      <div className="whot-center">
        <button
          className={`market${myTurn ? ' can' : ''}`}
          disabled={!myTurn}
          onClick={() => {
            play('deal');
            buzz();
            send({ type: 'draw' });
          }}
          aria-label={s.pending ? `Pick ${s.pending.cards} from the market` : 'Go to market'}
        >
          <span className="stack">
            <CardBack size="lg" />
            <CardBack size="lg" />
            <CardBack size="lg" />
          </span>
          <span className="mono">{s.market} in market</span>
          {myTurn && <span className="cta">{s.pending ? `Pick ${s.pending.cards}` : 'Go to market'}</span>}
        </button>

        <div className="pile" aria-label={`Top card: ${top.shape === 'whot' ? 'Whot' : `${top.n} of ${SHAPE_NAME[top.shape]}`}`}>
          {s.pile.slice(-4, -1).map((c, k) => (
            <span key={c.id} className="under" style={{ rotate: `${(k - 1) * 9}deg` }}>
              <CardFace card={c} size="lg" />
            </span>
          ))}
          <AnimatePresence mode="popLayout">
            <motion.span key={top.id} className="topcard" initial={{ y: -90, rotate: -25, scale: 1.2, opacity: 0 }} animate={{ y: 0, rotate: 3, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
              <CardFace card={top} size="lg" />
            </motion.span>
          </AnimatePresence>
          {s.called && (
            <motion.span className="called" initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Shape shape={s.called} size={26} colour="#fff" />
            </motion.span>
          )}
        </div>

        <div className="whot-side">
          <AnimatePresence mode="wait">
            {banner && (
              <motion.div key={banner} className={`banner${s.pending ? ' hot' : ''}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <span className="mono">{s.pending ? (s.pending.n === 2 ? 'Pick two' : 'Pick three') : 'Called shape'}</span>
                <b>{banner}</b>
              </motion.div>
            )}
          </AnimatePresence>
          <ul className="whot-log">
            {s.log.slice(-4).map((l, k, arr) => (
              <motion.li key={`${s.seq}-${k}-${l.text}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: k === arr.length - 1 ? 1 : 0.55, y: 0 }}>
                {l.by >= 0 ? <b>{l.by === mine ? 'You' : firstName(seatOf(seats, s.players[l.by])?.name ?? '')}</b> : null} {l.text}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      <div className="whot-me">
        {mine >= 0 ? (
          <>
            <div className="whot-actions">
              <PlayerChip seat={seatOf(seats, me)!} me sub={myTurn ? 'Your turn' : `${hand.length} cards`} active={myTurn} deadline={turnDeadline} total={turnSeconds} now={now} />
              <div className="acts">
                {needCall && myTurn && (
                  <button className={`btn-call${declare ? ' on' : ''}`} onClick={() => (setDeclare(!declare), play('tap'), buzz())}>
                    {declare ? '✓ ' : ''}
                    {needCall === 'last' ? 'Last card!' : 'Semi last card!'}
                  </button>
                )}
                {pickedCard && myTurn && canPlay(s, pickedCard) && (
                  <motion.button initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="btn-play" onClick={() => (pickedCard.shape === 'whot' ? setAsking(pickedCard) : playCard(pickedCard))}>
                    Play {pickedCard.shape === 'whot' ? 'Whot' : `${pickedCard.n} of ${SHAPE_NAME[pickedCard.shape]}`}
                  </motion.button>
                )}
              </div>
            </div>
            <div className="hand" style={{ ['--n' as string]: sorted.length }}>
              <AnimatePresence initial={false}>
                {sorted.map((c, k) => {
                  const ok = myTurn && canPlay(s, c);
                  const mid = (sorted.length - 1) / 2;
                  return (
                    <motion.button
                      key={c.id}
                      layout
                      className={`hand-card${ok ? ' ok' : ''}${picked === c.id ? ' picked' : ''}${myTurn && !ok ? ' dim' : ''}`}
                      initial={{ y: 120, opacity: 0 }}
                      animate={{ y: picked === c.id ? -26 : ok ? -8 : 0, opacity: 1, rotate: sorted.length > 4 ? (k - mid) * Math.min(4, 22 / sorted.length) : 0 }}
                      exit={{ y: -160, opacity: 0, scale: 0.8 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                      onClick={() => tapCard(c)}
                      aria-label={c.shape === 'whot' ? 'Whot 20' : `${c.n} of ${SHAPE_NAME[c.shape]}`}
                    >
                      <CardFace card={c} />
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
            {myTurn && !pickedCard && <p className="hint">Tap a glowing card to pick it, tap again to play. No match? Go to market.</p>}
          </>
        ) : (
          <p className="hint">You are watching this game.</p>
        )}
      </div>

      <AnimatePresence>
        {asking && (
          <motion.div className="sheet-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAsking(null)}>
            <motion.div className="shape-pick" initial={{ y: 40, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 40 }} onClick={(e) => e.stopPropagation()}>
              <h3>I need…</h3>
              <div className="shapes">
                {SHAPES.map((sh) => (
                  <button key={sh} onClick={() => playCard(asking, sh)}>
                    <Shape shape={sh} size={42} />
                    <span>{SHAPE_NAME[sh]}</span>
                    <small>{hand.filter((c) => c.shape === sh).length} in hand</small>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
