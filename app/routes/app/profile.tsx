import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Avatar } from '~/components/Avatar';
import { GameArt } from '~/components/GameArt';
import { Icon } from '~/components/Icon';
import { GAMES } from '~/engine/catalog';
import { AVATARS, cleanName, useIdentity } from '~/lib/identity';
import { levelProgress, syncLeaderboardName } from '~/lib/stats';
import { useProfile } from './layout';

export function meta() {
  return [{ title: 'Your profile · NexPlay' }, { name: 'robots', content: 'noindex' }];
}

export default function ProfilePage() {
  const id = useIdentity();
  const profile = useProfile();
  const [name, setName] = useState(id.name);
  const [saved, setSaved] = useState(false);
  useEffect(() => setName(id.name), [id.name]);

  const xp = profile?.xp ?? 0;
  const lp = levelProgress(xp);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const n = cleanName(name);
    if (!n) return;
    id.setName(n);
    if (id.uid) syncLeaderboardName(id.uid, n, id.avatar).catch(() => {});
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const pickColour = (c: string) => {
    id.setAvatar(c);
    if (id.uid) syncLeaderboardName(id.uid, id.name, c).catch(() => {});
  };

  const [going, setGoing] = useState(false);
  const google = async () => {
    setGoing(true);
    await id.signInWithGoogle();
    setGoing(false);
  };

  return (
    <div className="page-profile">
      <section className="prof-head">
        <Avatar name={id.name || '?'} colour={id.avatar} size={96} />
        <div>
          <span className="mono">{id.isGuest ? 'Guest player' : id.email}</span>
          <h1>{id.name}</h1>
          <div className="level">
            <b>Level {lp.level}</b>
            <div className="bar" aria-label={`${lp.into} of ${lp.need} XP to the next level`}>
              <motion.i initial={{ width: 0 }} animate={{ width: `${lp.pct * 100}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <small>
              {xp.toLocaleString()} XP · {lp.need - lp.into} to level {lp.level + 1}
            </small>
          </div>
        </div>
      </section>

      <div className="prof-grid">
        <section className="panel">
          <h2>Your name</h2>
          <form className="name-form" onSubmit={save}>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={18} aria-label="Display name" />
            <button className="btn small" type="submit">
              {saved ? <Icon name="check" size={18} /> : 'Save'}
            </button>
          </form>
          <h2>Colour</h2>
          <div className="colours">
            {AVATARS.map((c) => (
              <button key={c} style={{ background: c }} className={c === id.avatar ? 'on' : ''} onClick={() => pickColour(c)} aria-label={`Use colour ${c}`} />
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Account</h2>
          {id.isGuest ? (
            <>
              <p className="muted">You are playing as a guest. Your progress lives on this device. Sign in with Google to keep it safe and use it on any device.</p>
              <button className="btn google" onClick={google} disabled={going}>
                <Icon name="google" /> {going ? 'Finish signing in in the Google window…' : 'Continue with Google'}
              </button>
              {id.googleError && <p className="err">{id.googleError}</p>}
            </>
          ) : (
            <>
              <p className="muted">Signed in as {id.email}. Your stats follow you on every device.</p>
              <button className="btn dark" onClick={() => id.signOut()}>
                <Icon name="logout" /> Sign out
              </button>
            </>
          )}
        </section>

        <section className="panel stats-panel">
          <h2>Stats</h2>
          <div className="stat-row">
            <div>
              <b>{profile?.played ?? 0}</b>
              <span>played</span>
            </div>
            <div>
              <b>{profile?.wins ?? 0}</b>
              <span>won</span>
            </div>
            <div>
              <b>{profile?.played ? Math.round(((profile.wins ?? 0) / profile.played) * 100) : 0}%</b>
              <span>win rate</span>
            </div>
            <div>
              <b>{profile?.best ?? 0}</b>
              <span>best streak</span>
            </div>
          </div>
          <ul className="per-game">
            {GAMES.map((g) => {
              const s = profile?.games?.[g.id];
              return (
                <li key={g.id}>
                  <span className="art" style={{ ['--tint' as string]: g.colour }}>
                    <GameArt id={g.id} size={44} />
                  </span>
                  <b>{g.name}</b>
                  <span className="mono">
                    {s?.wins ?? 0} W · {s?.played ?? 0} P
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
