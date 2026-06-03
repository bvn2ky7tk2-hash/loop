import {
  FileProtectOutlined,
  FileTextOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';

// ─── Constants ───────────────────────────────────────────────────────────────

export const EVENT_ICON: Record<string, React.ReactNode> = {
  HR_DECISION: <FileProtectOutlined style={{ color: '#6366F1' }} />,
  CONTRACT_SIGNED: <FileTextOutlined style={{ color: '#10B981' }} />,
  INSURANCE_ENROLLED: <SafetyOutlined style={{ color: '#3B82F6' }} />,
  PROBATION_STARTED: <ClockCircleOutlined style={{ color: '#F59E0B' }} />,
  PROBATION_ENDED: <CheckCircleOutlined style={{ color: '#10B981' }} />,
  TERMINATION: <StopOutlined style={{ color: '#EF4444' }} />,
};

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Đang làm việc', color: 'green' },
  PROBATION: { label: 'Thử việc', color: 'blue' },
  TERMINATED: { label: 'Đã nghỉ', color: 'default' },
  ON_LEAVE: { label: 'Nghỉ phép', color: 'orange' },
};

export const CONTRACT_TYPE_LABEL: Record<string, string> = {
  INDEFINITE: 'Không xác định thời hạn',
  FIXED_TERM_12: '12 tháng',
  FIXED_TERM_24: '24 tháng',
  SEASONAL: 'Thời vụ',
  PROBATION: 'Thử việc',
};

export const DEGREE_LEVEL_LABEL: Record<string, string> = {
  PRIMARY: 'Tiểu học',
  SECONDARY: 'THPT/THCS',
  VOCATIONAL: 'Trung cấp',
  COLLEGE: 'Cao đẳng',
  BACHELOR: 'Đại học',
  MASTER: 'Thạc sĩ',
  DOCTORATE: 'Tiến sĩ',
  OTHER: 'Khác',
};

export const GENDER_LABEL: Record<string, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
};

export const MARITAL_LABEL: Record<string, string> = {
  SINGLE: 'Độc thân',
  MARRIED: 'Đã kết hôn',
  DIVORCED: 'Đã ly hôn',
  WIDOWED: 'Góa',
};

export const RELATIONSHIP_LABEL: Record<string, string> = {
  SPOUSE: 'Vợ/Chồng',
  PARENT: 'Cha/Mẹ',
  CHILD: 'Con',
  SIBLING: 'Anh/Chị/Em',
  GRANDPARENT: 'Ông/Bà',
  OTHER: 'Khác',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(-2).map((w) => w[0].toUpperCase()).join('');
}

export function avatarColor(name: string): string {
  const colors = ['#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#F97316'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
