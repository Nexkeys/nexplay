import { Icon } from './Icon';

export function Avatar({ name, colour, size = 40, bot, off }: { name: string; colour: string; size?: number; bot?: boolean; off?: boolean }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <span
      className={`av${off ? ' off' : ''}`}
      style={{ ['--size' as string]: `${size}px`, background: `linear-gradient(140deg, ${colour}, color-mix(in srgb, ${colour} 62%, #000))` }}
      aria-hidden="true"
    >
      {initial}
      {bot && (
        <i className="av-bot">
          <Icon name="bot" size={12} stroke={2.4} />
        </i>
      )}
    </span>
  );
}
