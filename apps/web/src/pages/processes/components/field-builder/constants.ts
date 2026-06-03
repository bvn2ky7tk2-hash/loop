import type {
  FormField,
  AssigneeMode,
  SystemRole,
} from '../../../../api/processes.api';

// Hình dạng user thực tế trả về từ /users — bù cho type UserRecord upstream
// đang thiếu các field cơ bản (id, email).
export interface AppUser { id: string; name: string; email: string; isActive: boolean }

export type FieldType = FormField['type'];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Văn bản',
  textarea: 'Đoạn văn',
  number: 'Số',
  date: 'Ngày tháng',
  time: 'Giờ',
  select: 'Lựa chọn',
  criteria_grid: 'Bảng tiêu chí',
};

export const ASSIGNEE_MODE_LABELS: Record<AssigneeMode, string> = {
  fixed: 'Người cố định',
  orgunit: 'Theo phòng ban',
  requester_manager: 'Quản lý của người yêu cầu',
  variable: 'Từ biến quy trình',
};

export const SYSTEM_ROLE_OPTIONS: { value: SystemRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'LEADERSHIP', label: 'Leadership' },
  { value: 'PM', label: 'PM' },
  { value: 'MEMBER', label: 'Member' },
];

export const TEMPLATE_VARS = [
  '{{process.name}}', '{{task.name}}', '{{task.dueDate}}',
  '{{requester.name}}', '{{requester.email}}',
  '{{assignee.name}}', '{{assignee.email}}',
  '{{recipient.name}}', '{{recipient.email}}',
];

export const RECIPIENT_PRESETS = [
  { value: 'assignee', label: 'Người xử lý' },
  { value: 'requester', label: 'Người yêu cầu' },
  { value: 'requester_manager', label: 'Quản lý người yêu cầu' },
];

export interface UserTaskMeta {
  id: string;
  name: string;
}
