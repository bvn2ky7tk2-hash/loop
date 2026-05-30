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

  // ─── Granular screen-level codes (per-screen navigation & API access) ────────

  // Work — screens tách từ dashboard:read
  FEED_READ:          'feed:read',
  FEED_CREATE:        'feed:create',
  WORK_CALENDAR_READ: 'work_calendar:read',
  // Work — screens tách từ tasks:read
  KANBAN_READ:        'kanban:read',
  // Work — screens tách từ projects:read
  TIMELINE_READ:      'timeline:read',
  KNOWLEDGE_BASE_READ: 'knowledge_base:read',
  KNOWLEDGE_BASE_MANAGE: 'knowledge_base:manage',
  // Work — screens tách từ bugs:read
  MY_BUGS_READ:       'my_bugs:read',
  BUGS_STATS_READ:    'bugs_stats:read',
  // Work — screens tách từ timesheets:read
  TIMESHEET_PROJECT_READ: 'timesheet_project:read',
  // Work — BPM inbox tách từ bpm:read
  BPM_INBOX_READ:     'bpm_inbox:read',

  // Ops — BPM screens tách từ bpm:manage
  BPM_PROCESSES_READ:   'bpm_processes:read',
  BPM_PROCESSES_MANAGE: 'bpm_processes:manage',
  BPM_INSTANCES_READ:   'bpm_instances:read',
  BPM_INSTANCES_MANAGE: 'bpm_instances:manage',

  // People — screens tách từ employees:read
  ORG_CHART_READ:     'org_chart:read',
  PERFORMANCE_READ:   'performance:read',
  PERFORMANCE_MANAGE: 'performance:manage',
  // People — payroll tách từ finance:read
  PAYROLL_READ:       'payroll:read',
  PAYROLL_EXPORT:     'payroll:export',
  PAYROLL_SETTINGS_MANAGE: 'payroll_settings:manage',
  // People — timesheet manager screens
  TIMESHEET_APPROVALS_READ:    'timesheet_approvals:read',
  TIMESHEET_APPROVALS_APPROVE: 'timesheet_approvals:approve',
  TIMESHEET_MANAGER_READ:      'timesheet_manager:read',
  // People — recruit screens tách từ recruit:read
  RECRUIT_PIPELINE_READ:     'recruit_pipeline:read',
  RECRUIT_CANDIDATES_READ:   'recruit_candidates:read',
  RECRUIT_CANDIDATES_CREATE: 'recruit_candidates:create',
  RECRUIT_CANDIDATES_APPROVE:'recruit_candidates:approve',
  RECRUIT_INTERVIEWS_READ:   'recruit_interviews:read',
  RECRUIT_INTERVIEWS_CREATE: 'recruit_interviews:create',
  RECRUIT_JOBS_READ:         'recruit_jobs:read',
  RECRUIT_JOBS_MANAGE:       'recruit_jobs:manage',

  // Finance — screens tách từ finance:read / finance:manage
  PROJECT_COST_READ:       'project_cost:read',
  PROJECT_COST_EXPORT:     'project_cost:export',
  BUDGET_READ:             'budget:read',
  BUDGET_WRITE:            'budget:write',
  BUDGET_APPROVE:          'budget:approve',
  BUDGET_CREATE:           'budget:create',
  BUDGET_MANAGE:           'budget:manage',
  EXPENSES_READ:           'expenses:read',
  EXPENSES_CREATE:         'expenses:create',
  EXPENSES_APPROVE:        'expenses:approve',
  EXPENSES_EXPORT:         'expenses:export',
  INVOICES_READ:           'invoices:read',
  INVOICES_CREATE:         'invoices:create',
  INVOICES_APPROVE:        'invoices:approve',
  INVOICES_EXPORT:         'invoices:export',
  ACCOUNTS_READ:           'accounts:read',
  ACCOUNTS_MANAGE:         'accounts:manage',
  JOURNAL_READ:            'journal:read',
  JOURNAL_CREATE:          'journal:create',
  JOURNAL_MANAGE:          'journal:manage',
  FINANCIAL_REPORTS_READ:  'financial_reports:read',
  FINANCIAL_REPORTS_EXPORT:'financial_reports:export',

  // CRM — screens tách từ crm:read
  CRM_LEADS_READ:        'crm_leads:read',
  CRM_LEADS_CREATE:      'crm_leads:create',
  CRM_LEADS_UPDATE:      'crm_leads:update',
  CRM_LEADS_MANAGE:      'crm_leads:manage',
  CRM_DEALS_READ:        'crm_deals:read',
  CRM_DEALS_CREATE:      'crm_deals:create',
  CRM_DEALS_UPDATE:      'crm_deals:update',
  CRM_DEALS_MANAGE:      'crm_deals:manage',
  CRM_CONTACTS_READ:     'crm_contacts:read',
  CRM_CONTACTS_CREATE:   'crm_contacts:create',
  CRM_CUSTOMERS_READ:    'crm_customers:read',
  CRM_CUSTOMERS_CREATE:  'crm_customers:create',
  CRM_CONTRACTS_READ:    'crm_contracts:read',
  CRM_CONTRACTS_CREATE:  'crm_contracts:create',
  CRM_CONTRACTS_APPROVE: 'crm_contracts:approve',
  CRM_ACTIVITIES_READ:   'crm_activities:read',
  CRM_ACTIVITIES_CREATE: 'crm_activities:create',
  CRM_FORECAST_READ:     'crm_forecast:read',
  CRM_PORTAL_READ:       'crm_portal:read',
  CRM_PORTAL_MANAGE:     'crm_portal:manage',

  // Asset — screens tách từ asset:read
  ASSET_ASSIGNMENTS_READ:   'asset_assignments:read',
  ASSET_ASSIGNMENTS_ASSIGN: 'asset_assignments:assign',
  ASSET_MAINTENANCE_READ:   'asset_maintenance:read',
  ASSET_MAINTENANCE_MANAGE: 'asset_maintenance:manage',
  VEHICLES_READ:            'vehicles:read',
  VEHICLES_MANAGE:          'vehicles:manage',
  // Procurement — screens tách từ procurement:read
  VENDORS_READ:             'vendors:read',
  VENDORS_MANAGE:           'vendors:manage',
  PURCHASE_ORDERS_READ:     'purchase_orders:read',
  PURCHASE_ORDERS_CREATE:   'purchase_orders:create',
  PURCHASE_ORDERS_APPROVE:  'purchase_orders:approve',
  PURCHASE_ORDERS_MANAGE:   'purchase_orders:manage',

  // Me — self-service tách từ hr:read
  SELF_SERVICE_READ:   'self_service:read',
  SELF_SERVICE_UPDATE: 'self_service:update',
  MY_PAYSLIPS_READ:    'my_payslips:read',

  // Admin — screens tách từ admin:settings
  MENU_CONFIG_MANAGE:       'menu_config:manage',
  INTEGRATIONS_READ:        'integrations:read',
  INTEGRATIONS_MANAGE:      'integrations:manage',
  DATA_IMPORT_MANAGE:       'data_import:manage',
  AUDIT_LOG_READ:           'audit_log:read',
  AUTOMATION_READ:          'automation:read',
  AUTOMATION_MANAGE:        'automation:manage',
  SCHEDULED_REPORTS_READ:   'scheduled_reports:read',
  SCHEDULED_REPORTS_MANAGE: 'scheduled_reports:manage',
  MODULE_CONFIG_MANAGE:     'module_config:manage',
  SYSTEM_HEALTH_READ:       'system_health:read',
  DEMO_MODE_MANAGE:         'demo_mode:manage',
  ONBOARDING_MANAGE:        'onboarding:manage',

  // HR Decisions — Quyết định nhân sự (HR v4.0)
  HR_DECISIONS_READ:  'hr_decisions:read',
  HR_DECISIONS_WRITE: 'hr_decisions:write',

  // HR Insurance — BHXH (HR v4.0 Wave 1)
  INSURANCE_READ:  'insurance:read',
  INSURANCE_WRITE: 'insurance:write',

  // Leave Policies — Chính sách phép năm (HR v4.0 Wave 1)
  LEAVE_POLICY_READ:  'leave_policy:read',
  LEAVE_POLICY_WRITE: 'leave_policy:write',

  // Attendance — Chấm công (HR v4.0 Wave 1)
  ATTENDANCE_READ:  'attendance:read',
  ATTENDANCE_WRITE: 'attendance:write',

  // Holidays — Ngày lễ (HR v4.0 Wave 1)
  HOLIDAYS_READ:   'holidays:read',
  HOLIDAYS_MANAGE: 'holidays:manage',
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

  // ─── Granular screen-level permissions ───────────────────────────────────────
  { code: PERMISSIONS.FEED_READ,            module: 'feed',          action: 'read',   description: 'Xem bảng tin công ty' },
  { code: PERMISSIONS.FEED_CREATE,          module: 'feed',          action: 'create', description: 'Đăng bài lên bảng tin công ty' },
  { code: PERMISSIONS.WORK_CALENDAR_READ,   module: 'work_calendar', action: 'read',   description: 'Xem lịch công ty' },
  { code: PERMISSIONS.KANBAN_READ,          module: 'kanban',        action: 'read',   description: 'Xem bảng Kanban' },
  { code: PERMISSIONS.TIMELINE_READ,        module: 'timeline',      action: 'read',   description: 'Xem lịch trình dự án' },
  { code: PERMISSIONS.KNOWLEDGE_BASE_READ,  module: 'knowledge_base',action: 'read',   description: 'Xem cơ sở tri thức' },
  { code: PERMISSIONS.KNOWLEDGE_BASE_MANAGE,module: 'knowledge_base',action: 'manage', description: 'Quản lý cơ sở tri thức' },
  { code: PERMISSIONS.MY_BUGS_READ,         module: 'my_bugs',       action: 'read',   description: 'Xem lỗi của tôi' },
  { code: PERMISSIONS.BUGS_STATS_READ,      module: 'bugs_stats',    action: 'read',   description: 'Xem thống kê lỗi' },
  { code: PERMISSIONS.TIMESHEET_PROJECT_READ, module: 'timesheet_project', action: 'read', description: 'Xem nhật ký dự án' },
  { code: PERMISSIONS.BPM_INBOX_READ,       module: 'bpm_inbox',     action: 'read',   description: 'Xem hộp thư BPM' },

  { code: PERMISSIONS.BPM_PROCESSES_READ,   module: 'bpm_processes', action: 'read',   description: 'Xem định nghĩa quy trình' },
  { code: PERMISSIONS.BPM_PROCESSES_MANAGE, module: 'bpm_processes', action: 'manage', description: 'Quản lý định nghĩa quy trình' },
  { code: PERMISSIONS.BPM_INSTANCES_READ,   module: 'bpm_instances', action: 'read',   description: 'Xem instances quy trình' },
  { code: PERMISSIONS.BPM_INSTANCES_MANAGE, module: 'bpm_instances', action: 'manage', description: 'Giám sát instances quy trình' },

  { code: PERMISSIONS.ORG_CHART_READ,          module: 'org_chart',           action: 'read',   description: 'Xem sơ đồ tổ chức' },
  { code: PERMISSIONS.PERFORMANCE_READ,        module: 'performance',         action: 'read',   description: 'Xem đánh giá năng lực' },
  { code: PERMISSIONS.PERFORMANCE_MANAGE,      module: 'performance',         action: 'manage', description: 'Quản lý đánh giá năng lực' },
  { code: PERMISSIONS.PAYROLL_READ,            module: 'payroll',             action: 'read',   description: 'Xem bảng lương nhân viên' },
  { code: PERMISSIONS.PAYROLL_EXPORT,          module: 'payroll',             action: 'export', description: 'Xuất bảng lương' },
  { code: PERMISSIONS.PAYROLL_SETTINGS_MANAGE, module: 'payroll_settings',    action: 'manage', description: 'Cài đặt công thức lương' },
  { code: PERMISSIONS.TIMESHEET_APPROVALS_READ,    module: 'timesheet_approvals', action: 'read',    description: 'Xem danh sách duyệt chấm công' },
  { code: PERMISSIONS.TIMESHEET_APPROVALS_APPROVE, module: 'timesheet_approvals', action: 'approve', description: 'Duyệt / từ chối chấm công' },
  { code: PERMISSIONS.TIMESHEET_MANAGER_READ,  module: 'timesheet_manager',   action: 'read',   description: 'Xem bảng điểm danh nhóm' },
  { code: PERMISSIONS.RECRUIT_PIPELINE_READ,   module: 'recruit_pipeline',    action: 'read',   description: 'Xem pipeline tuyển dụng' },
  { code: PERMISSIONS.RECRUIT_CANDIDATES_READ,   module: 'recruit_candidates', action: 'read',   description: 'Xem danh sách ứng viên' },
  { code: PERMISSIONS.RECRUIT_CANDIDATES_CREATE, module: 'recruit_candidates', action: 'create', description: 'Thêm ứng viên mới' },
  { code: PERMISSIONS.RECRUIT_CANDIDATES_APPROVE,module: 'recruit_candidates', action: 'approve',description: 'Phê duyệt / từ chối ứng viên' },
  { code: PERMISSIONS.RECRUIT_INTERVIEWS_READ,   module: 'recruit_interviews', action: 'read',   description: 'Xem lịch phỏng vấn' },
  { code: PERMISSIONS.RECRUIT_INTERVIEWS_CREATE, module: 'recruit_interviews', action: 'create', description: 'Đặt lịch phỏng vấn' },
  { code: PERMISSIONS.RECRUIT_JOBS_READ,         module: 'recruit_jobs',       action: 'read',   description: 'Xem vị trí tuyển dụng' },
  { code: PERMISSIONS.RECRUIT_JOBS_MANAGE,       module: 'recruit_jobs',       action: 'manage', description: 'Quản lý vị trí tuyển dụng' },

  { code: PERMISSIONS.PROJECT_COST_READ,       module: 'project_cost',      action: 'read',   description: 'Xem chi phí dự án' },
  { code: PERMISSIONS.PROJECT_COST_EXPORT,     module: 'project_cost',      action: 'export', description: 'Xuất báo cáo chi phí' },
  { code: PERMISSIONS.BUDGET_READ,             module: 'budget',            action: 'read',   description: 'Xem ngân sách' },
  { code: PERMISSIONS.BUDGET_WRITE,            module: 'budget',            action: 'write',  description: 'Chỉnh sửa kế hoạch ngân sách' },
  { code: PERMISSIONS.BUDGET_APPROVE,          module: 'budget',            action: 'approve',description: 'Phê duyệt ngân sách' },
  { code: PERMISSIONS.BUDGET_CREATE,           module: 'budget',            action: 'create', description: 'Tạo kế hoạch ngân sách' },
  { code: PERMISSIONS.BUDGET_MANAGE,           module: 'budget',            action: 'manage', description: 'Quản lý ngân sách' },
  { code: PERMISSIONS.EXPENSES_READ,           module: 'expenses',          action: 'read',   description: 'Xem đề nghị thanh toán' },
  { code: PERMISSIONS.EXPENSES_CREATE,         module: 'expenses',          action: 'create', description: 'Tạo đề nghị thanh toán' },
  { code: PERMISSIONS.EXPENSES_APPROVE,        module: 'expenses',          action: 'approve',description: 'Phê duyệt đề nghị thanh toán' },
  { code: PERMISSIONS.EXPENSES_EXPORT,         module: 'expenses',          action: 'export', description: 'Xuất danh sách thanh toán' },
  { code: PERMISSIONS.INVOICES_READ,           module: 'invoices',          action: 'read',   description: 'Xem hoá đơn' },
  { code: PERMISSIONS.INVOICES_CREATE,         module: 'invoices',          action: 'create', description: 'Tạo hoá đơn mới' },
  { code: PERMISSIONS.INVOICES_APPROVE,        module: 'invoices',          action: 'approve',description: 'Phê duyệt hoá đơn' },
  { code: PERMISSIONS.INVOICES_EXPORT,         module: 'invoices',          action: 'export', description: 'Xuất danh sách hoá đơn' },
  { code: PERMISSIONS.ACCOUNTS_READ,           module: 'accounts',          action: 'read',   description: 'Xem hệ thống tài khoản' },
  { code: PERMISSIONS.ACCOUNTS_MANAGE,         module: 'accounts',          action: 'manage', description: 'Quản lý tài khoản kế toán' },
  { code: PERMISSIONS.JOURNAL_READ,            module: 'journal',           action: 'read',   description: 'Xem nhật ký kế toán' },
  { code: PERMISSIONS.JOURNAL_CREATE,          module: 'journal',           action: 'create', description: 'Ghi bút toán kế toán' },
  { code: PERMISSIONS.JOURNAL_MANAGE,          module: 'journal',           action: 'manage', description: 'Quản lý nhật ký kế toán' },
  { code: PERMISSIONS.FINANCIAL_REPORTS_READ,  module: 'financial_reports', action: 'read',   description: 'Xem báo cáo tài chính' },
  { code: PERMISSIONS.FINANCIAL_REPORTS_EXPORT,module: 'financial_reports', action: 'export', description: 'Xuất báo cáo tài chính' },

  { code: PERMISSIONS.CRM_LEADS_READ,        module: 'crm_leads',     action: 'read',   description: 'Xem khách hàng tiềm năng' },
  { code: PERMISSIONS.CRM_LEADS_CREATE,      module: 'crm_leads',     action: 'create', description: 'Thêm lead mới' },
  { code: PERMISSIONS.CRM_LEADS_UPDATE,      module: 'crm_leads',     action: 'update', description: 'Cập nhật lead' },
  { code: PERMISSIONS.CRM_LEADS_MANAGE,      module: 'crm_leads',     action: 'manage', description: 'Quản lý leads' },
  { code: PERMISSIONS.CRM_DEALS_READ,        module: 'crm_deals',     action: 'read',   description: 'Xem cơ hội bán hàng' },
  { code: PERMISSIONS.CRM_DEALS_CREATE,      module: 'crm_deals',     action: 'create', description: 'Tạo deal mới' },
  { code: PERMISSIONS.CRM_DEALS_UPDATE,      module: 'crm_deals',     action: 'update', description: 'Cập nhật deal' },
  { code: PERMISSIONS.CRM_DEALS_MANAGE,      module: 'crm_deals',     action: 'manage', description: 'Quản lý deals' },
  { code: PERMISSIONS.CRM_CONTACTS_READ,     module: 'crm_contacts',  action: 'read',   description: 'Xem danh bạ liên hệ' },
  { code: PERMISSIONS.CRM_CONTACTS_CREATE,   module: 'crm_contacts',  action: 'create', description: 'Thêm liên hệ mới' },
  { code: PERMISSIONS.CRM_CUSTOMERS_READ,    module: 'crm_customers', action: 'read',   description: 'Xem danh sách khách hàng' },
  { code: PERMISSIONS.CRM_CUSTOMERS_CREATE,  module: 'crm_customers', action: 'create', description: 'Thêm khách hàng mới' },
  { code: PERMISSIONS.CRM_CONTRACTS_READ,    module: 'crm_contracts', action: 'read',   description: 'Xem hợp đồng khách hàng' },
  { code: PERMISSIONS.CRM_CONTRACTS_CREATE,  module: 'crm_contracts', action: 'create', description: 'Tạo hợp đồng khách hàng' },
  { code: PERMISSIONS.CRM_CONTRACTS_APPROVE, module: 'crm_contracts', action: 'approve',description: 'Phê duyệt hợp đồng' },
  { code: PERMISSIONS.CRM_ACTIVITIES_READ,   module: 'crm_activities',action: 'read',   description: 'Xem nhật ký hoạt động CRM' },
  { code: PERMISSIONS.CRM_ACTIVITIES_CREATE, module: 'crm_activities',action: 'create', description: 'Ghi nhật ký hoạt động' },
  { code: PERMISSIONS.CRM_FORECAST_READ,     module: 'crm_forecast',  action: 'read',   description: 'Xem dự báo doanh số' },
  { code: PERMISSIONS.CRM_PORTAL_READ,       module: 'crm_portal',    action: 'read',   description: 'Xem cổng khách hàng' },
  { code: PERMISSIONS.CRM_PORTAL_MANAGE,     module: 'crm_portal',    action: 'manage', description: 'Quản lý cổng khách hàng' },

  { code: PERMISSIONS.ASSET_ASSIGNMENTS_READ,   module: 'asset_assignments', action: 'read',   description: 'Xem cấp phát tài sản' },
  { code: PERMISSIONS.ASSET_ASSIGNMENTS_ASSIGN, module: 'asset_assignments', action: 'assign', description: 'Cấp phát / thu hồi tài sản' },
  { code: PERMISSIONS.ASSET_MAINTENANCE_READ,   module: 'asset_maintenance', action: 'read',   description: 'Xem lịch bảo trì' },
  { code: PERMISSIONS.ASSET_MAINTENANCE_MANAGE, module: 'asset_maintenance', action: 'manage', description: 'Quản lý bảo trì tài sản' },
  { code: PERMISSIONS.VEHICLES_READ,            module: 'vehicles',          action: 'read',   description: 'Xem xe công ty' },
  { code: PERMISSIONS.VEHICLES_MANAGE,          module: 'vehicles',          action: 'manage', description: 'Quản lý xe công ty' },
  { code: PERMISSIONS.VENDORS_READ,             module: 'vendors',           action: 'read',   description: 'Xem nhà cung cấp' },
  { code: PERMISSIONS.VENDORS_MANAGE,           module: 'vendors',           action: 'manage', description: 'Quản lý nhà cung cấp' },
  { code: PERMISSIONS.PURCHASE_ORDERS_READ,     module: 'purchase_orders',   action: 'read',   description: 'Xem đơn mua hàng' },
  { code: PERMISSIONS.PURCHASE_ORDERS_CREATE,   module: 'purchase_orders',   action: 'create', description: 'Tạo đơn mua hàng' },
  { code: PERMISSIONS.PURCHASE_ORDERS_APPROVE,  module: 'purchase_orders',   action: 'approve',description: 'Phê duyệt đơn mua hàng' },
  { code: PERMISSIONS.PURCHASE_ORDERS_MANAGE,   module: 'purchase_orders',   action: 'manage', description: 'Quản lý đơn mua hàng' },

  { code: PERMISSIONS.SELF_SERVICE_READ,   module: 'self_service', action: 'read',   description: 'Xem thông tin cá nhân' },
  { code: PERMISSIONS.SELF_SERVICE_UPDATE, module: 'self_service', action: 'update', description: 'Cập nhật thông tin cá nhân' },
  { code: PERMISSIONS.MY_PAYSLIPS_READ,    module: 'my_payslips',  action: 'read',   description: 'Xem phiếu lương của tôi' },

  { code: PERMISSIONS.MENU_CONFIG_MANAGE,       module: 'menu_config',       action: 'manage', description: 'Cấu hình menu / module' },
  { code: PERMISSIONS.INTEGRATIONS_READ,        module: 'integrations',      action: 'read',   description: 'Xem tích hợp hệ thống' },
  { code: PERMISSIONS.INTEGRATIONS_MANAGE,      module: 'integrations',      action: 'manage', description: 'Quản lý tích hợp' },
  { code: PERMISSIONS.DATA_IMPORT_MANAGE,       module: 'data_import',       action: 'manage', description: 'Nhập dữ liệu hàng loạt' },
  { code: PERMISSIONS.AUDIT_LOG_READ,           module: 'audit_log',         action: 'read',   description: 'Xem nhật ký hệ thống' },
  { code: PERMISSIONS.AUTOMATION_READ,          module: 'automation',        action: 'read',   description: 'Xem cấu hình tự động hóa' },
  { code: PERMISSIONS.AUTOMATION_MANAGE,        module: 'automation',        action: 'manage', description: 'Quản lý tự động hóa' },
  { code: PERMISSIONS.SCHEDULED_REPORTS_READ,   module: 'scheduled_reports', action: 'read',   description: 'Xem báo cáo định kỳ' },
  { code: PERMISSIONS.SCHEDULED_REPORTS_MANAGE, module: 'scheduled_reports', action: 'manage', description: 'Cấu hình báo cáo định kỳ' },
  { code: PERMISSIONS.MODULE_CONFIG_MANAGE,     module: 'module_config',     action: 'manage', description: 'Cấu hình module hệ thống' },
  { code: PERMISSIONS.SYSTEM_HEALTH_READ,       module: 'system_health',     action: 'read',   description: 'Giám sát sức khoẻ hệ thống' },
  { code: PERMISSIONS.DEMO_MODE_MANAGE,         module: 'demo_mode',         action: 'manage', description: 'Quản lý chế độ demo' },
  { code: PERMISSIONS.ONBOARDING_MANAGE,        module: 'onboarding',        action: 'manage', description: 'Quản lý onboarding wizard' },

  // HR Decisions
  { code: PERMISSIONS.HR_DECISIONS_READ,  module: 'hr_decisions', action: 'read',  description: 'Xem quyết định nhân sự' },
  { code: PERMISSIONS.HR_DECISIONS_WRITE, module: 'hr_decisions', action: 'write', description: 'Tạo/sửa quyết định nhân sự' },
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
    // Granular screen codes
    PERMISSIONS.FEED_READ, PERMISSIONS.FEED_CREATE, PERMISSIONS.WORK_CALENDAR_READ, PERMISSIONS.KANBAN_READ,
    PERMISSIONS.TIMELINE_READ, PERMISSIONS.KNOWLEDGE_BASE_READ, PERMISSIONS.KNOWLEDGE_BASE_MANAGE,
    PERMISSIONS.MY_BUGS_READ, PERMISSIONS.BUGS_STATS_READ, PERMISSIONS.TIMESHEET_PROJECT_READ,
    PERMISSIONS.BPM_INBOX_READ,
    PERMISSIONS.BPM_PROCESSES_READ, PERMISSIONS.BPM_PROCESSES_MANAGE,
    PERMISSIONS.BPM_INSTANCES_READ, PERMISSIONS.BPM_INSTANCES_MANAGE,
    PERMISSIONS.ORG_CHART_READ, PERMISSIONS.PERFORMANCE_READ, PERMISSIONS.PERFORMANCE_MANAGE,
    PERMISSIONS.PAYROLL_READ, PERMISSIONS.PAYROLL_EXPORT, PERMISSIONS.PAYROLL_SETTINGS_MANAGE,
    PERMISSIONS.TIMESHEET_APPROVALS_READ, PERMISSIONS.TIMESHEET_APPROVALS_APPROVE,
    PERMISSIONS.TIMESHEET_MANAGER_READ,
    PERMISSIONS.RECRUIT_PIPELINE_READ,
    PERMISSIONS.RECRUIT_CANDIDATES_READ, PERMISSIONS.RECRUIT_CANDIDATES_CREATE, PERMISSIONS.RECRUIT_CANDIDATES_APPROVE,
    PERMISSIONS.RECRUIT_INTERVIEWS_READ, PERMISSIONS.RECRUIT_INTERVIEWS_CREATE,
    PERMISSIONS.RECRUIT_JOBS_READ, PERMISSIONS.RECRUIT_JOBS_MANAGE,
    PERMISSIONS.PROJECT_COST_READ, PERMISSIONS.PROJECT_COST_EXPORT,
    PERMISSIONS.BUDGET_READ, PERMISSIONS.BUDGET_WRITE, PERMISSIONS.BUDGET_APPROVE, PERMISSIONS.BUDGET_CREATE, PERMISSIONS.BUDGET_MANAGE,
    PERMISSIONS.EXPENSES_READ, PERMISSIONS.EXPENSES_CREATE, PERMISSIONS.EXPENSES_APPROVE, PERMISSIONS.EXPENSES_EXPORT,
    PERMISSIONS.INVOICES_READ, PERMISSIONS.INVOICES_CREATE, PERMISSIONS.INVOICES_APPROVE, PERMISSIONS.INVOICES_EXPORT,
    PERMISSIONS.ACCOUNTS_READ, PERMISSIONS.ACCOUNTS_MANAGE,
    PERMISSIONS.JOURNAL_READ, PERMISSIONS.JOURNAL_CREATE, PERMISSIONS.JOURNAL_MANAGE,
    PERMISSIONS.FINANCIAL_REPORTS_READ, PERMISSIONS.FINANCIAL_REPORTS_EXPORT,
    PERMISSIONS.CRM_LEADS_READ, PERMISSIONS.CRM_LEADS_CREATE, PERMISSIONS.CRM_LEADS_UPDATE, PERMISSIONS.CRM_LEADS_MANAGE,
    PERMISSIONS.CRM_DEALS_READ, PERMISSIONS.CRM_DEALS_CREATE, PERMISSIONS.CRM_DEALS_UPDATE, PERMISSIONS.CRM_DEALS_MANAGE,
    PERMISSIONS.CRM_CONTACTS_READ, PERMISSIONS.CRM_CONTACTS_CREATE,
    PERMISSIONS.CRM_CUSTOMERS_READ, PERMISSIONS.CRM_CUSTOMERS_CREATE,
    PERMISSIONS.CRM_CONTRACTS_READ, PERMISSIONS.CRM_CONTRACTS_CREATE, PERMISSIONS.CRM_CONTRACTS_APPROVE,
    PERMISSIONS.CRM_ACTIVITIES_READ, PERMISSIONS.CRM_ACTIVITIES_CREATE,
    PERMISSIONS.CRM_FORECAST_READ,
    PERMISSIONS.CRM_PORTAL_READ, PERMISSIONS.CRM_PORTAL_MANAGE,
    PERMISSIONS.ASSET_ASSIGNMENTS_READ, PERMISSIONS.ASSET_ASSIGNMENTS_ASSIGN,
    PERMISSIONS.ASSET_MAINTENANCE_READ, PERMISSIONS.ASSET_MAINTENANCE_MANAGE,
    PERMISSIONS.VEHICLES_READ, PERMISSIONS.VEHICLES_MANAGE,
    PERMISSIONS.VENDORS_READ, PERMISSIONS.VENDORS_MANAGE,
    PERMISSIONS.PURCHASE_ORDERS_READ, PERMISSIONS.PURCHASE_ORDERS_CREATE,
    PERMISSIONS.PURCHASE_ORDERS_APPROVE, PERMISSIONS.PURCHASE_ORDERS_MANAGE,
    PERMISSIONS.SELF_SERVICE_READ, PERMISSIONS.SELF_SERVICE_UPDATE,
    PERMISSIONS.MY_PAYSLIPS_READ,
    PERMISSIONS.AUDIT_LOG_READ,
    PERMISSIONS.SCHEDULED_REPORTS_READ,
    PERMISSIONS.SYSTEM_HEALTH_READ,
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
    // Granular screen codes
    PERMISSIONS.FEED_READ, PERMISSIONS.FEED_CREATE, PERMISSIONS.WORK_CALENDAR_READ, PERMISSIONS.KANBAN_READ,
    PERMISSIONS.TIMELINE_READ, PERMISSIONS.KNOWLEDGE_BASE_READ, PERMISSIONS.KNOWLEDGE_BASE_MANAGE,
    PERMISSIONS.MY_BUGS_READ, PERMISSIONS.BUGS_STATS_READ, PERMISSIONS.TIMESHEET_PROJECT_READ,
    PERMISSIONS.BPM_INBOX_READ,
    PERMISSIONS.BPM_PROCESSES_READ, PERMISSIONS.BPM_PROCESSES_MANAGE,
    PERMISSIONS.BPM_INSTANCES_READ, PERMISSIONS.BPM_INSTANCES_MANAGE,
    PERMISSIONS.ORG_CHART_READ, PERMISSIONS.PERFORMANCE_READ,
    PERMISSIONS.PAYROLL_READ,
    PERMISSIONS.TIMESHEET_APPROVALS_READ, PERMISSIONS.TIMESHEET_APPROVALS_APPROVE,
    PERMISSIONS.TIMESHEET_MANAGER_READ,
    PERMISSIONS.RECRUIT_PIPELINE_READ,
    PERMISSIONS.RECRUIT_CANDIDATES_READ, PERMISSIONS.RECRUIT_CANDIDATES_CREATE,
    PERMISSIONS.RECRUIT_INTERVIEWS_READ, PERMISSIONS.RECRUIT_INTERVIEWS_CREATE,
    PERMISSIONS.RECRUIT_JOBS_READ,
    PERMISSIONS.PROJECT_COST_READ,
    PERMISSIONS.EXPENSES_READ, PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.INVOICES_READ,
    PERMISSIONS.CRM_LEADS_READ, PERMISSIONS.CRM_LEADS_CREATE, PERMISSIONS.CRM_LEADS_UPDATE,
    PERMISSIONS.CRM_DEALS_READ, PERMISSIONS.CRM_DEALS_CREATE, PERMISSIONS.CRM_DEALS_UPDATE,
    PERMISSIONS.CRM_CONTACTS_READ, PERMISSIONS.CRM_CONTACTS_CREATE,
    PERMISSIONS.CRM_CUSTOMERS_READ,
    PERMISSIONS.CRM_CONTRACTS_READ,
    PERMISSIONS.CRM_ACTIVITIES_READ, PERMISSIONS.CRM_ACTIVITIES_CREATE,
    PERMISSIONS.CRM_FORECAST_READ,
    PERMISSIONS.ASSET_ASSIGNMENTS_READ,
    PERMISSIONS.ASSET_MAINTENANCE_READ,
    PERMISSIONS.VEHICLES_READ,
    PERMISSIONS.VENDORS_READ,
    PERMISSIONS.PURCHASE_ORDERS_READ,
    PERMISSIONS.SELF_SERVICE_READ, PERMISSIONS.SELF_SERVICE_UPDATE,
    PERMISSIONS.MY_PAYSLIPS_READ,
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
    // Granular screen codes
    PERMISSIONS.FEED_READ, PERMISSIONS.FEED_CREATE, PERMISSIONS.WORK_CALENDAR_READ, PERMISSIONS.KANBAN_READ,
    PERMISSIONS.TIMELINE_READ, PERMISSIONS.KNOWLEDGE_BASE_READ,
    PERMISSIONS.MY_BUGS_READ, PERMISSIONS.TIMESHEET_PROJECT_READ,
    PERMISSIONS.BPM_INBOX_READ,
    PERMISSIONS.ORG_CHART_READ, PERMISSIONS.PERFORMANCE_READ,
    PERMISSIONS.RECRUIT_PIPELINE_READ,
    PERMISSIONS.SELF_SERVICE_READ, PERMISSIONS.SELF_SERVICE_UPDATE,
    PERMISSIONS.MY_PAYSLIPS_READ,
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
