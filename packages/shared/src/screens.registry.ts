/**
 * screens.registry.ts — Single source of truth cho toàn bộ màn hình & routes.
 *
 * Dev thêm chức năng mới tại ĐÂY. Mọi thứ còn lại tự động:
 *   - ROUTE_PERMISSION_MAP  → derive từ registry (kiểm soát truy cập)
 *   - Bảng phân quyền UI   → derive từ registry (nhóm theo module)
 *   - DB screens table      → synced từ seed.ts khi deploy
 */

export interface ScreenDef {
  route:     string;            // '/projects' | '/contracts' | ...
  module:    string;            // 'pm' | 'hr' | 'finance' | 'bpm' | 'timesheet' | 'reports' | 'admin'
  label:     string;            // Tên hiển thị tiếng Việt
  icon:      string;            // Tên icon Ant Design
  permCode:  string | null;     // Permission code yêu cầu. null = public
  sortOrder: number;
}

export const SCREEN_REGISTRY: ScreenDef[] = [
  // ─── PM — Quản lý dự án ────────────────────────────────────────────────────
  { route: '/',               module: 'pm', label: 'Dashboard',       icon: 'DashboardOutlined',    permCode: 'dashboard:read',  sortOrder: 0 },
  { route: '/projects',       module: 'pm', label: 'All Projects',    icon: 'ProjectOutlined',      permCode: 'projects:read',   sortOrder: 1 },
  { route: '/my-tasks',       module: 'pm', label: 'Kanban Board',    icon: 'AppstoreOutlined',     permCode: 'tasks:read',      sortOrder: 2 },
  { route: '/tasks',          module: 'pm', label: 'My Tasks',        icon: 'CheckSquareOutlined',  permCode: 'tasks:read',      sortOrder: 3 },
  { route: '/timeline',       module: 'pm', label: 'Timeline',        icon: 'ScheduleOutlined',     permCode: 'projects:read',   sortOrder: 4 },
  { route: '/cost',           module: 'pm', label: 'Cost',            icon: 'DollarOutlined',       permCode: 'projects:read',   sortOrder: 5 },
  { route: '/my-bugs',        module: 'pm', label: 'My Bugs',         icon: 'BugOutlined',          permCode: 'bugs:read',       sortOrder: 6 },
  { route: '/bugs',           module: 'pm', label: 'Bug Management',  icon: 'BugFilled',            permCode: 'bugs:read',       sortOrder: 7 },
  { route: '/bugs/dashboard', module: 'pm', label: 'Bug Dashboard',   icon: 'FundOutlined',         permCode: 'bugs:read',       sortOrder: 8 },

  // ─── BPM — Quy trình ───────────────────────────────────────────────────────
  { route: '/processes/inbox',     module: 'bpm', label: 'Inbox',     icon: 'InboxOutlined',          permCode: 'bpm:read',   sortOrder: 0 },
  { route: '/processes',           module: 'bpm', label: 'Processes', icon: 'UnorderedListOutlined',  permCode: 'bpm:manage', sortOrder: 1 },
  { route: '/processes/instances', module: 'bpm', label: 'Monitor',   icon: 'RiseOutlined',           permCode: 'bpm:manage', sortOrder: 2 },

  // ─── Timesheet — Chấm công ─────────────────────────────────────────────────
  { route: '/timesheet',           module: 'timesheet', label: 'My Timesheet', icon: 'ClockCircleOutlined', permCode: 'timesheets:read',    sortOrder: 0 },
  { route: '/timesheet/approvals', module: 'timesheet', label: 'Approvals',    icon: 'AuditOutlined',       permCode: 'timesheets:approve', sortOrder: 1 },
  { route: '/timesheet/project',   module: 'timesheet', label: 'Project Log',  icon: 'LineChartOutlined',   permCode: 'timesheets:read',    sortOrder: 2 },
  { route: '/timesheet/manager',   module: 'timesheet', label: 'Attendance',   icon: 'LineChartOutlined',   permCode: 'timesheets:read',    sortOrder: 3 },

  // ─── Reports — Báo cáo ─────────────────────────────────────────────────────
  { route: '/reports', module: 'reports', label: 'Summary', icon: 'BarChartOutlined', permCode: 'reports:read', sortOrder: 0 },

  // ─── HR — Nhân sự ──────────────────────────────────────────────────────────
  { route: '/personnel', module: 'hr', label: 'Employees',      icon: 'TeamOutlined',      permCode: 'employees:read',   sortOrder: 0 },
  { route: '/org-chart', module: 'hr', label: 'Org Chart',      icon: 'ApartmentOutlined', permCode: 'employees:read',   sortOrder: 1 },
  { route: '/contracts', module: 'hr', label: 'Contracts',      icon: 'AuditOutlined',     permCode: 'contracts:read',   sortOrder: 2 },
  { route: '/leaves',    module: 'hr', label: 'Leave Requests', icon: 'CalendarOutlined',  permCode: 'leaves:read',      sortOrder: 3 },

  // ─── Finance — Tài chính ───────────────────────────────────────────────────
  { route: '/payroll',  module: 'finance', label: 'Payroll',  icon: 'CreditCardOutlined', permCode: 'finance:read', sortOrder: 0 },
  { route: '/expenses', module: 'finance', label: 'Expenses', icon: 'WalletOutlined',     permCode: 'finance:read', sortOrder: 1 },
  { route: '/budget',   module: 'finance', label: 'Budget',   icon: 'PieChartOutlined',   permCode: 'finance:read', sortOrder: 2 },
  { route: '/invoices', module: 'finance', label: 'Invoices', icon: 'FileTextOutlined',   permCode: 'finance:read', sortOrder: 3 },

  // ─── CRM ───────────────────────────────────────────────────────────────────
  { route: '/crm/leads',     module: 'crm', label: 'Leads',         icon: 'FunnelPlotOutlined', permCode: 'crm:read', sortOrder: 0 },
  { route: '/crm/deals',     module: 'crm', label: 'Deals',         icon: 'TrophyOutlined',     permCode: 'crm:read', sortOrder: 1 },
  { route: '/crm/contacts',  module: 'crm', label: 'Contacts',      icon: 'ContactsOutlined',   permCode: 'crm:read', sortOrder: 2 },
  { route: '/crm/customers', module: 'crm', label: 'All Customers', icon: 'ShopOutlined',       permCode: 'crm:read', sortOrder: 3 },

  // ─── Recruitment — Tuyển dụng ─────────────────────────────────────────────
  { route: '/recruit/pipeline',   module: 'recruit', label: 'Pipeline',    icon: 'AppstoreAddOutlined',  permCode: 'recruit:read', sortOrder: 0 },
  { route: '/recruit/candidates', module: 'recruit', label: 'Candidates',  icon: 'UsergroupAddOutlined', permCode: 'recruit:read', sortOrder: 1 },
  { route: '/recruit/interviews', module: 'recruit', label: 'Interviews',  icon: 'ScheduleFilled',       permCode: 'recruit:read', sortOrder: 2 },
  { route: '/recruit/jobs',       module: 'recruit', label: 'Job Openings',icon: 'SolutionOutlined',     permCode: 'recruit:read', sortOrder: 3 },

  // ─── Assets — Tài sản ─────────────────────────────────────────────────────
  { route: '/assets',             module: 'asset', label: 'All Assets',   icon: 'LaptopOutlined',  permCode: 'asset:read', sortOrder: 0 },
  { route: '/assets/assignments', module: 'asset', label: 'Assignments',  icon: 'SwapOutlined',    permCode: 'asset:read', sortOrder: 1 },
  { route: '/assets/maintenance', module: 'asset', label: 'Maintenance',  icon: 'ToolOutlined',    permCode: 'asset:read', sortOrder: 2 },

  // ─── Admin — Quản trị ──────────────────────────────────────────────────────
  { route: '/users',        module: 'admin', label: 'Users',        icon: 'UserOutlined',              permCode: 'admin:users',       sortOrder: 0 },
  { route: '/alerts',       module: 'admin', label: 'Alerts',       icon: 'BellOutlined',              permCode: 'alerts:read',       sortOrder: 1 },
  { route: '/settings',     module: 'admin', label: 'Settings',     icon: 'SettingOutlined',           permCode: 'admin:settings',    sortOrder: 2 },
  { route: '/permissions',  module: 'admin', label: 'Permissions',  icon: 'SafetyCertificateOutlined', permCode: 'admin:permissions', sortOrder: 3 },
  { route: '/integrations', module: 'admin', label: 'Integrations', icon: 'ApiOutlined',               permCode: 'admin:settings',    sortOrder: 4 },
];

/**
 * ROUTE_PERMISSION_MAP — derive từ registry, không hardcode thêm ở đây.
 * Dùng trong AppSidebar và PermissionGuard phía frontend.
 */
export const ROUTE_PERMISSION_MAP: Record<string, string | undefined> =
  Object.fromEntries(
    SCREEN_REGISTRY.map(s => [s.route, s.permCode ?? undefined]),
  );

/**
 * Nhãn tiếng Việt cho từng module — dùng trong filter bảng phân quyền.
 */
export const MODULE_LABELS: Record<string, string> = {
  pm:        'Dự án',
  bpm:       'Quy trình',
  timesheet: 'Chấm công',
  reports:   'Báo cáo',
  hr:        'Nhân sự',
  finance:   'Tài chính',
  crm:       'CRM',
  recruit:   'Tuyển dụng',
  asset:     'Tài sản',
  admin:     'Quản trị',
};

/**
 * Nhãn tiếng Việt cho từng action — dùng trong bảng phân quyền.
 */
export const ACTION_LABELS: Record<string, string> = {
  read:        'Xem',
  create:      'Thêm',
  update:      'Sửa',
  delete:      'Xoá',
  approve:     'Phê duyệt',
  export:      'Xuất file',
  manage:      'Quản lý',
  assign:      'Phân công',
  close:       'Đóng',
  configure:   'Cấu hình',
  users:       'Người dùng',
  org:         'Tổ chức',
  permissions: 'Phân quyền',
  settings:    'Cài đặt',
};

/**
 * Màu sắc cho từng permission domain — dùng trong bảng phân quyền.
 */
export const PERM_DOMAIN_COLOR: Record<string, string> = {
  projects:  '#2563EB',
  tasks:     '#0891B2',
  bugs:      '#DC2626',
  issues:    '#EA580C',
  employees: '#059669',
  contracts: '#0D9488',
  leaves:    '#65A30D',
  timesheets:'#D97706',
  timelogs:  '#F59E0B',
  reports:   '#0891B2',
  finance:   '#0D9488',
  bpm:       '#7C3AED',
  dashboard: '#64748B',
  alerts:    '#DB2777',
  admin:     '#475569',
  crm:       '#DC2626',
  recruit:   '#0EA5E9',
  asset:     '#B45309',
};

/**
 * Tên tiếng Việt cho từng permission domain.
 */
export const PERM_DOMAIN_LABEL: Record<string, string> = {
  projects:  'Dự án',
  tasks:     'Công việc',
  bugs:      'Lỗi & Vấn đề',
  issues:    'Vấn đề',
  employees: 'Nhân viên',
  contracts: 'Hợp đồng',
  leaves:    'Nghỉ phép',
  timesheets:'Chấm công',
  timelogs:  'Ghi giờ',
  reports:   'Báo cáo',
  finance:   'Tài chính',
  bpm:       'Quy trình',
  dashboard: 'Dashboard',
  alerts:    'Cảnh báo',
  admin:     'Quản trị',
  crm:       'CRM',
  recruit:   'Tuyển dụng',
  asset:     'Tài sản',
};

/**
 * Module chứa từng permission domain — dùng cho filter.
 */
export const PERM_DOMAIN_MODULE: Record<string, string> = {
  projects:  'pm',
  tasks:     'pm',
  bugs:      'pm',
  issues:    'pm',
  employees: 'hr',
  contracts: 'hr',
  leaves:    'hr',
  timesheets:'timesheet',
  timelogs:  'timesheet',
  reports:   'reports',
  finance:   'finance',
  bpm:       'bpm',
  dashboard: 'general',
  alerts:    'general',
  admin:     'admin',
  crm:       'crm',
  recruit:   'recruit',
  asset:     'asset',
};
