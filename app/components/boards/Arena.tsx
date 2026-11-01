import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CLASSES,
  CLASS_IDS,
  CLASS_MS,
  LENGTHS,
  REVEAL_MS,
  RULES,
  commitHash,
  describe,
  guardOf,
  needsTarget,
  specialOf,
  stormDamage,
  type Action,
  type ArenaView,
  type ClassId,
  type Fighter,
  type LogEntry,
  type Played
} from '~/engine/games/arena';
import { buzz, play } from '~/lib/sound';
import type { StageProps } from '~/lib/stage';
import { firstName, seatOf } from '~/lib/stage';
import { ActionIcon, ClassPortrait, HitBurst, KoMark, StatusIcon, UnknownPortrait } from '../art/ArenaArt';
import { Countdown, TimeBar, useChange } from '../game/common';
import '~/styles/games/arena.css';

interface Sealed {
  round: number;
  action: Action;
  target: string | null;
  salt: string;
}

const randomSalt = () => {
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
};

// Sealed picks also go in session storage, so a reload mid round can still reveal.
const SEAL_KEY = 'np-arena-seal:';
const saveSeal = (hash: string, seal: Sealed) => {
  try {
    sessionStorage.setItem(SEAL_KEY + hash, JSON.stringify(seal));
  } catch {
    /* private mode: the in memory copy is enough */
  }
};
const loadSeal = (hash: string): Sealed | null => {
  try {
    const raw = sessionStorage.getItem(SEAL_KEY + hash);
    return raw ? (JSON.parse(raw) as Sealed) : null;
  } catch {
    return null;
  }
};

const ACTION_LABEL: Record<Action, string> = { strike: 'Strike', block: 'Block', charge: 'Charge', special: 'Special' };

interface Fx {
  dmg: number;
  heal: number;
  crit: boolean;
  ko: boolean;
}

/** Totals for each fighter from last round's log, for damage numbers and hit effects. */
function effects(log: LogEntry[]): Record<string, Fx> {
  const out: Record<string, Fx> = {};
  const get = (id: string) => (out[id] ??= { dmg: 0, heal: 0, crit: false, ko: false });
  for (const e of log) {
    if (e.k === 'hit') {
      const f = get(e.to);
      f.dmg += e.n;
      if (e.crit) f.crit = true;
    } else if (e.k === 'heal' && e.n > 0) get(e.by).heal += e.n;
    else if (e.k === 'ko') get(e.to).ko = true;
  }
  return out;
}

export default function ArenaBoard({ view: s, me, seats, send, now, result }: StageProps<ArenaView>) {
  const playing = me && s.fighters[me] ? me : null;
  const meF = playing ? s.fighters[playing] : null;
  const seat = (id: string) => seatOf(seats, id);
  const name = (id: string) => (id === me ? 'You' : firstName(seat(id)?.name ?? 'Someone'));
  const colour = (id: string) => seat(id)?.avatar ?? '#e8b450';

  const sealed = useRef(new Map<string, Sealed>());
  const [mine, setMine] = useState<Sealed | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [armed, setArmed] = useState<Action | null>(null);

  const foes = s.players.filter((p) => p !== playing && s.fighters[p].alive);
  const tgt = target && target !== playing && s.fighters[target]?.alive ? target : foes.length === 1 ? foes[0] : null;
  const canAct = !!meF && s.phase === 'choose' && meF.alive && !meF.stunned;
  const myPick = mine && mine.round === s.round ? mine : null;

  useChange(s.round, () => setArmed(null));

  // Everyone is sealed in: reveal the pick that matches my fingerprint.
  const revealed = useRef('');
  useEffect(() => {
    if (!playing || s.phase !== 'reveal' || !s.myCommit || s.picks[playing]) return;
    const seal = sealed.current.get(s.myCommit) ?? loadSeal(s.myCommit);
    const key = `${s.round}:${s.myCommit}`;
    if (!seal || revealed.current === key) return;
    revealed.current = key;
    send({ type: 'reveal', action: seal.action, target: seal.target, salt: seal.salt });
  }, [s.phase, s.myCommit, s.round, playing, s.picks, send]);

  const commit = (action: Action, t: string | null) => {
    if (!canAct) return;
    const seal: Sealed = { round: s.round, action, target: t, salt: randomSalt() };
    const hash = commitHash(action, t, seal.salt);
    sealed.current.set(hash, seal);
    saveSeal(hash, seal);
    setMine(seal);
    setArmed(null);
    play('tap');
    buzz();
    send({ type: 'commit', hash });
  };

  const choose = (action: Action) => {
    if (!canAct || !meF) return;
    if (!needsTarget(meF, action)) return commit(action, null);
    if (tgt) return commit(action, tgt);
    setArmed(action);
    play('tap');
  };

  const tapFighter = (id: string) => {
    if (!canAct || !meF || id === playing || !s.fighters[id]?.alive) return;
    setTarget(id);
    if (armed) commit(armed, id);
    else if (myPick && needsTarget(meF, myPick.action) && myPick.target !== id) commit(myPick.action, id);
    else play('tap');
  };

  // Round results: sounds and buzz for whatever happened to me.
  const showing = s.phase === 'result' || s.phase === 'over';
  const fx = useMemo(() => (showing ? effects(s.log) : {}), [showing, s.log]);
  useChange(showing ? s.round : -1, () => {
    if (!showing) return;
    const mineFx = playing ? fx[playing] : null;
    if (mineFx?.ko) play('lose');
    else if (mineFx && mineFx.dmg >= 15) {
      play('wrong');
      buzz([30, 40, 30]);
    } else if (Object.values(fx).some((f) => f.ko)) play('capture');
    else if (mineFx?.heal) play('correct');
    else play('drop');
  });

  const order = playing ? [playing, ...s.players.filter((p) => p !== playing)] : s.players;
  const n = s.players.length;
  const size = n <= 2 ? 'n2' : n <= 4 ? 'n4' : 'n8';

  if (s.phase === 'class') {
    return <ClassPick s={s} me={playing} name={name} colour={colour} now={now} send={send} />;
  }

  const storm = stormDamage(s);
  const roundsToStorm = s.suddenDeath - s.round;
  const banner =
    s.phase === 'over'
      ? result?.draw
        ? 'Shared win!'
        : `${name(result?.ranking[0]?.[0] ?? '')} ${result?.ranking[0]?.[0] === me ? 'win' : 'wins'}!`
      : storm
        ? `Sudden death: ${storm} damage`
        : roundsToStorm <= 3
          ? `The arena shrinks in ${roundsToStorm} round${roundsToStorm === 1 ? '' : 's'}`
          : 'Last one standing wins';

  return (
    <div className={`board-arena ${size}`}>
      <div className="ar-hud">
        <div className="ar-round">
          <b>Round {s.round}</b>
          <span className={storm ? 'storm' : roundsToStorm <= 3 ? 'warn' : ''}>{banner}</span>
        </div>
        {(s.phase === 'choose' || s.phase === 'reveal') && <Countdown deadline={s.deadline} now={now} />}
      </div>
      {s.phase === 'choose' && <TimeBar start={s.start} deadline={s.deadline} now={now} />}
      {s.phase === 'reveal' && <TimeBar start={s.deadline - REVEAL_MS} deadline={s.deadline} now={now} tone="var(--teal)" />}
      {showing && <div className="timebar ghost" aria-hidden="true" />}

      <div className={`ar-grid ${size}${storm ? ' storming' : ''}`}>
        {order.map((id) => (
          <FighterCard
            key={id}
            f={s.fighters[id]}
            round={s.round}
            name={name(id)}
            colour={colour(id)}
            isMe={id === playing}
            targeted={canAct && id === tgt && id !== playing}
            pickable={canAct && id !== playing && s.fighters[id].alive}
            locked={s.phase === 'choose' && s.locked.includes(id)}
            played={showing ? s.played[id] : undefined}
            history={(s.past[id] ?? []).slice(-3)}
            sealedPick={id === playing && myPick && s.phase !== 'result' ? myPick : null}
            targetName={(t) => name(t)}
            fx={fx[id]}
            onTap={() => tapFighter(id)}
          />
        ))}
      </div>

      <div className="ar-foot">
        {showing ? (
          <RoundLog s={s} me={playing} name={name} />
        ) : meF && meF.alive ? (
          <ActionBar
            f={meF}
            canAct={canAct}
            phase={s.phase}
            armed={armed}
            pick={myPick}
            tgtName={tgt ? name(tgt) : null}
            locked={!!playing && s.locked.includes(playing)}
            name={name}
            onChoose={choose}
          />
        ) : (
          <p className="ar-hint">{meF ? 'You were knocked out. Watch the rest of the fight.' : 'Watching the fight.'}</p>
        )}
      </div>
    </div>
  );
}

// --- class pick -----------------------------------------------------------------------------------

function ClassPick({
  s,
  me,
  name,
  colour,
  now,
  send
}: {
  s: ArenaView;
  me: string | null;
  name: (id: string) => string;
  colour: (id: string) => string;
  now: () => number;
  send: (m: unknown) => void;
}) {
  const mine = me ? s.fighters[me].cls : null;
  const pick = (cls: ClassId) => {
    if (!me || mine) return;
    play('tap');
    buzz();
    send({ type: 'class', cls });
  };
  return (
    <div className="board-arena">
      <div className="ar-hud">
        <div className="ar-round">
          <b>{me && !mine ? 'Choose your fighter' : 'Fighters are choosing'}</b>
          <span>Pick in time or you get a random one</span>
        </div>
        <Countdown deadline={s.deadline} now={now} />
      </div>
      <TimeBar start={s.deadline - CLASS_MS} deadline={s.deadline} now={now} />
      <div className="ar-classes">
        {CLASS_IDS.map((c, i) => {
          const info = CLASSES[c];
          const hp = Math.round(info.hp * LENGTHS[s.length].hp);
          return (
            <motion.button
              key={c}
              className={`ar-class c-${c}${mine === c ? ' on' : ''}`}
              disabled={!me || !!mine}
              onClick={() => pick(c)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileTap={{ scale: 0.96 }}
            >
              <ClassPortrait cls={c} size={58} />
              <b>{info.name}</b>
              <small>{info.role}</small>
              <span className="stats">
                <span>HP {hp}</span>
                <span>Hit {info.strike}</span>
              </span>
              <span className="sp">
                <ActionIcon action="special" cls={c} size={15} />
                {info.special.name} · {info.special.cost}
                <StatusIcon kind="energy" size={11} />
              </span>
            </motion.button>
          );
        })}
      </div>
      <ul className="ar-roster" aria-label="Who picked what">
        {s.players.map((p) => {
          const cls = s.fighters[p].cls;
          return (
            <li key={p} className={cls ? 'done' : ''}>
              {cls ? <ClassPortrait cls={cls} size={26} ring={colour(p)} /> : <UnknownPortrait size={26} />}
              <span>{name(p)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// --- fighter card -----------------------------------------------------------------------------------

function FighterCard({
  f,
  round,
  name,
  colour,
  isMe,
  targeted,
  pickable,
  locked,
  played,
  history,
  sealedPick,
  targetName,
  fx,
  onTap
}: {
  f: Fighter;
  round: number;
  name: string;
  colour: string;
  isMe: boolean;
  targeted: boolean;
  pickable: boolean;
  locked: boolean;
  played?: Played;
  /** Their last few moves, oldest first, for reading habits. */
  history: Played[];
  sealedPick: Sealed | null;
  targetName: (id: string) => string;
  fx?: Fx;
  onTap: () => void;
}) {
  const cls = f.cls ?? 'warrior';
  const pct = f.maxHp ? f.hp / f.maxHp : 0;
  const tone = pct > 0.5 ? 'good' : pct > 0.25 ? 'mid' : 'low';
  const sp = specialOf(f);
  const big = !!fx && fx.dmg >= 18;
  const guard = guardOf(f);
  const badge = played ?? (sealedPick ? { a: sealedPick.action, t: sealedPick.target, rich: false } : null);

  return (
    <motion.div
      key={big ? `shake-${round}` : 'card'}
      className={`ar-card${isMe ? ' me' : ''}${targeted ? ' target' : ''}${pickable ? ' pickable' : ''}${f.alive ? '' : ' out'}`}
      style={{ ['--pc' as string]: colour }}
      animate={big ? { x: [0, -8, 8, -6, 6, -3, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
      onClick={onTap}
      role={pickable ? 'button' : undefined}
      tabIndex={pickable ? 0 : undefined}
      aria-label={`${name}, ${CLASSES[cls].name}, ${f.hp} of ${f.maxHp} HP, ${f.energy} energy${targeted ? ', your target' : ''}`}
      onKeyDown={(e) => {
        if (pickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onTap();
        }
      }}
    >
      {fx && fx.dmg > 0 && <span key={`flash-${round}`} className="ar-flash" aria-hidden="true" />}
      <div className="ar-pt">
        <ClassPortrait cls={cls} size={56} ring={colour} />
        {targeted && (
          <svg className="ar-reticle" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="10 8" />
            <path d="M32 0 V10 M32 54 V64 M0 32 H10 M54 32 H64" stroke="currentColor" strokeWidth="3" />
          </svg>
        )}
      </div>
      <div className="ar-info">
        <div className="ar-name">
          <b>{name}</b>
          <span className="ar-tags">
            {f.burn > 0 && <StatusIcon kind="burn" />}
            {f.stunned && <StatusIcon kind="stun" />}
            {f.alive && guard !== 'full' && <StatusIcon kind={guard === 'half' ? 'tired' : 'broken'} />}
          </span>
        </div>
        <div className={`ar-hp ${tone}`} aria-hidden="true">
          <i style={{ transform: `scaleX(${pct})` }} />
          <span>
            {f.hp}
            <small>/{f.maxHp}</small>
          </span>
        </div>
        <div className="ar-en-row">
          <div className={`ar-en${f.energy >= sp.cost ? ' ready' : ''}`} aria-hidden="true">
            {Array.from({ length: RULES.maxEnergy }, (_, i) => (
              <i key={i} className={`${i < f.energy ? 'on' : ''}${i === sp.cost - 1 ? ' cost' : ''}`} />
            ))}
          </div>
          {history.length > 0 && (
            <span className="ar-hist" aria-label={`Last moves: ${history.map((h) => (h.a === 'special' ? sp.name : h.a)).join(', ')}`}>
              {history.map((h, i) => (
                <span key={i} className={`a-${h.a}`}>
                  <ActionIcon action={h.a} cls={cls} size={11} />
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      {badge && f.alive !== false && (
        <span className={`ar-badge a-${badge.a}${played?.auto ? ' auto' : ''}`}>
          <ActionIcon action={badge.a} cls={cls} size={14} />
          {badge.t && <em>{targetName(badge.t)}</em>}
        </span>
      )}
      {!badge && played === undefined && locked && f.alive && (
        <span className="ar-badge ready" aria-label="locked in">
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
            <path d="M5 12.5 L10 17.5 L19 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {played && !f.alive && fx?.ko && (
        <span className={`ar-badge a-${played.a}`}>
          <ActionIcon action={played.a} cls={cls} size={14} />
        </span>
      )}

      <AnimatePresence>
        {fx && (fx.dmg > 0 || fx.heal > 0) && (
          <motion.span
            key={`pop-${round}`}
            className={`ar-pop${fx.dmg > 0 ? '' : ' heal'}${fx.crit ? ' crit' : ''}`}
            initial={{ opacity: 0, scale: 0.4, y: 6 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.2, 1, 1], y: [6, -4, -8, -16] }}
            transition={{ duration: 2.2, times: [0, 0.15, 0.75, 1] }}
          >
            {fx.dmg > 0 && <HitBurst size={big ? 58 : 46} colour={fx.crit ? '#ffb43d' : '#ff5a3c'} />}
            <b>{fx.dmg > 0 ? `-${fx.dmg}` : `+${fx.heal}`}</b>
          </motion.span>
        )}
      </AnimatePresence>
      {!f.alive && (
        <motion.span className="ar-out" initial={fx?.ko ? { scale: 2.2, opacity: 0, rotate: -20 } : false} animate={{ scale: 1, opacity: 1, rotate: -8 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: fx?.ko ? 0.5 : 0 }}>
          <KoMark size={40} />
        </motion.span>
      )}
    </motion.div>
  );
}

// --- action bar ----------------------------------------------------------------------------------------

function ActionBar({
  f,
  canAct,
  phase,
  armed,
  pick,
  tgtName,
  locked,
  name,
  onChoose
}: {
  f: Fighter;
  canAct: boolean;
  phase: ArenaView['phase'];
  armed: Action | null;
  pick: Sealed | null;
  tgtName: string | null;
  locked: boolean;
  name: (id: string) => string;
  onChoose: (a: Action) => void;
}) {
  const info = CLASSES[f.cls ?? 'warrior'];
  const sp = info.special;
  const guard = guardOf(f);
  const label = (a: Action) => (a === 'special' ? sp.name : ACTION_LABEL[a]);
  const hint = f.stunned
    ? 'You are stunned and sit this round out.'
    : phase === 'reveal'
      ? 'Everyone is in. Revealing…'
      : armed
        ? `Tap a fighter to aim your ${label(armed)}.`
        : pick && locked
          ? `Locked in: ${label(pick.action)}${pick.target ? ` on ${name(pick.target)}` : ''}. You can still change it.`
          : pick
            ? 'Sealing your move…'
            : tgtName
              ? `Target: ${tgtName}. Pick a move.`
              : 'Tap a fighter to target, then pick a move.';
  const sub: Record<Action, string> = {
    strike: `${info.strike} dmg`,
    block: guard === 'full' ? 'Full guard' : guard === 'half' ? 'Tired: half' : 'Guard broken',
    charge: `+${info.charge} energy`,
    special: `${sp.cost} energy`
  };
  return (
    <>
      <p className={`ar-hint${armed ? ' armed' : ''}`}>{hint}</p>
      <div className="ar-actions" role="group" aria-label="Your move">
        {(['strike', 'block', 'charge', 'special'] as Action[]).map((a) => {
          const off = !canAct || (a === 'special' && f.energy < sp.cost) || (a === 'charge' && f.energy >= RULES.maxEnergy);
          const on = pick?.action === a;
          return (
            <motion.button
              key={a}
              className={`ar-act a-${a}${on ? ' on' : ''}${armed === a ? ' armed' : ''}${a === 'block' && guard !== 'full' ? ` g-${guard}` : ''}`}
              disabled={off}
              onClick={() => onChoose(a)}
              whileTap={off ? undefined : { scale: 0.92 }}
              title={a === 'special' ? sp.text : undefined}
            >
              <ActionIcon action={a} cls={f.cls} size={26} />
              <b>{label(a)}</b>
              <small>{sub[a]}</small>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

// --- round log -----------------------------------------------------------------------------------------

const ME = '';

/** The log is written in the third person; this turns lines about the viewer into "you". */
function secondPerson(text: string) {
  const out = text
    .replaceAll(`${ME}'s `, 'your ')
    .replaceAll(`${ME} is `, 'you are ')
    .replaceAll(`${ME} was `, 'you were ')
    .replaceAll(`${ME} burns `, 'you burn ')
    .replaceAll(ME, 'you');
  return out.charAt(0).toUpperCase() + out.slice(1);
}

function RoundLog({ s, me, name }: { s: ArenaView; me: string | null; name: (id: string) => string }) {
  const who = (id: string) => (id === me ? ME : name(id));
  const lines = s.log
    .map((e) => {
      const text = describe(e, who, s);
      return { e, text: text && secondPerson(text) };
    })
    .filter((l): l is { e: LogEntry; text: string } => !!l.text);
  return (
    <div className="ar-log" aria-live="polite">
      <h4>Round {s.round}</h4>
      <ol>
        {lines.length === 0 && <li className="quiet">Everyone held back. Nothing happened.</li>}
        {lines.map(({ e, text }, i) => (
          <motion.li
            key={`${s.round}-${i}`}
            className={`k-${e.k}${e.k === 'hit' && e.crit ? ' crit' : ''}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i, 12) * 0.12 }}
          >
            <LogIcon e={e} fighters={s.fighters} />
            <span>{text}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

function LogIcon({ e, fighters }: { e: LogEntry; fighters: Record<string, Fighter> }) {
  const clsOf = (id: string | null) => (id ? fighters[id]?.cls : null);
  switch (e.k) {
    case 'hit':
      if (e.via === 'burn') return <StatusIcon kind="burn" size={14} />;
      if (e.via === 'strike' || e.via === 'counter') return <ActionIcon action="strike" size={14} />;
      return <ActionIcon action="special" cls={clsOf(e.by)} size={14} />;
    case 'parry':
    case 'auto':
      return <ActionIcon action="block" size={14} />;
    case 'broken':
      return <StatusIcon kind="broken" size={14} />;
    case 'charge':
      return <StatusIcon kind="energy" size={14} />;
    case 'heal':
      return <ActionIcon action="special" cls="cleric" size={14} />;
    case 'stun':
    case 'idle':
      return <StatusIcon kind="stun" size={14} />;
    case 'storm':
      return (
        <svg className="ar-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeDasharray="4 3" />
          <path d="M12 7 V12 L15 14" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'ko':
      return <KoMark size={14} />;
  }
}
