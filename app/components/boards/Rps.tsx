import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { BEATS, choicesFor, commitHash, type Choice, type RpsState } from '~/engine/games/rps';
import { buzz, play } from '~/lib/sound';
import type { StageProps } from '~/lib/stage';
import { firstName, seatOf } from '~/lib/stage';
import { Avatar } from '../Avatar';
import { Countdown, TimeBar, useChange } from '../game/common';

const GLYPH: Record<Choice, string> = { rock: '✊', paper: '✋', scissors: '✌️', lizard: '🦎', spock: '🖖' };
const LABEL: Record<Choice, string> = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors', lizard: 'Lizard', spock: 'Spock' };

type View = Omit<RpsState, 'commits'> & { commits: boolean[] };

const randomSalt = () => {
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
};

export default function RpsBoard({ view, me, seats, send, now, result }: StageProps<View>) {
  const s = view;
  const mine = me ? s.players.indexOf(me) : -1;
  const opp = mine === 1 ? 0 : 1;
  const left = mine >= 0 ? mine : 0;
  const sealed = useRef<{ round: number; choice: Choice; salt: string } | null>(null);
  const round = s.history.length;
  const options = choicesFor(s.mode);
  const need = Math.floor(s.bestOf / 2) + 1;

  // Picks are sealed with a fingerprint first, then revealed when both are in.
  const choose = (choice: Choice) => {
    if (mine < 0 || s.phase !== 'choose' || s.commits[mine]) return;
    const salt = randomSalt();
    sealed.current = { round, choice, salt };
    play('tap');
    buzz();
    send({ type: 'commit', hash: commitHash(choice, salt) });
  };
  useEffect(() => {
    const c = sealed.current;
    if (mine < 0 || !c || c.round !== round || s.picks[mine]) return;
    if (s.phase === 'reveal') send({ type: 'reveal', choice: c.choice, salt: c.salt });
  }, [s.phase, round, mine, s.picks, send]);

  const lastRound = s.history[s.history.length - 1];
  const showing = s.phase === 'result' || s.phase === 'over' ? lastRound : null;
  useChange(showing ? round : -1, () => {
    if (!showing || mine < 0) return;
    if (showing.winner === null) play('tap');
    else if (showing.winner === mine) play('correct');
    else play('wrong');
  });

  const myPick: Choice | null = mine >= 0 ? (s.picks[mine] ?? (sealed.current?.round === round ? sealed.current.choice : null)) : null;
  const seatL = seatOf(seats, s.players[left])!;
  const seatR = seatOf(seats, s.players[1 - left])!;

  const verdict = (() => {
    if (!showing) return null;
    if (showing.winner === null) return showing.picks.every(Boolean) ? 'Same pick. Nobody scores.' : 'Nobody picked in time.';
    const w = showing.winner;
    const [a, b] = [showing.picks[w], showing.picks[1 - w]];
    const who = w === mine ? 'You win the round' : `${firstName(seatOf(seats, s.players[w])!.name)} wins the round`;
    if (a && b) return `${LABEL[a]} ${BEATS[a][b]} ${LABEL[b].toLowerCase()}. ${who}.`;
    return `${who}: the other player ran out of time.`;
  })();

  const Hand = ({ side, pick, waiting }: { side: 'l' | 'r'; pick: Choice | null; waiting: boolean }) => (
    <div className={`rps-hand ${side}`}>
      <AnimatePresence mode="wait">
        {pick && showing ? (
          <motion.span key={pick} className="glyph" initial={{ scale: 0.3, rotate: side === 'l' ? -30 : 30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 16 }}>
            {GLYPH[pick]}
          </motion.span>
        ) : (
          <motion.span key="fist" className="glyph shaking" animate={waiting ? { y: [0, -18, 0] } : { y: 0 }} transition={waiting ? { repeat: Infinity, duration: 0.55 } : {}}>
            ✊
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="board-rps">
      <div className="rps-score">
        {[seatL, seatR].map((seat, k) => {
          const idx = k === 0 ? left : 1 - left;
          return (
            <div key={seat.id} className={`side ${k ? 'r' : 'l'}`}>
              <Avatar name={seat.name} colour={seat.avatar} size={44} bot={!!seat.bot} off={!seat.connected} />
              <div>
                <b>
                  {idx === mine ? 'You' : firstName(seat.name)}
                  {s.phase === 'choose' && s.commits[idx] && <span className="locked">locked in</span>}
                </b>
                <div className="pips" aria-label={`${s.wins[idx]} rounds won`}>
                  {Array.from({ length: need }, (_, i) => (
                    <i key={i} className={i < s.wins[idx] ? 'on' : ''} />
                  ))}
                </div>
              </div>
              <span className="big">{s.wins[idx]}</span>
            </div>
          );
        })}
      </div>

      <div className="rps-arena">
        <Hand side="l" pick={showing ? showing.picks[left] : null} waiting={s.phase === 'choose' || s.phase === 'reveal'} />
        <div className="rps-mid">
          <span className="mono">
            Round {Math.min(round + (showing ? 0 : 1), s.bestOf)} · best of {s.bestOf}
          </span>
          {s.phase === 'choose' && <Countdown deadline={s.deadline} now={now} />}
          {s.phase === 'reveal' && <span className="vs">Reveal!</span>}
          {showing && <span className="vs">vs</span>}
        </div>
        <Hand side="r" pick={showing ? showing.picks[1 - left] : null} waiting={s.phase === 'choose' || s.phase === 'reveal'} />
      </div>

      {s.phase === 'choose' && <TimeBar start={s.deadline - s.seconds * 1000} deadline={s.deadline} now={now} />}

      <div className="rps-foot">
        <AnimatePresence mode="wait">
          {verdict ? (
            <motion.p key={`v${round}`} className="status big" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {result ? result.summary : verdict}
            </motion.p>
          ) : mine >= 0 && s.phase === 'choose' && !s.commits[mine] ? (
            <motion.div key="pick" className={`rps-picks n${options.length}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {options.map((c) => (
                <button key={c} onClick={() => choose(c)}>
                  <span>{GLYPH[c]}</span>
                  <b>{LABEL[c]}</b>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.p key="wait" className="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {mine < 0
                ? 'Watching…'
                : myPick
                  ? `You picked ${LABEL[myPick].toLowerCase()}. Waiting for ${firstName(seatOf(seats, s.players[opp])!.name)}…`
                  : 'Waiting…'}
            </motion.p>
          )}
        </AnimatePresence>
        {s.history.length > 0 && (
          <ol className="rps-history" aria-label="Previous rounds">
            {s.history.map((h, i) => (
              <li key={i} className={h.winner === null ? 'tie' : h.winner === left ? 'l' : 'r'}>
                <span>{h.picks[left] ? GLYPH[h.picks[left]!] : '⌛'}</span>
                <span>{h.picks[1 - left] ? GLYPH[h.picks[1 - left]!] : '⌛'}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
