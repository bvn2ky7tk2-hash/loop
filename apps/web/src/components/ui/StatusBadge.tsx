import type { CSSProperties, ReactNode } from 'react';
import { useThemePalette } from '../../hooks/useThemePalette';

/**
 * Tone ngữ nghĩa cho badge trạng thái — thay cho việc tự khai báo
 * bg/color/darkBg/darkColor rải rác ở từng trang.
 */
export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'processing' | 'neutral';

interface ToneConfig {
  bg: string;
  color: string;
  darkBg: string;
  darkColor: string;
}

const TONE: Record<StatusTone, ToneConfig> = {
  success:    { bg: '#ECFDF5', color: '#065F46', darkBg: '#052e16', darkColor: '#6ee7b7' },
  warning:    { bg: '#FFFBEB', color: '#92400E', darkBg: '#451a03', darkColor: '#fcd34d' },
  error:      { bg: '#FEF2F2', color: '#991B1B', darkBg: '#450a0a', darkColor: '#fca5a5' },
  info:       { bg: '#EFF6FF', color: '#1E40AF', darkBg: '#172554', darkColor: '#93C5FD' },
  processing: { bg: '#EEF2FF', color: '#4338CA', darkBg: '#1e1b4b', darkColor: '#a5b4fc' },
  neutral:    { bg: '#F1F5F9', color: '#475569', darkBg: '#1E293B', darkColor: '#94A3B8' },
};

interface StatusBadgeProps {
  /** Nhãn hiển thị (đã việt hóa) */
  label: ReactNode;
  /** Tone ngữ nghĩa quyết định màu */
  tone?: StatusTone;
  size?: 'sm' | 'md';
  /** Chấm tròn màu phía trước nhãn */
  dot?: boolean;
  style?: CSSProperties;
}

/**
 * Badge trạng thái dùng chung — chọn màu qua `tone` ngữ nghĩa, tự xử lý dark/light.
 * Dùng cho các trạng thái KHÔNG thuộc task/project (đã có <TaskStatusPill>).
 *
 * @example
 * <StatusBadge label="Đang mở" tone="success" />
 * <StatusBadge label="Đã đóng" tone="neutral" dot />
 */
export function StatusBadge({ label, tone = 'neutral', size = 'md', dot, style }: StatusBadgeProps) {
  const { isDark } = useThemePalette();
  const cfg = TONE[tone];
  const fg = isDark ? cfg.darkColor : cfg.color;

  const badgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 9999,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    backgroundColor: isDark ? cfg.darkBg : cfg.bg,
    color: fg,
    ...(size === 'sm'
      ? { fontSize: 11, padding: '2px 8px', lineHeight: '16px' }
      : { fontSize: 12, padding: '3px 10px', lineHeight: '18px' }),
    ...style,
  };

  return (
    <span role="status" style={badgeStyle}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: fg, display: 'inline-block' }} />}
      {label}
    </span>
  );
}
