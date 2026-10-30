import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { GameArt } from '~/components/GameArt';
import { Icon } from '~/components/Icon';
import { GAMES, gameMeta, type GameMeta } from '~/engine/catalog';
import type { GameId } from '~/engine/types';
import { useIdentity } from '~/lib/identity';
import { CODE_LENGTH, createRoom, isCode, normaliseCode, sweepExpiredRooms } from '~/lib/rooms';
import { dailyGame } from '~/lib/stats';
import { useProfile } from './layout';

const FILTERS = [
  { id: 'all', label: 'All games' },
  { id: 'classic', label: 'Naija classics' },
  { id: 'board', label: 'Board' },
  { id: 'party', label: 'Party, 2 to 8' }
] as const;

export default function Play() {
  const id = useIdentity();
  const nav = useNavigate();
  const profile = useProfile();
  const [code, setCode] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [sheet, setSheet] = useState<GameMeta | 'pick' | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const daily = gameMeta(dailyGame())!;

  // Tidy up: clear a few rooms whose time is up whenever someone opens the hub.
  useEffect(() => {
    if (id.uid) sweepExpiredRooms().catch(() => {});
  }, [id.uid]);
  const today = new Date().toISOString().slice(0, 10);
  const dailyDone = !!profile?.daily?.[today];

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 864e5);
    const key = d.toISOString().slice(0, 10);
    return { key, label: 'SMTWTFS'[d.getDay()], on: !!profile?.daily?.[key] };
  });

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const c = normaliseCode(code);
    if (!isCode(c)) return setErr(`Room codes are ${CODE_LENGTH} letters and numbers.`);
    nav(`/room/${c}`);
  };

  const host = async (game: GameId) => {
    if (!id.uid) return setErr(id.error ?? 'Still connecting. Try again in a second.');
    setBusy(true);
    try {
      const c = await createRoom({ uid: id.uid, name: id.name, avatar: id.avatar, game, config: {} });
      nav(`/room/${c}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create a room.');
      setBusy(false);
    }
  };

  const shown = GAMES.filter((g) => filter === 'all' || g.family === filter);

  return (
    <div className="page-play">
      <section className="play-top">
        <div className="felt-hero">
          <span className="mono">Hi {id.name.split(' ')[0] || 'there'}, welcome back</span>
          <h1>
            Pull up a <span>chair.</span>
          </h1>
          <p>Start a room and share the code, jump into a quick match, or warm up against the computer.</p>
          <div className="hero-actions">
            <button className="btn" onClick={() => setSheet('pick')} disabled={busy}>
              <Icon name="plus" /> Create a room
            </button>
            <form className="join" onSubmit={join}>
              <input
                value={code}
                onChange={(e) => {
                  setErr(null);
                  setCode(normaliseCode(e.target.value));
                }}
                placeholder="CODE"
                aria-label="Room code"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={CODE_LENGTH}
              />
              <button className="btn small" type="submit" disabled={code.length !== CODE_LENGTH}>
                Join
              </button>
            </form>
          </div>
          {err && <p className="err">{err}</p>}
          <svg className="felt-art" viewBox="0 0 300 220" aria-hidden="true">
            <g transform="translate(40 30) rotate(-14)">
              <rect width="110" height="156" rx="14" fill="#fffaf0" />
              <text x="12" y="30" fontFamily="var(--display)" fontWeight="800" fontSize="24" fill="#8e1b2b">
                20
              </text>
              <text x="55" y="90" textAnchor="middle" fontFamily="var(--display)" fontWeight="800" fontSize="24" fill="#8e1b2b">
                WHOT
              </text>
            </g>
            <g transform="translate(150 50) rotate(10)">
              <rect width="110" height="156" rx="14" fill="#fffaf0" />
              <text x="12" y="30" fontFamily="var(--display)" fontWeight="800" fontSize="24" fill="#8e1b2b">
                5
              </text>
              <polygon points="55,58 84,112 26,112" fill="#8e1b2b" />
            </g>
          </svg>
        </div>

        <div className="play-side">
          <button className="tile daily" onClick={() => setSheet(daily)}>
            <span className="mono gold">Daily challenge</span>
            <h3>
              Win a game of {daily.name} {dailyDone ? '✓' : ''}
            </h3>
            <p>{dailyDone ? 'Done for today. Come back tomorrow.' : 'Bonus 50 XP for a win today.'}</p>
            <div className="streak" aria-label="Last seven days">
              {week.map((d) => (
                <i key={d.key} className={d.on ? 'on' : ''}>
                  {d.label}
                </i>
              ))}
            </div>
          </button>
          <div className="tile qm">
            <div>
              <span className="mono">Quick match</span>
              <h3>Play someone new</h3>
              <p>We pair you with the next player who wants the same game.</p>
            </div>
            <div className="qm-games">
              {(['whot', 'ayo', 'connect-four', 'trivia'] as GameId[]).map((g) => (
                <button key={g} onClick={() => nav(`/match/${g}`)}>
                  {gameMeta(g)!.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="shelf">
        <div className="shelf-head">
          <h2>All games</h2>
          <div className="chips" role="tablist">
            {FILTERS.map((f) => (
              <button key={f.id} role="tab" aria-selected={filter === f.id} className={`chip${filter === f.id ? ' on' : ''}`} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <motion.div layout className="grid">
          <AnimatePresence mode="popLayout">
            {shown.map((g, i) => (
              <motion.button
                layout
                key={g.id}
                className="gcard"
                onClick={() => setSheet(g)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="art" style={{ ['--tint' as string]: g.colour }}>
                  <GameArt id={g.id} size={140} />
                </span>
                <span className="meta">
                  <span>
                    <h4>{g.name}</h4>
                    <small>{g.tagline}</small>
                  </span>
                  <span className={`tag${g.isNew ? ' new' : ''}`}>{g.isNew ? 'New' : g.players[0] === g.players[1] ? `${g.players[0]}P` : `${Math.max(2, g.players[0])} to ${g.players[1]}`}</span>
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      <AnimatePresence>{sheet && <GameSheet game={sheet} busy={busy} onClose={() => setSheet(null)} onHost={host} />}</AnimatePresence>
    </div>
  );
}

function GameSheet({ game, busy, onClose, onHost }: { game: GameMeta | 'pick'; busy: boolean; onClose(): void; onHost(g: GameId): void }) {
  const nav = useNavigate();
  if (game === 'pick') return <PickSheet busy={busy} onClose={onClose} onHost={onHost} />;
  return (
    <motion.div className="sheet-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={game.name}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="gbtn close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
          <>
            <div className="sheet-hero" style={{ ['--tint' as string]: game.colour }}>
              <GameArt id={game.id} size={170} />
            </div>
            <h3>{game.name}</h3>
            <p className="muted">{game.blurb}</p>
            <p className="facts mono">
              {game.players[0] === game.players[1] ? `${game.players[0]} players` : `${Math.max(1, game.players[0])} to ${game.players[1]} players`} · {game.minutes} min
            </p>
            <div className="sheet-actions">
              <button className="btn" onClick={() => onHost(game.id)} disabled={busy}>
                <Icon name="users" /> {busy ? 'Opening room…' : 'Play with friends'}
              </button>
              <button className="btn dark" onClick={() => nav(`/match/${game.id}`)}>
                <Icon name="bolt" /> Quick match
              </button>
              <button className="btn dark" onClick={() => nav(`/solo/${game.id}`)}>
                <Icon name="bot" /> Vs computer
              </button>
            </div>
          </>
      </motion.div>
    </motion.div>
  );
}

function PickSheet({ busy, onClose, onHost }: { busy: boolean; onClose(): void; onHost(g: GameId): void }) {
  return (
    <motion.div className="sheet-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="sheet" role="dialog" aria-modal="true" aria-label="Choose a game" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} onClick={(e) => e.stopPropagation()}>
        <button className="gbtn close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
            <h3>Which game?</h3>
            <p className="muted">You can change the game and the rules in the lobby.</p>
            <div className="pick-grid">
              {GAMES.map((g) => (
                <button key={g.id} onClick={() => onHost(g.id)} disabled={busy}>
                  <span className="art" style={{ ['--tint' as string]: g.colour }}>
                    <GameArt id={g.id} size={84} />
                  </span>
                  <b>{g.name}</b>
                </button>
              ))}
            </div>
      </motion.div>
    </motion.div>
  );
}
