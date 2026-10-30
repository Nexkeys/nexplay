import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { Avatar } from '~/components/Avatar';
import { Icon } from '~/components/Icon';
import { Logo } from '~/components/Logo';
import { IdentityProvider, useIdentity } from '~/lib/identity';
import { levelFor, watchProfile, type Profile } from '~/lib/stats';
import '~/styles/arcade.css';
import '~/styles/boards.css';

export function meta() {
  return [{ title: 'Play · NexPlay' }, { name: 'robots', content: 'noindex' }];
}

export default function AppLayout() {
  return (
    <IdentityProvider>
      <Shell />
    </IdentityProvider>
  );
}

export function useProfile() {
  const { uid } = useIdentity();
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    if (!uid) return;
    return watchProfile(uid, setProfile);
  }, [uid]);
  return profile;
}

function Shell() {
  const id = useIdentity();
  const profile = useProfile();
  return (
    <div className="arcade">
      <header className="atop">
        <Link to="/play" aria-label="NexPlay home">
          <Logo />
        </Link>
        <nav className="anav" aria-label="Main">
          <NavLink to="/play" end>
            Play
          </NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/guide">Guide</NavLink>
        </nav>
        <Link to="/profile" className="me-pill" aria-label="Your profile">
          <span className="lvl">Lv {levelFor(profile?.xp ?? 0)}</span>
          <span className="nm">{id.name || 'Guest'}</span>
          <Avatar name={id.name || '?'} colour={id.avatar} size={34} />
        </Link>
      </header>
      {id.error && (
        <div className="abanner" role="alert">
          {id.error}
        </div>
      )}
      <Outlet />
      <nav className="tabbar" aria-label="Main">
        <NavLink to="/play" end>
          <Icon name="home" />
          Play
        </NavLink>
        <NavLink to="/leaderboard">
          <Icon name="trophy" />
          Ranks
        </NavLink>
        <NavLink to="/guide">
          <Icon name="book" />
          Guide
        </NavLink>
        <NavLink to="/profile">
          <Icon name="user" />
          Me
        </NavLink>
      </nav>
    </div>
  );
}
