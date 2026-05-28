/**
 * screens.registry.ts — Single source of truth cho toàn bộ màn hình & routes.
 *
 * Dev thêm chức năng mới tại ĐÂY. Mọi thứ còn lại tự động:
 *   - ROUTE_PERMISSION_MAP  → derive từ registry (kiểm soát truy cập)
 *   - Bảng phân quyền UI   → derive từ registry (nhóm theo module)
 *   - DB screens table      → synced từ seed.ts khi deploy
 *
 * Module IDs v3.0: work | people | finance | crm | asset | ops | me | admin
 */

export interface ScreenDef {
  route:     string;
  module:    string;
  label:     string;
  icon:      string;
  permCode:  string | null;
  sortOrder: number;
}

export const SCREEN_REGISTRY: ScreenDef[] = [
  // ─── Work — Công việc ──────────────────────────────────────────────────────
  { route: '/',               module: 'work', label: 'Tổng quan',            icon: 'DashboardOutlined',    permCode: 'dashboard:read',     sortOrder: 0 },
  { route: '/my-tasks',       module: 'work', label: 'Bảng Kanban',           icon: 'AppstoreOutlined',     permCode: 'tasks:read',         sortOrder: 1 },
  { route: '/tasks',          module: 'work', label: 'Việc của tôi',          icon: 'CheckSquareOutlined',  permCode: 'tasks:read',         sortOrder: 2 },
  { route: '/timeline',       module: 'work', label: 'Lịch trình',            icon: 'ScheduleOutlined',     permCode: 'projects:read',      sortOrder: 3 },
  { route: '/my-bugs',        module: 'work', label: 'Lỗi của tôi',           icon: 'BugOutlined',          permCode: 'bugs:read',          sortOrder: 4 },
  { route: '/bugs',           module: 'work', label: 'Quản lý lỗi',           icon: 'BugFilled',            permCode: 'bugs:read',          sortOrder: 5 },
  { route: '/bugs/dashboard', module: 'work', label: 'Thống kê lỗi',          icon: 'FundOutlined',         permCode: 'bugs:read',          sortOrder: 6 },
  { route: '/projects',       module: 'work', label: 'Tất cả dự án',          icon: 'ProjectOutlined',      permCode: 'projects:read',      sortOrder: 7 },
  { route: '/knowledge-base', module: 'work', label: 'Cơ sở tri thức',        icon: 'BookOutlined',         permCode: 'projects:read',      sortOrder: 8 },
  { route: '/timesheet',      module: 'work', label: 'Chấm công của tôi',     icon: 'ClockCircleOutlined',  permCode: 'timesheets:read',    sortOrder: 9 },
  { route: '/timesheet/project', module: 'work', label: 'Nhật ký dự án',      icon: 'LineChartOutlined',    permCode: 'timesheets:read',    sortOrder: 10 },
  { route: '/processes/inbox',   module: 'work', label: 'Hộp thư BPM',        icon: 'InboxOutlined',        permCode: 'bpm:read',           sortOrder: 11 },
  { route: '/feed',              module: 'work', label: 'Bảng tin công ty',    icon: 'MessageOutlined',      permCode: 'dashboard:read',     sortOrder: 12 },
  { route: '/calendar',          module: 'work', label: 'Lịch công ty',        icon: 'CalendarOutlined',     permCode: 'dashboard:read',     sortOrder: 13 },
  { route: '/reports',           module: 'work', label: 'Báo cáo',             icon: 'BarChartOutlined',     permCode: 'reports:read',       sortOrder: 14 },

  // ─── Ops — Vận hành (BPM Design + Monitor) ────────────────────────────────
  { route: '/processes',           module: 'ops', label: 'Định nghĩa quy trình', icon: 'UnorderedListOutlined', permCode: 'bpm:manage', sortOrder: 0 },
  { route: '/processes/instances', module: 'ops', label: 'Giám sát quy trình',   icon: 'RiseOutlined',          permCode: 'bpm:manage', sortOrder: 1 },

  // ─── People — Nhân sự + Tuyển dụng ────────────────────────────────────────
  { route: '/personnel',           module: 'people', label: 'Danh sách nhân viên',  icon: 'TeamOutlined',          permCode: 'employees:read',    sortOrder: 0 },
  { route: '/org-chart',           module: 'people', label: 'Sơ đồ tổ chức',        icon: 'ApartmentOutlined',     permCode: 'employees:read',    sortOrder: 1 },
  { route: '/contracts',           module: 'people', label: 'Hợp đồng lao động',    icon: 'AuditOutlined',         permCode: 'contracts:read',    sortOrder: 2 },
  { route: '/leaves',              module: 'people', label: 'Đơn nghỉ phép',         icon: 'CalendarOutlined',      permCode: 'leaves:read',       sortOrder: 3 },
  { route: '/payroll',             module: 'people', label: 'Bảng lương',            icon: 'CreditCardOutlined',    permCode: 'finance:read',      sortOrder: 4 },
  { route: '/payroll/settings',    module: 'people', label: 'Cài đặt lương',         icon: 'SettingOutlined',       permCode: 'finance:manage',    sortOrder: 5 },
  { route: '/hr/training',         module: 'people', label: 'Đào tạo',               icon: 'ReadOutlined',          permCode: 'training:read',     sortOrder: 6 },
  { route: '/hr/performance',      module: 'people', label: 'Đánh giá năng lực',     icon: 'TrophyOutlined',        permCode: 'employees:read',    sortOrder: 7 },
  { route: '/hr/skill-matrix',     module: 'people', label: 'Ma trận kỹ năng',       icon: 'ApartmentOutlined',     permCode: 'skills:read',       sortOrder: 8 },
  { route: '/hr/okr',              module: 'people', label: 'OKR & KPI',              icon: 'AimOutlined',           permCode: 'okr:read',          sortOrder: 9 },
  { route: '/recruit/pipeline',    module: 'people', label: 'Pipeline tuyển dụng',   icon: 'AppstoreAddOutlined',   permCode: 'recruit:read',      sortOrder: 10 },
  { route: '/recruit/candidates',  module: 'people', label: 'Ứng viên',               icon: 'UsergroupAddOutlined',  permCode: 'recruit:read',      sortOrder: 11 },
  { route: '/recruit/interviews',  module: 'people', label: 'Lịch phỏng vấn',         icon: 'ScheduleFilled',        permCode: 'recruit:read',      sortOrder: 12 },
  { route: '/recruit/jobs',        module: 'people', label: 'Vị trí tuyển dụng',      icon: 'SolutionOutlined',      permCode: 'recruit:read',      sortOrder: 13 },
  { route: '/timesheet/approvals', module: 'people', label: 'Duyệt chấm công',        icon: 'AuditOutlined',         permCode: 'timesheets:approve', sortOrder: 14 },
  { route: '/timesheet/manager',   module: 'people', label: 'Bảng điểm danh',         icon: 'LineChartOutlined',     permCode: 'timesheets:read',   sortOrder: 15 },

  // ─── Finance — Tài chính ───────────────────────────────────────────────────
  { route: '/cost',                          module: 'finance', label: 'Chi phí dự án',      icon: 'DollarOutlined',     permCode: 'finance:read',   sortOrder: 0 },
  { route: '/budget',                        module: 'finance', label: 'Ngân sách',           icon: 'PieChartOutlined',   permCode: 'finance:read',   sortOrder: 1 },
  { route: '/expenses',                      module: 'finance', label: 'Đề nghị thanh toán', icon: 'WalletOutlined',     permCode: 'finance:read',   sortOrder: 2 },
  { route: '/invoices',                      module: 'finance', label: 'Hoá đơn',             icon: 'FileTextOutlined',   permCode: 'finance:read',   sortOrder: 3 },
  { route: '/accounting/accounts',           module: 'finance', label: 'Hệ thống tài khoản',  icon: 'BankOutlined',       permCode: 'finance:read',   sortOrder: 4 },
  { route: '/accounting/journal',            module: 'finance', label: 'Nhật ký kế toán',     icon: 'BookOutlined',       permCode: 'finance:manage', sortOrder: 5 },
  { route: '/accounting/financial-reports',  module: 'finance', label: 'Báo cáo tài chính',   icon: 'FundOutlined',       permCode: 'finance:read',   sortOrder: 6 },

  // ─── CRM ───────────────────────────────────────────────────────────────────
  { route: '/crm/leads',            module: 'crm', label: 'Khách hàng tiềm năng', icon: 'FunnelPlotOutlined', permCode: 'crm:read', sortOrder: 0 },
  { route: '/crm/deals',            module: 'crm', label: 'Cơ hội bán hàng',      icon: 'TrophyOutlined',     permCode: 'crm:read', sortOrder: 1 },
  { route: '/crm/contacts',         module: 'crm', label: 'Danh bạ liên hệ',       icon: 'ContactsOutlined',   permCode: 'crm:read', sortOrder: 2 },
  { route: '/crm/customers',        module: 'crm', label: 'Tất cả khách hàng',     icon: 'ShopOutlined',       permCode: 'crm:read', sortOrder: 3 },
  { route: '/crm/client-contracts', module: 'crm', label: 'Hợp đồng khách hàng',   icon: 'AuditOutlined',      permCode: 'crm:read', sortOrder: 4 },
  { route: '/crm/activities',       module: 'crm', label: 'Nhật ký hoạt động',     icon: 'PhoneOutlined',      permCode: 'crm:read', sortOrder: 5 },
  { route: '/crm/forecast',         module: 'crm', label: 'Dự báo doanh số',       icon: 'RiseOutlined',       permCode: 'crm:read', sortOrder: 6 },
  { route: '/crm/portal',           module: 'crm', label: 'Cổng khách hàng',       icon: 'GlobalOutlined',     permCode: 'crm:read', sortOrder: 7 },

  // ─── Asset — Tài sản + Mua hàng ───────────────────────────────────────────
  { route: '/assets',                module: 'asset', label: 'Tất cả tài sản',   icon: 'LaptopOutlined',   permCode: 'asset:read',        sortOrder: 0 },
  { route: '/assets/assignments',    module: 'asset', label: 'Cấp phát tài sản', icon: 'SwapOutlined',     permCode: 'asset:read',        sortOrder: 1 },
  { route: '/assets/maintenance',    module: 'asset', label: 'Bảo trì tài sản',  icon: 'ToolOutlined',     permCode: 'asset:read',        sortOrder: 2 },
  { route: '/assets/room-booking',   module: 'asset', label: 'Đặt phòng họp',    icon: 'CalendarOutlined', permCode: 'room_booking:read', sortOrder: 3 },
  { route: '/assets/vehicles',       module: 'asset', label: 'Đặt xe công ty',   icon: 'CarOutlined',      permCode: 'asset:read',        sortOrder: 4 },
  { route: '/procurement/vendors',   module: 'asset', label: 'Nhà cung cấp',     icon: 'ShopOutlined',     permCode: 'procurement:read',  sortOrder: 5 },
  { route: '/procurement/orders',    module: 'asset', label: 'Đơn mua hàng',     icon: 'FileTextOutlined', permCode: 'procurement:read',  sortOrder: 6 },

  // ─── Me — Của tôi (Self-service) ──────────────────────────────────────────
  { route: '/self-service',        module: 'me', label: 'Thông tin của tôi', icon: 'UserOutlined',     permCode: 'hr:read',         sortOrder: 0 },
  { route: '/payroll/my-payslips', module: 'me', label: 'Phiếu lương',       icon: 'FileTextOutlined', permCode: 'hr:read',         sortOrder: 1 },

  // ─── Admin — Quản trị ──────────────────────────────────────────────────────
  { route: '/users',               module: 'admin', label: 'Người dùng',        icon: 'UserOutlined',              permCode: 'admin:users',       sortOrder: 0 },
  { route: '/permissions',         module: 'admin', label: 'Phân quyền',         icon: 'SafetyCertificateOutlined', permCode: 'admin:permissions', sortOrder: 1 },
  { route: '/alerts',              module: 'admin', label: 'Cảnh báo hệ thống',  icon: 'BellOutlined',              permCode: 'alerts:read',       sortOrder: 2 },
  { route: '/settings',            module: 'admin', label: 'Cấu hình menu',      icon: 'SettingOutlined',           permCode: 'admin:settings',    sortOrder: 3 },
  { route: '/integrations',        module: 'admin', label: 'Tích hợp',           icon: 'ApiOutlined',               permCode: 'admin:settings',    sortOrder: 4 },
  { route: '/import',              module: 'admin', label: 'Nhập dữ liệu',       icon: 'UploadOutlined',            permCode: 'admin:settings',    sortOrder: 5 },
  { route: '/audit-log',           module: 'admin', label: 'Nhật ký hệ thống',   icon: 'AuditOutlined',             permCode: 'admin:settings',    sortOrder: 6 },
  { route: '/automation',          module: 'admin', label: 'Tự động hóa',        icon: 'ThunderboltOutlined',       permCode: 'admin:settings',    sortOrder: 7 },
  { route: '/scheduled-reports',   module: 'admin', label: 'Báo cáo định kỳ',    icon: 'MailOutlined',              permCode: 'admin:settings',    sortOrder: 8 },
  { route: '/module-config',       module: 'admin', label: 'Cấu hình Module',     icon: 'AppstoreOutlined',          permCode: 'admin:settings',    sortOrder: 9 },
  { route: '/admin/health',        module: 'admin', label: 'Giám sát hệ thống',   icon: 'MonitorOutlined',           permCode: 'admin:settings',    sortOrder: 10 },
  { route: '/admin/demo',          module: 'admin', label: 'Demo Mode',            icon: 'ExperimentOutlined',        permCode: 'admin:settings',    sortOrder: 11 },
  { route: '/onboarding',          module: 'admin', label: 'Onboarding Wizard',    icon: 'RocketOutlined',            permCode: 'admin:settings',    sortOrder: 12 },
];

/**
 * ROUTE_PERMISSION_MAP — derive từ registry, không hardcode thêm ở đây.
 */
export const ROUTE_PERMISSION_MAP: Record<string, string | undefined> =
  Object.fromEntries(
    SCREEN_REGISTRY.map(s => [s.route, s.permCode ?? undefined]),
  );

/**
 * Nhãn tiếng Việt cho từng module v3.0.
 */
export const MODULE_LABELS: Record<string, string> = {
  work:    'Công việc',
  people:  'Nhân sự',
  finance: 'Tài chính',
  crm:     'CRM',
  asset:   'Tài sản',
  ops:     'Vận hành',
  me:      'Của tôi',
  admin:   'Quản trị',
};

/**
 * Nhãn tiếng Việt cho từng action.
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
 * Màu sắc cho từng permission domain.
 */
export const PERM_DOMAIN_COLOR: Record<string, string> = {
  projects:     '#2563EB',
  tasks:        '#0891B2',
  bugs:         '#DC2626',
  issues:       '#EA580C',
  employees:    '#059669',
  contracts:    '#0D9488',
  leaves:       '#65A30D',
  timesheets:   '#D97706',
  timelogs:     '#F59E0B',
  reports:      '#0891B2',
  finance:      '#0D9488',
  bpm:          '#7C3AED',
  dashboard:    '#64748B',
  alerts:       '#DB2777',
  admin:        '#475569',
  crm:          '#DC2626',
  recruit:      '#0EA5E9',
  asset:        '#B45309',
  procurement:  '#F97316',
  okr:          '#8B5CF6',
  skills:       '#059669',
  training:     '#0891B2',
  hr:           '#10B981',
  room_booking: '#3B82F6',
};

/**
 * Tên tiếng Việt cho từng permission domain.
 */
export const PERM_DOMAIN_LABEL: Record<string, string> = {
  projects:     'Dự án',
  tasks:        'Công việc',
  bugs:         'Lỗi & Vấn đề',
  issues:       'Vấn đề',
  employees:    'Nhân viên',
  contracts:    'Hợp đồng',
  leaves:       'Nghỉ phép',
  timesheets:   'Chấm công',
  timelogs:     'Ghi giờ',
  reports:      'Báo cáo',
  finance:      'Tài chính',
  bpm:          'Quy trình',
  dashboard:    'Tổng quan',
  alerts:       'Cảnh báo',
  admin:        'Quản trị',
  crm:          'CRM',
  recruit:      'Tuyển dụng',
  asset:        'Tài sản',
  procurement:  'Mua hàng',
  okr:          'OKR & KPI',
  skills:       'Kỹ năng',
  training:     'Đào tạo',
  hr:           'Nhân sự (Self-service)',
  room_booking: 'Đặt phòng',
};

/**
 * Module chứa từng permission domain — v3.0 mapping.
 */
export const PERM_DOMAIN_MODULE: Record<string, string> = {
  projects:     'work',
  tasks:        'work',
  bugs:         'work',
  issues:       'work',
  dashboard:    'work',
  reports:      'work',
  bpm:          'ops',
  employees:    'people',
  contracts:    'people',
  leaves:       'people',
  okr:          'people',
  skills:       'people',
  training:     'people',
  hr:           'me',
  timesheets:   'people',
  timelogs:     'work',
  finance:      'finance',
  crm:          'crm',
  recruit:      'people',
  asset:        'asset',
  procurement:  'asset',
  room_booking: 'asset',
  alerts:       'admin',
  admin:        'admin',
};
