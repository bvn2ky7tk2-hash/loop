// Role constants

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  VIEWER = 'VIEWER',
  GUEST = 'GUEST',
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Quản trị viên',
  [Role.MANAGER]: 'Quản lý',
  [Role.EMPLOYEE]: 'Nhân viên',
  [Role.VIEWER]: 'Xem',
  [Role.GUEST]: 'Khách',
};

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.ADMIN]: 5,
  [Role.MANAGER]: 4,
  [Role.EMPLOYEE]: 3,
  [Role.VIEWER]: 2,
  [Role.GUEST]: 1,
};
