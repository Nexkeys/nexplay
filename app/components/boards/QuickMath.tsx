import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluate, type MathState } from '~/engine/games/quick-math';
import { buzz, play } from '~/lib/sound';
import type { StageProps } from '~/lib/stage';
import { Icon } from '../Icon';
import { Countdown, Scoreboard, TimeBar, useChange } from '../game/common';

const pretty = (e: string) => e.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−');

export default function QuickMathBoard({ view, me, seats, send, now, result }: StageProps<MathState>) {
  const s = view;
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const mineAns = me ? s.answered[me] : undefined;
  const make24 = s.mode === 'make24';
  const open = s.phase === 'play' && !!me && !result && (make24 ? !mineAns?.ok : !mineAns);

  useEffect(() => {
    setValue('');
    if (open) setTimeout(() => input.current?.focus({ preventScroll: true }), 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.q]);
  useChange(mineAns?.at, () => {
    if (!mineAns) return;
    play(mineAns.ok ? 'correct' : 'wrong');
    buzz(mineAns.ok ? 15 : [30, 30, 30]);
  });

  const preview = useMemo(() => {
    if (!make24 || !value.trim()) return null;
    try {
      const { value: v } = evaluate(value);
      return v[1] === 1 ? String(v[0]) : `${v[0]}/${v[1]}`;
    } catch {
      return null;
    }
  }, [make24, value]);

  const submit = () => {
    if (!value.trim()) return;
    play('tap');
    send({ type: 'answer', value: value.trim() });
    if (!make24) setValue('');
  };
  const add = (t: string) => {
    play('tap');
    setValue((v) => v + t);
  };

  const keys = make24 ? [...s.numbers.map(String), '+', '-', '*', '/', '(', ')'] : ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0'];

  return (
    <div className="board-party board-math">
      <div className="party-main">
        <div className="party-top">
          <span className="mono">
            {make24 ? 'Make 24' : 'Sprint'} · {s.q} of {s.total}
          </span>
          {s.phase === 'play' && <Countdown deadline={s.deadline} now={now} />}
        </div>
        {s.phase === 'play' && <TimeBar start={s.start} deadline={s.deadline} now={now} />}

        <AnimatePresence mode="wait">
          <motion.div key={s.q} className="math-q" initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16 }}>
            {make24 ? (
              <div className="nums">
                {s.numbers.map((n, i) => (
                  <motion.span key={i} className="num" initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ delay: i * 0.07 }}>
                    {n}
                  </motion.span>
                ))}
              </div>
            ) : (
              <h2 className="prompt">{pretty(s.prompt)} =</h2>
            )}
            {s.phase !== 'play' && (
              <motion.p className="answer" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {make24 ? (s.answer ? `One way: ${pretty(s.answer)}` : '') : `Answer: ${s.answer}`}
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>

        {open ? (
          <form
            className={`math-input${make24 ? ' expr' : ''}`}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="field">
              <input
                ref={input}
                value={make24 ? pretty(value) : value}
                onChange={(e) => setValue(e.target.value.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'))}
                inputMode={make24 ? 'text' : 'numeric'}
                placeholder={make24 ? 'e.g. (8 − 4) × 6' : 'Your answer'}
                autoComplete="off"
                enterKeyHint="send"
                aria-label="Your answer"
              />
              {preview && <span className={`m-preview${preview === '24' ? ' ok' : ''}`}>= {preview}</span>}
            </div>
            <div className={`keypad${make24 ? ' ops' : ''}`}>
              {keys.map((k, i) => (
                <button type="button" key={`${k}${i}`} onClick={() => add(k)} className={/[0-9]/.test(k) && make24 ? 'n' : ''}>
                  {pretty(k)}
                </button>
              ))}
              <button type="button" onClick={() => setValue((v) => v.slice(0, -1))} aria-label="Delete">
                <Icon name="backspace" />
              </button>
              {make24 && (
                <button type="button" onClick={() => setValue('')}>
                  Clear
                </button>
              )}
              <button type="submit" className="go">
                {make24 ? 'Check' : 'Go'}
              </button>
            </div>
          </form>
        ) : (
          <p className={`status${mineAns ? (mineAns.ok ? ' good' : ' bad') : ''}`}>
            {!me ? 'Watching…' : mineAns ? (mineAns.ok ? `Correct! +${mineAns.points}` : `Not quite. You said ${mineAns.value}.`) : s.phase === 'play' ? '' : 'Too slow!'}
          </p>
        )}
      </div>

      <aside className="party-side">
        <Scoreboard
          seats={seats}
          scores={s.scores}
          me={me}
          extra={(id) => {
            const a = s.answered[id];
            if (!a) return s.streak[id] > 1 ? <span className="sub">🔥 {s.streak[id]}</span> : null;
            return s.phase === 'play' ? <span className="sub">answered</span> : <span className={`sub ${a.ok ? 'ok' : 'no'}`}>{a.ok ? `+${a.points}` : '✗'}</span>;
          }}
        />
      </aside>
    </div>
  );
}
