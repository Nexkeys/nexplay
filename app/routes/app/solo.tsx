import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { GameArt } from '~/components/GameArt';
import { Icon } from '~/components/Icon';
import { GameScreen } from '~/components/game/GameScreen';
import { Settings } from '~/components/game/Settings';
import { gameMeta, isTurnBased, loadGame, TURN_TIMERS } from '~/engine/catalog';
import type { BotLevel, GameId } from '~/engine/types';
import { useIdentity } from '~/lib/identity';
import { useLocalMatch, type LocalSetup } from '~/lib/useLocalMatch';
import { Problem } from './room';

export function meta() {
  return [{ title: 'Vs computer · NexPlay' }, { name: 'robots', content: 'noindex' }];
}

const LEVELS: { id: BotLevel; label: string; text: string }[] = [
  { id: 'easy', label: 'Easy', text: 'Relaxed. Makes mistakes.' },
  { id: 'medium', label: 'Medium', text: 'A fair fight.' },
  { id: 'hard', label: 'Hard', text: 'Plays to win. Good luck.' }
];

export default function Solo() {
  const { game: param } = useParams();
  const info = gameMeta(param ?? '');
  const id = useIdentity();
  const nav = useNavigate();
  const [defaults, setDefaults] = useState<Record<string, unknown> | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [level, setLevel] = useState<BotLevel>('medium');
  const [opponents, setOpponents] = useState(1);
  const [setup, setSetup] = useState<LocalSetup | null>(null);
  const [started, setStarted] = useState(0);
  const [turnSeconds, setTurnSeconds] = useState(30);

  useEffect(() => {
    if (!info) return;
    loadGame(info.id).then((g) => {
      setDefaults(g.defaultConfig);
      setConfig(g.defaultConfig);
    });
    setOpponents(info.id === 'whot' ? 3 : 1);
  }, [info?.id]);

  const match = useLocalMatch(setup);
  if (!info) return <Problem title="Game not found" text="That game does not exist." />;

  if (setup) {
    return (
      <GameScreen
        game={info.id}
        stage={match.stage}
        chip={
          <span className="gchip mono">
            Vs computer · {level}
            {setup.turnSeconds ? ` · ${setup.turnSeconds}s turns` : ''}
          </span>
        }
        error={match.error}
        onLeave={() => setSetup(null)}
        recordKey={`solo:${info.id}:${started}:${match.round}`}
        actions={
          <>
            <button className="btn" onClick={() => match.rematch()}>
              <Icon name="refresh" /> Play again
            </button>
            <button className="btn dark" onClick={() => setSetup(null)}>
              Change settings
            </button>
          </>
        }
      />
    );
  }

  const maxOpp = info.players[1] - 1;
  const minOpp = info.players[0] <= 1 ? 1 : info.players[0] - 1;

  return (
    <div className="page-solo">
      <section className="solo-card" style={{ ['--tint' as string]: info.colour }}>
        <div className="solo-art">
          <GameArt id={info.id as GameId} size={190} />
        </div>
        <div className="solo-form">
          <span className="mono">Vs computer</span>
          <h1>{info.name}</h1>
          <p className="muted">Practise against the computer. Wins here earn a little XP too.</p>

          <h2>How good?</h2>
          <div className="levels" role="radiogroup" aria-label="Computer level">
            {LEVELS.map((l) => (
              <motion.button key={l.id} role="radio" aria-checked={level === l.id} className={level === l.id ? 'on' : ''} onClick={() => setLevel(l.id)} whileTap={{ scale: 0.97 }}>
                <b>{l.label}</b>
                <small>{l.text}</small>
              </motion.button>
            ))}
          </div>

          {maxOpp > 1 && (
            <>
              <h2>Computer players</h2>
              <div className="seg">
                {Array.from({ length: maxOpp - minOpp + 1 }, (_, i) => i + minOpp).map((n) => (
                  <button key={n} className={opponents === n ? 'on' : ''} onClick={() => setOpponents(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </>
          )}

          {isTurnBased(info.id) && (
            <>
              <h2>Turn timer</h2>
              <div className="seg" role="radiogroup" aria-label="Turn timer">
                {TURN_TIMERS.map((s) => (
                  <button key={s} role="radio" aria-checked={turnSeconds === s} className={turnSeconds === s ? 'on' : ''} onClick={() => setTurnSeconds(s)}>
                    {s}s
                  </button>
                ))}
              </div>
              <p className="muted small timer-help">Run out of time and a random move is played for you.</p>
            </>
          )}

          <h2>House rules</h2>
          {defaults ? <Settings meta={info} config={config} onChange={(p) => setConfig({ ...config, ...p })} /> : <p className="muted">Loading…</p>}

          <div className="solo-go">
            <button className="btn dark" onClick={() => nav('/play')}>
              Back
            </button>
            <button
              className="btn go"
              disabled={!defaults || !id.ready}
              onClick={() => {
                setStarted(Date.now());
                setSetup({
                  game: info.id,
                  config,
                  level,
                  opponents: Math.min(Math.max(opponents, minOpp), maxOpp),
                  me: { id: id.uid ?? 'me', name: id.name || 'You', avatar: id.avatar },
                  turnSeconds: isTurnBased(info.id) ? turnSeconds : 0
                });
              }}
            >
              <Icon name="play" /> Start
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
