// Permission constants

export enum Permission {
  // Admin
  ADMIN_PANEL_ACCESS = 'ADMIN_PANEL_ACCESS',
  USER_MANAGE = 'USER_MANAGE',
  ROLE_MANAGE = 'ROLE_MANAGE',

  // HR
  HR_VIEW = 'HR_VIEW',
  HR_CREATE = 'HR_CREATE',
  HR_EDIT = 'HR_EDIT',
  HR_DELETE = 'HR_DELETE',

  // CRM
  CRM_VIEW = 'CRM_VIEW',
  CRM_CREATE = 'CRM_CREATE',
  CRM_EDIT = 'CRM_EDIT',
  CRM_DELETE = 'CRM_DELETE',

  // Finance
  FINANCE_VIEW = 'FINANCE_VIEW',
  FINANCE_CREATE = 'FINANCE_CREATE',
  FINANCE_EDIT = 'FINANCE_EDIT',
  FINANCE_DELETE = 'FINANCE_DELETE',
  FINANCE_APPROVE = 'FINANCE_APPROVE',

  // Projects
  PROJECT_VIEW = 'PROJECT_VIEW',
  PROJECT_CREATE = 'PROJECT_CREATE',
  PROJECT_EDIT = 'PROJECT_EDIT',
  PROJECT_DELETE = 'PROJECT_DELETE',
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  [Permission.ADMIN_PANEL_ACCESS]: 'Truy cập bảng điều khiển quản trị',
  [Permission.USER_MANAGE]: 'Quản lý người dùng',
  [Permission.ROLE_MANAGE]: 'Quản lý vai trò',
  [Permission.HR_VIEW]: 'Xem Nhân sự',
  [Permission.HR_CREATE]: 'Tạo Nhân sự',
  [Permission.HR_EDIT]: 'Chỉnh sửa Nhân sự',
  [Permission.HR_DELETE]: 'Xóa Nhân sự',
  [Permission.CRM_VIEW]: 'Xem CRM',
  [Permission.CRM_CREATE]: 'Tạo CRM',
  [Permission.CRM_EDIT]: 'Chỉnh sửa CRM',
  [Permission.CRM_DELETE]: 'Xóa CRM',
  [Permission.FINANCE_VIEW]: 'Xem Tài chính',
  [Permission.FINANCE_CREATE]: 'Tạo Tài chính',
  [Permission.FINANCE_EDIT]: 'Chỉnh sửa Tài chính',
  [Permission.FINANCE_DELETE]: 'Xóa Tài chính',
  [Permission.FINANCE_APPROVE]: 'Duyệt Tài chính',
  [Permission.PROJECT_VIEW]: 'Xem Dự án',
  [Permission.PROJECT_CREATE]: 'Tạo Dự án',
  [Permission.PROJECT_EDIT]: 'Chỉnh sửa Dự án',
  [Permission.PROJECT_DELETE]: 'Xóa Dự án',
};
