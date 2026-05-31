import {
  ProjectOutlined,
  ApartmentOutlined,
  BugOutlined,
  SettingOutlined,
  DashboardOutlined,
  AppstoreOutlined,
  CheckSquareOutlined,
  ScheduleOutlined,
  TeamOutlined,
  DollarOutlined,
  BarChartOutlined,
  LineChartOutlined,
  InboxOutlined,
  UnorderedListOutlined,
  RiseOutlined,
  BugFilled,
  BellOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  IdcardOutlined,
  ClockCircleOutlined,
  AuditOutlined,
  FundOutlined,
  CalendarOutlined,
  WalletOutlined,
  PieChartOutlined,
  CreditCardOutlined,
  BankOutlined,
  ApiOutlined,
  ShopOutlined,
  ContactsOutlined,
  FunnelPlotOutlined,
  TrophyOutlined,
  FileTextOutlined,
  SolutionOutlined,
  UsergroupAddOutlined,
  ScheduleFilled,
  AppstoreAddOutlined,
  LaptopOutlined,
  HomeOutlined,
  ToolOutlined,
  SwapOutlined,
  BookOutlined,
  ReadOutlined,
  PhoneOutlined,
  AimOutlined,
  GlobalOutlined,
  UploadOutlined,
  ThunderboltOutlined,
  MailOutlined,
  MessageOutlined,
  MonitorOutlined,
  ExperimentOutlined,
  AppstoreAddOutlined as ModuleConfigIcon,
  RocketOutlined,
  CalendarOutlined as RoomCalendarIcon,
  CarOutlined,
  BuildOutlined,
  FieldTimeOutlined,
  DotChartOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { MenuTopItemCfg, MenuGroupCfg } from '../store/menu.store';
import { ROUTE_PERMISSION_MAP as REGISTRY_MAP, SCREEN_REGISTRY } from './screens.registry';

export interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
  color: string;
  /** Permission bắt buộc để truy cập module này. Admin luôn bypass.
   *  Truyền array để check any-of (user có BẤT KỲ 1 trong các perms là được vào).
   *  Được derive tự động từ SCREEN_REGISTRY qua moduleGate(). */
  gatePermission?: string | string[];
  topItems: MenuTopItemCfg[];
  groups: MenuGroupCfg[];
}

/** Tự động tập hợp tất cả permCode của các màn hình trong module.
 *  Module hiển thị trong switcher khi user có ÍT NHẤT 1 trong các codes này. */
function moduleGate(moduleId: string): string[] {
  return [
    ...new Set(
      SCREEN_REGISTRY
        .filter(s => s.module === moduleId && s.permCode)
        .map(s => s.permCode!),
    ),
  ];
}

export const MODULES: ModuleDefinition[] = [
  // ─── Work ────────────────────────────────────────────────────────────────
  {
    id: 'work',
    label: 'Công việc',
    description: 'Dự án, công việc, lỗi & vấn đề hàng ngày',
    icon: <CheckSquareOutlined />,
    color: '#2563EB',
    gatePermission: moduleGate('work'),
    topItems: [
      { key: '/feed', label: 'Bảng tin', visible: true },
    ],
    groups: [
      {
        key: 'g-work-me', label: 'Của tôi', visible: true,
        items: [
          { key: '/my-tasks',          label: 'Việc của tôi',         visible: true },
          { key: '/my-bugs',           label: 'Lỗi của tôi',          visible: true },
          { key: '/processes/inbox',   label: 'Việc quy trình',        visible: true },
          { key: '/approvals/inbox',   label: 'Hộp thư duyệt',        visible: true },
          { key: '/timesheet',         label: 'Chấm công của tôi',    visible: true },
          { key: '/timesheet/project', label: 'Nhật ký dự án',        visible: true },
        ],
      },
      {
        key: 'g-work-team', label: 'Nhóm & Dự án', visible: true,
        items: [
          { key: '/tasks',                label: 'Việc dự án',     visible: true },
          { key: '/timeline',             label: 'Lịch trình',     visible: true },
          { key: '/timesheet/manager',    label: 'Bảng điểm danh', visible: true },
          { key: '/bugs',                 label: 'Quản lý lỗi',   visible: true },
          { key: '/bugs/dashboard',       label: 'Thống kê lỗi',  visible: true },
        ],
      },
      {
        key: 'g-work-collab', label: 'Cộng tác', visible: true,
        items: [
          { key: '/knowledge-base', label: 'Cơ sở tri thức', visible: true },
          { key: '/calendar',       label: 'Lịch công ty',    visible: true },
        ],
      },
      {
        key: 'g-work-tools', label: 'Tiện ích', visible: true,
        items: [
          { key: '/assets/room-booking', label: 'Đặt phòng họp',   visible: true },
          { key: '/assets/vehicles',     label: 'Đặt xe công ty',   visible: true },
        ],
      },
      {
        key: 'g-work-reports', label: 'Báo cáo', visible: true,
        items: [
          { key: '/reports',             label: 'Báo cáo tổng hợp', visible: true },
          { key: '/reports/utilization', label: 'Utilization Rate',  visible: true },
        ],
      },
      {
        key: 'g-work-personal', label: 'Cá nhân', visible: true,
        items: [
          { key: '/self-service',        label: 'Thông tin của tôi',     visible: true },
          { key: '/leaves',              label: 'Đơn nghỉ phép',         visible: true },
          { key: '/my-overtime',         label: 'Đăng ký làm thêm giờ',  visible: true },
          { key: '/payroll/my-payslips', label: 'Phiếu lương',           visible: true },
        ],
      },
    ],
  },

  // ─── People (HR) ──────────────────────────────────────────────────────────
  {
    id: 'people',
    label: 'Nhân sự',
    description: 'Nhân viên, đào tạo, tuyển dụng và chấm công',
    icon: <IdcardOutlined />,
    color: '#059669',
    gatePermission: moduleGate('people'),
    topItems: [
      { key: '/personnel', label: 'Danh sách nhân viên', visible: true },
    ],
    groups: [
      {
        key: 'g-people-profile', label: 'Hồ sơ & Tổ chức', visible: true,
        items: [
          { key: '/personnel',       label: 'Danh sách nhân viên', visible: true },
          { key: '/org-chart',       label: 'Sơ đồ tổ chức',      visible: true },
          { key: '/contracts',       label: 'Hợp đồng lao động',  visible: true },
          { key: '/hr/job-titles',   label: 'Chức danh',          visible: true },
          { key: '/hr/positions',    label: 'Vị trí biên chế',    visible: true },
          { key: '/hr/decisions',    label: 'Quyết định nhân sự', visible: true },
        ],
      },
      {
        key: 'g-people-attendance', label: 'Chấm công & Đơn từ', visible: true,
        items: [
          { key: '/timesheet/manager',   label: 'Bảng điểm danh',        visible: true },
          { key: '/leaves',              label: 'Quản lý đơn nghỉ phép', visible: true },
          { key: '/hr/overtime',         label: 'Quản lý OT',             visible: true },
        ],
      },
      {
        key: 'g-people-admin', label: 'Lịch & Hành chính', visible: true,
        items: [
          { key: '/hr/attendance', label: 'Bảng công',   visible: true },
          { key: '/hr/holidays',   label: 'Ngày lễ',     visible: true },
          { key: '/hr/shifts',     label: 'Ca làm việc', visible: true },
        ],
      },
      {
        key: 'g-people-payroll', label: 'Lương & Phúc lợi', visible: true,
        items: [
          { key: '/payroll',           label: 'Bảng lương',      visible: true },
          { key: '/payroll/settings',  label: 'Cài đặt lương',   visible: true },
          { key: '/hr/insurance',      label: 'Bảo hiểm xã hội', visible: true },
          { key: '/hr/leave-policies', label: 'Chính sách phép', visible: true },
        ],
      },
      {
        key: 'g-people-dev', label: 'Phát triển nhân lực', visible: true,
        items: [
          { key: '/hr/training',     label: 'Đào tạo',           visible: true },
          { key: '/hr/performance',  label: 'Đánh giá năng lực', visible: true },
          { key: '/hr/skill-matrix', label: 'Ma trận kỹ năng',   visible: true },
          { key: '/hr/okr',          label: 'OKR & KPI',         visible: true },
          { key: '/hr/analytics',    label: 'HR Analytics',      visible: true },
          { key: '/hr/performance/bonus-config',  label: 'Cấu hình Bonus',    visible: true },
          { key: '/hr/performance/salary-review', label: 'Xem xét Lương',     visible: true },
        ],
      },
      {
        key: 'g-people-offboard', label: 'Offboarding', visible: true,
        items: [
          { key: '/hr/offboarding', label: 'Danh sách Offboarding', visible: true },
        ],
      },
      {
        key: 'g-people-recruit', label: 'Tuyển dụng', visible: true,
        items: [
          { key: '/recruit/pipeline',   label: 'Phễu tuyển dụng', visible: true },
          { key: '/recruit/candidates', label: 'Ứng viên',        visible: true },
          { key: '/recruit/interviews', label: 'Lịch phỏng vấn',  visible: true },
          { key: '/recruit/jobs',       label: 'Tin tuyển dụng',  visible: true },
        ],
      },
    ],
  },

  // ─── Finance ──────────────────────────────────────────────────────────────
  {
    id: 'finance',
    label: 'Tài chính',
    description: 'Chi phí, ngân sách, hóa đơn và kế toán',
    icon: <BankOutlined />,
    color: '#0D9488',
    gatePermission: moduleGate('finance'),
    topItems: [
      { key: '/dashboard/finance', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-finance-projects', label: 'Dự án', visible: true,
        items: [
          { key: '/projects', label: 'Tất cả dự án', visible: true },
        ],
      },
      {
        key: 'g-finance-ops', label: 'Tài chính vận hành', visible: true,
        items: [
          { key: '/cost',           label: 'Chi phí dự án',      visible: true },
          { key: '/budget',         label: 'Ngân sách dự án',    visible: true },
          { key: '/finance/budget', label: 'Kế hoạch ngân sách', visible: true },
          { key: '/expenses',       label: 'Đề nghị thanh toán', visible: true },
          { key: '/invoices',       label: 'Hóa đơn',            visible: true },
        ],
      },
      {
        key: 'g-finance-accounting', label: 'Kế toán', visible: true,
        items: [
          { key: '/accounting/accounts',          label: 'Hệ thống tài khoản', visible: true },
          { key: '/accounting/journal',           label: 'Nhật ký kế toán',    visible: true },
          { key: '/accounting/financial-reports', label: 'Báo cáo tài chính',  visible: true },
        ],
      },
    ],
  },

  // ─── CRM ──────────────────────────────────────────────────────────────────
  {
    id: 'crm',
    label: 'CRM',
    description: 'Khách hàng, leads, deals và pipeline bán hàng',
    icon: <ShopOutlined />,
    color: '#DC2626',
    gatePermission: moduleGate('crm'),
    topItems: [
      { key: '/dashboard/crm', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-crm-pipeline', label: 'Kênh bán hàng', visible: true,
        items: [
          { key: '/crm/leads',    label: 'Khách hàng tiềm năng', visible: true },
          { key: '/crm/deals',    label: 'Cơ hội bán hàng',      visible: true },
          { key: '/crm/contacts', label: 'Liên hệ', visible: true },
        ],
      },
      {
        key: 'g-crm-activities', label: 'Hoạt động', visible: true,
        items: [
          { key: '/crm/activities', label: 'Nhật ký hoạt động', visible: true },
          { key: '/crm/forecast',   label: 'Dự báo doanh số',   visible: true },
          { key: '/crm/analytics',  label: 'CRM Analytics',      visible: true },
        ],
      },
      {
        key: 'g-crm-customers', label: 'Khách hàng', visible: true,
        items: [
          { key: '/crm/customers', label: 'Tất cả khách hàng', visible: true },
          { key: '/crm/portal',    label: 'Cổng khách hàng',   visible: true },
        ],
      },
      {
        key: 'g-crm-contracts', label: 'Hợp đồng', visible: true,
        items: [
          { key: '/crm/client-contracts', label: 'Hợp đồng khách hàng', visible: true },
        ],
      },
    ],
  },

  // ─── Asset ────────────────────────────────────────────────────────────────
  {
    id: 'asset',
    label: 'Tài sản',
    description: 'Quản lý tài sản, bảo trì và mua hàng',
    icon: <LaptopOutlined />,
    color: '#D97706',
    gatePermission: moduleGate('asset'),
    topItems: [
      { key: '/dashboard/asset', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-asset-main', label: 'Quản lý tài sản', visible: true,
        items: [
          { key: '/assets',             label: 'Tất cả tài sản',   visible: true },
          { key: '/assets/assignments', label: 'Cấp phát tài sản', visible: true },
          { key: '/assets/maintenance', label: 'Bảo trì',          visible: true },
          { key: '/assets/rooms',       label: 'Quản lý phòng họp', visible: true },
        ],
      },
      {
        key: 'g-asset-procurement', label: 'Mua hàng', visible: true,
        items: [
          { key: '/procurement/vendors', label: 'Nhà cung cấp', visible: true },
          { key: '/procurement/orders',  label: 'Đơn mua hàng', visible: true },
        ],
      },
    ],
  },

  // ─── Ops (BPM) ────────────────────────────────────────────────────────────
  {
    id: 'ops',
    label: 'Vận hành',
    description: 'Thiết kế và giám sát quy trình nghiệp vụ',
    icon: <BuildOutlined />,
    color: '#7C3AED',
    gatePermission: moduleGate('ops'),
    topItems: [
      { key: '/dashboard/ops', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-ops-bpm', label: 'Quy trình tự động', visible: true,
        items: [
          { key: '/processes',           label: 'Định nghĩa quy trình', visible: true },
          { key: '/processes/instances', label: 'Giám sát quy trình',   visible: true },
        ],
      },
    ],
  },

  // ─── Admin ────────────────────────────────────────────────────────────────
  {
    id: 'admin',
    label: 'Quản trị',
    description: 'Cài đặt hệ thống, người dùng và phân quyền',
    icon: <SettingOutlined />,
    color: '#475569',
    gatePermission: moduleGate('admin'),
    topItems: [
      { key: '/dashboard/admin', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-admin-system', label: 'Hệ thống', visible: true,
        items: [
          { key: '/users',          label: 'Người dùng',       visible: true },
          { key: '/permissions',    label: 'Phân quyền',       visible: true },
          { key: '/alerts',         label: 'Cảnh báo',         visible: true },
          { key: '/settings',       label: 'Cấu hình menu',    visible: true },
          { key: '/integrations',   label: 'Tích hợp',         visible: true },
          { key: '/admin/tenants',  label: 'Quản lý Tenant',   visible: true },
        ],
      },
      {
        key: 'g-admin-tools', label: 'Công cụ', visible: true,
        items: [
          { key: '/import',            label: 'Nhập dữ liệu',      visible: true },
          { key: '/audit-log',         label: 'Nhật ký hệ thống',  visible: true },
          { key: '/automation',        label: 'Tự động hóa',       visible: true },
          { key: '/scheduled-reports', label: 'Báo cáo định kỳ',   visible: true },
          { key: '/module-config',     label: 'Cấu hình phân hệ', visible: true },
        ],
      },
      {
        key: 'g-admin-ops', label: 'Vận hành', visible: true,
        items: [
          { key: '/admin/health',            label: 'Giám sát hệ thống',   visible: true },
          { key: '/admin/queues',            label: 'Queue Browser',        visible: true },
          { key: '/admin/email-logs',        label: 'Email Delivery Log',   visible: true },
          { key: '/admin/demo',              label: 'Chế độ trình diễn',   visible: true },
          { key: '/onboarding',              label: 'Hướng dẫn khởi động', visible: true },
        ],
      },
      {
        key: 'g-admin-platform', label: 'Platform Utilities', visible: true,
        items: [
          { key: '/admin/announcements',     label: 'System Announcements', visible: true },
          { key: '/admin/permission-audit',  label: 'Báo cáo Phân quyền',  visible: true },
        ],
      },
    ],
  },
];

export const MODULE_MAP = Object.fromEntries(MODULES.map(m => [m.id, m]));

export const DEFAULT_MODULE_ID = 'work';

// Route key → permission code (derived from screens.registry)
export const ROUTE_PERMISSION_MAP: Record<string, string | undefined> = {
  ...REGISTRY_MAP,
  // Overrides không cần — tất cả routes đã có trong SCREEN_REGISTRY
};

// Icon map shared across all sidebar items
export const ICON_MAP: Record<string, ReactNode> = {
  '/dashboard/work':    <DashboardOutlined />,
  '/dashboard/people':  <DashboardOutlined />,
  '/dashboard/finance': <DashboardOutlined />,
  '/dashboard/crm':     <DashboardOutlined />,
  '/dashboard/asset':   <DashboardOutlined />,
  '/dashboard/ops':     <DashboardOutlined />,
  '/dashboard/admin':   <DashboardOutlined />,
  '/my-tasks':              <AppstoreOutlined />,
  '/tasks':                 <CheckSquareOutlined />,
  '/timeline':              <ScheduleOutlined />,
  '/projects':              <ProjectOutlined />,
  '/personnel':             <TeamOutlined />,
  '/cost':                  <DollarOutlined />,
  '/timesheet/project':     <LineChartOutlined />,
  '/reports':               <BarChartOutlined />,
  '/timesheet/manager':     <LineChartOutlined />,
  '/processes/inbox':       <InboxOutlined />,
  '/processes':             <UnorderedListOutlined />,
  '/processes/instances':   <RiseOutlined />,
  '/my-bugs':               <BugOutlined />,
  '/bugs':                  <BugFilled />,
  '/bugs/dashboard':        <FundOutlined />,
  '/alerts':                <BellOutlined />,
  '/settings':              <SettingOutlined />,
  '/integrations':          <ApiOutlined />,
  '/permissions':           <SafetyCertificateOutlined />,
  '/users':                 <UserOutlined />,
  '/timesheet':             <ClockCircleOutlined />,
  '/leaves':                <CalendarOutlined />,
  '/expenses':              <WalletOutlined />,
  '/budget':                <PieChartOutlined />,
  '/finance/budget':        <DotChartOutlined />,
  '/org-chart':             <ApartmentOutlined />,
  '/contracts':             <AuditOutlined />,
  '/payroll':               <CreditCardOutlined />,
  '/payroll/settings':      <SettingOutlined />,
  '/payroll/my-payslips':   <FileTextOutlined />,
  '/self-service':          <UserOutlined />,
  '/invoices':              <FileTextOutlined />,
  '/crm/leads':             <FunnelPlotOutlined />,
  '/crm/deals':             <TrophyOutlined />,
  '/crm/contacts':          <ContactsOutlined />,
  '/crm/customers':         <ShopOutlined />,
  '/crm/client-contracts':  <AuditOutlined />,
  '/crm/activities':        <PhoneOutlined />,
  '/crm/forecast':          <RiseOutlined />,
  '/crm/analytics':         <BarChartOutlined />,
  '/crm/portal':            <GlobalOutlined />,
  '/approvals/inbox':       <InboxOutlined />,
  '/procurement/vendors':   <ShopOutlined />,
  '/procurement/orders':    <FileTextOutlined />,
  '/recruit/pipeline':      <AppstoreAddOutlined />,
  '/recruit/candidates':    <UsergroupAddOutlined />,
  '/recruit/interviews':    <ScheduleFilled />,
  '/recruit/jobs':          <SolutionOutlined />,
  '/assets':                <LaptopOutlined />,
  '/assets/assignments':    <SwapOutlined />,
  '/assets/maintenance':    <ToolOutlined />,
  '/accounting/accounts':   <BankOutlined />,
  '/accounting/journal':    <BookOutlined />,
  '/hr/training':           <ReadOutlined />,
  '/hr/performance':        <TrophyOutlined />,
  '/hr/skill-matrix':       <ApartmentOutlined />,
  '/hr/okr':                        <AimOutlined />,
  '/hr/analytics':                  <BarChartOutlined />,
  '/reports/utilization':           <TeamOutlined />,
  '/knowledge-base':                <BookOutlined />,
  '/accounting/financial-reports':  <FundOutlined />,
  '/import':                        <UploadOutlined />,
  '/audit-log':                     <AuditOutlined />,
  '/automation':                    <ThunderboltOutlined />,
  '/scheduled-reports':             <MailOutlined />,
  '/feed':                          <MessageOutlined />,
  '/admin/health':                  <MonitorOutlined />,
  '/admin/queues':                  <ThunderboltOutlined />,
  '/admin/email-logs':              <MailOutlined />,
  '/admin/demo':                    <ExperimentOutlined />,
  '/admin/tenants':                 <GlobalOutlined />,
  '/admin/announcements':           <BellOutlined />,
  '/admin/permission-audit':        <SafetyCertificateOutlined />,
  '/module-config':                 <ModuleConfigIcon />,
  '/onboarding':                    <RocketOutlined />,
  '/assets/room-booking':           <RoomCalendarIcon />,
  '/assets/rooms':                  <HomeOutlined />,
  '/assets/vehicles':               <CarOutlined />,
  '/calendar':                      <RoomCalendarIcon />,

  '/hr/overtime':                   <FieldTimeOutlined />,
  '/my-overtime':                   <FieldTimeOutlined />,
  '/hr/shifts':                     <ClockCircleOutlined />,
  '/hr/attendance':                 <AuditOutlined />,
  '/hr/holidays':                   <CalendarOutlined />,
  '/hr/leave-policies':             <FileTextOutlined />,
  '/hr/insurance':                  <SafetyCertificateOutlined />,
  // HR v5.1
  '/hr/offboarding':                <LogoutOutlined />,
  '/hr/performance/bonus-config':   <TrophyOutlined />,
  '/hr/performance/salary-review':  <DollarOutlined />,
};
