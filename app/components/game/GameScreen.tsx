import { AnimatePresence, motion } from 'motion/react';
import { Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { gameMeta } from '~/engine/catalog';
import type { GameId } from '~/engine/types';
import { useIdentity } from '~/lib/identity';
import { isMuted, play, setMuted } from '~/lib/sound';
import type { StageProps } from '~/lib/stage';
import { firstName, seatOf } from '~/lib/stage';
import { outcomeFor, recordMatch } from '~/lib/stats';
import { Avatar } from '../Avatar';
import { Icon } from '../Icon';
import { BOARDS } from '../boards';

export const EMOTES = ['😂', '🔥', '👏', '😤', '👀', '🙏', '😭', '🤝'];

export interface FloatingEmote {
  id: string;
  uid: string;
  e: string;
}

export function GameScreen({
  game,
  stage,
  chip,
  error,
  emotes,
  onEmote,
  onLeave,
  actions,
  recordKey
}: {
  game: GameId;
  stage: StageProps | null;
  chip: React.ReactNode;
  error?: string | null;
  emotes?: FloatingEmote[];
  onEmote?: (e: string) => void;
  onLeave: () => void;
  actions: React.ReactNode;
  /** Unique per match, so a result is only ever counted once. */
  recordKey: string;
}) {
  const meta = gameMeta(game)!;
  const Board = BOARDS[game];
  const { uid, name, avatar } = useIdentity();
  const [rules, setRules] = useState(false);
  const [muted, setMute] = useState(false);
  const [xp, setXp] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [emoteOpen, setEmoteOpen] = useState(false);
  useEffect(() => setMute(isMuted()), []);

  const result = stage?.result ?? null;
  const me = stage?.me ?? null;

  // Count the result once, then show the results card after the last animation settles.
  useEffect(() => {
    if (!result) {
      setShowResult(false);
      setXp(null);
      return;
    }
    const t = setTimeout(() => setShowResult(true), game === 'ayo' ? 2600 : 1300);
    if (me && uid && stage) {
      const outcome = outcomeFor(result, me);
      play(outcome === 'win' ? 'win' : outcome === 'loss' ? 'lose' : 'turn');
      const vsComputerOnly = stage.seats.filter((s) => s.id !== me).every((s) => s.bot);
      recordMatch({ uid, name, avatar, game, outcome, vsComputerOnly, key: recordKey })
        .then((g) => setXp(g))
        .catch(() => setXp(null));
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, recordKey]);

  const outcome = result && me ? outcomeFor(result, me) : null;

  return (
    <div className={`gscreen g-${game}`}>
      <header className="gbar">
        <button className="gbtn" onClick={onLeave} aria-label="Leave game">
          <Icon name="back" />
        </button>
        <div className="gtitle">
          <b>{meta.name}</b>
          {chip}
        </div>
        <div className="gtools">
          {onEmote && me && (
            <button className={`gbtn${emoteOpen ? ' on' : ''}`} onClick={() => setEmoteOpen(!emoteOpen)} aria-label="Reactions" aria-expanded={emoteOpen}>
              <span aria-hidden="true">😀</span>
            </button>
          )}
          <button className="gbtn" onClick={() => setRules(true)} aria-label="Rules">
            <Icon name="book" />
          </button>
          <button
            className="gbtn"
            onClick={() => {
              setMuted(!muted);
              setMute(!muted);
            }}
            aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
          >
            <Icon name={muted ? 'mute' : 'sound'} />
          </button>
        </div>
      </header>

      <main className="gstage">
        {stage ? (
          <Suspense fallback={<div className="gload" />}>
            <Board {...stage} />
          </Suspense>
        ) : (
          <div className="gload">
            <span className="boot-mark">
              <i />
            </span>
            <p>Setting up the table…</p>
          </div>
        )}
      </main>

      {onEmote && me && (
        <div className={`emote-bar${emoteOpen ? ' open' : ''}`} role="toolbar" aria-label="Reactions">
          {EMOTES.map((e) => (
            <button
              key={e}
              onClick={() => {
                onEmote(e);
                setEmoteOpen(false);
              }}
              aria-label={`React ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="emote-layer" aria-live="polite">
        <AnimatePresence>
          {emotes?.map((em, i) => {
            const who = stage ? seatOf(stage.seats, em.uid) : null;
            return (
              <motion.div
                key={em.id}
                className="emote-float"
                initial={{ opacity: 0, y: 40, scale: 0.6 }}
                animate={{ opacity: 1, y: -20, scale: 1 }}
                exit={{ opacity: 0, y: -80 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                style={{ left: `${12 + ((i * 23) % 70)}%` }}
              >
                <span>{em.e}</span>
                {who && <small>{em.uid === me ? 'You' : firstName(who.name)}</small>}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div className="gtoast" role="alert" initial={{ opacity: 0, y: -16, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -16, x: '-50%' }}>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResult && result && stage && (
          <motion.div className="results-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className={`results ${outcome ?? 'watch'}`} initial={{ y: 60, scale: 0.94 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
              {outcome === 'win' && <Confetti />}
              <span className="mono">{meta.name} · game over</span>
              <h2>{outcome === 'win' ? 'You won!' : outcome === 'draw' ? "It's a draw" : outcome === 'loss' ? 'Good game' : `${firstName(seatOf(stage.seats, result.ranking[0]?.[0])?.name ?? '')} won`}</h2>
              <p className="sum">{result.summary}</p>
              <ol className="ranking">
                {result.ranking.flatMap((group, place) =>
                  group.map((id) => {
                    const s = seatOf(stage.seats, id);
                    if (!s) return null;
                    return (
                      <li key={id} className={`${place === 0 && !result.draw ? 'first' : ''}${id === me ? ' me' : ''}`}>
                        <span className="place">{place === 0 && !result.draw ? <Icon name="crown" size={18} /> : place + 1}</span>
                        <Avatar name={s.name} colour={s.avatar} size={34} bot={!!s.bot} />
                        <span className="nm">{id === me ? 'You' : firstName(s.name)}</span>
                        <span className="sc">{(result.scores[id] ?? 0).toLocaleString()}</span>
                      </li>
                    );
                  })
                )}
              </ol>
              {xp !== null && xp > 0 && (
                <motion.p className="xp" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }}>
                  +{xp} XP
                </motion.p>
              )}
              <div className="results-actions">{actions}</div>
              <button className="link" onClick={() => setShowResult(false)}>
                See the board
              </button>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
      {result && !showResult && (
        <button className="results-peek" onClick={() => setShowResult(true)}>
          Show results
        </button>
      )}

      <AnimatePresence>
        {rules && (
          <motion.div className="drawer-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRules(false)}>
            <motion.aside className="drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }} onClick={(e) => e.stopPropagation()}>
              <div className="drawer-head">
                <h3>How to play {meta.name}</h3>
                <button className="gbtn" onClick={() => setRules(false)} aria-label="Close rules">
                  <Icon name="close" />
                </button>
              </div>
              {meta.rules.map((r) => (
                <section key={r.title}>
                  <h4>{r.title}</h4>
                  {r.body.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </section>
              ))}
              {meta.tips.length > 0 && (
                <section className="tips">
                  <h4>Tips</h4>
                  {meta.tips.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </section>
              )}
              <Link to={`/games/${game}`} className="link" target="_blank">
                Full rules page
              </Link>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Confetti() {
  const bits = Array.from({ length: 36 }, (_, i) => i);
  const colours = ['#e8b450', '#ff6a4d', '#3ec7b0', '#f5ecd9', '#7ab8ff'];
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((i) => (
        <motion.i
          key={i}
          style={{ background: colours[i % colours.length], left: `${(i * 37) % 100}%` }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{ y: 420, rotate: 360 * (i % 2 ? 1 : -1), opacity: 0 }}
          transition={{ duration: 1.6 + (i % 5) * 0.3, delay: (i % 7) * 0.05, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
