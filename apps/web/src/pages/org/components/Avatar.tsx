import { getInitials, stringToColor } from '../orgChartHelpers';

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const bg = stringToColor(name);
  return (
    <div
      title={name}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: bg, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
        border: '2px solid rgba(255,255,255,0.3)',
        cursor: 'default', userSelect: 'none',
      }}
    >
      {getInitials(name)}
    </div>
  );
}
