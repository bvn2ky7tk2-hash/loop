import type { CSSProperties } from 'react';
import { useThemeStore } from '../../store/theme.store';
import type { BugStatus } from '../../api/bugs.api';

interface PillConfig {
  label: string;
  bg: string;
  color: string;
  darkBg: string;
  darkColor: string;
}

const CONFIG: Record<BugStatus, PillConfig> = {
  OPEN:           { label: 'Open',         bg: '#EFF6FF', color: '#1D4ED8', darkBg: '#1e3a5f', darkColor: '#93c5fd' },
  PENDING:        { label: 'Chờ xử lý',   bg: '#FFFBEB', color: '#92400E', darkBg: '#451a03', darkColor: '#fcd34d' },
  PENDING_REVIEW: { label: 'Chờ duyệt',   bg: '#FFF7ED', color: '#C2410C', darkBg: '#431407', darkColor: '#fdba74' },
  APPROVED:       { label: 'Đã duyệt',    bg: '#ECFDF5', color: '#065F46', darkBg: '#052e16', darkColor: '#6ee7b7' },
  REJECTED:       { label: 'Từ chối',     bg: '#FEF2F2', color: '#991B1B', darkBg: '#450a0a', darkColor: '#fca5a5' },
  IN_PROGRESS:    { label: 'Đang xử lý',  bg: '#EEF2FF', color: '#4338CA', darkBg: '#1e1b4b', darkColor: '#a5b4fc' },
  RESOLVED:       { label: 'Resolved',    bg: '#F0FDF4', color: '#166534', darkBg: '#14532d', darkColor: '#86efac' },
  CLOSED:         { label: 'Closed',      bg: '#F8FAFC', color: '#475569', darkBg: '#1E293B', darkColor: '#94A3B8' },
  CANCELLED:      { label: 'Đã hủy',      bg: '#F9FAFB', color: '#374151', darkBg: '#1f2937', darkColor: '#9ca3af' },
};

interface BugStatusPillProps {
  status: BugStatus;
  size?: 'sm' | 'md';
  style?: CSSProperties;
}

export function BugStatusPill({ status, size = 'md', style }: BugStatusPillProps) {
  const isDark = useThemeStore((s) => s.mode === 'dark');
  const fallback: PillConfig = { label: status, bg: '#F1F5F9', color: '#475569', darkBg: '#1E293B', darkColor: '#94A3B8' };
  const cfg = CONFIG[status] ?? fallback;

  const pillStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 9999,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    backgroundColor: isDark ? cfg.darkBg : cfg.bg,
    color: isDark ? cfg.darkColor : cfg.color,
    ...(size === 'sm'
      ? { fontSize: 11, padding: '2px 8px', lineHeight: '16px' }
      : { fontSize: 12, padding: '3px 10px', lineHeight: '18px' }),
    ...style,
  };

  return <span style={pillStyle}>{cfg.label}</span>;
}
