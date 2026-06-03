import { Tag } from 'antd';
import { EVENT_TYPE_LABELS } from '../constants';

// ─── Event Type Tag ────────────────────────────────────────────────────────

export function EventTypeTag({ type, isDark }: { type: string; isDark: boolean }) {
  const colorMap: Record<string, { bg: string; text: string; border: string; light: string }> = {
    MEETING:      { bg: 'rgba(59,130,246,0.15)',  text: '#93C5FD', border: 'rgba(59,130,246,0.3)',  light: 'blue' },
    HOLIDAY:      { bg: 'rgba(16,185,129,0.15)',  text: '#6EE7B7', border: 'rgba(16,185,129,0.3)',  light: 'green' },
    TRAINING:     { bg: 'rgba(139,92,246,0.15)',  text: '#C4B5FD', border: 'rgba(139,92,246,0.3)',  light: 'purple' },
    DEADLINE:     { bg: 'rgba(239,68,68,0.15)',   text: '#FCA5A5', border: 'rgba(239,68,68,0.3)',   light: 'red' },
    OTHER:        { bg: 'rgba(148,163,184,0.15)', text: '#CBD5E1', border: 'rgba(148,163,184,0.3)', light: 'default' },
    ROOM_BOOKING: { bg: 'rgba(245,158,11,0.15)',  text: '#FCD34D', border: 'rgba(245,158,11,0.3)',  light: 'orange' },
  };
  const c = colorMap[type] ?? colorMap.OTHER;
  return (
    <Tag
      style={isDark ? { background: c.bg, color: c.text, borderColor: c.border } : {}}
      color={isDark ? undefined : c.light}
    >
      {EVENT_TYPE_LABELS[type] ?? type}
    </Tag>
  );
}
