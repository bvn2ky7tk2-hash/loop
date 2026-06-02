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
  FallOutlined,
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
  FormOutlined,
  SaveOutlined,
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
  gatePermission?: string | string[];
  topItems: MenuTopItemCfg[];
  groups: MenuGroupCfg[];
}

/** Tập hợp permCode từ nhiều moduleId trong SCREEN_REGISTRY. */
function moduleGates(...moduleIds: string[]): string[] {
  return [
    ...new Set(
      SCREEN_REGISTRY
        .filter(s => moduleIds.includes(s.module) && s.permCode)
        .map(s => s.permCode!),
    ),
  ];
}

export const MODULES: ModuleDefinition[] = [

  // ─── 1. Không gian làm việc (Workspace cá nhân) ───────────────────────────
  {
    id: 'workspace',
    label: 'Workspace',
    description: 'Việc của tôi, hộp thư, đơn từ và lịch cá nhân',
    icon: <HomeOutlined />,
    color: '#2563EB',
    gatePermission: moduleGates('work'),
    topItems: [
      { key: '/feed', label: 'Bảng tin', visible: true },
    ],
    groups: [
      {
        key: 'g-ws-daily', label: 'Việc hàng ngày', visible: true,
        items: [
          { key: '/my-tasks',        label: 'Việc của tôi',          visible: true },
          { key: '/my-bugs',         label: 'Lỗi của tôi',           visible: true },
          { key: '/processes/inbox', label: 'Hộp thư quy trình',     visible: false },
          { key: '/approvals/inbox', label: 'Hộp thư phê duyệt',     visible: true },
        ],
      },
      {
        key: 'g-ws-personal', label: 'Đơn từ & Lương', visible: true,
        items: [
          { key: '/leaves',              label: 'Đơn nghỉ phép',          visible: true },
          { key: '/my-overtime',         label: 'Đăng ký làm thêm giờ',   visible: true },
          { key: '/payroll/my-payslips', label: 'Phiếu lương',            visible: true },
          { key: '/self-service',        label: 'Hồ sơ cá nhân',          visible: true },
          { key: '/timesheet',           label: 'Chấm công của tôi',      visible: true },
        ],
      },
      {
        key: 'g-ws-tools', label: 'Lịch & Tiện ích', visible: true,
        items: [
          { key: '/calendar',            label: 'Lịch công ty',      visible: true },
          { key: '/assets/room-booking', label: 'Đặt phòng họp',    visible: true },
          { key: '/assets/vehicles',     label: 'Đặt xe công ty',    visible: true },
        ],
      },
    ],
  },

  // ─── 2. Dự án ─────────────────────────────────────────────────────────────
  {
    id: 'projects',
    label: 'Dự án',
    description: 'Quản lý dự án, công việc, lỗi và tri thức nội bộ',
    icon: <ProjectOutlined />,
    color: '#7C3AED',
    gatePermission: moduleGates('work', 'finance'),
    topItems: [
      { key: '/dashboard/work', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-proj-work', label: 'Dự án & Công việc', visible: true,
        items: [
          { key: '/projects',           label: 'Tất cả dự án',  visible: true },
          { key: '/tasks',              label: 'Việc dự án',     visible: true },
          { key: '/timeline',           label: 'Lịch trình',     visible: true },
          { key: '/timesheet/project',  label: 'Nhật ký dự án', visible: true },
        ],
      },
      {
        key: 'g-proj-quality', label: 'Chất lượng & Lỗi', visible: true,
        items: [
          { key: '/bugs', label: 'Quản lý lỗi', visible: true },
        ],
      },
      {
        key: 'g-proj-knowledge', label: 'Tri thức', visible: true,
        items: [
          { key: '/knowledge-base', label: 'Cơ sở tri thức', visible: true },
        ],
      },
    ],
  },

  // ─── 3. Nhân sự ───────────────────────────────────────────────────────────
  {
    id: 'people',
    label: 'Nhân sự',
    description: 'Hồ sơ nhân viên, tổ chức và phát triển nhân lực',
    icon: <IdcardOutlined />,
    color: '#059669',
    gatePermission: moduleGates('people'),
    topItems: [
      { key: '/dashboard/people', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-people-profile', label: 'Hồ sơ & Tổ chức', visible: true,
        items: [
          { key: '/personnel',      label: 'Danh sách nhân viên', visible: true },
          { key: '/org-chart',      label: 'Sơ đồ tổ chức',      visible: true },
          { key: '/contracts',      label: 'Hợp đồng lao động',   visible: true },
          { key: '/hr/job-titles',  label: 'Chức danh',           visible: true },
          { key: '/hr/positions',   label: 'Vị trí biên chế',     visible: true },
          { key: '/hr/decisions',   label: 'Quyết định nhân sự',  visible: true },
          { key: '/hr/offboarding', label: 'Offboarding',          visible: true },
        ],
      },
      {
        key: 'g-people-dev', label: 'Phát triển nhân lực', visible: true,
        items: [
          { key: '/hr/training',     label: 'Đào tạo',           visible: true },
          { key: '/hr/performance',  label: 'Đánh giá năng lực', visible: true },
          { key: '/hr/skill-matrix', label: 'Ma trận kỹ năng',   visible: true },
          { key: '/hr/okr',          label: 'OKR & KPI',          visible: true },
          { key: '/hr/analytics',    label: 'HR Analytics',       visible: true },
        ],
      },
    ],
  },

  // ─── 4. Chấm công & Lương ─────────────────────────────────────────────────
  {
    id: 'attendance',
    label: 'Chấm công & Lương',
    description: 'Bảng công, nghỉ phép, OT, ca làm và bảng lương',
    icon: <ClockCircleOutlined />,
    color: '#D97706',
    gatePermission: moduleGates('attendance'),
    topItems: [
      { key: '/dashboard/attendance', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-att-daily', label: 'Chấm công & Đơn từ', visible: true,
        items: [
          { key: '/timesheet/manager',          label: 'Bảng điểm danh',         visible: true },
          { key: '/hr/attendance',              label: 'Bảng công',               visible: true },
          { key: '/hr/attendance/explanations', label: 'Giải trình chấm công',    visible: true },
          { key: '/hr/leaves',                  label: 'Quản lý đơn nghỉ phép',   visible: true },
          { key: '/hr/leave-summary',           label: 'Quản lý phép năm',        visible: true },
          { key: '/hr/overtime',                label: 'Quản lý OT',              visible: true },
          { key: '/hr/shifts',                  label: 'Ca làm việc',             visible: true },
          { key: '/hr/holidays',                label: 'Ngày lễ',                 visible: true },
          { key: '/hr/leave-policies',          label: 'Chính sách phép',         visible: true },
        ],
      },
      {
        key: 'g-att-payroll', label: 'Lương & Phúc lợi', visible: true,
        items: [
          { key: '/payroll',                          label: 'Bảng lương',        visible: true },
          { key: '/payroll/settings',                 label: 'Cài đặt lương',     visible: true },
          { key: '/hr/performance/salary-review',     label: 'Xem xét lương',     visible: true },
          { key: '/hr/performance/bonus-config',      label: 'Cấu hình Bonus',    visible: true },
          { key: '/hr/salary-bands',                  label: 'Band lương',        visible: true },
          { key: '/hr/insurance',                     label: 'Bảo hiểm xã hội',   visible: true },
        ],
      },
    ],
  },

  // ─── 5. Tuyển dụng ────────────────────────────────────────────────────────
  {
    id: 'recruit',
    label: 'Tuyển dụng',
    description: 'Phễu tuyển dụng, ứng viên, phỏng vấn và vị trí',
    icon: <UsergroupAddOutlined />,
    color: '#0EA5E9',
    gatePermission: moduleGates('recruit'),
    topItems: [
      { key: '/dashboard/recruit', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-recruit-main', label: 'Tuyển dụng', visible: true,
        items: [
          { key: '/recruit/jobs',        label: 'Tin tuyển dụng',  visible: true },
          { key: '/recruit/pipeline',    label: 'Phễu tuyển dụng', visible: true },
          { key: '/recruit/candidates',  label: 'Ứng viên',        visible: true },
          { key: '/recruit/interviews',  label: 'Lịch phỏng vấn',  visible: true },
          { key: '/recruit/onboarding',  label: 'Onboarding',      visible: true },
        ],
      },
    ],
  },

  // ─── 6. Tài chính ─────────────────────────────────────────────────────────
  {
    id: 'finance',
    label: 'Tài chính',
    description: 'Chi phí, ngân sách, hóa đơn và kế toán',
    icon: <BankOutlined />,
    color: '#0D9488',
    gatePermission: moduleGates('finance'),
    topItems: [
      { key: '/dashboard/finance', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-finance-cashflow', label: 'Thu - Chi', visible: true,
        items: [
          { key: '/expenses', label: 'Đề nghị thanh toán', visible: true },
          { key: '/invoices', label: 'Hóa đơn',            visible: true },
        ],
      },
      {
        key: 'g-finance-budget', label: 'Ngân sách', visible: true,
        items: [
          { key: '/finance/budget', label: 'Ngân sách tổng thể',  visible: true },
          { key: '/budget',         label: 'Ngân sách dự án',     visible: true },
          { key: '/cost',           label: 'Chi phí dự án',       visible: true },
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

  // ─── 7. Bán hàng & Khách hàng ────────────────────────────────────────────
  {
    id: 'crm',
    label: 'Khách hàng',
    description: 'Khách hàng, tiềm năng, cơ hội bán hàng và pipeline',
    icon: <ShopOutlined />,
    color: '#DC2626',
    gatePermission: moduleGates('crm'),
    topItems: [
      { key: '/dashboard/crm', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-crm-pipeline', label: 'Kênh bán hàng', visible: true,
        items: [
          { key: '/crm/leads',    label: 'Khách hàng tiềm năng', visible: true },
          { key: '/crm/deals',    label: 'Cơ hội bán hàng',      visible: true },
          { key: '/crm/contacts', label: 'Liên hệ',              visible: true },
        ],
      },
      {
        key: 'g-crm-activities', label: 'Hoạt động & Phân tích', visible: true,
        items: [
          { key: '/crm/activities', label: 'Nhật ký hoạt động', visible: true },
          { key: '/crm/forecast',   label: 'Dự báo doanh số',   visible: true },
          { key: '/crm/analytics',  label: 'Phân tích CRM',      visible: true },
        ],
      },
      {
        key: 'g-crm-customers', label: 'Khách hàng & Hợp đồng', visible: true,
        items: [
          { key: '/crm/customers',        label: 'Tất cả khách hàng',    visible: true },
          { key: '/crm/client-contracts', label: 'Hợp đồng khách hàng',  visible: true },
          { key: '/crm/portal',           label: 'Cổng khách hàng',      visible: true },
        ],
      },
    ],
  },

  // ─── 8. Tài sản ───────────────────────────────────────────────────────────
  {
    id: 'asset',
    label: 'Tài sản',
    description: 'Quản lý tài sản, bảo trì và mua sắm',
    icon: <LaptopOutlined />,
    color: '#D97706',
    gatePermission: moduleGates('asset'),
    topItems: [
      { key: '/dashboard/asset', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-asset-main', label: 'Quản lý tài sản', visible: true,
        items: [
          { key: '/assets',             label: 'Tất cả tài sản',    visible: true },
          { key: '/assets/assignments', label: 'Cấp phát tài sản',  visible: true },
          { key: '/assets/maintenance', label: 'Bảo trì',           visible: true },
          { key: '/assets/depreciation', label: 'Khấu hao tài sản', visible: true },
          { key: '/assets/rooms',       label: 'Quản lý phòng họp', visible: true },
        ],
      },
      {
        key: 'g-asset-vehicles', label: 'Đội xe', visible: true,
        items: [
          { key: '/assets/vehicles/manage', label: 'Quản lý đội xe', visible: true },
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

  // ─── 9. Quản trị ──────────────────────────────────────────────────────────
  {
    id: 'admin',
    label: 'Quản trị',
    description: 'Hệ thống, quy trình BPM và công cụ quản trị',
    icon: <SettingOutlined />,
    color: '#475569',
    gatePermission: moduleGates('admin', 'ops'),
    topItems: [
      { key: '/dashboard/admin', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-admin-users', label: 'Người dùng & Phân quyền', visible: true,
        items: [
          { key: '/users',         label: 'Người dùng',       visible: true },
          { key: '/permissions',   label: 'Phân quyền',       visible: true },
          { key: '/admin/categories', label: 'Quản lý danh mục', visible: true },
          { key: '/admin/tenants', label: 'Quản lý Tenant',   visible: true },
          { key: '/module-config', label: 'Cấu hình phân hệ', visible: true },
        ],
      },
      {
        key: 'g-admin-bpm', label: 'Quy trình (BPM)', visible: true,
        items: [
          { key: '/processes',           label: 'Định nghĩa quy trình', visible: true },
          { key: '/processes/instances', label: 'Giám sát quy trình',   visible: true },
        ],
      },
      {
        key: 'g-admin-settings', label: 'Cài đặt & Tích hợp', visible: true,
        items: [
          { key: '/settings',          label: 'Cấu hình menu',  visible: true },
          { key: '/integrations',      label: 'Tích hợp',       visible: true },
          { key: '/alerts',            label: 'Cảnh báo',       visible: true },
          { key: '/automation',        label: 'Tự động hóa',    visible: true },
          { key: '/scheduled-reports', label: 'Báo cáo định kỳ', visible: true },
        ],
      },
      {
        key: 'g-admin-tools', label: 'Công cụ', visible: true,
        items: [
          { key: '/import',                 label: 'Nhập dữ liệu',       visible: true },
          { key: '/audit-log',              label: 'Nhật ký hệ thống',   visible: true },
          { key: '/admin/announcements',    label: 'Thông báo hệ thống', visible: true },
          { key: '/admin/permission-audit', label: 'Báo cáo phân quyền', visible: true },
        ],
      },
      {
        key: 'g-admin-ops', label: 'Vận hành hệ thống', visible: true,
        items: [
          { key: '/admin/health',     label: 'Giám sát hệ thống',   visible: true },
          { key: '/admin/queues',     label: 'Queue Browser',        visible: true },
          { key: '/admin/email-logs', label: 'Email Delivery Log',   visible: true },
          { key: '/admin/demo',       label: 'Chế độ trình diễn',   visible: true },
          { key: '/onboarding',       label: 'Hướng dẫn khởi động', visible: true },
        ],
      },
    ],
  },

  // ─── Analytics — Trung tâm Phân tích cho Lãnh đạo ────────────────────────
  {
    id: 'analytics',
    label: 'Phân tích',
    description: 'Trung tâm báo cáo và phân tích toàn doanh nghiệp',
    icon: <BarChartOutlined />,
    color: '#6366F1',
    gatePermission: moduleGates('analytics'),
    topItems: [
      { key: '/analytics/overview', label: 'Tổng quan Lãnh đạo', visible: true },
    ],
    groups: [
      {
        key: 'g-analytics-reports', label: 'Báo cáo', visible: true,
        items: [
          { key: '/reports',             label: 'Báo cáo tổng hợp',        visible: true },
          { key: '/reports/utilization', label: 'Tỷ lệ sử dụng nhân lực', visible: true },
          { key: '/projects/analytics',  label: 'Phân tích dự án',         visible: true },
          { key: '/analytics/reports',   label: 'Thư viện Báo cáo',        visible: true },
          { key: '/analytics/saved',     label: 'Báo cáo đã lưu',          visible: true },
        ],
      },
      {
        key: 'g-analytics-tools', label: 'Công cụ', visible: true,
        items: [
          { key: '/analytics/builder', label: 'Tạo báo cáo', visible: true },
        ],
      },
    ],
  },
];

export const MODULE_MAP = Object.fromEntries(MODULES.map(m => [m.id, m]));

export const DEFAULT_MODULE_ID = 'workspace';

// Route key → permission code (derived from screens.registry)
export const ROUTE_PERMISSION_MAP: Record<string, string | undefined> = {
  ...REGISTRY_MAP,
};

// Icon map shared across all sidebar items
export const ICON_MAP: Record<string, ReactNode> = {
  '/dashboard/work':       <ProjectOutlined />,
  '/dashboard/people':     <TeamOutlined />,
  '/dashboard/attendance': <ClockCircleOutlined />,
  '/dashboard/recruit':    <UsergroupAddOutlined />,
  '/dashboard/finance':    <BankOutlined />,
  '/dashboard/crm':        <ShopOutlined />,
  '/dashboard/asset':      <LaptopOutlined />,
  '/dashboard/ops':        <BuildOutlined />,
  '/dashboard/admin':      <SettingOutlined />,

  '/feed':                  <MessageOutlined />,
  '/my-tasks':              <AppstoreOutlined />,
  '/my-bugs':               <BugOutlined />,
  '/processes/inbox':       <InboxOutlined />,
  '/approvals/inbox':       <InboxOutlined />,
  '/leaves':                <CalendarOutlined />,
  '/my-overtime':           <FieldTimeOutlined />,
  '/payroll/my-payslips':   <FileTextOutlined />,
  '/self-service':          <UserOutlined />,
  '/timesheet':             <ClockCircleOutlined />,
  '/calendar':              <RoomCalendarIcon />,
  '/assets/room-booking':   <RoomCalendarIcon />,
  '/assets/vehicles':       <CarOutlined />,

  '/projects':              <ProjectOutlined />,
  '/tasks':                 <CheckSquareOutlined />,
  '/timeline':              <ScheduleOutlined />,
  '/timesheet/project':     <LineChartOutlined />,
  '/bugs':                  <BugFilled />,
  '/bugs/dashboard':        <FundOutlined />,
  '/knowledge-base':        <BookOutlined />,
  '/reports':               <BarChartOutlined />,
  '/reports/utilization':   <TeamOutlined />,
  '/reports/builder':       <BuildOutlined />,
  '/projects/analytics':    <BarChartOutlined />,

  '/personnel':             <TeamOutlined />,
  '/org-chart':             <ApartmentOutlined />,
  '/contracts':             <AuditOutlined />,
  '/hr/job-titles':         <IdcardOutlined />,
  '/hr/positions':          <ApartmentOutlined />,
  '/hr/decisions':          <AuditOutlined />,
  '/timesheet/manager':     <LineChartOutlined />,
  '/hr/attendance':         <AuditOutlined />,
  '/hr/attendance/explanations': <FormOutlined />,
  '/hr/leaves':             <CalendarOutlined />,
  '/hr/leave-summary':      <ScheduleOutlined />,
  '/hr/overtime':           <FieldTimeOutlined />,
  '/hr/shifts':             <ClockCircleOutlined />,
  '/hr/holidays':           <CalendarOutlined />,
  '/payroll':               <CreditCardOutlined />,
  '/payroll/settings':      <SettingOutlined />,
  '/hr/insurance':          <SafetyCertificateOutlined />,
  '/hr/leave-policies':     <FileTextOutlined />,
  '/hr/salary-bands':       <DollarOutlined />,
  '/hr/training':           <ReadOutlined />,
  '/hr/performance':        <TrophyOutlined />,
  '/hr/skill-matrix':       <ApartmentOutlined />,
  '/hr/okr':                <AimOutlined />,
  '/hr/analytics':          <BarChartOutlined />,
  '/hr/performance/bonus-config':   <TrophyOutlined />,
  '/hr/performance/salary-review':  <DollarOutlined />,
  '/recruit/onboarding':    <RocketOutlined />,
  '/recruit/pipeline':      <AppstoreAddOutlined />,
  '/recruit/candidates':    <UsergroupAddOutlined />,
  '/recruit/interviews':    <ScheduleFilled />,
  '/recruit/jobs':          <SolutionOutlined />,
  '/hr/offboarding':        <LogoutOutlined />,

  '/expenses':              <WalletOutlined />,
  '/cost':                  <DollarOutlined />,
  '/budget':                <PieChartOutlined />,
  '/finance/budget':        <DotChartOutlined />,
  '/invoices':              <FileTextOutlined />,
  '/accounting/accounts':   <BankOutlined />,
  '/accounting/journal':    <BookOutlined />,
  '/accounting/financial-reports': <FundOutlined />,

  '/crm/leads':             <FunnelPlotOutlined />,
  '/crm/deals':             <TrophyOutlined />,
  '/crm/contacts':          <ContactsOutlined />,
  '/crm/activities':        <PhoneOutlined />,
  '/crm/forecast':          <RiseOutlined />,
  '/crm/analytics':         <BarChartOutlined />,
  '/crm/customers':         <ShopOutlined />,
  '/crm/client-contracts':  <AuditOutlined />,
  '/crm/portal':            <GlobalOutlined />,

  '/users':                 <UserOutlined />,
  '/permissions':           <SafetyCertificateOutlined />,
  '/admin/categories':      <AppstoreOutlined />,
  '/admin/tenants':         <GlobalOutlined />,
  '/module-config':         <ModuleConfigIcon />,
  '/processes':             <UnorderedListOutlined />,
  '/processes/instances':   <RiseOutlined />,
  '/assets':                <LaptopOutlined />,
  '/assets/assignments':    <SwapOutlined />,
  '/assets/maintenance':    <ToolOutlined />,
  '/assets/depreciation':   <FallOutlined />,
  '/assets/rooms':               <HomeOutlined />,
  '/assets/vehicles/manage':     <ToolOutlined />,
  '/assets/vehicles/approvals':  <CarOutlined />,
  '/procurement/vendors':        <ShopOutlined />,
  '/procurement/orders':    <FileTextOutlined />,
  '/settings':              <SettingOutlined />,
  '/integrations':          <ApiOutlined />,
  '/alerts':                <BellOutlined />,
  '/automation':            <ThunderboltOutlined />,
  '/scheduled-reports':     <MailOutlined />,
  '/import':                <UploadOutlined />,
  '/audit-log':             <AuditOutlined />,
  '/admin/announcements':   <BellOutlined />,
  '/admin/permission-audit': <SafetyCertificateOutlined />,
  '/admin/health':          <MonitorOutlined />,
  '/admin/queues':          <ThunderboltOutlined />,
  '/admin/email-logs':      <MailOutlined />,
  '/admin/demo':            <ExperimentOutlined />,
  '/onboarding':            <RocketOutlined />,

  '/analytics/overview':    <BarChartOutlined />,
  '/analytics/reports':     <FileTextOutlined />,
  '/analytics/builder':     <BuildOutlined />,
  '/analytics/saved':       <SaveOutlined />,
};
