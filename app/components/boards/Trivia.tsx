import { AnimatePresence, motion } from 'motion/react';
import type { TriviaState } from '~/engine/games/trivia';
import { buzz, play } from '~/lib/sound';
import type { StageProps } from '~/lib/stage';
import { seatOf } from '~/lib/stage';
import { Avatar } from '../Avatar';
import { Countdown, Scoreboard, TimeBar, useChange } from '../game/common';

const TONES = ['#ff5a3c', '#2f6fe4', '#e3a63a', '#16a08a'];
const LETTERS = ['A', 'B', 'C', 'D'];

export default function TriviaBoard({ view, me, seats, send, now, result }: StageProps<TriviaState>) {
  const s = view;
  const mine = me ? s.answers[me] : undefined;
  const reveal = s.phase !== 'question';
  const canAnswer = !!me && s.phase === 'question' && !mine && !result;
  const q = s.question;

  useChange(reveal ? s.n : -1, () => {
    if (!reveal || !me) return;
    const a = s.answers[me];
    if (a?.ok) {
      play('correct');
      buzz(20);
    } else play('wrong');
  });

  const pick = (i: number) => {
    if (!canAnswer) return;
    play('tap');
    buzz();
    send({ type: 'answer', choice: i });
  };

  const answeredCount = Object.keys(s.answers).length;

  return (
    <div className="board-party board-trivia">
      <div className="party-main">
        <div className="party-top">
          <span className="mono">
            Question {s.n} of {s.total} · {q.pack} · {q.difficulty}
          </span>
          {s.phase === 'question' && <Countdown deadline={s.deadline} now={now} />}
        </div>
        {s.phase === 'question' && <TimeBar start={s.start} deadline={s.deadline} now={now} tone="var(--teal)" />}

        <AnimatePresence mode="wait">
          <motion.div key={s.n} className="tq" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            <h2>{q.text}</h2>
            <div className="opts">
              {q.options.map((o, i) => {
                const chosen = mine?.choice === i;
                const right = reveal && s.correct === i;
                const wrong = reveal && chosen && s.correct !== i;
                const pickers = reveal ? Object.entries(s.answers).filter(([, a]) => a.choice === i) : [];
                return (
                  <motion.button
                    key={i}
                    className={`opt${chosen ? ' chosen' : ''}${right ? ' right' : ''}${wrong ? ' wrong' : ''}${reveal && !right && !chosen ? ' fade' : ''}`}
                    style={{ ['--tone' as string]: TONES[i] }}
                    onClick={() => pick(i)}
                    disabled={!canAnswer}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0, scale: right ? [1, 1.04, 1] : 1 }}
                    transition={{ delay: 0.05 * i + 0.1 }}
                  >
                    <span className="letter">{LETTERS[i]}</span>
                    <span className="txt">{o}</span>
                    {pickers.length > 0 && (
                      <span className="pickers">
                        {pickers.slice(0, 4).map(([id]) => {
                          const st = seatOf(seats, id);
                          return st ? <Avatar key={id} name={st.name} colour={st.avatar} size={22} /> : null;
                        })}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
            <p className={`status${reveal && mine ? (mine.ok ? ' good' : ' bad') : ''}`}>
              {reveal
                ? mine
                  ? mine.ok
                    ? `Correct! +${mine.points}${(s.streak[me!] ?? 0) > 1 ? ` · ${s.streak[me!]} in a row 🔥` : ''}`
                    : `The answer was ${q.options[s.correct]}.`
                  : me
                    ? `Too slow. The answer was ${q.options[s.correct]}.`
                    : `The answer was ${q.options[s.correct]}.`
                : mine
                  ? `Locked in. ${answeredCount} of ${s.players.length} answered…`
                  : me
                    ? 'Faster answers score more.'
                    : 'Watching…'}
            </p>
            {q.source === 'otdb' && <p className="credit">Question from the Open Trivia Database, CC BY-SA 4.0</p>}
          </motion.div>
        </AnimatePresence>
      </div>

      <aside className="party-side">
        <Scoreboard
          seats={seats}
          scores={s.scores}
          me={me}
          extra={(id) => {
            const a = s.answers[id];
            if (!reveal) return a ? <span className="sub">✓</span> : null;
            return a ? <span className={`sub ${a.ok ? 'ok' : 'no'}`}>{a.ok ? `+${a.points}` : '✗'}</span> : <span className="sub no">·</span>;
          }}
        />
      </aside>
    </div>
  );
}
