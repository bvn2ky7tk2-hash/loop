/**
 * screens.registry.ts — Single source of truth cho toàn bộ màn hình & routes.
 *
 * Dev thêm chức năng mới tại ĐÂY. Mọi thứ còn lại tự động:
 *   - ROUTE_PERMISSION_MAP  → derive từ registry (kiểm soát truy cập)
 *   - Bảng phân quyền UI   → derive từ registry (nhóm theo module)
 *   - DB screens table      → synced từ seed.ts khi deploy
 *
 * Module IDs v7.0: workspace | projects | people | attendance | recruit | finance | crm | asset | admin
 * (people tách thành 3: people=hồ sơ+phát triển, attendance=chấm công+lương, recruit=tuyển dụng)
 */

export interface ScreenDef {
  route:     string;
  module:    string;     // module để XẾP vào menu (vd self-service nằm trong 'workspace')
  label:     string;
  icon:      string;
  permCode:  string | null;
  sortOrder: number;
  // Module NGHIỆP VỤ sở hữu chức năng này — dùng để ẩn khi module đó bị tắt.
  // Vd /leaves nằm trong menu workspace nhưng thuộc 'attendance' → tắt attendance thì ẩn.
  // Bỏ trống = gate theo `module` (chính nó).
  featureOf?: string;
}

export const SCREEN_REGISTRY: ScreenDef[] = [
  // ─── Persona Dashboards ───────────────────────────────────────────────────
  { route: '/dashboard/work',      module: 'projects',  label: 'Tổng quan Dự án',         icon: 'DashboardOutlined', permCode: 'dashboard:read',        sortOrder: 0 },
  { route: '/dashboard/people',    module: 'people',    label: 'Tổng quan Nhân sự',       icon: 'DashboardOutlined', permCode: 'employees:read',         sortOrder: 0 },
  { route: '/dashboard/finance',   module: 'finance',   label: 'Tổng quan Tài chính',     icon: 'DashboardOutlined', permCode: 'financial_reports:read', sortOrder: 0 },
  { route: '/dashboard/crm',       module: 'crm',       label: 'Tổng quan CRM',           icon: 'DashboardOutlined', permCode: 'crm_leads:read',         sortOrder: 0 },
  { route: '/dashboard/asset',      module: 'asset',      label: 'Tổng quan Tài sản',        icon: 'DashboardOutlined', permCode: 'asset:read',             sortOrder: 0 },
  { route: '/dashboard/attendance', module: 'attendance', label: 'Tổng quan Chấm công & Lương', icon: 'DashboardOutlined', permCode: 'attendance:read',        sortOrder: 0 },
  { route: '/dashboard/recruit',    module: 'recruit',    label: 'Tổng quan Tuyển dụng',     icon: 'DashboardOutlined', permCode: 'recruit_pipeline:read',  sortOrder: 0 },
  { route: '/dashboard/ops',       module: 'admin',     label: 'Tổng quan Vận hành',      icon: 'DashboardOutlined', permCode: 'bpm_processes:manage',   sortOrder: 0 },
  { route: '/dashboard/admin',     module: 'admin',     label: 'Tổng quan Quản trị',      icon: 'DashboardOutlined', permCode: 'system_health:read',     sortOrder: 0 },
  { route: '/dashboard/executive', module: 'admin',     label: 'Executive Command Center', icon: 'FundOutlined',      permCode: 'admin:read',             sortOrder: 0 },

  // ─── Workspace — Cá nhân hàng ngày ───────────────────────────────────────
  { route: '/feed',                module: 'workspace', label: 'Bảng tin công ty',      icon: 'MessageOutlined',     permCode: 'feed:read',              sortOrder: 1 },
  { route: '/my-tasks',            module: 'workspace', label: 'Việc của tôi',          icon: 'AppstoreOutlined',    permCode: 'kanban:read',             sortOrder: 2,  featureOf: 'projects' },
  { route: '/my-bugs',             module: 'workspace', label: 'Lỗi của tôi',           icon: 'BugOutlined',         permCode: 'my_bugs:read',            sortOrder: 3,  featureOf: 'projects' },
  { route: '/processes/inbox',     module: 'workspace', label: 'Hộp thư quy trình',     icon: 'InboxOutlined',       permCode: 'bpm_inbox:read',          sortOrder: 4 },
  { route: '/approvals/inbox',     module: 'workspace', label: 'Hộp thư phê duyệt',     icon: 'InboxOutlined',       permCode: 'process_tasks:read',      sortOrder: 5 },
  { route: '/leaves',              module: 'workspace', label: 'Đơn nghỉ phép',          icon: 'CalendarOutlined',    permCode: 'leaves:read',             sortOrder: 6,  featureOf: 'attendance' },
  { route: '/my-overtime',         module: 'workspace', label: 'Đăng ký làm thêm giờ',  icon: 'FieldTimeOutlined',   permCode: 'employees:read',          sortOrder: 7,  featureOf: 'attendance' },
  { route: '/payroll/my-payslips', module: 'workspace', label: 'Phiếu lương',            icon: 'FileTextOutlined',    permCode: 'my_payslips:read',        sortOrder: 8,  featureOf: 'attendance' },
  { route: '/self-service',        module: 'workspace', label: 'Hồ sơ cá nhân',          icon: 'UserOutlined',        permCode: 'self_service:read',       sortOrder: 9,  featureOf: 'people' },
  { route: '/timesheet',           module: 'workspace', label: 'Chấm công của tôi',      icon: 'ClockCircleOutlined', permCode: 'timesheets:read',         sortOrder: 10, featureOf: 'attendance' },
  { route: '/calendar',            module: 'workspace', label: 'Lịch công ty',            icon: 'CalendarOutlined',    permCode: 'work_calendar:read',      sortOrder: 11 },
  { route: '/assets/room-booking', module: 'workspace', label: 'Đặt phòng họp',          icon: 'CalendarOutlined',    permCode: 'room_booking:read',       sortOrder: 12, featureOf: 'asset' },
  { route: '/assets/vehicles',     module: 'workspace', label: 'Đặt xe công ty',          icon: 'CarOutlined',         permCode: 'vehicles:read',           sortOrder: 13, featureOf: 'asset' },

  // ─── Projects — Dự án & Công việc nhóm ───────────────────────────────────
  { route: '/projects',            module: 'projects', label: 'Tất cả dự án',      icon: 'ProjectOutlined',    permCode: 'projects:read',           sortOrder: 1 },
  { route: '/tasks',               module: 'projects', label: 'Việc dự án',         icon: 'CheckSquareOutlined', permCode: 'tasks:read',              sortOrder: 2 },
  { route: '/timeline',            module: 'projects', label: 'Lịch trình',         icon: 'ScheduleOutlined',    permCode: 'timeline:read',           sortOrder: 3 },
  { route: '/timesheet/project',   module: 'projects', label: 'Nhật ký dự án',      icon: 'LineChartOutlined',   permCode: 'timesheet_project:read',  sortOrder: 4 },
  { route: '/bugs',                module: 'projects', label: 'Quản lý lỗi',        icon: 'BugFilled',           permCode: 'bugs:read',               sortOrder: 5 },
  { route: '/bugs/dashboard',      module: 'projects', label: 'Thống kê lỗi',       icon: 'FundOutlined',        permCode: 'bugs_stats:read',         sortOrder: 6 },
  { route: '/knowledge-base',      module: 'projects', label: 'Cơ sở tri thức',     icon: 'BookOutlined',        permCode: 'knowledge_base:read',     sortOrder: 7 },
  { route: '/reports',             module: 'analytics', label: 'Báo cáo',             icon: 'BarChartOutlined',    permCode: 'reports:read',            sortOrder: 8 },
  { route: '/reports/utilization', module: 'analytics', label: 'Tỷ lệ sử dụng nhân lực', icon: 'TeamOutlined',     permCode: 'reports:read',            sortOrder: 9 },
  { route: '/reports/builder',     module: 'analytics', label: 'Tạo báo cáo',            icon: 'BuildOutlined',    permCode: 'reports:read',            sortOrder: 10 },
  { route: '/projects/analytics',  module: 'analytics', label: 'Phân tích dự án',         icon: 'ProjectOutlined',  permCode: 'projects:read',           sortOrder: 11 },

  // ─── BPM — gộp vào admin ─────────────────────────────────────────────────
  { route: '/processes',           module: 'admin', label: 'Định nghĩa quy trình', icon: 'UnorderedListOutlined', permCode: 'bpm_processes:manage', sortOrder: 50 },
  { route: '/processes/instances', module: 'admin', label: 'Giám sát quy trình',   icon: 'RiseOutlined',          permCode: 'bpm_instances:read',  sortOrder: 51 },

  // ─── People — Nhân sự (hồ sơ + tổ chức + phát triển) ────────────────────
  { route: '/personnel',             module: 'people', label: 'Danh sách nhân viên',      icon: 'TeamOutlined',         permCode: 'employees:read',             sortOrder: 1 },
  { route: '/org-chart',             module: 'people', label: 'Sơ đồ tổ chức',            icon: 'ApartmentOutlined',    permCode: 'org_chart:read',             sortOrder: 2 },
  { route: '/contracts',             module: 'people', label: 'Hợp đồng lao động',         icon: 'AuditOutlined',        permCode: 'contracts:read',             sortOrder: 3 },
  { route: '/hr/job-titles',         module: 'people', label: 'Chức danh',                 icon: 'TagOutlined',          permCode: 'employees:read',             sortOrder: 4 },
  { route: '/hr/positions',          module: 'people', label: 'Vị trí biên chế',           icon: 'ApartmentOutlined',    permCode: 'employees:read',             sortOrder: 5 },
  { route: '/hr/decisions',          module: 'people', label: 'Quyết định nhân sự',        icon: 'FileProtectOutlined',  permCode: 'hr_decisions:read',          sortOrder: 6 },
  { route: '/hr/offboarding',        module: 'people', label: 'Offboarding',               icon: 'LogoutOutlined',       permCode: 'employees:manage',           sortOrder: 7 },
  { route: '/hr/training',           module: 'people', label: 'Đào tạo',                   icon: 'ReadOutlined',         permCode: 'training:read',              sortOrder: 8 },
  { route: '/hr/performance',        module: 'people', label: 'Đánh giá năng lực',         icon: 'TrophyOutlined',       permCode: 'performance:read',           sortOrder: 9 },
  { route: '/hr/skill-matrix',       module: 'people', label: 'Ma trận kỹ năng',           icon: 'ApartmentOutlined',    permCode: 'skills:read',                sortOrder: 10 },
  { route: '/hr/okr',                module: 'people', label: 'OKR & KPI',                 icon: 'AimOutlined',          permCode: 'okr:read',                   sortOrder: 11 },
  { route: '/hr/analytics',          module: 'people', label: 'HR Analytics',              icon: 'BarChartOutlined',     permCode: 'employees:read',             sortOrder: 12 },
  { route: '/hr/performance/bonus-config',  module: 'people', label: 'Cấu hình Bonus Hiệu suất', icon: 'TrophyOutlined', permCode: 'performance:read',          sortOrder: 13 },
  { route: '/hr/performance/salary-review', module: 'people', label: 'Xem xét Lương',      icon: 'DollarOutlined',       permCode: 'employees:manage',           sortOrder: 14 },

  // ─── Attendance — Chấm công & Lương ───────────────────────────────────────
  { route: '/timesheet/manager',            module: 'attendance', label: 'Bảng điểm danh',          icon: 'LineChartOutlined',   permCode: 'timesheet_manager:read',   sortOrder: 1 },
  { route: '/hr/attendance',                module: 'attendance', label: 'Bảng công',                icon: 'ScheduleOutlined',    permCode: 'attendance:read',          sortOrder: 2 },
  { route: '/hr/timekeeping',               module: 'attendance', label: 'Quản lý giờ quẹt thẻ',     icon: 'ClockCircleOutlined', permCode: 'attendance:read',          sortOrder: 2.5 },
  { route: '/hr/attendance/explanations',   module: 'attendance', label: 'Giải trình Chấm công',    icon: 'FormOutlined',        permCode: 'attendance:read',          sortOrder: 3 },
  { route: '/hr/leaves',                    module: 'attendance', label: 'Quản lý đơn nghỉ phép',   icon: 'CalendarOutlined',    permCode: 'leaves:approve',           sortOrder: 4 },
  { route: '/hr/leave-summary',             module: 'attendance', label: 'Quản lý phép năm',         icon: 'ScheduleOutlined',    permCode: 'leaves:approve',           sortOrder: 5 },
  { route: '/hr/overtime',                  module: 'attendance', label: 'Quản lý OT',               icon: 'FieldTimeOutlined',   permCode: 'employees:read',           sortOrder: 6 },
  { route: '/hr/shifts',                    module: 'attendance', label: 'Ca làm việc',              icon: 'ClockCircleOutlined', permCode: 'work_shifts:read',         sortOrder: 7 },
  { route: '/hr/holidays',                  module: 'attendance', label: 'Ngày lễ',                  icon: 'StarOutlined',        permCode: 'holidays:read',            sortOrder: 8 },
  { route: '/hr/leave-policies',            module: 'attendance', label: 'Chính sách phép',          icon: 'FileTextOutlined',    permCode: 'leave_policy:read',        sortOrder: 9 },
  { route: '/payroll',                      module: 'attendance', label: 'Bảng lương',               icon: 'CreditCardOutlined',  permCode: 'payroll:read',             sortOrder: 10 },
  { route: '/payroll/settings',             module: 'attendance', label: 'Cài đặt lương',            icon: 'SettingOutlined',     permCode: 'payroll_settings:manage',  sortOrder: 11 },
  { route: '/hr/insurance',                 module: 'attendance', label: 'Bảo hiểm xã hội',          icon: 'SafetyOutlined',      permCode: 'insurance:read',           sortOrder: 12 },
  { route: '/hr/salary-bands',              module: 'attendance', label: 'Band lương & Đề xuất',     icon: 'DollarOutlined',      permCode: 'employees:manage',         sortOrder: 13 },
  { route: '/payroll/analytics',            module: 'attendance', label: 'Payroll Analytics',         icon: 'CreditCardOutlined',  permCode: 'payroll:read',             sortOrder: 14 },

  // ─── Recruit — Tuyển dụng ─────────────────────────────────────────────────
  { route: '/recruit/onboarding', module: 'recruit', label: 'Onboarding',        icon: 'RocketOutlined',       permCode: 'recruit_candidates:read', sortOrder: 0 },
  { route: '/recruit/pipeline',   module: 'recruit', label: 'Phễu tuyển dụng',  icon: 'AppstoreAddOutlined',  permCode: 'recruit_pipeline:read',   sortOrder: 1 },
  { route: '/recruit/candidates', module: 'recruit', label: 'Ứng viên',         icon: 'UsergroupAddOutlined', permCode: 'recruit_candidates:read', sortOrder: 2 },
  { route: '/recruit/interviews', module: 'recruit', label: 'Lịch phỏng vấn',  icon: 'ScheduleFilled',       permCode: 'recruit_interviews:read', sortOrder: 3 },
  { route: '/recruit/jobs',       module: 'recruit', label: 'Vị trí tuyển dụng',icon: 'SolutionOutlined',     permCode: 'recruit_jobs:read',       sortOrder: 4 },

  // ─── Finance — Tài chính ───────────────────────────────────────────────────
  { route: '/cost',                          module: 'finance', label: 'Chi phí dự án',        icon: 'DollarOutlined',    permCode: 'project_cost:read',       sortOrder: 1 },
  { route: '/budget',                        module: 'finance', label: 'Ngân sách dự án',      icon: 'PieChartOutlined',  permCode: 'budget:read',             sortOrder: 2 },
  { route: '/finance/budget',                module: 'finance', label: 'Kế hoạch ngân sách',   icon: 'DotChartOutlined',  permCode: 'budget:read',             sortOrder: 3 },
  { route: '/expenses',                      module: 'finance', label: 'Đề nghị thanh toán',   icon: 'WalletOutlined',    permCode: 'expenses:read',           sortOrder: 4 },
  { route: '/invoices',                      module: 'finance', label: 'Hoá đơn',               icon: 'FileTextOutlined',  permCode: 'invoices:read',           sortOrder: 5 },
  { route: '/accounting/accounts',           module: 'finance', label: 'Hệ thống tài khoản',   icon: 'BankOutlined',      permCode: 'accounts:read',           sortOrder: 6 },
  { route: '/accounting/journal',            module: 'finance', label: 'Nhật ký kế toán',       icon: 'BookOutlined',      permCode: 'journal:read',            sortOrder: 7 },
  { route: '/accounting/financial-reports',  module: 'finance', label: 'Báo cáo tài chính',    icon: 'FundOutlined',      permCode: 'financial_reports:read',  sortOrder: 8 },
  { route: '/finance/analytics',             module: 'finance', label: 'Finance Analytics',     icon: 'BarChartOutlined',  permCode: 'financial_reports:read',  sortOrder: 9 },

  // ─── CRM ───────────────────────────────────────────────────────────────────
  { route: '/crm/leads',            module: 'crm', label: 'Khách hàng tiềm năng', icon: 'FunnelPlotOutlined', permCode: 'crm_leads:read',     sortOrder: 1 },
  { route: '/crm/deals',            module: 'crm', label: 'Cơ hội bán hàng',      icon: 'TrophyOutlined',     permCode: 'crm_deals:read',     sortOrder: 2 },
  { route: '/crm/contacts',         module: 'crm', label: 'Danh bạ liên hệ',       icon: 'ContactsOutlined',   permCode: 'crm_contacts:read',  sortOrder: 3 },
  { route: '/crm/customers',        module: 'crm', label: 'Tất cả khách hàng',     icon: 'ShopOutlined',       permCode: 'crm_customers:read', sortOrder: 4 },
  { route: '/crm/client-contracts', module: 'crm', label: 'Hợp đồng khách hàng',   icon: 'AuditOutlined',      permCode: 'crm_contracts:read', sortOrder: 5 },
  { route: '/crm/activities',       module: 'crm', label: 'Nhật ký hoạt động',     icon: 'PhoneOutlined',      permCode: 'crm_activities:read',sortOrder: 6 },
  { route: '/crm/forecast',         module: 'crm', label: 'Dự báo doanh số',       icon: 'RiseOutlined',       permCode: 'crm_forecast:read',  sortOrder: 7 },
  { route: '/crm/portal',           module: 'crm', label: 'Cổng khách hàng',       icon: 'GlobalOutlined',     permCode: 'crm_portal:read',    sortOrder: 8 },
  { route: '/crm/analytics',        module: 'crm', label: 'CRM Analytics',          icon: 'BarChartOutlined',   permCode: 'crm_deals:read',     sortOrder: 9 },

  // ─── Asset — Tài sản (module riêng) ─────────────────────────────────────
  { route: '/assets',                    module: 'asset', label: 'Tất cả tài sản',    icon: 'LaptopOutlined',   permCode: 'asset:read',             sortOrder: 1 },
  { route: '/assets/assignments',        module: 'asset', label: 'Cấp phát tài sản',  icon: 'SwapOutlined',     permCode: 'asset_assignments:read', sortOrder: 2 },
  { route: '/assets/maintenance',        module: 'asset', label: 'Bảo trì tài sản',   icon: 'ToolOutlined',     permCode: 'asset_maintenance:read', sortOrder: 3 },
  { route: '/assets/depreciation',       module: 'asset', label: 'Khấu hao tài sản',  icon: 'FallOutlined',     permCode: 'asset:read',             sortOrder: 7 },
  { route: '/assets/rooms',              module: 'asset', label: 'Quản lý phòng họp', icon: 'HomeOutlined',     permCode: 'asset:read',             sortOrder: 4 },
  { route: '/assets/vehicles/approvals', module: 'asset', label: 'Duyệt yêu cầu xe',  icon: 'CarOutlined',      permCode: 'vehicles:approve',       sortOrder: 5 },
  { route: '/assets/vehicles/manage',    module: 'asset', label: 'Quản lý đội xe',     icon: 'CarOutlined',      permCode: 'vehicles:manage',        sortOrder: 6 },
  { route: '/procurement/vendors',       module: 'asset', label: 'Nhà cung cấp',       icon: 'ShopOutlined',     permCode: 'vendors:read',           sortOrder: 7 },
  { route: '/procurement/orders',        module: 'asset', label: 'Đơn mua hàng',       icon: 'FileTextOutlined', permCode: 'purchase_orders:read',   sortOrder: 8 },

  // ─── Admin — Quản trị ──────────────────────────────────────────────────────
  { route: '/users',               module: 'admin', label: 'Người dùng',        icon: 'UserOutlined',              permCode: 'admin:users',            sortOrder: 1 },
  { route: '/permissions',         module: 'admin', label: 'Phân quyền',         icon: 'SafetyCertificateOutlined', permCode: 'admin:permissions',      sortOrder: 2 },
  { route: '/admin/categories',    module: 'admin', label: 'Quản lý danh mục',   icon: 'AppstoreOutlined',          permCode: 'admin:org',              sortOrder: 3 },
  { route: '/alerts',              module: 'admin', label: 'Cảnh báo hệ thống',  icon: 'BellOutlined',              permCode: 'alerts:read',            sortOrder: 3 },
  { route: '/settings',            module: 'admin', label: 'Cấu hình menu',      icon: 'SettingOutlined',           permCode: 'menu_config:manage',     sortOrder: 4 },
  { route: '/integrations',        module: 'admin', label: 'Tích hợp',           icon: 'ApiOutlined',               permCode: 'integrations:read',      sortOrder: 5 },
  { route: '/admin/tenants',       module: 'admin', label: 'Quản lý Tenant',     icon: 'GlobalOutlined',            permCode: 'admin:users',            sortOrder: 6 },
  { route: '/import',              module: 'admin', label: 'Nhập dữ liệu',       icon: 'UploadOutlined',            permCode: 'data_import:manage',     sortOrder: 11 },
  { route: '/audit-log',           module: 'admin', label: 'Nhật ký hệ thống',   icon: 'AuditOutlined',             permCode: 'audit_log:read',         sortOrder: 12 },
  { route: '/automation',          module: 'admin', label: 'Tự động hóa',        icon: 'ThunderboltOutlined',       permCode: 'automation:read',        sortOrder: 13 },
  { route: '/scheduled-reports',   module: 'admin', label: 'Báo cáo định kỳ',    icon: 'MailOutlined',              permCode: 'scheduled_reports:read', sortOrder: 14 },
  { route: '/module-config',       module: 'admin', label: 'Cấu hình phân hệ',   icon: 'AppstoreOutlined',          permCode: 'module_config:manage',   sortOrder: 15 },
  { route: '/admin/health',        module: 'admin', label: 'Giám sát hệ thống',  icon: 'MonitorOutlined',           permCode: 'system_health:read',     sortOrder: 16 },
  { route: '/admin/demo',          module: 'admin', label: 'Chế độ trình diễn',  icon: 'ExperimentOutlined',        permCode: 'demo_mode:manage',       sortOrder: 17 },
  { route: '/onboarding',          module: 'admin', label: 'Hướng dẫn khởi động',icon: 'RocketOutlined',            permCode: 'onboarding:manage',      sortOrder: 18 },
  { route: '/settings/tenant',        module: 'admin', label: 'Cài đặt Công ty',      icon: 'BuildOutlined',             permCode: 'admin:users',            sortOrder: 19 },
  { route: '/settings/delegation',    module: 'admin', label: 'Ủy quyền duyệt',       icon: 'UsergroupAddOutlined',      permCode: 'admin:manage',           sortOrder: 20 },
  // E26: Platform Utilities
  { route: '/admin/announcements',    module: 'admin', label: 'System Announcements',  icon: 'BellOutlined',              permCode: 'admin:read',             sortOrder: 21 },
  { route: '/admin/permission-audit', module: 'admin', label: 'Báo cáo Phân quyền',   icon: 'SafetyCertificateOutlined', permCode: 'admin:permissions',      sortOrder: 22 },
  { route: '/admin/email-logs',       module: 'admin', label: 'Email Delivery Log',    icon: 'MailOutlined',              permCode: 'admin:read',             sortOrder: 23 },
  { route: '/admin/queues',           module: 'admin', label: 'Queue Browser',          icon: 'ThunderboltOutlined',       permCode: 'system_health:read',     sortOrder: 24 },

  // ─── Analytics — Trung tâm Phân tích (Executive) ──────────────────────────
  { route: '/analytics/overview', module: 'analytics', label: 'Tổng quan Lãnh đạo',  icon: 'BarChartOutlined',   permCode: 'analytics:read',   sortOrder: 1 },
  { route: '/analytics/reports',  module: 'analytics', label: 'Thư viện Báo cáo',    icon: 'FileTextOutlined',   permCode: 'analytics:read',   sortOrder: 2 },
  { route: '/analytics/builder',  module: 'analytics', label: 'Tạo báo cáo',         icon: 'BuildOutlined',      permCode: 'analytics:build',  sortOrder: 3 },
  { route: '/analytics/saved',    module: 'analytics', label: 'Báo cáo đã lưu',      icon: 'SaveOutlined',       permCode: 'analytics:read',   sortOrder: 4 },
];

/**
 * ROUTE_PERMISSION_MAP — derive từ registry, không hardcode thêm ở đây.
 */
export const ROUTE_PERMISSION_MAP: Record<string, string | undefined> =
  Object.fromEntries(
    SCREEN_REGISTRY.map(s => [s.route, s.permCode ?? undefined]),
  );

/**
 * route → module NGHIỆP VỤ quyết định ẩn/hiện khi module bị tắt.
 * Self-service trong Workspace gate theo featureOf (vd /leaves → attendance),
 * còn lại gate theo chính module của màn hình.
 */
export const ROUTE_GATE_MODULE: Record<string, string> =
  Object.fromEntries(
    SCREEN_REGISTRY.map(s => [s.route, s.featureOf ?? s.module]),
  );

/**
 * Nhãn tiếng Việt cho từng module v3.0.
 */
export const MODULE_LABELS: Record<string, string> = {
  workspace:  'Workspace',
  projects:   'Dự án',
  people:     'Nhân sự',
  attendance: 'Chấm công & Lương',
  recruit:    'Tuyển dụng',
  finance:    'Tài chính',
  crm:        'CRM',
  asset:      'Tài sản',
  admin:      'Quản trị',
  analytics:  'Phân tích',
  // legacy aliases
  work:       'Workspace',
  ops:        'Quản trị',
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
  // Work
  dashboard:           '#64748B',
  kanban:              '#0891B2',
  tasks:               '#0891B2',
  timeline:            '#2563EB',
  my_bugs:             '#DC2626',
  bugs:                '#DC2626',
  bugs_stats:          '#DC2626',
  projects:            '#2563EB',
  knowledge_base:      '#7C3AED',
  timesheets:          '#D97706',
  timesheet_project:   '#D97706',
  bpm_inbox:           '#7C3AED',
  feed:                '#64748B',
  work_calendar:       '#64748B',
  reports:             '#0891B2',
  self_service:        '#10B981',
  my_payslips:         '#10B981',
  issues:              '#EA580C',
  timelogs:            '#F59E0B',
  // Ops
  bpm_processes:       '#7C3AED',
  bpm_instances:       '#7C3AED',
  // People
  employees:           '#059669',
  org_chart:           '#059669',
  contracts:           '#0D9488',
  leaves:              '#65A30D',
  leaves_approve:      '#10B981',
  payroll:             '#0D9488',
  payroll_settings:    '#0D9488',
  training:            '#0891B2',
  performance:         '#F59E0B',
  skills:              '#059669',
  okr:                 '#8B5CF6',
  recruit_pipeline:    '#0EA5E9',
  recruit_candidates:  '#0EA5E9',
  recruit_interviews:  '#0EA5E9',
  recruit_jobs:        '#0EA5E9',
  timesheet_manager:   '#D97706',
  work_shifts:         '#F59E0B',
  attendance:          '#D97706',
  leave_policy:        '#65A30D',
  holidays:            '#65A30D',
  insurance:           '#0D9488',
  hr_decisions:        '#059669',
  // Finance
  project_cost:        '#0D9488',
  budget:              '#0D9488',
  expenses:            '#0D9488',
  invoices:            '#0D9488',
  accounts:            '#0D9488',
  journal:             '#0D9488',
  financial_reports:   '#0D9488',
  // CRM
  crm_leads:           '#DC2626',
  crm_deals:           '#DC2626',
  crm_contacts:        '#EA580C',
  crm_customers:       '#EA580C',
  crm_contracts:       '#0D9488',
  crm_activities:      '#EA580C',
  crm_forecast:        '#DC2626',
  crm_portal:          '#EA580C',
  // Asset
  asset:               '#B45309',
  asset_assignments:   '#B45309',
  asset_maintenance:   '#B45309',
  room_booking:        '#3B82F6',
  vehicles:            '#B45309',
  vehicles_approve:    '#F59E0B',
  vehicles_manage:     '#B45309',
  vendors:             '#F97316',
  purchase_orders:     '#F97316',
  // Admin
  admin:               '#475569',
  alerts:              '#DB2777',
  menu_config:         '#475569',
  integrations:        '#475569',
  data_import:         '#475569',
  audit_log:           '#475569',
  automation:          '#475569',
  scheduled_reports:   '#475569',
  module_config:       '#475569',
  system_health:       '#475569',
  demo_mode:           '#475569',
  onboarding:          '#475569',
  analytics:           '#6366F1',
  analytics_build:     '#8B5CF6',
};

/**
 * Tên tiếng Việt cho từng permission domain.
 */
export const PERM_DOMAIN_LABEL: Record<string, string> = {
  // Work
  dashboard:           'Tổng quan',
  kanban:              'Bảng Kanban',
  tasks:               'Công việc',
  timeline:            'Lịch trình',
  my_bugs:             'Lỗi của tôi',
  bugs:                'Quản lý lỗi',
  bugs_stats:          'Thống kê lỗi',
  projects:            'Dự án',
  knowledge_base:      'Cơ sở tri thức',
  timesheets:          'Chấm công',
  timesheet_project:   'Nhật ký dự án',
  bpm_inbox:           'Hộp thư BPM',
  feed:                'Bảng tin công ty',
  work_calendar:       'Lịch công ty',
  reports:             'Báo cáo',
  self_service:        'Thông tin cá nhân',
  my_payslips:         'Phiếu lương',
  issues:              'Vấn đề',
  timelogs:            'Ghi giờ',
  // Ops
  bpm_processes:       'Định nghĩa quy trình',
  bpm_instances:       'Giám sát quy trình',
  // People
  employees:           'Nhân viên',
  org_chart:           'Sơ đồ tổ chức',
  contracts:           'Hợp đồng lao động',
  leaves:              'Nghỉ phép',
  leaves_approve:      'Duyệt nghỉ phép',
  payroll:             'Bảng lương',
  payroll_settings:    'Cài đặt lương',
  training:            'Đào tạo',
  performance:         'Đánh giá năng lực',
  skills:              'Kỹ năng',
  okr:                 'OKR & KPI',
  recruit_pipeline:    'Pipeline tuyển dụng',
  recruit_candidates:  'Ứng viên',
  recruit_interviews:  'Lịch phỏng vấn',
  recruit_jobs:        'Vị trí tuyển dụng',
  timesheet_manager:   'Bảng điểm danh',
  work_shifts:         'Ca làm việc',
  attendance:          'Chấm công',
  leave_policy:        'Chính sách phép',
  holidays:            'Ngày lễ',
  insurance:           'Bảo hiểm xã hội',
  hr_decisions:        'Quyết định nhân sự',
  // Finance
  project_cost:        'Chi phí dự án',
  budget:              'Ngân sách',
  expenses:            'Đề nghị thanh toán',
  invoices:            'Hoá đơn',
  accounts:            'Hệ thống tài khoản',
  journal:             'Nhật ký kế toán',
  financial_reports:   'Báo cáo tài chính',
  // CRM
  crm_leads:           'KH tiềm năng',
  crm_deals:           'Cơ hội bán hàng',
  crm_contacts:        'Danh bạ liên hệ',
  crm_customers:       'Khách hàng',
  crm_contracts:       'Hợp đồng KH',
  crm_activities:      'Nhật ký hoạt động',
  crm_forecast:        'Dự báo doanh số',
  crm_portal:          'Cổng khách hàng',
  // Asset
  asset:               'Tài sản',
  asset_assignments:   'Cấp phát tài sản',
  asset_maintenance:   'Bảo trì tài sản',
  room_booking:        'Đặt phòng họp',
  vehicles:            'Xe công ty',
  vehicles_approve:    'Duyệt yêu cầu xe',
  vehicles_manage:     'Quản lý đội xe',
  vendors:             'Nhà cung cấp',
  purchase_orders:     'Đơn mua hàng',
  // Admin
  admin:               'Quản trị',
  alerts:              'Cảnh báo hệ thống',
  menu_config:         'Cấu hình menu',
  integrations:        'Tích hợp',
  data_import:         'Nhập dữ liệu',
  audit_log:           'Nhật ký hệ thống',
  automation:          'Tự động hóa',
  scheduled_reports:   'Báo cáo định kỳ',
  module_config:       'Cấu hình phân hệ',
  system_health:       'Giám sát hệ thống',
  demo_mode:           'Chế độ trình diễn',
  onboarding:          'Hướng dẫn khởi động',
  analytics:           'Phân tích (Lãnh đạo)',
  analytics_build:     'Tạo báo cáo tùy chỉnh',
};

/**
 * Module chứa từng permission domain — v3.0 mapping.
 */
export const PERM_DOMAIN_MODULE: Record<string, string> = {
  // Workspace
  dashboard:           'workspace',
  feed:                'workspace',
  kanban:              'workspace',
  my_bugs:             'workspace',
  timesheets:          'workspace',
  bpm_inbox:           'workspace',
  work_calendar:       'workspace',
  self_service:        'workspace',
  my_payslips:         'workspace',
  room_booking:        'workspace',
  vehicles:            'workspace',
  leaves:              'workspace',
  process_tasks:       'workspace',
  // Projects
  tasks:               'projects',
  timeline:            'projects',
  bugs:                'projects',
  bugs_stats:          'projects',
  projects:            'projects',
  knowledge_base:      'projects',
  timesheet_project:   'projects',
  reports:             'projects',
  issues:              'projects',
  timelogs:            'projects',
  // Admin (ex-Ops + ex-Asset)
  bpm_processes:       'admin',
  bpm_instances:       'admin',
  // People — hồ sơ + phát triển
  employees:           'people',
  org_chart:           'people',
  contracts:           'people',
  hr_decisions:        'people',
  training:            'people',
  performance:         'people',
  skills:              'people',
  okr:                 'people',
  // Attendance — chấm công + lương
  leaves_approve:      'attendance',
  attendance:          'attendance',
  timesheet_manager:   'attendance',
  work_shifts:         'attendance',
  leave_policy:        'attendance',
  holidays:            'attendance',
  payroll:             'attendance',
  payroll_settings:    'attendance',
  insurance:           'attendance',
  // Recruit — tuyển dụng
  recruit_pipeline:    'recruit',
  recruit_candidates:  'recruit',
  recruit_interviews:  'recruit',
  recruit_jobs:        'recruit',
  // Finance
  project_cost:        'finance',
  budget:              'finance',
  expenses:            'finance',
  invoices:            'finance',
  accounts:            'finance',
  journal:             'finance',
  financial_reports:   'finance',
  // CRM
  crm_leads:           'crm',
  crm_deals:           'crm',
  crm_contacts:        'crm',
  crm_customers:       'crm',
  crm_contracts:       'crm',
  crm_activities:      'crm',
  crm_forecast:        'crm',
  crm_portal:          'crm',
  // Asset
  asset:               'asset',
  asset_assignments:   'asset',
  asset_maintenance:   'asset',
  vehicles_approve:    'asset',
  vehicles_manage:     'asset',
  vendors:             'asset',
  purchase_orders:     'asset',
  // Admin
  admin:               'admin',
  alerts:              'admin',
  menu_config:         'admin',
  integrations:        'admin',
  data_import:         'admin',
  audit_log:           'admin',
  automation:          'admin',
  scheduled_reports:   'admin',
  module_config:       'admin',
  system_health:       'admin',
  demo_mode:           'admin',
  onboarding:          'admin',
  analytics:           'analytics',
  analytics_build:     'analytics',
};
