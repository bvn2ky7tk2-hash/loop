import { Typography, Tag } from 'antd';
import type { HrDecisionType, HrDecisionStatus } from '../../../api/hr-decisions';

const { Text } = Typography;

// ─── Label + color maps ───────────────────────────────────────────────────────

export const DECISION_TYPE_MAP: Record<HrDecisionType, { label: string; color: string }> = {
  HIRE:            { label: 'Tuyển dụng',         color: '#10B981' },
  PROBATION_END:   { label: 'Kết thúc thử việc',  color: '#3B82F6' },
  TRANSFER:        { label: 'Điều chuyển',         color: '#8B5CF6' },
  POSITION_CHANGE: { label: 'Thay đổi vị trí',    color: '#6366F1' },
  SALARY_CHANGE:   { label: 'Điều chỉnh lương',   color: '#F59E0B' },
  COMMENDATION:    { label: 'Khen thưởng',         color: '#F97316' },
  DISCIPLINE:      { label: 'Kỷ luật',             color: '#EF4444' },
  TERMINATION:     { label: 'Chấm dứt HĐ',         color: '#94A3B8' },
  PROMOTION:       { label: 'Thăng chức',          color: '#EC4899' },
  SECONDMENT:      { label: 'Biệt phái',           color: '#0EA5E9' },
};

export const STATUS_MAP: Record<HrDecisionStatus, { label: string; antColor: string }> = {
  DRAFT:    { label: 'Bản nháp',  antColor: 'default' },
  PENDING:  { label: 'Chờ duyệt', antColor: 'warning' },
  APPROVED: { label: 'Đã duyệt',  antColor: 'success' },
  REJECTED: { label: 'Từ chối',   antColor: 'error'   },
};

// Helper: render TypeTag với explicit dark-mode style
export function TypeTag({ type, isDark }: { type: HrDecisionType; isDark: boolean }) {
  const meta = DECISION_TYPE_MAP[type];
  if (!meta) return <Text>{type}</Text>;
  const hex = meta.color;

  const style = isDark
    ? {
        background: `${hex}26`,
        color: `${hex}`,
        borderColor: `${hex}50`,
      }
    : {};

  return (
    <Tag color={isDark ? undefined : hex} style={style}>
      {meta.label}
    </Tag>
  );
}
