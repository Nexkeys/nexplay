import type { GameMeta } from '~/engine/catalog';

/** The house rules for a game, from its catalog entry. Read only for everyone except the host. */
export function Settings({
  meta,
  config,
  onChange,
  readOnly
}: {
  meta: GameMeta;
  config: Record<string, unknown>;
  onChange?: (patch: Record<string, unknown>) => void;
  readOnly?: boolean;
}) {
  const visible = meta.settings.filter((s) => !s.when || config[s.when.key] === s.when.value);
  if (!visible.length) return <p className="muted small">This game has no options. Just play.</p>;
  return (
    <div className="settings">
      {visible.map((s) =>
        s.type === 'toggle' ? (
          <label key={s.key} className={`set-toggle${readOnly ? ' ro' : ''}`}>
            <span>
              <b>{s.label}</b>
              {s.help && <small>{s.help}</small>}
            </span>
            <input type="checkbox" role="switch" checked={!!config[s.key]} disabled={readOnly} onChange={(e) => onChange?.({ [s.key]: e.target.checked })} />
            <i aria-hidden="true" />
          </label>
        ) : (
          <div key={s.key} className="set-choice">
            <span>
              <b>{s.label}</b>
              {s.help && <small>{s.help}</small>}
            </span>
            <div className="seg" role="radiogroup" aria-label={s.label}>
              {s.options!.map((o) => (
                <button
                  key={String(o.value)}
                  role="radio"
                  aria-checked={config[s.key] === o.value}
                  className={config[s.key] === o.value ? 'on' : ''}
                  disabled={readOnly}
                  onClick={() => onChange?.({ [s.key]: o.value })}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
