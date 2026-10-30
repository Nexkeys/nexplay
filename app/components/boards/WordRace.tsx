import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { huntPoints, type WordState } from '~/engine/games/word-race';
import { buzz, play } from '~/lib/sound';
import type { StageProps } from '~/lib/stage';
import { firstName, seatOf } from '~/lib/stage';
import { Icon } from '../Icon';
import { Countdown, Scoreboard, TimeBar, useChange } from '../game/common';

type View = Omit<WordState, 'answers' | 'found'> & { answers: (string | number)[]; found: Record<string, string[] | number> };

export default function WordRaceBoard({ view, me, seats, send, now, result }: StageProps<View>) {
  const s = view;
  const [typed, setTyped] = useState('');
  const [order, setOrder] = useState<number[]>([]);
  const [used, setUsed] = useState<number[]>([]);
  const [shake, setShake] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const playing = s.phase === 'play' && !!me && !result;
  const hunt = s.mode === 'hunt';
  const myFound = me && Array.isArray(s.found[me]) ? (s.found[me] as string[]) : [];
  const solved = !!me && s.solved.includes(me);

  // New letters: reset the tray.
  useEffect(() => {
    setOrder(s.letters.split('').map((_, i) => i));
    setTyped('');
    setUsed([]);
    if (playing) setTimeout(() => input.current?.focus({ preventScroll: true }), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.letters, s.round]);

  useChange(myFound.length, (a, b) => {
    if (b > a) {
      play('correct');
      buzz(15);
    }
  });
  useChange(solved, (_, on) => on && (play('correct'), buzz([20, 30, 20])));
  useChange(s.feed.length, () => !hunt && play('tap'));

  const submit = () => {
    const w = typed.trim().toLowerCase();
    if (w.length < 3) {
      setShake((n) => n + 1);
      return play('error');
    }
    if (hunt && myFound.includes(w)) {
      setShake((n) => n + 1);
      play('error');
    } else send({ type: 'guess', word: w });
    setTyped('');
    setUsed([]);
  };

  const tapTile = (k: number) => {
    if (!playing || used.includes(k) || (!hunt && solved)) return;
    play('tap');
    setUsed([...used, k]);
    setTyped(typed + s.letters[k]);
  };
  const backspace = () => {
    setTyped(typed.slice(0, -1));
    setUsed(used.slice(0, -1));
  };
  const onType = (v: string) => {
    const clean = v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, s.letters.length);
    // Keep tile highlights in sync with typing.
    const pool = s.letters.split('').map((ch, i) => ({ ch, i }));
    const marks: number[] = [];
    for (const ch of clean) {
      const hit = pool.find((p) => p.ch === ch && !marks.includes(p.i));
      if (hit) marks.push(hit.i);
    }
    setUsed(marks);
    setTyped(clean);
  };

  const slots = useMemo(() => {
    if (!hunt) return [];
    return [...s.answers].sort((a, b) => (typeof a === 'number' ? a : a.length) - (typeof b === 'number' ? b : b.length));
  }, [hunt, s.answers]);

  const last = s.history[s.history.length - 1];
  const showAnswer = s.phase !== 'play' && last;

  return (
    <div className="board-party board-word">
      <div className="party-main">
        <div className="party-top">
          <span className="mono">
            {hunt ? 'Word Hunt' : 'Unscramble'} · Round {s.round} of {s.rounds}
          </span>
          {s.phase === 'play' && <Countdown deadline={s.deadline} now={now} />}
        </div>
        {s.phase === 'play' && <TimeBar start={s.start} deadline={s.deadline} now={now} tone="var(--teal)" />}

        <AnimatePresence mode="wait">
          {showAnswer ? (
            <motion.div key={`ans${s.round}`} className="reveal-card" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <span className="mono">{hunt ? 'The seven letter word' : 'The word was'}</span>
              <div className="tiles big">
                {last.answer.toUpperCase().split('').map((ch, i) => (
                  <motion.span key={i} className="ltile solved" initial={{ rotateX: 90 }} animate={{ rotateX: 0 }} transition={{ delay: i * 0.05 }}>
                    {ch}
                  </motion.span>
                ))}
              </div>
              <p>{last.winner ? `${last.winner === me ? 'You' : firstName(seatOf(seats, last.winner)?.name ?? '')} ${hunt ? 'found the most words' : 'got it first'}.` : hunt ? 'Nobody found a word.' : 'Nobody got it.'}</p>
            </motion.div>
          ) : (
            <motion.div key={`play${s.round}`} className="word-play" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <motion.div className="tiles" animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}} key={`t${shake}`}>
                {order.map((k) => (
                  <motion.button key={k} layout className={`ltile${used.includes(k) ? ' used' : ''}${solved && !hunt ? ' solved' : ''}`} onClick={() => tapTile(k)} disabled={!playing}>
                    {s.letters[k]}
                  </motion.button>
                ))}
              </motion.div>

              {playing && (!solved || hunt) ? (
                <form
                  className="word-input"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                  }}
                >
                  <button type="button" className="ico" onClick={() => setOrder((o) => [...o].sort(() => Math.random() - 0.5))} aria-label="Shuffle letters">
                    <Icon name="shuffle" />
                  </button>
                  <input
                    ref={input}
                    value={typed}
                    onChange={(e) => onType(e.target.value)}
                    placeholder={hunt ? 'Make a word…' : 'Type the word…'}
                    autoCapitalize="characters"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="send"
                    aria-label="Your word"
                  />
                  <button type="button" className="ico" onClick={backspace} aria-label="Delete a letter">
                    <Icon name="backspace" />
                  </button>
                  <button type="submit" className="go">
                    {hunt ? 'Add' : 'Go'}
                  </button>
                </form>
              ) : (
                <p className="status">{solved ? 'Solved! Waiting for the others…' : 'Watching…'}</p>
              )}

              {hunt && (
                <div className="hunt-slots" aria-label="Words to find">
                  {slots.map((w, i) =>
                    typeof w === 'string' ? (
                      <motion.span key={w} className="slot found" initial={{ scale: 1.3, background: '#3ec7b0' }} animate={{ scale: 1, background: 'rgba(62,199,176,.16)' }}>
                        {w.toUpperCase()}
                        <small>+{huntPoints(w.length)}</small>
                      </motion.span>
                    ) : (
                      <span key={`n${i}`} className="slot" style={{ ['--len' as string]: w }}>
                        {Array.from({ length: w }, (_, k) => (
                          <i key={k} />
                        ))}
                      </span>
                    )
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <aside className="party-side">
        <Scoreboard
          seats={seats}
          scores={s.scores}
          me={me}
          extra={(id) =>
            hunt ? (
              <span className="sub">{typeof s.found[id] === 'number' ? s.found[id] : (s.found[id] as string[] | undefined)?.length ?? 0} words</span>
            ) : s.solved.includes(id) && s.phase === 'play' ? (
              <span className="sub ok">✓ solved</span>
            ) : null
          }
        />
        <ul className="feed">
          <AnimatePresence initial={false}>
            {s.feed.slice(-4).reverse().map((f, i) => (
              <motion.li key={`${f.by}${f.text}${s.feed.length - i}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <b>{f.by === me ? 'You' : firstName(seatOf(seats, f.by)?.name ?? '')}</b> {f.text} {f.points > 0 && <em>+{f.points}</em>}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </aside>
    </div>
  );
}
