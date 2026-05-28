import { Tag } from 'antd';
import type { DefinitionStatus, InstanceStatus, UserTaskStatus } from '../../../api/processes.api';

interface DefinitionStatusBadgeProps {
  status: DefinitionStatus;
}

interface InstanceStatusBadgeProps {
  status: InstanceStatus;
}

interface UserTaskStatusBadgeProps {
  status: UserTaskStatus;
}

const DEFINITION_STATUS_MAP: Record<DefinitionStatus, { color: string; label: string }> = {
  DRAFT:      { color: 'default', label: 'Không sử dụng' },
  ACTIVE:     { color: 'green',   label: 'Kích hoạt' },
  DEPRECATED: { color: 'default', label: 'Không sử dụng' },
};

const INSTANCE_STATUS_MAP: Record<InstanceStatus, { color: string; label: string }> = {
  RUNNING: { color: 'processing', label: 'Đang chạy' },
  SUSPENDED: { color: 'warning', label: 'Tạm dừng' },
  COMPLETED: { color: 'success', label: 'Hoàn thành' },
  CANCELLED: { color: 'default', label: 'Đã huỷ' },
  ERROR: { color: 'error', label: 'Lỗi' },
};

const USER_TASK_STATUS_MAP: Record<UserTaskStatus, { color: string; label: string }> = {
  PENDING: { color: 'default', label: 'Chờ xử lý' },
  IN_PROGRESS: { color: 'processing', label: 'Đang xử lý' },
  COMPLETED: { color: 'success', label: 'Hoàn thành' },
  SKIPPED: { color: 'volcano', label: 'Bỏ qua' },
};

export function DefinitionStatusBadge({ status }: DefinitionStatusBadgeProps) {
  const config = DEFINITION_STATUS_MAP[status] ?? { color: 'default', label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
}

export function InstanceStatusBadge({ status }: InstanceStatusBadgeProps) {
  const config = INSTANCE_STATUS_MAP[status] ?? { color: 'default', label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
}

export function UserTaskStatusBadge({ status }: UserTaskStatusBadgeProps) {
  const config = USER_TASK_STATUS_MAP[status] ?? { color: 'default', label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
}
