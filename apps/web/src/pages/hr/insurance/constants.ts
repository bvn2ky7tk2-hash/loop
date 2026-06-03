import type {
  InsuranceEnrollmentStatus,
  InsuranceEventType,
} from '../../../api/hr-insurance';

// ─── Helpers ────────────────────────────────────────────────────────────────

export const STATUS_COLOR: Record<InsuranceEnrollmentStatus, string> = {
  ACTIVE: 'green',
  TERMINATED: 'default',
  SUSPENDED: 'warning',
};

export const STATUS_LABEL: Record<InsuranceEnrollmentStatus, string> = {
  ACTIVE: 'Đang đóng',
  TERMINATED: 'Đã nghỉ',
  SUSPENDED: 'Tạm dừng',
};

export const EVENT_LABEL: Record<InsuranceEventType, string> = {
  ENROLL: 'Tăng lao động',
  TERMINATE: 'Giảm lao động',
  SALARY_CHANGE: 'Điều chỉnh mức đóng',
  SUSPEND: 'Tạm dừng',
};
