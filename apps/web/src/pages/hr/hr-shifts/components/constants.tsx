import { Tag, Typography } from 'antd';
import type { ShiftType, ScheduleRepeatType } from '../../../../api/work-shifts';

const { Text } = Typography;

// ─── Constants ────────────────────────────────────────────────────────────────

export const SHIFT_TYPE_MAP: Record<ShiftType, { label: string; color: string; darkBg: string; darkText: string; darkBorder: string }> = {
  HANH_CHINH: { label: 'Hành chính', color: 'blue',   darkBg: 'rgba(96,165,250,0.15)',  darkText: '#93C5FD', darkBorder: 'rgba(96,165,250,0.3)' },
  CA_SANG:    { label: 'Ca sáng',    color: 'gold',   darkBg: 'rgba(251,191,36,0.15)',  darkText: '#FCD34D', darkBorder: 'rgba(251,191,36,0.3)' },
  CA_CHIEU:   { label: 'Ca chiều',   color: 'orange', darkBg: 'rgba(251,146,60,0.15)',  darkText: '#FDBA74', darkBorder: 'rgba(251,146,60,0.3)' },
  CA_DEM:     { label: 'Ca đêm',     color: 'purple', darkBg: 'rgba(167,139,250,0.15)', darkText: '#C4B5FD', darkBorder: 'rgba(167,139,250,0.3)' },
  LINH_HOAT:  { label: 'Linh hoạt', color: 'cyan',   darkBg: 'rgba(34,211,238,0.15)',  darkText: '#67E8F9', darkBorder: 'rgba(34,211,238,0.3)' },
};

export const REPEAT_META: Record<ScheduleRepeatType, { label: string; phaseLabel: string; color: string }> = {
  DAILY:   { label: 'Theo ngày',  phaseLabel: 'Ngày',  color: '#10B981' },
  WEEKLY:  { label: 'Theo tuần',  phaseLabel: 'Tuần',  color: '#3B82F6' },
  MONTHLY: { label: 'Theo tháng', phaseLabel: 'Tháng', color: '#8B5CF6' },
};

export function calcNetHours(startTime: string, endTime: string, breakMinutes: number): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let totalMin = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMin < 0) totalMin += 24 * 60;
  totalMin -= breakMinutes;
  return Math.max(0, totalMin / 60);
}

export function ShiftTypeTag({ type, isDark }: { type: ShiftType; isDark: boolean }) {
  const meta = SHIFT_TYPE_MAP[type];
  if (!meta) return <Text>{type}</Text>;
  return (
    <Tag
      color={isDark ? undefined : meta.color}
      style={isDark ? { background: meta.darkBg, color: meta.darkText, borderColor: meta.darkBorder } : {}}
    >
      {meta.label}
    </Tag>
  );
}
