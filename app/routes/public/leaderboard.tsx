import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Split } from '~/components/fx/Split';
import { seo } from '~/lib/seo';

export function meta() {
  return seo({ title: 'Leaderboard · NexPlay', description: 'The top NexPlay players by XP. Win games against real people to climb the board.', path: '/leaderboard' });
}

interface Row {
  uid: string;
  name: string;
  avatar?: string;
  xp: number;
  wins?: number;
  level?: number;
}

export default function Leaderboard() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let off = () => {};
    (async () => {
      try {
        const [{ db }, fb] = await Promise.all([import('~/lib/firebase'), import('firebase/database')]);
        const q = fb.query(fb.ref(db(), 'leaderboard'), fb.orderByChild('xp'), fb.limitToLast(50));
        off = fb.onValue(
          q,
          (snap) => {
            const list: Row[] = [];
            snap.forEach((c) => {
              list.push({ uid: c.key!, ...(c.val() as Omit<Row, 'uid'>) });
            });
            setRows(list.sort((a, b) => b.xp - a.xp));
          },
          () => setFailed(true)
        );
      } catch {
        setFailed(true);
      }
    })();
    return () => off();
  }, []);

  const top = rows?.slice(0, 3) ?? [];
  const podium = [top[1], top[0], top[2]];

  return (
    <div className="page-p lb">
      <header className="ph">
        <span className="eyebrow">All time · updated live</span>
        <Split text="The leaderboard." className="ph-h" />
        <p className="lede">Win 100 XP, draw 50, lose 30 for showing up. Games against the computer count for less, and the daily challenge pays a bonus.</p>
      </header>

      {failed ? (
        <p className="empty-note">The leaderboard could not load right now. Try again in a minute.</p>
      ) : !rows ? (
        <div className="lb-skel" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="empty-note">
          Nobody is on the board yet. <Link to="/play">Play a game</Link> and take the top spot.
        </p>
      ) : (
        <>
          <div className="podium">
            {podium.map((r, i) =>
              r ? (
                <motion.div key={r.uid} className={`pod${i === 1 ? ' first' : ''}`} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: [0.15, 0, 0.3][i], type: 'spring', stiffness: 200, damping: 22 }}>
                  <span className="medal">{[2, 1, 3][i]}</span>
                  <span className="av-p" style={{ background: r.avatar ?? '#e3a63a' }}>
                    {r.name[0]?.toUpperCase()}
                  </span>
                  <b>{r.name}</b>
                  <span className="lvl">Level {r.level ?? 1}</span>
                  <span className="pts">{r.xp.toLocaleString()}</span>
                  <span className="lvl">XP</span>
                </motion.div>
              ) : (
                <div key={i} className="pod ghost" />
              )
            )}
          </div>
          <div className="table" role="table" aria-label="Leaderboard">
            <div className="tr head" role="row">
              <span role="columnheader">#</span>
              <span role="columnheader">Player</span>
              <span role="columnheader" className="lv">
                Level
              </span>
              <span role="columnheader" className="wins">
                Wins
              </span>
              <span role="columnheader" className="xp">
                XP
              </span>
            </div>
            {rows.map((r, i) => (
              <div key={r.uid} className={`tr${i < 3 ? ` top top-${i + 1}` : ''}`} role="row">
                <span className="n" role="cell">
                  {i + 1}
                </span>
                <span className="who" role="cell">
                  <i style={{ background: r.avatar ?? '#e3a63a' }} aria-hidden="true">
                    {r.name[0]?.toUpperCase()}
                  </i>
                  <span className="nm">
                    <span className="name">{r.name}</span>
                    <small className="sub">Level {r.level ?? 1}</small>
                  </span>
                </span>
                <span className="lv" role="cell">
                  {r.level ?? 1}
                </span>
                <span className="wins" role="cell">
                  {r.wins ?? 0}
                </span>
                <span className="xp" role="cell">
                  {r.xp.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
