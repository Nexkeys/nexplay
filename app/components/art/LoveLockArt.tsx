// Placeholder art while this game is being built.
export function LoveLockArt({ size = 150 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 150 90" aria-hidden="true">
      <rect x="20" y="15" width="110" height="60" rx="14" fill="#fffaf0" opacity=".2" />
    </svg>
  );
}
