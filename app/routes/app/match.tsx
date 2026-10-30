import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Avatar } from '~/components/Avatar';
import { GameArt } from '~/components/GameArt';
import { Icon } from '~/components/Icon';
import { gameMeta } from '~/engine/catalog';
import { AVATARS, useIdentity } from '~/lib/identity';
import { findMatch } from '~/lib/quickmatch';
import { Problem } from './room';

export function meta() {
  return [{ title: 'Quick match · NexPlay' }, { name: 'robots', content: 'noindex' }];
}

export default function Match() {
  const { game } = useParams();
  const info = gameMeta(game ?? '');
  const id = useIdentity();
  const nav = useNavigate();
  const [phase, setPhase] = useState<'connecting' | 'waiting'>('connecting');
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!info || !id.uid) return;
    const stop = findMatch({
      uid: id.uid,
      name: id.name,
      avatar: id.avatar,
      game: info.id,
      onWaiting: () => setPhase('waiting'),
      onRoom: (code) => nav(`/room/${code}`, { replace: true })
    });
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info?.id, id.uid]);

  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!info) return <Problem title="Game not found" text="That game does not exist." />;
  if (id.error) return <Problem title="Cannot connect" text={id.error} />;

  return (
    <div className="page-match" style={{ ['--tint' as string]: info.colour }}>
      <div className="radar" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} initial={{ scale: 0.3, opacity: 0.8 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ repeat: Infinity, duration: 2.4, delay: i * 0.8, ease: 'easeOut' }} />
        ))}
        <div className="radar-core">
          <Avatar name={id.name || '?'} colour={id.avatar} size={84} />
        </div>
        {AVATARS.slice(0, 5).map((c, i) => (
          <motion.span
            key={c}
            className="blip"
            style={{ background: c, left: `${50 + Math.cos(i * 1.3) * 40}%`, top: `${50 + Math.sin(i * 1.3) * 40}%` }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, delay: i * 0.45 }}
          />
        ))}
      </div>
      <span className="mono">Quick match · {info.name}</span>
      <h1>{phase === 'connecting' ? 'Connecting…' : 'Finding a player…'}</h1>
      <p className="muted">
        {secs < 20
          ? 'We will pair you with the next person who picks this game.'
          : 'It is quiet right now. Keep waiting, or warm up against the computer and try again later.'}
      </p>
      <span className="mono timer">
        {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
      </span>
      <div className="match-actions">
        <Link to="/play" className="btn dark">
          Cancel
        </Link>
        {secs >= 12 && (
          <Link to={`/solo/${info.id}`} className="btn">
            <Icon name="bot" /> Play the computer
          </Link>
        )}
      </div>
      <div className="match-art">
        <GameArt id={info.id} size={120} />
      </div>
    </div>
  );
}
