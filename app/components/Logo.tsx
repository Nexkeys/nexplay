export function Logo({ tone = 'dark', label = 'NexPlay' }: { tone?: 'dark' | 'light'; label?: string }) {
  const light = tone === 'light';
  return (
    <span className="logo">
      <span className="logo-mark" style={{ background: light ? 'var(--ink)' : 'linear-gradient(145deg,var(--brass),var(--brass-2))' }} aria-hidden="true">
        <b style={{ background: light ? 'var(--p-brass)' : 'var(--night)', boxShadow: `9px 0 0 -2px ${light ? 'var(--p-brass)' : 'var(--night)'}` }} />
      </span>
      {label}
    </span>
  );
}
