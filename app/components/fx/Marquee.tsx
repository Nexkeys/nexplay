/** An endless ticker. The list is doubled so the loop is seamless. */
export function Marquee({ items, speed = 40 }: { items: string[]; speed?: number }) {
  const row = (hidden?: boolean) => (
    <div className="mq-row" aria-hidden={hidden}>
      {items.map((t, i) => (
        <span key={i}>
          {t}
          <i className="mq-dot" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee" style={{ ['--mq' as string]: `${speed}s` }}>
      <div className="mq-track">
        {row()}
        {row(true)}
      </div>
    </div>
  );
}
