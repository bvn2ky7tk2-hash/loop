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
  { route: '/',               module: 'pm', label: 'Tổng quan',           icon: 'DashboardOutlined',    permCode: 'dashboard:read',  sortOrder: 0 },
  { route: '/projects',       module: 'pm', label: 'Tất cả dự án',        icon: 'ProjectOutlined',      permCode: 'projects:read',   sortOrder: 1 },
  { route: '/my-tasks',       module: 'pm', label: 'Bảng Kanban',          icon: 'AppstoreOutlined',     permCode: 'tasks:read',      sortOrder: 2 },
  { route: '/tasks',          module: 'pm', label: 'Việc của tôi',         icon: 'CheckSquareOutlined',  permCode: 'tasks:read',      sortOrder: 3 },
  { route: '/timeline',       module: 'pm', label: 'Lịch trình',           icon: 'ScheduleOutlined',     permCode: 'projects:read',   sortOrder: 4 },
  { route: '/cost',        module: 'finance', label: 'Chi phí dự án',      icon: 'DollarOutlined',       permCode: 'finance:read',    sortOrder: 5 },
  { route: '/my-bugs',        module: 'pm', label: 'Lỗi của tôi',          icon: 'BugOutlined',          permCode: 'bugs:read',       sortOrder: 6 },
  { route: '/bugs',           module: 'pm', label: 'Quản lý lỗi',          icon: 'BugFilled',            permCode: 'bugs:read',       sortOrder: 7 },
  { route: '/bugs/dashboard', module: 'pm', label: 'Thống kê lỗi',         icon: 'FundOutlined',         permCode: 'bugs:read',       sortOrder: 8 },
  { route: '/knowledge-base', module: 'pm', label: 'Cơ sở tri thức',       icon: 'BookOutlined',         permCode: 'projects:read',   sortOrder: 9 },

  // ─── BPM — Quy trình ───────────────────────────────────────────────────────
  { route: '/processes/inbox',     module: 'bpm', label: 'Hộp thư đến',         icon: 'InboxOutlined',         permCode: 'bpm:read',   sortOrder: 0 },
  { route: '/processes',           module: 'bpm', label: 'Định nghĩa quy trình', icon: 'UnorderedListOutlined', permCode: 'bpm:manage', sortOrder: 1 },
  { route: '/processes/instances', module: 'bpm', label: 'Giám sát quy trình',   icon: 'RiseOutlined',          permCode: 'bpm:manage', sortOrder: 2 },

  // ─── Timesheet — Chấm công ─────────────────────────────────────────────────
  { route: '/timesheet',           module: 'timesheet', label: 'Chấm công của tôi', icon: 'ClockCircleOutlined', permCode: 'timesheets:read',    sortOrder: 0 },
  { route: '/timesheet/approvals', module: 'timesheet', label: 'Duyệt chấm công',   icon: 'AuditOutlined',       permCode: 'timesheets:approve', sortOrder: 1 },
  { route: '/timesheet/project',   module: 'timesheet', label: 'Nhật ký dự án',      icon: 'LineChartOutlined',   permCode: 'timesheets:read',    sortOrder: 2 },
  { route: '/timesheet/manager',   module: 'timesheet', label: 'Bảng điểm danh',     icon: 'LineChartOutlined',   permCode: 'timesheets:read',    sortOrder: 3 },

  // ─── Reports — Báo cáo ─────────────────────────────────────────────────────
  { route: '/reports', module: 'reports', label: 'Báo cáo tổng hợp', icon: 'BarChartOutlined', permCode: 'reports:read', sortOrder: 0 },

  // ─── HR — Nhân sự ──────────────────────────────────────────────────────────
  { route: '/personnel', module: 'hr', label: 'Danh sách nhân viên', icon: 'TeamOutlined',      permCode: 'employees:read', sortOrder: 0 },
  { route: '/org-chart', module: 'hr', label: 'Sơ đồ tổ chức',       icon: 'ApartmentOutlined', permCode: 'employees:read', sortOrder: 1 },
  { route: '/contracts', module: 'hr', label: 'Hợp đồng lao động',   icon: 'AuditOutlined',     permCode: 'contracts:read', sortOrder: 2 },
  { route: '/leaves',    module: 'hr', label: 'Đơn xin nghỉ phép',   icon: 'CalendarOutlined',  permCode: 'leaves:read',    sortOrder: 3 },

  // ─── Finance — Tài chính ───────────────────────────────────────────────────
  { route: '/payroll',                      module: 'finance', label: 'Bảng lương',           icon: 'CreditCardOutlined', permCode: 'finance:read',   sortOrder: 0 },
  { route: '/payroll/settings',             module: 'finance', label: 'Cài đặt lương',        icon: 'SettingOutlined',    permCode: 'finance:manage', sortOrder: 1 },
  { route: '/expenses',                     module: 'finance', label: 'Đề nghị thanh toán',  icon: 'WalletOutlined',     permCode: 'finance:read',   sortOrder: 2 },
  { route: '/budget',                       module: 'finance', label: 'Ngân sách',            icon: 'PieChartOutlined',   permCode: 'finance:read',   sortOrder: 3 },
  { route: '/invoices',                     module: 'finance', label: 'Hoá đơn',              icon: 'FileTextOutlined',   permCode: 'finance:read',   sortOrder: 4 },
  { route: '/accounting/accounts',          module: 'finance', label: 'Danh mục tài khoản',   icon: 'BankOutlined',       permCode: 'finance:read',   sortOrder: 5 },
  { route: '/accounting/journal',           module: 'finance', label: 'Sổ nhật ký',           icon: 'BookOutlined',       permCode: 'finance:manage', sortOrder: 6 },
  { route: '/accounting/financial-reports', module: 'finance', label: 'Báo cáo tài chính',    icon: 'FundOutlined',       permCode: 'finance:read',   sortOrder: 7 },

  // ─── CRM ───────────────────────────────────────────────────────────────────
  { route: '/crm/leads',            module: 'crm', label: 'Khách hàng tiềm năng', icon: 'FunnelPlotOutlined', permCode: 'crm:read', sortOrder: 0 },
  { route: '/crm/deals',            module: 'crm', label: 'Cơ hội bán hàng',      icon: 'TrophyOutlined',     permCode: 'crm:read', sortOrder: 1 },
  { route: '/crm/contacts',         module: 'crm', label: 'Danh bạ liên hệ',       icon: 'ContactsOutlined',   permCode: 'crm:read', sortOrder: 2 },
  { route: '/crm/customers',        module: 'crm', label: 'Tất cả khách hàng',     icon: 'ShopOutlined',       permCode: 'crm:read', sortOrder: 3 },
  { route: '/crm/client-contracts', module: 'crm', label: 'Hợp đồng khách hàng',   icon: 'AuditOutlined',      permCode: 'crm:read', sortOrder: 4 },
  { route: '/crm/activities',       module: 'crm', label: 'Nhật ký hoạt động',     icon: 'PhoneOutlined',      permCode: 'crm:read', sortOrder: 5 },
  { route: '/crm/forecast',         module: 'crm', label: 'Dự báo doanh số',       icon: 'RiseOutlined',       permCode: 'crm:read', sortOrder: 6 },
  { route: '/crm/portal',           module: 'crm', label: 'Cổng khách hàng',       icon: 'GlobalOutlined',     permCode: 'crm:read', sortOrder: 7 },

  // ─── Self Service ──────────────────────────────────────────────────────────
  { route: '/self-service', module: 'hr', label: 'Thông tin cá nhân', icon: 'UserOutlined', permCode: 'hr:read', sortOrder: 10 },

  // ─── Admin — Quản trị ──────────────────────────────────────────────────────
  { route: '/users',        module: 'admin', label: 'Người dùng',        icon: 'UserOutlined',              permCode: 'admin:users',       sortOrder: 0 },
  { route: '/alerts',       module: 'admin', label: 'Cảnh báo hệ thống', icon: 'BellOutlined',              permCode: 'alerts:read',       sortOrder: 1 },
  { route: '/settings',     module: 'admin', label: 'Cấu hình menu',     icon: 'SettingOutlined',           permCode: 'admin:settings',    sortOrder: 2 },
  { route: '/permissions',  module: 'admin', label: 'Phân quyền',        icon: 'SafetyCertificateOutlined', permCode: 'admin:permissions', sortOrder: 3 },
  { route: '/integrations', module: 'admin', label: 'Tích hợp',          icon: 'ApiOutlined',               permCode: 'admin:settings',    sortOrder: 4 },
  { route: '/import',       module: 'admin', label: 'Import Data',       icon: 'UploadOutlined',            permCode: 'admin:settings',    sortOrder: 5 },
  { route: '/audit-log',    module: 'admin', label: 'Audit Log',         icon: 'AuditOutlined',             permCode: 'admin:settings',    sortOrder: 6 },
  { route: '/automation',         module: 'admin', label: 'Automation Rules',  icon: 'ThunderboltOutlined', permCode: 'admin:settings', sortOrder: 7 },
  { route: '/scheduled-reports',  module: 'admin', label: 'Báo cáo định kỳ',   icon: 'MailOutlined',        permCode: 'admin:settings', sortOrder: 8 },
  { route: '/module-config',      module: 'admin', label: 'Cấu hình Module',    icon: 'AppstoreOutlined',    permCode: 'admin:settings', sortOrder: 9 },
  { route: '/admin/health',       module: 'admin', label: 'Giám sát hệ thống',  icon: 'AppstoreOutlined',    permCode: 'admin:settings', sortOrder: 10 },
  { route: '/admin/demo',         module: 'admin', label: 'Demo Mode',           icon: 'AppstoreOutlined',    permCode: 'admin:settings', sortOrder: 11 },
  { route: '/onboarding',         module: 'admin', label: 'Onboarding Wizard',   icon: 'AppstoreOutlined',    permCode: 'admin:settings', sortOrder: 12 },
  { route: '/feed',               module: 'pm',    label: 'Bảng tin công ty',    icon: 'AppstoreOutlined',    permCode: 'dashboard:read', sortOrder: 10 },

  // ─── Recruitment — Tuyển dụng ──────────────────────────────────────────────
  { route: '/recruit/pipeline',   module: 'recruit', label: 'Bảng tuyển dụng',  icon: 'AppstoreAddOutlined',  permCode: 'recruit:read', sortOrder: 0 },
  { route: '/recruit/candidates', module: 'recruit', label: 'Ứng viên',          icon: 'UsergroupAddOutlined', permCode: 'recruit:read', sortOrder: 1 },
  { route: '/recruit/interviews', module: 'recruit', label: 'Lịch phỏng vấn',    icon: 'ScheduleFilled',       permCode: 'recruit:read', sortOrder: 2 },
  { route: '/recruit/jobs',       module: 'recruit', label: 'Vị trí tuyển dụng', icon: 'SolutionOutlined',     permCode: 'recruit:read', sortOrder: 3 },

  // ─── Assets — Tài sản ──────────────────────────────────────────────────────
  { route: '/assets',               module: 'asset', label: 'Tất cả tài sản',   icon: 'LaptopOutlined',   permCode: 'asset:read',         sortOrder: 0 },
  { route: '/assets/assignments',   module: 'asset', label: 'Cấp phát tài sản', icon: 'SwapOutlined',     permCode: 'asset:read',         sortOrder: 1 },
  { route: '/assets/maintenance',   module: 'asset', label: 'Bảo trì tài sản',  icon: 'ToolOutlined',     permCode: 'asset:read',         sortOrder: 2 },
  { route: '/assets/room-booking',  module: 'asset', label: 'Đặt phòng họp',    icon: 'CalendarOutlined', permCode: 'room_booking:read',   sortOrder: 3 },
  { route: '/assets/vehicles',      module: 'asset', label: 'Đặt xe công ty',    icon: 'CarOutlined',      permCode: 'asset:read',          sortOrder: 4 },
  { route: '/calendar',             module: 'pm',    label: 'Lịch công ty',       icon: 'CalendarOutlined', permCode: 'dashboard:read',      sortOrder: 11 },

  // ─── Procurement ──────────────────────────────────────────────────────────
  { route: '/procurement/vendors', module: 'procurement', label: 'Nhà cung cấp', icon: 'ShopOutlined',     permCode: 'procurement:read', sortOrder: 0 },
  { route: '/procurement/orders',  module: 'procurement', label: 'Đơn mua hàng', icon: 'FileTextOutlined', permCode: 'procurement:read', sortOrder: 1 },

  // ─── HR Extensions — Đào tạo & Phát triển ─────────────────────────────────
  { route: '/hr/training',     module: 'hr', label: 'Đào tạo',            icon: 'ReadOutlined',      permCode: 'training:read',  sortOrder: 4 },
  { route: '/hr/performance',  module: 'hr', label: 'Đánh giá hiệu suất', icon: 'TrophyOutlined',    permCode: 'employees:read', sortOrder: 5 },
  { route: '/hr/skill-matrix', module: 'hr', label: 'Ma trận kỹ năng',    icon: 'ApartmentOutlined', permCode: 'skills:read',    sortOrder: 6 },
  { route: '/hr/okr',          module: 'hr', label: 'OKR & KPI',          icon: 'AimOutlined',       permCode: 'okr:read',       sortOrder: 7 },
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
  pm:          'Dự án',
  bpm:         'Quy trình',
  timesheet:   'Chấm công',
  reports:     'Báo cáo',
  hr:          'Nhân sự',
  finance:     'Tài chính',
  crm:         'CRM',
  recruit:     'Tuyển dụng',
  asset:       'Tài sản',
  procurement: 'Mua hàng',
  admin:       'Quản trị',
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
  projects:    '#2563EB',
  tasks:       '#0891B2',
  bugs:        '#DC2626',
  issues:      '#EA580C',
  employees:   '#059669',
  contracts:   '#0D9488',
  leaves:      '#65A30D',
  timesheets:  '#D97706',
  timelogs:    '#F59E0B',
  reports:     '#0891B2',
  finance:     '#0D9488',
  bpm:         '#7C3AED',
  dashboard:   '#64748B',
  alerts:      '#DB2777',
  admin:       '#475569',
  crm:         '#DC2626',
  recruit:     '#0EA5E9',
  asset:       '#B45309',
  procurement: '#F97316',
  okr:         '#8B5CF6',
  skills:      '#059669',
  training:    '#0891B2',
  hr:          '#10B981',
};

/**
 * Tên tiếng Việt cho từng permission domain.
 */
export const PERM_DOMAIN_LABEL: Record<string, string> = {
  projects:    'Dự án',
  tasks:       'Công việc',
  bugs:        'Lỗi & Vấn đề',
  issues:      'Vấn đề',
  employees:   'Nhân viên',
  contracts:   'Hợp đồng',
  leaves:      'Nghỉ phép',
  timesheets:  'Chấm công',
  timelogs:    'Ghi giờ',
  reports:     'Báo cáo',
  finance:     'Tài chính',
  bpm:         'Quy trình',
  dashboard:   'Tổng quan',
  alerts:      'Cảnh báo',
  admin:       'Quản trị',
  crm:         'CRM',
  recruit:     'Tuyển dụng',
  asset:       'Tài sản',
  procurement: 'Mua hàng',
  okr:         'OKR & KPI',
  skills:      'Kỹ năng',
  training:    'Đào tạo',
  hr:          'Nhân sự (Self-service)',
};

/**
 * Module chứa từng permission domain — dùng cho filter.
 */
export const PERM_DOMAIN_MODULE: Record<string, string> = {
  projects:    'pm',
  tasks:       'pm',
  bugs:        'pm',
  issues:      'pm',
  dashboard:   'pm',
  employees:   'hr',
  contracts:   'hr',
  leaves:      'hr',
  okr:         'hr',
  skills:      'hr',
  training:    'hr',
  hr:          'hr',
  timesheets:  'timesheet',
  timelogs:    'timesheet',
  reports:     'reports',
  finance:     'finance',
  bpm:         'bpm',
  alerts:      'admin',
  admin:       'admin',
  crm:         'crm',
  recruit:     'recruit',
  asset:       'asset',
  procurement: 'procurement',
};
