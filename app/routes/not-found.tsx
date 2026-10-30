import { Link } from 'react-router';

export function meta() {
  return [{ title: 'Page not found · NexPlay' }, { name: 'robots', content: 'noindex' }];
}

export default function NotFound() {
  return (
    <main className="crash">
      <span className="mono" style={{ color: 'var(--ink-mute)' }}>
        404
      </span>
      <h1>This table is empty.</h1>
      <p>The page you are looking for is not here. It may have moved, or the link has a typo.</p>
      <Link className="crash-link" to="/">
        Back to NexPlay
      </Link>
    </main>
  );
}
