import type { CSSProperties } from 'react';
import { useThemeStore } from '../../store/theme.store';

export type TaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'PENDING_APPROVAL'
  | 'RETURNED'
  | 'CANCELLED';

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'CLOSED';

type AnyStatus = TaskStatus | ProjectStatus;

interface PillConfig {
  label: string;
  bg: string;
  color: string;
  darkBg: string;
  darkColor: string;
}

const CONFIG: Record<string, PillConfig> = {
  TODO:             { label: 'Chưa bắt đầu',   bg: '#F1F5F9', color: '#475569', darkBg: '#1E293B',  darkColor: '#94A3B8' },
  IN_PROGRESS:      { label: 'Đang thực hiện', bg: '#EEF2FF', color: '#4338CA', darkBg: '#1e1b4b',  darkColor: '#a5b4fc' },
  DONE:             { label: 'Hoàn thành',      bg: '#ECFDF5', color: '#065F46', darkBg: '#052e16',  darkColor: '#6ee7b7' },
  PENDING_APPROVAL: { label: 'Chờ duyệt',       bg: '#FFFBEB', color: '#92400E', darkBg: '#451a03',  darkColor: '#fcd34d' },
  RETURNED:         { label: 'Trả lại',          bg: '#FEF2F2', color: '#991B1B', darkBg: '#450a0a',  darkColor: '#fca5a5' },
  CANCELLED:        { label: 'Đã hủy',           bg: '#F9FAFB', color: '#374151', darkBg: '#1f2937',  darkColor: '#9ca3af' },
  PLANNING:         { label: 'Lên kế hoạch',    bg: '#F8FAFC', color: '#475569', darkBg: '#1E293B',  darkColor: '#94A3B8' },
  ACTIVE:           { label: 'Đang chạy',        bg: '#EEF2FF', color: '#4338CA', darkBg: '#1e1b4b',  darkColor: '#a5b4fc' },
  ON_HOLD:          { label: 'Tạm dừng',         bg: '#FFFBEB', color: '#92400E', darkBg: '#451a03',  darkColor: '#fcd34d' },
  CLOSED:           { label: 'Đã đóng',          bg: '#F1F5F9', color: '#6B7280', darkBg: '#1E293B',  darkColor: '#6B7280' },
};

interface TaskStatusPillProps {
  status: AnyStatus;
  size?: 'sm' | 'md';
  style?: CSSProperties;
}

export function TaskStatusPill({ status, size = 'md', style }: TaskStatusPillProps) {
  const isDark = useThemeStore((s) => s.mode === 'dark');
  const fallback = { label: status, bg: '#F1F5F9', color: '#475569', darkBg: '#1E293B', darkColor: '#94A3B8' };
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

  return (
    <span role="status" aria-label={`Status: ${cfg.label}`} style={pillStyle}>
      {cfg.label}
    </span>
  );
}
