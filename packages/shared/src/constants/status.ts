// Entity status enums and constants

export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export const STATUS_LABELS: Record<EntityStatus, string> = {
  [EntityStatus.ACTIVE]: 'Hoạt động',
  [EntityStatus.INACTIVE]: 'Không hoạt động',
  [EntityStatus.PENDING]: 'Chờ duyệt',
  [EntityStatus.APPROVED]: 'Đã duyệt',
  [EntityStatus.REJECTED]: 'Từ chối',
  [EntityStatus.ARCHIVED]: 'Lưu trữ',
  [EntityStatus.DELETED]: 'Đã xóa',
};

export const STATUS_COLORS: Record<EntityStatus, string> = {
  [EntityStatus.ACTIVE]: 'green',
  [EntityStatus.INACTIVE]: 'gray',
  [EntityStatus.PENDING]: 'orange',
  [EntityStatus.APPROVED]: 'green',
  [EntityStatus.REJECTED]: 'red',
  [EntityStatus.ARCHIVED]: 'blue',
  [EntityStatus.DELETED]: 'red',
};
