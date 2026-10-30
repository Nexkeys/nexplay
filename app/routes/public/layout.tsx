import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Icon } from '~/components/Icon';
import { Logo } from '~/components/Logo';
import { GAMES } from '~/engine/catalog';
import { AGENCY_URL } from '~/lib/seo';
import '~/styles/public.css';

const LINKS = [
  { to: '/games', label: 'Games' },
  { to: '/guide', label: 'How to play' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/about', label: 'About' }
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <div className="pub">
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="pnav">
        <Link to="/" aria-label="NexPlay home">
          <Logo tone="light" />
        </Link>
        <nav className="plinks" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="pcta">
          <Link to="/profile" className="pbtn ghost hide-sm">
            Sign in
          </Link>
          <Link to="/play" className="pbtn">
            Play now
          </Link>
          <button className="pmenu" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
            <span />
            <span />
          </button>
        </div>
      </header>
      {open && (
        <nav className="pdrawer" aria-label="Menu">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to}>
              {l.label}
              <Icon name="arrow" />
            </NavLink>
          ))}
          <Link to="/profile">
            Sign in
            <Icon name="arrow" />
          </Link>
        </nav>
      )}

      <main id="main">
        <Outlet />
      </main>

      <footer className="pfoot">
        <div className="pfoot-top">
          <div className="pfoot-brand">
            <Logo tone="light" />
            <p>Nigerian classics and party games, played live with friends. Free, no download, on any phone or laptop.</p>
            <Link to="/play" className="pbtn coral">
              Start a game
            </Link>
          </div>
          <div className="pfoot-cols">
            <div>
              <h4>Games</h4>
              {GAMES.map((g) => (
                <Link key={g.id} to={`/games/${g.id}`}>
                  {g.name}
                </Link>
              ))}
            </div>
            <div>
              <h4>NexPlay</h4>
              <Link to="/guide">User guide</Link>
              <Link to="/leaderboard">Leaderboard</Link>
              <Link to="/about">About</Link>
              <Link to="/play">Play</Link>
            </div>
            <div>
              <h4>Legal</h4>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </div>
          </div>
        </div>
        <div className="pfoot-big" aria-hidden="true">
          NexPlay
        </div>
        <div className="pfoot-bottom">
          <span>© {new Date().getFullYear()} NexPlay</span>
          <span className="made">
            Made by{' '}
            <a href={AGENCY_URL} target="_blank" rel="noopener">
              <b>NexKeys Agency</b>
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
