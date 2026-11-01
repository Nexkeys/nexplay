import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import {
  highlights,
  KIND_LABEL,
  likelyTarget,
  syncPercent,
  syncTitle,
  type Answer,
  type InSyncState,
  type Kind,
  type Prompt,
  type RoundRecord
} from '~/engine/games/in-sync';
import { buzz, play } from '~/lib/sound';
import type { Seat, StageProps } from '~/lib/stage';
import { firstName, seatOf } from '~/lib/stage';
import '~/styles/games/in-sync.css';
import { Avatar } from '../Avatar';
import { Countdown, TimeBar, useChange } from '../game/common';

const EASE = [0.22, 1, 0.36, 1] as const;
const HEART = 'M12 21.2s-7.6-4.7-9.7-9.4C.8 8.4 2.8 4.4 6.6 4c2.1-.2 3.9.9 5.4 2.8C13.5 4.9 15.3 3.8 17.4 4c3.8.4 5.8 4.4 4.3 7.8-2.1 4.7-9.7 9.4-9.7 9.4z';
const VIBE_LABEL = { cute: 'Cute', deep: 'Deep', flirty: 'Flirty' } as const;

// ---------- crafted icons ----------
export function HeartIcon({ size = 16, fill = 'currentColor', stroke, className }: { size?: number; fill?: string; stroke?: string; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={HEART} fill={fill} stroke={stroke} strokeWidth={stroke ? 1.6 : 0} strokeLinejoin="round" />
    </svg>
  );
}

function KindIcon({ kind, size = 22 }: { kind: Kind; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'tot':
      // A heart split down the middle: this half, or that one.
      return (
        <svg {...common}>
          <defs>
            <clipPath id="is-k-l">
              <rect x="0" y="0" width="11.4" height="24" />
            </clipPath>
          </defs>
          <path d={HEART} fill="currentColor" stroke="none" clipPath="url(#is-k-l)" opacity=".9" />
          <path d={HEART} />
          <path d="M12 6.8l-1.4 3.4 2.4 2.4-1.6 3.6" strokeWidth="1.5" />
        </svg>
      );
    case 'mind':
      // A thought bubble holding a heart.
      return (
        <svg {...common}>
          <path d="M6.5 15.5C3.9 15.2 2 13.2 2 10.8 2 8 4.5 5.8 7.4 6 8.4 4.2 10.3 3 12.6 3c2.6 0 4.8 1.6 5.6 3.9 2.2.3 3.8 2.1 3.8 4.3 0 2.4-2 4.3-4.5 4.3H6.5z" />
          <circle cx="6" cy="18.6" r="1.4" />
          <circle cx="3.6" cy="21.4" r=".8" />
          <path d="M12 13.6s-3.1-1.9-3.1-3.8c0-1.1.9-1.8 1.7-1.8.7 0 1.1.4 1.4.9.3-.5.7-.9 1.4-.9.8 0 1.7.7 1.7 1.8 0 1.9-3.1 3.8-3.1 3.8z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'finish':
      // A pen finishing a line.
      return (
        <svg {...common}>
          <path d="M15.2 3.8l5 5L9.6 19.4 4 20.6l1.2-5.6L15.2 3.8z" />
          <path d="M13 6l5 5" />
          <circle cx="13.5" cy="21" r=".9" fill="currentColor" stroke="none" />
          <circle cx="17" cy="21" r=".9" fill="currentColor" stroke="none" />
          <circle cx="20.5" cy="21" r=".9" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'scale':
      // Five rising bars, the top one a heart.
      return (
        <svg {...common}>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={2 + i * 4.4} y={17 - i * 3} width="3" height={4 + i * 3} rx="1.2" fill={i === 3 ? 'currentColor' : 'none'} />
          ))}
          <path d="M20.6 7.6s-2.6-1.6-2.6-3.2c0-.9.7-1.5 1.4-1.5.6 0 .9.3 1.2.7.3-.4.6-.7 1.2-.7.7 0 1.4.6 1.4 1.5 0 1.6-2.6 3.2-2.6 3.2z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'likely':
      // Two people, one pointing at the other.
      return (
        <svg {...common}>
          <circle cx="7" cy="6.5" r="2.6" />
          <path d="M2.5 20v-2.8c0-2.6 2-4.6 4.5-4.6s4.5 2 4.5 4.6V20" />
          <circle cx="17.5" cy="8.5" r="2.3" />
          <path d="M13.6 20v-2c0-2.3 1.7-4.1 3.9-4.1s3.9 1.8 3.9 4.1v2" />
          <path d="M10.5 11.2l3.4-1.6m-1.3-1l1.3 1-.6 1.5" strokeWidth="1.5" />
        </svg>
      );
  }
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5l3.2 3.2L13 4.8" />
    </svg>
  );
}

function CrossIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/** A heart that fills from the bottom with the running sync score. */
function SyncMeter({ pct, played }: { pct: number; played: number }) {
  return (
    <div className="is-meter" aria-label={`${pct}% in sync`}>
      <svg width="46" height="44" viewBox="0 0 24 23" aria-hidden="true">
        <defs>
          <clipPath id="is-meter-clip">
            <path d={HEART} />
          </clipPath>
          <linearGradient id="is-meter-fill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#c2345b" />
            <stop offset="1" stopColor="#ff7aa2" />
          </linearGradient>
        </defs>
        <path d={HEART} fill="rgba(255,255,255,.06)" />
        <g clipPath="url(#is-meter-clip)">
          <motion.rect x="0" width="24" height="23" fill="url(#is-meter-fill)" initial={false} animate={{ y: 22 - (played ? pct / 100 : 0) * 19 }} transition={{ type: 'spring', stiffness: 90, damping: 16 }} />
          <motion.path
            d="M-2 0q3-1.6 6 0t6 0 6 0 6 0 6 0 6 0"
            fill="none"
            stroke="rgba(255,255,255,.45)"
            strokeWidth=".8"
            initial={false}
            animate={{ y: 22 - (played ? pct / 100 : 0) * 19, x: [0, -6] }}
            transition={{ y: { type: 'spring', stiffness: 90, damping: 16 }, x: { duration: 1.6, repeat: Infinity, ease: 'linear' } }}
          />
        </g>
        <path d={HEART} fill="none" stroke="#ff8fb0" strokeOpacity=".75" strokeWidth="1.1" />
      </svg>
      <span className="is-meter-txt">
        <motion.b key={pct} initial={{ scale: 1.3, color: '#ffd2df' }} animate={{ scale: 1, color: '#f5ecd9' }}>
          {played ? `${pct}%` : '–'}
        </motion.b>
        <small>in sync</small>
      </span>
    </div>
  );
}

/** Little hearts that burst out of a match. */
function HeartBurst() {
  return (
    <div className="is-burst" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, scale: 0.2, opacity: 1 }}
            animate={{ x: Math.cos(a) * (70 + (i % 3) * 18), y: Math.sin(a) * (46 + (i % 2) * 16) - 10, scale: 0.6 + (i % 3) * 0.25, opacity: 0, rotate: (i % 2 ? 1 : -1) * 25 }}
            transition={{ duration: 1.1, delay: 0.55 + (i % 4) * 0.03, ease: 'easeOut' }}
          >
            <HeartIcon size={16} fill={i % 3 ? '#ff7aa2' : '#e8b450'} />
          </motion.span>
        );
      })}
    </div>
  );
}

/** Two hearts that slide together on a match, or drift apart on a miss. */
function VerdictMark({ points }: { points: number }) {
  const together = points >= 60;
  return (
    <svg width="58" height="40" viewBox="0 0 58 40" aria-hidden="true">
      <motion.g initial={{ x: -8, opacity: 0 }} animate={{ x: together ? 4 : -4, opacity: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 14 }}>
        <path d={HEART} transform="translate(2 6) scale(1.2)" fill={together ? '#ff5c8a' : 'rgba(255,255,255,.18)'} />
      </motion.g>
      <motion.g initial={{ x: 8, opacity: 0 }} animate={{ x: together ? -4 : 4, opacity: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 14 }}>
        <path d={HEART} transform="translate(27 6) scale(1.2)" fill={together ? '#e8b450' : 'rgba(255,255,255,.1)'} stroke={together ? 'none' : 'rgba(255,255,255,.35)'} strokeWidth="1.2" />
      </motion.g>
    </svg>
  );
}

// ---------- helpers ----------
const nameOf = (seats: Seat[], id: string | null | undefined, me: string | null) => (id && id === me ? 'You' : firstName(seatOf(seats, id)?.name ?? 'Partner'));

function answerText(prompt: Prompt, a: Answer | null | undefined, by: string, players: string[], seats: Seat[], me: string | null): string {
  if (!a || a.choice < 0) return 'Ran out of time';
  if (prompt.kind === 'scale') return String(a.choice);
  if (prompt.kind === 'likely') return nameOf(seats, likelyTarget(players, by, a.choice), me);
  return prompt.options[a.choice] ?? '';
}

function Question({ prompt, subject, me, seats }: { prompt: Prompt; subject: string | null; me: string | null; seats: Seat[] }) {
  if (prompt.kind === 'tot')
    return (
      <h2 className="is-q">
        {prompt.text && <small>{prompt.text}</small>}
        {prompt.options[0]} <em>or</em> {prompt.options[1]}?
      </h2>
    );
  if (prompt.kind === 'likely')
    return (
      <h2 className="is-q">
        <small>Who's more likely to…</small>
        {prompt.text}?
      </h2>
    );
  if (prompt.kind === 'mind') {
    const about = subject === me ? 'About you. Answer honestly.' : `About ${nameOf(seats, subject, me)}. What would they say?`;
    return (
      <h2 className="is-q">
        <small className={subject === me ? 'self' : 'guess'}>{about}</small>
        {prompt.text}
      </h2>
    );
  }
  return <h2 className="is-q">{prompt.text}</h2>;
}

// ---------- inputs ----------
function Choices({ prompt, me, partner, seats, onPick }: { prompt: Prompt; me: string; partner: string; seats: Seat[]; onPick: (i: number) => void }) {
  if (prompt.kind === 'tot')
    return (
      <div className="is-tot">
        {prompt.options.map((o, i) => (
          <motion.button key={i} className={`is-big t${i}`} onClick={() => onPick(i)} initial={{ opacity: 0, x: i ? 30 : -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 + i * 0.06, ease: EASE }} whileTap={{ scale: 0.96 }}>
            {o}
          </motion.button>
        ))}
        <span className="is-or" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="19" fill="#1f1712" stroke="#ff8fb0" strokeWidth="1.5" />
            <text x="22" y="27" textAnchor="middle" fontFamily="var(--display)" fontWeight="800" fontSize="15" fill="#ffd2df">
              or
            </text>
          </svg>
        </span>
      </div>
    );
  if (prompt.kind === 'likely') {
    const mine = seatOf(seats, me);
    const theirs = seatOf(seats, partner);
    return (
      <div className="is-likely">
        {[mine, theirs].map((st, i) => (
          <motion.button key={i} className="is-person" onClick={() => onPick(i)} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.07 }} whileTap={{ scale: 0.95 }}>
            {st && <Avatar name={st.name} colour={st.avatar} size={54} bot={!!st.bot} />}
            <b>{i === 0 ? 'Me' : firstName(st?.name ?? 'Partner')}</b>
          </motion.button>
        ))}
      </div>
    );
  }
  return (
    <div className="is-opts">
      {prompt.options.map((o, i) => (
        <motion.button key={i} className="is-opt" onClick={() => onPick(i)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} whileTap={{ scale: 0.97 }}>
          <HeartIcon size={14} fill="none" stroke="currentColor" className="is-bullet" />
          <span>{o}</span>
        </motion.button>
      ))}
    </div>
  );
}

function ScaleRow({ label, value, onPick, low, high }: { label: string; value: number; onPick: (n: number) => void; low: string; high: string }) {
  return (
    <div className="is-scale-row">
      <span className="is-scale-label">{label}</span>
      <div className="is-dots" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} role="radio" aria-checked={value === n} className={value === n ? 'on' : value > 0 && n < value ? 'under' : ''} onClick={() => onPick(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="is-scale-ends">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

function ScaleInput({ prompt, partnerName, onSend }: { prompt: Prompt; partnerName: string; onSend: (self: number, guess: number) => void }) {
  const [self, setSelf] = useState(0);
  const [guess, setGuess] = useState(0);
  const tap = (fn: (n: number) => void) => (n: number) => {
    play('tap');
    fn(n);
  };
  return (
    <div className="is-scale">
      <ScaleRow label="You" value={self} onPick={tap(setSelf)} low={prompt.options[0]} high={prompt.options[1]} />
      <ScaleRow label={`Your guess for ${partnerName}`} value={guess} onPick={tap(setGuess)} low={prompt.options[0]} high={prompt.options[1]} />
      <motion.button className="is-lock" disabled={!self || !guess} onClick={() => onSend(self, guess)} whileTap={{ scale: 0.97 }}>
        <HeartIcon size={16} />
        Lock in
      </motion.button>
    </div>
  );
}

function Waiting({ partnerName, partnerIn }: { partnerName: string; partnerIn: boolean }) {
  return (
    <motion.div className="is-wait" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <svg className="is-beat" width="120" height="44" viewBox="0 0 120 44" aria-hidden="true">
        <path d="M2 24h30l6-12 8 24 7-30 7 30 5-12h53" fill="none" stroke="#ff5c8a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <b>Locked in</b>
      <span>{partnerIn ? `${partnerName} is in too…` : `Waiting for ${partnerName}…`}</span>
    </motion.div>
  );
}

// ---------- reveal ----------
function RevealCards({ round, players, me, seats }: { round: RoundRecord; players: string[]; me: string | null; seats: Seat[] }) {
  const left = me && players.includes(me) ? me : players[0];
  const order = [left, players.find((p) => p !== left)!];
  const { prompt, subject } = round;
  const tag = (id: string) => {
    if (prompt.kind === 'mind') return id === subject ? (id === me ? 'Your answer' : `${nameOf(seats, id, me)}'s answer`) : id === me ? 'Your guess' : `${nameOf(seats, id, me)}'s guess`;
    if (prompt.kind === 'scale') return id === me ? 'You said' : `${nameOf(seats, id, me)} said`;
    return id === me ? 'You picked' : `${nameOf(seats, id, me)} picked`;
  };
  const verdict = round.points === 100 ? 'In sync!' : round.points >= 60 ? 'So close!' : round.points > 0 ? 'Almost' : 'Not quite';
  return (
    <div className="is-reveal">
      <div className="is-pair-cards">
        {order.map((id, i) => {
          const st = seatOf(seats, id);
          const a = round.answers[id];
          const other = order[1 - i];
          const otherA = round.answers[other];
          return (
            <motion.div
              key={id}
              className={`is-rcard${round.points >= 60 ? ' match' : ''}${!a ? ' empty' : ''}`}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.22, duration: 0.5, ease: EASE }}
            >
              <span className="is-rwho">
                {st && <Avatar name={st.name} colour={st.avatar} size={26} bot={!!st.bot} />}
                <small>{tag(id)}</small>
              </span>
              <b className={prompt.kind === 'scale' ? 'is-rnum' : ''}>{answerText(prompt, a, id, players, seats, me)}</b>
              {prompt.kind === 'scale' && a && (
                <span className={`is-rguess${otherA && otherA.choice === a.guess ? ' ok' : ''}`}>
                  {otherA && Math.abs(otherA.choice - a.guess) <= 1 ? <CheckIcon size={12} /> : <CrossIcon size={12} />}
                  guessed {nameOf(seats, other, me)} {a.guess}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
      <motion.div className={`is-verdict${round.points >= 60 ? ' good' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <VerdictMark points={round.points} />
        <b>{verdict}</b>
        {round.points > 0 && <span>+{round.points}</span>}
      </motion.div>
      {round.points === 100 && <HeartBurst />}
    </div>
  );
}

// ---------- end ----------
const BADGE_TONES = [
  { min: 90, a: '#ff5c8a', b: '#e8b450' },
  { min: 75, a: '#ff7aa2', b: '#c2345b' },
  { min: 60, a: '#e8b450', b: '#ff6a4d' },
  { min: 45, a: '#ff8fb0', b: '#8e2f6b' },
  { min: 30, a: '#c48bff', b: '#8e2f6b' },
  { min: 0, a: '#7ab8ff', b: '#c2345b' }
];

/** A rosette with ribbon tails and two hearts, tinted by how in sync you were. */
function SyncBadge({ pct }: { pct: number }) {
  const tone = BADGE_TONES.find((t) => pct >= t.min)!;
  const petals = 18;
  return (
    <svg className="is-badge" width="150" height="160" viewBox="0 0 150 160" aria-hidden="true">
      <defs>
        <radialGradient id="is-badge-core" cx=".4" cy=".35">
          <stop offset="0" stopColor="#3b2229" />
          <stop offset="1" stopColor="#1f1712" />
        </radialGradient>
        <linearGradient id="is-badge-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={tone.a} />
          <stop offset="1" stopColor={tone.b} />
        </linearGradient>
      </defs>
      <path d="M52 112l-14 44 16-8 10 14 10-44z" fill={tone.b} />
      <path d="M98 112l14 44-16-8-10 14-10-44z" fill={tone.a} />
      {Array.from({ length: petals }, (_, i) => {
        const ang = (i / petals) * Math.PI * 2;
        return <circle key={i} cx={75 + Math.cos(ang) * 56} cy={74 + Math.sin(ang) * 56} r="11" fill="url(#is-badge-ring)" />;
      })}
      <circle cx="75" cy="74" r="56" fill="url(#is-badge-ring)" />
      <circle cx="75" cy="74" r="47" fill="url(#is-badge-core)" />
      <circle cx="75" cy="74" r="47" fill="none" stroke="#fff" strokeOpacity=".18" strokeDasharray="2 4" />
      <path d={HEART} transform="translate(52 40) scale(1.1)" fill={tone.a} opacity=".95" />
      <path d={HEART} transform="translate(72 40) scale(1.1)" fill={tone.b} opacity=".95" />
      <text x="75" y="96" textAnchor="middle" fontFamily="var(--display)" fontWeight="800" fontSize="28" fill="#f5ecd9" letterSpacing="-1">
        {pct}%
      </text>
    </svg>
  );
}

function EndSummary({ s, me, seats }: { s: InSyncState; me: string | null; seats: Seat[] }) {
  const pct = syncPercent(s);
  const title = syncTitle(pct);
  const { misses, matches } = highlights(s.history, s.players);
  const botId = Object.keys(s.personas)[0];
  const persona = botId ? s.personas[botId] : null;
  const line = (r: RoundRecord) => {
    const [x, y] = s.players;
    const kind = r.prompt.kind;
    const q = kind === 'tot' ? `${r.prompt.options[0]} or ${r.prompt.options[1]}?` : kind === 'likely' ? `Who's more likely to ${r.prompt.text}?` : r.prompt.text;
    if (kind === 'scale') {
      const ax = r.answers[x]!;
      const ay = r.answers[y]!;
      return { q, a: `${nameOf(seats, x, me)} said ${ax.choice}, ${nameOf(seats, y, me)} guessed ${ay.guess}`, b: `${nameOf(seats, y, me)} said ${ay.choice}, ${nameOf(seats, x, me)} guessed ${ax.guess}` };
    }
    const tagged = (id: string) => `${nameOf(seats, id, me)}${kind === 'mind' ? (id === r.subject ? ' answered' : ' guessed') : ''}: ${answerText(r.prompt, r.answers[id], id, s.players, seats, me)}`;
    return { q, a: tagged(x), b: tagged(y) };
  };
  return (
    <motion.div className="is-end" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
      <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 12, delay: 0.15 }}>
        <SyncBadge pct={pct} />
      </motion.div>
      <h2>{title.title}</h2>
      <p className="is-end-line">{title.line}</p>
      {persona && (
        <section className="is-persona">
          <h3>{nameOf(seats, botId, me)}'s secret persona</h3>
          <div>
            {persona.traits.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </section>
      )}
      {misses.length > 0 && (
        <section className="is-moments">
          <h3>Best mismatches</h3>
          <ul>
            {misses.map((r, i) => {
              const l = line(r);
              return (
                <motion.li key={i} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.12 }}>
                  <KindIcon kind={r.prompt.kind} size={18} />
                  <div>
                    <b>{l.q}</b>
                    <span>{l.a}</span>
                    <span>{l.b}</span>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </section>
      )}
      {matches.length > 0 && (
        <section className="is-moments sweet">
          <h3>Sweetest matches</h3>
          <ul>
            {matches.map((r, i) => {
              const l = line(r);
              return (
                <li key={i}>
                  <HeartIcon size={16} fill="#ff5c8a" />
                  <div>
                    <b>{l.q}</b>
                    <span>{r.prompt.kind === 'scale' ? 'Both read each other perfectly.' : `Both: ${answerText(r.prompt, r.answers[s.players[0]], s.players[0], s.players, seats, me)}`}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </motion.div>
  );
}

// ---------- board ----------
export default function InSyncBoard({ view, me, seats, send, now }: StageProps<InSyncState>) {
  const s = view;
  const playing = !!me && s.players.includes(me);
  const left = playing ? me! : s.players[0];
  const partner = s.players.find((p) => p !== left)!;
  const partnerName = nameOf(seats, partner, me);
  const mine = playing ? s.answers[me!] : undefined;
  const last = s.history[s.history.length - 1];
  const pct = syncPercent(s);

  useChange(s.phase === 'reveal' ? s.history.length : -1, () => {
    if (s.phase !== 'reveal' || !last) return;
    if (last.points >= 60) {
      play('correct');
      buzz([20, 40, 20]);
    } else play('wrong');
  });

  const answer = (choice: number, guess?: number) => {
    if (!playing || s.phase !== 'answer' || mine) return;
    play('tap');
    buzz();
    send(guess === undefined ? { type: 'answer', choice } : { type: 'answer', choice, guess });
  };

  if (s.phase === 'over') {
    return (
      <div className="board-insync over">
        <EndSummary s={s} me={me} seats={seats} />
      </div>
    );
  }

  const kind = s.prompt.kind;
  const iAmReady = playing && s.ready.includes(me!);
  const partnerIn = !!s.answers[partner];

  return (
    <div className="board-insync">
      <header className="is-top">
        <div className="is-couple">
          {[left, partner].map((id, i) => {
            const st = seatOf(seats, id);
            const done = s.phase === 'answer' ? !!s.answers[id] : true;
            return (
              <span key={id} className={`is-who${done ? ' in' : ''}`}>
                {st && <Avatar name={st.name} colour={st.avatar} size={34} bot={!!st.bot} off={!st.connected} />}
                {i === 0 && (
                  <svg className="is-link" width="22" height="20" viewBox="0 0 24 23" aria-hidden="true">
                    <path d={HEART} fill={s.phase === 'reveal' && (last?.points ?? 0) >= 60 ? '#ff5c8a' : 'rgba(255,143,176,.35)'} />
                  </svg>
                )}
                {s.phase === 'answer' && done && (
                  <i className="is-tick">
                    <CheckIcon size={10} />
                  </i>
                )}
              </span>
            );
          })}
        </div>
        <SyncMeter pct={pct} played={s.history.length} />
        {s.phase === 'answer' ? <Countdown deadline={s.deadline} now={now} /> : <span className="is-round-badge">{s.round}/{s.total}</span>}
      </header>
      <div className="is-time">{s.phase === 'answer' ? <TimeBar start={s.start} deadline={s.deadline} now={now} tone="#ff5c8a" /> : <div className="timebar" />}</div>

      <AnimatePresence mode="wait">
        <motion.section
          key={`${s.round}`}
          className={`is-card k-${kind} v-${s.prompt.vibe}`}
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -18, scale: 0.98 }}
          transition={{ duration: 0.38, ease: EASE }}
        >
          <svg className="is-watermark" width="220" height="210" viewBox="0 0 24 23" aria-hidden="true">
            <path d={HEART} fill="currentColor" />
          </svg>
          <div className="is-kind">
            <span className="is-kind-ico">
              <KindIcon kind={kind} />
            </span>
            <b>{KIND_LABEL[kind]}</b>
            <span className="is-vibe">{VIBE_LABEL[s.prompt.vibe]}</span>
            <span className="is-count">
              {s.round} of {s.total}
            </span>
          </div>
          <Question prompt={s.prompt} subject={s.subject} me={me} seats={seats} />

          {s.phase === 'answer' ? (
            !playing ? (
              <p className="is-note">Watching…</p>
            ) : mine ? (
              <Waiting partnerName={partnerName} partnerIn={partnerIn} />
            ) : kind === 'scale' ? (
              <ScaleInput key={s.round} prompt={s.prompt} partnerName={partnerName} onSend={(a, g) => answer(a, g)} />
            ) : (
              <Choices prompt={s.prompt} me={me!} partner={partner} seats={seats} onPick={(i) => answer(i)} />
            )
          ) : (
            last && <RevealCards round={last} players={s.players} me={me} seats={seats} />
          )}
        </motion.section>
      </AnimatePresence>

      {s.phase === 'reveal' && playing && (
        <motion.button className="is-next" disabled={iAmReady} onClick={() => send({ type: 'ready' })} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} whileTap={{ scale: 0.97 }}>
          {iAmReady ? `Waiting for ${partnerName}…` : s.round >= s.total ? 'See how in sync you are' : 'Next'}
          {!iAmReady && (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          )}
        </motion.button>
      )}
    </div>
  );
}
