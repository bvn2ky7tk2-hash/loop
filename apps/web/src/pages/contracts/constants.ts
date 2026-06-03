import dayjs from 'dayjs';
import type { ContractType, ContractStatus } from '../../api/contracts';

// ── Constants ─────────────────────────────────────────────────────────────────

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  PROBATION:  'Thử việc',
  FIXED_12:   'Xác định 12 tháng',
  FIXED_24:   'Xác định 24 tháng',
  FIXED_36:   'Xác định 36 tháng',
  INDEFINITE: 'Không xác định thời hạn',
  PART_TIME:  'Bán thời gian',
  SEASONAL:   'Thời vụ',
};

export const CONTRACT_TYPE_HUE: Record<ContractType, string> = {
  PROBATION:  '#F59E0B',
  FIXED_12:   '#3B82F6',
  FIXED_24:   '#6366F1',
  FIXED_36:   '#8B5CF6',
  INDEFINITE: '#10B981',
  PART_TIME:  '#0EA5E9',
  SEASONAL:   '#94A3B8',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT:      'Nháp',
  ACTIVE:     'Đang hiệu lực',
  EXPIRED:    'Đã hết hạn',
  TERMINATED: 'Đã chấm dứt',
};

export const CONTRACT_STATUS_HUE: Record<ContractStatus, string> = {
  DRAFT:      '#3B82F6',
  ACTIVE:     '#16A34A',
  EXPIRED:    '#EA580C',
  TERMINATED: '#DC2626',
};

export const CONTRACT_TYPES: ContractType[] = [
  'PROBATION', 'FIXED_12', 'FIXED_24', 'FIXED_36', 'INDEFINITE', 'PART_TIME', 'SEASONAL',
];
export const CONTRACT_STATUSES: ContractStatus[] = ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'];

// Loại HĐ có thể gia hạn → tự động tính endDate
export const FIXED_TYPES: ContractType[] = ['PROBATION', 'FIXED_12', 'FIXED_24', 'FIXED_36'];

// Số ngày/tháng theo loại HĐ
export const CONTRACT_TYPE_DURATION: Record<ContractType, { unit: 'day' | 'month' | null; value: number | null }> = {
  PROBATION:  { unit: 'day',   value: 60 },
  FIXED_12:   { unit: 'month', value: 12 },
  FIXED_24:   { unit: 'month', value: 24 },
  FIXED_36:   { unit: 'month', value: 36 },
  INDEFINITE: { unit: null,    value: null },
  PART_TIME:  { unit: null,    value: null },
  SEASONAL:   { unit: null,    value: null },
};

// Tính endDate từ startDate + loại HĐ
export function calcEndDate(type: ContractType, start: dayjs.Dayjs, probationDays = 60): dayjs.Dayjs | null {
  const d = CONTRACT_TYPE_DURATION[type];
  if (!d.unit) return null;
  if (d.unit === 'day') return start.add(probationDays, 'day');
  return start.add(d.value!, 'month');
}

// Gợi ý loại HĐ kế tiếp khi gia hạn
export function suggestRenewalType(current: ContractType, renewalCount: number): ContractType {
  if (renewalCount >= 2) return 'INDEFINITE'; // BLLĐ bắt buộc
  if (current === 'PROBATION') return 'FIXED_12';
  if (current === 'FIXED_12')  return 'FIXED_24';
  if (current === 'FIXED_24')  return 'INDEFINITE';
  return 'INDEFINITE';
}

// ── Probation days selector ──────────────────────────────────────────────────

export const PROBATION_OPTIONS = [
  { value: 6,   label: '6 ngày (lao động phổ thông)' },
  { value: 30,  label: '30 ngày (trung cấp nghề)' },
  { value: 60,  label: '60 ngày (đại học / cao đẳng)' },
  { value: 180, label: '180 ngày (quản lý / chuyên gia)' },
];
