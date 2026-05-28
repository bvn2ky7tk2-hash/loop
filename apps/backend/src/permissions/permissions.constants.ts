import { Role } from '../generated/prisma';

// ─── Permission Codes ─────────────────────────────────────────────────────────
// Convention: {domain_module}:action (2-part, underscore for sub-modules)
// Current: core domain only. ERP domains (hr_*, finance_*, crm_*) added per module.

export const PERMISSIONS = {
  // Projects
  PROJECTS_READ:   'projects:read',
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',

  // Tasks
  TASKS_READ:    'tasks:read',
  TASKS_CREATE:  'tasks:create',
  TASKS_UPDATE:  'tasks:update',
  TASKS_DELETE:  'tasks:delete',
  TASKS_APPROVE: 'tasks:approve',

  // Employees
  EMPLOYEES_READ:   'employees:read',
  EMPLOYEES_CREATE: 'employees:create',
  EMPLOYEES_UPDATE: 'employees:update',
  EMPLOYEES_DELETE: 'employees:delete',

  // Reports
  REPORTS_READ:   'reports:read',
  REPORTS_EXPORT: 'reports:export',

  // Timesheets
  TIMESHEETS_READ:    'timesheets:read',
  TIMESHEETS_APPROVE: 'timesheets:approve',

  // Time Logs
  TIMELOGS_CREATE: 'timelogs:create',
  TIMELOGS_UPDATE: 'timelogs:update',

  // Bugs
  BUGS_READ:   'bugs:read',
  BUGS_CREATE: 'bugs:create',
  BUGS_UPDATE: 'bugs:update',
  BUGS_ASSIGN: 'bugs:assign',
  BUGS_CLOSE:  'bugs:close',

  // Issues (Epic 14 — Issue Register)
  ISSUES_READ:    'issues:read',
  ISSUES_CREATE:  'issues:create',
  ISSUES_UPDATE:  'issues:update',
  ISSUES_APPROVE: 'issues:approve',

  // BPM
  BPM_READ:   'bpm:read',
  BPM_MANAGE: 'bpm:manage',

  // Alerts
  ALERTS_READ:      'alerts:read',
  ALERTS_CONFIGURE: 'alerts:configure',

  // Dashboard
  DASHBOARD_READ: 'dashboard:read',

  // Finance
  FINANCE_READ:   'finance:read',
  FINANCE_CREATE: 'finance:create',
  FINANCE_APPROVE:'finance:approve',
  FINANCE_MANAGE: 'finance:manage',
  FINANCE_EXPORT: 'finance:export',

  // Leaves (HR — nghỉ phép)
  LEAVES_READ:    'leaves:read',
  LEAVES_CREATE:  'leaves:create',
  LEAVES_APPROVE: 'leaves:approve',

  // Contracts (HR — hợp đồng)
  CONTRACTS_READ:   'contracts:read',
  CONTRACTS_CREATE: 'contracts:create',
  CONTRACTS_UPDATE: 'contracts:update',
  CONTRACTS_APPROVE:'contracts:approve',

  // Admin
  ADMIN_USERS:       'admin:users',
  ADMIN_ORG:         'admin:org',
  ADMIN_PERMISSIONS: 'admin:permissions',
  ADMIN_SETTINGS:    'admin:settings',

  // CRM
  CRM_READ:   'crm:read',
  CRM_CREATE: 'crm:create',
  CRM_UPDATE: 'crm:update',
  CRM_DELETE: 'crm:delete',
  CRM_MANAGE: 'crm:manage',

  // Recruitment
  RECRUIT_READ:   'recruit:read',
  RECRUIT_CREATE: 'recruit:create',
  RECRUIT_UPDATE: 'recruit:update',
  RECRUIT_APPROVE:'recruit:approve',
  RECRUIT_MANAGE: 'recruit:manage',

  // Assets
  ASSET_READ:   'asset:read',
  ASSET_CREATE: 'asset:create',
  ASSET_UPDATE: 'asset:update',
  ASSET_ASSIGN: 'asset:assign',
  ASSET_MANAGE: 'asset:manage',

  // Procurement — Mua hàng
  PROCUREMENT_READ:    'procurement:read',
  PROCUREMENT_CREATE:  'procurement:create',
  PROCUREMENT_UPDATE:  'procurement:update',
  PROCUREMENT_APPROVE: 'procurement:approve',
  PROCUREMENT_MANAGE:  'procurement:manage',

  // OKR & KPI
  OKR_READ:   'okr:read',
  OKR_CREATE: 'okr:create',
  OKR_UPDATE: 'okr:update',
  OKR_MANAGE: 'okr:manage',

  // Skill Matrix
  SKILLS_READ:   'skills:read',
  SKILLS_MANAGE: 'skills:manage',

  // Training
  TRAINING_READ:   'training:read',
  TRAINING_CREATE: 'training:create',
  TRAINING_MANAGE: 'training:manage',

  // Timelogs — đọc (bổ sung bên cạnh create/update đã có)
  TIMELOGS_READ: 'timelogs:read',

  // HR Self-service
  HR_READ: 'hr:read',

  // Room Booking
  ROOM_BOOKING_READ:   'room_booking:read',
  ROOM_BOOKING_CREATE: 'room_booking:create',
  ROOM_BOOKING_MANAGE: 'room_booking:manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── All permission definitions (for seeding) ────────────────────────────────

export interface PermissionDef {
  code: string;
  module: string;
  action: string;
  description?: string;
}

export const ALL_PERMISSIONS: PermissionDef[] = [
  { code: PERMISSIONS.PROJECTS_READ,   module: 'projects',   action: 'read',      description: 'Xem danh sách dự án' },
  { code: PERMISSIONS.PROJECTS_CREATE, module: 'projects',   action: 'create',    description: 'Tạo dự án mới' },
  { code: PERMISSIONS.PROJECTS_UPDATE, module: 'projects',   action: 'update',    description: 'Cập nhật thông tin dự án' },
  { code: PERMISSIONS.PROJECTS_DELETE, module: 'projects',   action: 'delete',    description: 'Xóa dự án' },

  { code: PERMISSIONS.TASKS_READ,    module: 'tasks', action: 'read',    description: 'Xem task' },
  { code: PERMISSIONS.TASKS_CREATE,  module: 'tasks', action: 'create',  description: 'Tạo task mới' },
  { code: PERMISSIONS.TASKS_UPDATE,  module: 'tasks', action: 'update',  description: 'Cập nhật task' },
  { code: PERMISSIONS.TASKS_DELETE,  module: 'tasks', action: 'delete',  description: 'Xóa task' },
  { code: PERMISSIONS.TASKS_APPROVE, module: 'tasks', action: 'approve', description: 'Duyệt/từ chối task' },

  { code: PERMISSIONS.EMPLOYEES_READ,   module: 'employees', action: 'read',   description: 'Xem danh sách nhân sự' },
  { code: PERMISSIONS.EMPLOYEES_CREATE, module: 'employees', action: 'create', description: 'Thêm nhân sự mới' },
  { code: PERMISSIONS.EMPLOYEES_UPDATE, module: 'employees', action: 'update', description: 'Cập nhật hồ sơ nhân sự' },
  { code: PERMISSIONS.EMPLOYEES_DELETE, module: 'employees', action: 'delete', description: 'Xóa nhân sự' },

  { code: PERMISSIONS.REPORTS_READ,   module: 'reports', action: 'read',   description: 'Xem báo cáo' },
  { code: PERMISSIONS.REPORTS_EXPORT, module: 'reports', action: 'export', description: 'Xuất báo cáo Excel' },

  { code: PERMISSIONS.TIMESHEETS_READ,    module: 'timesheets', action: 'read',    description: 'Xem timesheet' },
  { code: PERMISSIONS.TIMESHEETS_APPROVE, module: 'timesheets', action: 'approve', description: 'Duyệt timesheet' },

  { code: PERMISSIONS.TIMELOGS_CREATE, module: 'timelogs', action: 'create', description: 'Ghi nhận giờ làm việc' },
  { code: PERMISSIONS.TIMELOGS_UPDATE, module: 'timelogs', action: 'update', description: 'Chỉnh sửa time log' },

  { code: PERMISSIONS.BUGS_READ,   module: 'bugs', action: 'read',   description: 'Xem danh sách bug' },
  { code: PERMISSIONS.BUGS_CREATE, module: 'bugs', action: 'create', description: 'Tạo bug mới' },
  { code: PERMISSIONS.BUGS_UPDATE, module: 'bugs', action: 'update', description: 'Cập nhật bug' },
  { code: PERMISSIONS.BUGS_ASSIGN, module: 'bugs', action: 'assign', description: 'Giao bug cho người xử lý' },
  { code: PERMISSIONS.BUGS_CLOSE,  module: 'bugs', action: 'close',  description: 'Đóng bug' },

  { code: PERMISSIONS.ISSUES_READ,    module: 'issues', action: 'read',    description: 'Xem issue register' },
  { code: PERMISSIONS.ISSUES_CREATE,  module: 'issues', action: 'create',  description: 'Tạo issue mới' },
  { code: PERMISSIONS.ISSUES_UPDATE,  module: 'issues', action: 'update',  description: 'Cập nhật issue' },
  { code: PERMISSIONS.ISSUES_APPROVE, module: 'issues', action: 'approve', description: 'Phê duyệt CR' },

  { code: PERMISSIONS.BPM_READ,   module: 'bpm', action: 'read',   description: 'Xem quy trình BPM' },
  { code: PERMISSIONS.BPM_MANAGE, module: 'bpm', action: 'manage', description: 'Quản lý quy trình BPM' },

  { code: PERMISSIONS.ALERTS_READ,      module: 'alerts', action: 'read',      description: 'Xem cảnh báo' },
  { code: PERMISSIONS.ALERTS_CONFIGURE, module: 'alerts', action: 'configure', description: 'Cấu hình ngưỡng cảnh báo' },

  { code: PERMISSIONS.DASHBOARD_READ, module: 'dashboard', action: 'read', description: 'Xem dashboard' },

  { code: PERMISSIONS.FINANCE_READ,   module: 'finance', action: 'read',   description: 'Xem payroll, chi phí, ngân sách, hóa đơn' },
  { code: PERMISSIONS.FINANCE_CREATE, module: 'finance', action: 'create', description: 'Tạo hóa đơn / chi phí mới' },
  { code: PERMISSIONS.FINANCE_APPROVE,module: 'finance', action: 'approve',description: 'Phê duyệt chi phí / hóa đơn' },
  { code: PERMISSIONS.FINANCE_MANAGE, module: 'finance', action: 'manage', description: 'Quản lý tài chính toàn diện' },
  { code: PERMISSIONS.FINANCE_EXPORT, module: 'finance', action: 'export', description: 'Xuất báo cáo tài chính' },

  { code: PERMISSIONS.LEAVES_READ,    module: 'leaves', action: 'read',    description: 'Xem danh sách đơn nghỉ phép' },
  { code: PERMISSIONS.LEAVES_CREATE,  module: 'leaves', action: 'create',  description: 'Tạo đơn nghỉ phép' },
  { code: PERMISSIONS.LEAVES_APPROVE, module: 'leaves', action: 'approve', description: 'Phê duyệt đơn nghỉ phép' },

  { code: PERMISSIONS.CONTRACTS_READ,   module: 'contracts', action: 'read',   description: 'Xem hợp đồng' },
  { code: PERMISSIONS.CONTRACTS_CREATE, module: 'contracts', action: 'create', description: 'Tạo hợp đồng mới' },
  { code: PERMISSIONS.CONTRACTS_UPDATE, module: 'contracts', action: 'update', description: 'Cập nhật hợp đồng' },
  { code: PERMISSIONS.CONTRACTS_APPROVE,module: 'contracts', action: 'approve',description: 'Phê duyệt / ký hợp đồng' },

  { code: PERMISSIONS.ADMIN_USERS,       module: 'admin', action: 'users',       description: 'Quản lý người dùng' },
  { code: PERMISSIONS.ADMIN_ORG,         module: 'admin', action: 'org',         description: 'Quản lý cây tổ chức' },
  { code: PERMISSIONS.ADMIN_PERMISSIONS, module: 'admin', action: 'permissions', description: 'Quản lý phân quyền' },
  { code: PERMISSIONS.ADMIN_SETTINGS,    module: 'admin', action: 'settings',    description: 'Cài đặt hệ thống' },

  { code: PERMISSIONS.CRM_READ,   module: 'crm', action: 'read',   description: 'Xem leads, deals, contacts, khách hàng' },
  { code: PERMISSIONS.CRM_CREATE, module: 'crm', action: 'create', description: 'Tạo lead / deal / khách hàng mới' },
  { code: PERMISSIONS.CRM_UPDATE, module: 'crm', action: 'update', description: 'Cập nhật thông tin CRM' },
  { code: PERMISSIONS.CRM_DELETE, module: 'crm', action: 'delete', description: 'Xoá dữ liệu CRM' },
  { code: PERMISSIONS.CRM_MANAGE, module: 'crm', action: 'manage', description: 'Quản lý CRM toàn bộ' },

  { code: PERMISSIONS.RECRUIT_READ,   module: 'recruit', action: 'read',   description: 'Xem vị trí tuyển dụng, ứng viên, lịch phỏng vấn' },
  { code: PERMISSIONS.RECRUIT_CREATE, module: 'recruit', action: 'create', description: 'Đăng tin / thêm ứng viên mới' },
  { code: PERMISSIONS.RECRUIT_UPDATE, module: 'recruit', action: 'update', description: 'Cập nhật hồ sơ ứng viên / vị trí' },
  { code: PERMISSIONS.RECRUIT_APPROVE,module: 'recruit', action: 'approve',description: 'Phê duyệt / từ chối ứng viên' },
  { code: PERMISSIONS.RECRUIT_MANAGE, module: 'recruit', action: 'manage', description: 'Quản lý tuyển dụng toàn bộ' },

  { code: PERMISSIONS.ASSET_READ,   module: 'asset', action: 'read',   description: 'Xem danh sách tài sản' },
  { code: PERMISSIONS.ASSET_CREATE, module: 'asset', action: 'create', description: 'Thêm tài sản mới' },
  { code: PERMISSIONS.ASSET_UPDATE, module: 'asset', action: 'update', description: 'Cập nhật thông tin tài sản' },
  { code: PERMISSIONS.ASSET_ASSIGN, module: 'asset', action: 'assign', description: 'Cấp phát / thu hồi tài sản' },
  { code: PERMISSIONS.ASSET_MANAGE, module: 'asset', action: 'manage', description: 'Quản lý bảo trì, xoá tài sản' },

  { code: PERMISSIONS.PROCUREMENT_READ,    module: 'procurement', action: 'read',    description: 'Xem nhà cung cấp và đơn mua hàng' },
  { code: PERMISSIONS.PROCUREMENT_CREATE,  module: 'procurement', action: 'create',  description: 'Tạo đơn mua hàng mới' },
  { code: PERMISSIONS.PROCUREMENT_UPDATE,  module: 'procurement', action: 'update',  description: 'Cập nhật đơn mua hàng' },
  { code: PERMISSIONS.PROCUREMENT_APPROVE, module: 'procurement', action: 'approve', description: 'Phê duyệt đơn mua hàng' },
  { code: PERMISSIONS.PROCUREMENT_MANAGE,  module: 'procurement', action: 'manage',  description: 'Quản lý nhà cung cấp toàn bộ' },

  { code: PERMISSIONS.OKR_READ,   module: 'okr', action: 'read',   description: 'Xem mục tiêu và kết quả then chốt' },
  { code: PERMISSIONS.OKR_CREATE, module: 'okr', action: 'create', description: 'Tạo OKR mới' },
  { code: PERMISSIONS.OKR_UPDATE, module: 'okr', action: 'update', description: 'Cập nhật tiến độ OKR' },
  { code: PERMISSIONS.OKR_MANAGE, module: 'okr', action: 'manage', description: 'Quản lý OKR toàn tổ chức' },

  { code: PERMISSIONS.SKILLS_READ,   module: 'skills', action: 'read',   description: 'Xem ma trận kỹ năng' },
  { code: PERMISSIONS.SKILLS_MANAGE, module: 'skills', action: 'manage', description: 'Cập nhật và quản lý ma trận kỹ năng' },

  { code: PERMISSIONS.TRAINING_READ,   module: 'training', action: 'read',   description: 'Xem chương trình đào tạo' },
  { code: PERMISSIONS.TRAINING_CREATE, module: 'training', action: 'create', description: 'Tạo khoá đào tạo mới' },
  { code: PERMISSIONS.TRAINING_MANAGE, module: 'training', action: 'manage', description: 'Quản lý toàn bộ đào tạo' },

  { code: PERMISSIONS.TIMELOGS_READ, module: 'timelogs', action: 'read', description: 'Xem nhật ký ghi giờ của nhân viên' },

  { code: PERMISSIONS.HR_READ, module: 'hr', action: 'read', description: 'Xem thông tin cá nhân (self-service)' },

  { code: PERMISSIONS.ROOM_BOOKING_READ,   module: 'room_booking', action: 'read',   description: 'Xem lịch đặt phòng họp' },
  { code: PERMISSIONS.ROOM_BOOKING_CREATE, module: 'room_booking', action: 'create', description: 'Đặt phòng họp' },
  { code: PERMISSIONS.ROOM_BOOKING_MANAGE, module: 'room_booking', action: 'manage', description: 'Quản lý phòng và lịch đặt phòng' },
];

// ─── Default Role → Permission Mapping ───────────────────────────────────────

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
  [Role.ADMIN]: ALL_PERMISSIONS.map(p => p.code),

  [Role.LEADERSHIP]: [
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.TASKS_READ, PERMISSIONS.TASKS_APPROVE,
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.FINANCE_READ, PERMISSIONS.FINANCE_CREATE, PERMISSIONS.FINANCE_APPROVE,
    PERMISSIONS.FINANCE_MANAGE, PERMISSIONS.FINANCE_EXPORT,
    PERMISSIONS.TIMESHEETS_READ, PERMISSIONS.TIMESHEETS_APPROVE,
    PERMISSIONS.TIMELOGS_READ, PERMISSIONS.TIMELOGS_CREATE, PERMISSIONS.TIMELOGS_UPDATE,
    PERMISSIONS.BUGS_READ, PERMISSIONS.BUGS_UPDATE, PERMISSIONS.BUGS_ASSIGN, PERMISSIONS.BUGS_CLOSE,
    PERMISSIONS.ISSUES_READ, PERMISSIONS.ISSUES_UPDATE, PERMISSIONS.ISSUES_APPROVE,
    PERMISSIONS.BPM_READ,
    PERMISSIONS.ALERTS_READ, PERMISSIONS.ALERTS_CONFIGURE,
    PERMISSIONS.LEAVES_READ, PERMISSIONS.LEAVES_APPROVE,
    PERMISSIONS.CONTRACTS_READ, PERMISSIONS.CONTRACTS_CREATE,
    PERMISSIONS.CONTRACTS_UPDATE, PERMISSIONS.CONTRACTS_APPROVE,
    PERMISSIONS.CRM_READ, PERMISSIONS.CRM_CREATE, PERMISSIONS.CRM_UPDATE,
    PERMISSIONS.RECRUIT_READ, PERMISSIONS.RECRUIT_CREATE, PERMISSIONS.RECRUIT_APPROVE,
    PERMISSIONS.ADMIN_ORG,
    PERMISSIONS.ASSET_READ, PERMISSIONS.ASSET_CREATE, PERMISSIONS.ASSET_UPDATE,
    PERMISSIONS.ASSET_ASSIGN, PERMISSIONS.ASSET_MANAGE,
    PERMISSIONS.PROCUREMENT_READ, PERMISSIONS.PROCUREMENT_CREATE,
    PERMISSIONS.PROCUREMENT_APPROVE, PERMISSIONS.PROCUREMENT_MANAGE,
    PERMISSIONS.OKR_READ, PERMISSIONS.OKR_CREATE, PERMISSIONS.OKR_UPDATE, PERMISSIONS.OKR_MANAGE,
    PERMISSIONS.SKILLS_READ, PERMISSIONS.SKILLS_MANAGE,
    PERMISSIONS.TRAINING_READ, PERMISSIONS.TRAINING_CREATE, PERMISSIONS.TRAINING_MANAGE,
    PERMISSIONS.HR_READ,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.ROOM_BOOKING_READ, PERMISSIONS.ROOM_BOOKING_CREATE, PERMISSIONS.ROOM_BOOKING_MANAGE,
  ],

  [Role.PM]: [
    PERMISSIONS.PROJECTS_READ, PERMISSIONS.PROJECTS_CREATE, PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.TASKS_READ, PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.TASKS_DELETE, PERMISSIONS.TASKS_APPROVE,
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.TIMESHEETS_READ, PERMISSIONS.TIMESHEETS_APPROVE,
    PERMISSIONS.TIMELOGS_READ, PERMISSIONS.TIMELOGS_CREATE, PERMISSIONS.TIMELOGS_UPDATE,
    PERMISSIONS.BUGS_READ, PERMISSIONS.BUGS_CREATE, PERMISSIONS.BUGS_UPDATE,
    PERMISSIONS.BUGS_ASSIGN, PERMISSIONS.BUGS_CLOSE,
    PERMISSIONS.ISSUES_READ, PERMISSIONS.ISSUES_CREATE, PERMISSIONS.ISSUES_UPDATE,
    PERMISSIONS.ISSUES_APPROVE,
    PERMISSIONS.BPM_READ, PERMISSIONS.BPM_MANAGE,
    PERMISSIONS.ALERTS_READ, PERMISSIONS.ALERTS_CONFIGURE,
    PERMISSIONS.LEAVES_READ, PERMISSIONS.LEAVES_CREATE,
    PERMISSIONS.CONTRACTS_READ,
    PERMISSIONS.RECRUIT_READ, PERMISSIONS.RECRUIT_CREATE, PERMISSIONS.RECRUIT_UPDATE,
    PERMISSIONS.PROCUREMENT_READ,
    PERMISSIONS.OKR_READ, PERMISSIONS.OKR_CREATE, PERMISSIONS.OKR_UPDATE,
    PERMISSIONS.SKILLS_READ,
    PERMISSIONS.TRAINING_READ,
    PERMISSIONS.HR_READ,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.ROOM_BOOKING_READ, PERMISSIONS.ROOM_BOOKING_CREATE,
  ],

  [Role.MEMBER]: [
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.TASKS_READ, PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.TIMESHEETS_READ,
    PERMISSIONS.TIMELOGS_READ, PERMISSIONS.TIMELOGS_CREATE, PERMISSIONS.TIMELOGS_UPDATE,
    PERMISSIONS.BUGS_READ, PERMISSIONS.BUGS_CREATE, PERMISSIONS.BUGS_UPDATE,
    PERMISSIONS.ISSUES_READ, PERMISSIONS.ISSUES_CREATE,
    PERMISSIONS.LEAVES_READ, PERMISSIONS.LEAVES_CREATE,
    PERMISSIONS.OKR_READ, PERMISSIONS.OKR_CREATE, PERMISSIONS.OKR_UPDATE,
    PERMISSIONS.SKILLS_READ,
    PERMISSIONS.TRAINING_READ,
    PERMISSIONS.HR_READ,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.ROOM_BOOKING_READ, PERMISSIONS.ROOM_BOOKING_CREATE,
  ],
};

// ─── Placeholder Module Roles (seeded now, permissions added when ERP module ships) ──

export interface ModuleRoleDef {
  code: string;
  name: string;
  domain: string;
  description: string;
  isSystem: boolean;
}

export const SEED_MODULE_ROLES: ModuleRoleDef[] = [
  { code: 'hr:manager',           name: 'HR Manager',         domain: 'hr',         description: 'Quản lý HR — nhân sự, payroll, nghỉ phép',          isSystem: true },
  { code: 'hr:recruiter',         name: 'HR Recruiter',        domain: 'hr',         description: 'Tuyển dụng — JD, ứng viên, onboarding',              isSystem: true },
  { code: 'finance:accountant',   name: 'Accountant',          domain: 'finance',    description: 'Kế toán — expense, invoice, budget',                 isSystem: true },
  { code: 'finance:manager',      name: 'Finance Manager',     domain: 'finance',    description: 'Quản lý tài chính — phê duyệt chi phí, báo cáo',     isSystem: true },
  { code: 'crm:sales',            name: 'Sales Rep',           domain: 'crm',        description: 'Sales — leads, deals, contacts',                      isSystem: true },
  { code: 'crm:manager',          name: 'CRM Manager',         domain: 'crm',        description: 'Quản lý CRM — toàn bộ pipeline',                      isSystem: true },
  { code: 'operations:asset',     name: 'Asset Manager',       domain: 'operations', description: 'Quản lý tài sản — hardware, license',                 isSystem: true },
  { code: 'operations:contract',  name: 'Contract Manager',    domain: 'operations', description: 'Quản lý hợp đồng — soạn thảo, ký kết, gia hạn',      isSystem: true },
];

// ─── Module Role codes constant (for type-safe references) ───────────────────

export const MODULE_ROLES = {
  HR_MANAGER:          'hr:manager',
  HR_RECRUITER:        'hr:recruiter',
  FINANCE_ACCOUNTANT:  'finance:accountant',
  FINANCE_MANAGER:     'finance:manager',
  CRM_SALES:           'crm:sales',
  CRM_MANAGER:         'crm:manager',
  OPERATIONS_ASSET:    'operations:asset',
  OPERATIONS_CONTRACT: 'operations:contract',
} as const;
