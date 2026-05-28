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
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { MenuTopItemCfg, MenuGroupCfg } from '../store/menu.store';
import { ROUTE_PERMISSION_MAP as REGISTRY_MAP } from './screens.registry';

export interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
  color: string;
  /** Permission bắt buộc để truy cập module này. Admin luôn bypass.
   *  Truyền array để check any-of (user có BẤT KỲ 1 trong các perms là được vào). */
  gatePermission?: string | string[];
  topItems: MenuTopItemCfg[];
  groups: MenuGroupCfg[];
}

export const MODULES: ModuleDefinition[] = [
  // ─── Projects ─────────────────────────────────────────────────────────────
  {
    id: 'pm',
    label: 'Dự án',
    description: 'Quản lý dự án, công việc, lỗi & vấn đề',
    icon: <ProjectOutlined />,
    color: '#2563EB',
    gatePermission: 'projects:read',
    topItems: [
      { key: '/', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-work', label: 'Công việc', visible: true,
        items: [
          { key: '/my-tasks',  label: 'Bảng Kanban', visible: true },
          { key: '/tasks',     label: 'Việc của tôi', visible: true },
          { key: '/timeline',  label: 'Lịch trình',   visible: true },
        ],
      },
      {
        key: 'g-bugs', label: 'Lỗi & Vấn đề', visible: true,
        items: [
          { key: '/my-bugs',        label: 'Lỗi của tôi',  visible: true },
          { key: '/bugs',           label: 'Quản lý lỗi',  visible: true },
          { key: '/bugs/dashboard', label: 'Thống kê lỗi', visible: true },
        ],
      },
      {
        key: 'g-projects', label: 'Dự án', visible: true,
        items: [
          { key: '/projects',       label: 'Tất cả dự án',   visible: true },
          { key: '/knowledge-base', label: 'Cơ sở tri thức', visible: true },
        ],
      },
    ],
  },

  // ─── Workflow (BPM) ────────────────────────────────────────────────────────
  {
    id: 'bpm',
    label: 'Quy trình',
    description: 'Thiết kế và vận hành quy trình nghiệp vụ',
    icon: <ApartmentOutlined />,
    color: '#1D4ED8',
    gatePermission: 'bpm:read',
    topItems: [
      { key: '/', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-bpm', label: 'Quy trình', visible: true,
        items: [
          { key: '/processes/inbox',     label: 'Hộp thư đến',         visible: true },
          { key: '/processes',           label: 'Định nghĩa quy trình', visible: true },
          { key: '/processes/instances', label: 'Giám sát quy trình',   visible: true },
        ],
      },
    ],
  },

  // ─── Timesheet ────────────────────────────────────────────────────────────
  {
    id: 'timesheet',
    label: 'Chấm công',
    description: 'Ghi giờ làm việc, phê duyệt và chấm công',
    icon: <ClockCircleOutlined />,
    color: '#D97706',
    gatePermission: 'timesheets:read',
    topItems: [
      { key: '/', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-timesheet', label: 'Chấm công', visible: true,
        items: [
          { key: '/timesheet',           label: 'Chấm công của tôi', visible: true },
          { key: '/timesheet/approvals', label: 'Duyệt chấm công',   visible: true },
          { key: '/timesheet/project',   label: 'Nhật ký dự án',     visible: true },
          { key: '/timesheet/manager',   label: 'Bảng điểm danh',    visible: true },
        ],
      },
    ],
  },

  // ─── Reports ──────────────────────────────────────────────────────────────
  {
    id: 'reports',
    label: 'Báo cáo',
    description: 'Phân tích, thống kê và báo cáo dự án',
    icon: <FundOutlined />,
    color: '#0891B2',
    gatePermission: 'reports:read',
    topItems: [
      { key: '/', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-reports', label: 'Báo cáo', visible: true,
        items: [
          { key: '/reports', label: 'Báo cáo tổng hợp', visible: true },
        ],
      },
    ],
  },

  // ─── HR ───────────────────────────────────────────────────────────────────
  {
    id: 'hr',
    label: 'Nhân sự',
    description: 'Nhân sự, sơ đồ tổ chức và quản lý nghỉ phép',
    icon: <IdcardOutlined />,
    color: '#059669',
    gatePermission: 'employees:read',
    topItems: [
      { key: '/', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-hr', label: 'Nhân sự', visible: true,
        items: [
          { key: '/personnel',  label: 'Danh sách nhân viên', visible: true },
          { key: '/org-chart',  label: 'Sơ đồ tổ chức',      visible: true },
          { key: '/contracts',  label: 'Hợp đồng lao động',  visible: true },
          { key: '/leaves',     label: 'Đơn nghỉ phép',      visible: true },
        ],
      },
      {
        key: 'g-hr-dev', label: 'Phát triển nhân lực', visible: true,
        items: [
          { key: '/hr/training',      label: 'Đào tạo',           visible: true },
          { key: '/hr/performance',   label: 'Đánh giá năng lực', visible: true },
          { key: '/hr/skill-matrix',  label: 'Ma trận kỹ năng',   visible: true },
          { key: '/hr/okr',           label: 'OKR & KPI',         visible: true },
        ],
      },
      {
        key: 'g-hr-self', label: 'Thông tin cá nhân', visible: true,
        items: [
          { key: '/self-service',        label: 'Thông tin của tôi', visible: true },
          { key: '/payroll/my-payslips', label: 'Phiếu lương',       visible: true },
        ],
      },
    ],
  },

  // ─── Finance ──────────────────────────────────────────────────────────────
  {
    id: 'finance',
    label: 'Tài chính',
    description: 'Lương, chi phí, ngân sách và hóa đơn',
    icon: <BankOutlined />,
    color: '#0D9488',
    gatePermission: 'finance:read',
    topItems: [
      { key: '/', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-finance', label: 'Tài chính', visible: true,
        items: [
          { key: '/cost',     label: 'Chi phí dự án',  visible: true },
          { key: '/budget',   label: 'Ngân sách',      visible: true },
          { key: '/expenses', label: 'Đề nghị thanh toán', visible: true },
          { key: '/payroll',          label: 'Bảng lương',        visible: true },
          { key: '/payroll/settings', label: 'Cài đặt lương',     visible: true },
          { key: '/invoices',              label: 'Hóa đơn',             visible: true },
          { key: '/accounting/accounts',          label: 'Hệ thống tài khoản',  visible: true },
          { key: '/accounting/journal',           label: 'Nhật ký kế toán',     visible: true },
          { key: '/accounting/financial-reports', label: 'Báo cáo tài chính',   visible: true },
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
    gatePermission: 'crm:read',
    topItems: [
      { key: '/', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-crm-pipeline', label: 'Pipeline', visible: true,
        items: [
          { key: '/crm/leads',    label: 'Leads',   visible: true },
          { key: '/crm/deals',    label: 'Deals',   visible: true },
          { key: '/crm/contacts', label: 'Liên hệ', visible: true },
        ],
      },
      {
        key: 'g-crm-activities', label: 'Hoạt động', visible: true,
        items: [
          { key: '/crm/activities', label: 'Nhật ký hoạt động', visible: true },
          { key: '/crm/forecast',   label: 'Dự báo doanh số',   visible: true },
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

  // ─── Recruitment ──────────────────────────────────────────────────────────
  {
    id: 'recruit',
    label: 'Tuyển dụng',
    description: 'Vị trí tuyển dụng, ứng viên và phỏng vấn',
    icon: <SolutionOutlined />,
    color: '#0EA5E9',
    gatePermission: 'recruit:read',
    topItems: [
      { key: '/', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-recruit-pipeline', label: 'Pipeline tuyển dụng', visible: true,
        items: [
          { key: '/recruit/pipeline',    label: 'Pipeline',       visible: true },
          { key: '/recruit/candidates',  label: 'Ứng viên',       visible: true },
          { key: '/recruit/interviews',  label: 'Lịch phỏng vấn', visible: true },
        ],
      },
      {
        key: 'g-recruit-jobs', label: 'Vị trí tuyển dụng', visible: true,
        items: [
          { key: '/recruit/jobs', label: 'Tin tuyển dụng', visible: true },
        ],
      },
    ],
  },

  // ─── Procurement ──────────────────────────────────────────────────────────
  {
    id: 'procurement',
    label: 'Mua hàng',
    description: 'Nhà cung cấp và đơn mua hàng',
    icon: <ShopOutlined />,
    color: '#F97316',
    gatePermission: 'procurement:read',
    topItems: [
      { key: '/', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-procurement-main', label: 'Mua hàng', visible: true,
        items: [
          { key: '/procurement/vendors', label: 'Nhà cung cấp', visible: true },
          { key: '/procurement/orders',  label: 'Đơn mua hàng', visible: true },
        ],
      },
    ],
  },

  // ─── Assets ───────────────────────────────────────────────────────────────
  {
    id: 'asset',
    label: 'Tài sản',
    description: 'Tài sản công ty, cấp phát và bảo trì',
    icon: <LaptopOutlined />,
    color: '#B45309',
    gatePermission: 'asset:read',
    topItems: [
      { key: '/', label: 'Tổng quan', visible: true },
    ],
    groups: [
      {
        key: 'g-asset-main', label: 'Quản lý tài sản', visible: true,
        items: [
          { key: '/assets',             label: 'Tất cả tài sản',  visible: true },
          { key: '/assets/assignments', label: 'Cấp phát tài sản', visible: true },
          { key: '/assets/maintenance', label: 'Bảo trì',          visible: true },
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
    gatePermission: ['admin:users', 'admin:permissions', 'admin:settings'],
    topItems: [],
    groups: [
      {
        key: 'g-system', label: 'Hệ thống', visible: true,
        items: [
          { key: '/users',        label: 'Người dùng',       visible: true },
          { key: '/permissions',  label: 'Phân quyền',       visible: true },
          { key: '/alerts',       label: 'Cảnh báo',         visible: true },
          { key: '/settings',     label: 'Cấu hình menu',    visible: true },
          { key: '/integrations', label: 'Tích hợp',         visible: true },
          { key: '/import',       label: 'Nhập dữ liệu',     visible: true },
          { key: '/audit-log',    label: 'Nhật ký hệ thống', visible: true },
          { key: '/automation',         label: 'Tự động hóa',      visible: true },
          { key: '/scheduled-reports',  label: 'Scheduled Reports', visible: true },
        ],
      },
    ],
  },
];

export const MODULE_MAP = Object.fromEntries(MODULES.map(m => [m.id, m]));

export const DEFAULT_MODULE_ID = 'pm';

// Route key → permission code (derived from screens.registry)
export const ROUTE_PERMISSION_MAP: Record<string, string | undefined> = {
  ...REGISTRY_MAP,
  // Overrides không cần — tất cả routes đã có trong SCREEN_REGISTRY
};

// Icon map shared across all sidebar items
export const ICON_MAP: Record<string, ReactNode> = {
  '/':                      <DashboardOutlined />,
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
  '/timesheet/approvals':   <AuditOutlined />,
  '/leaves':                <CalendarOutlined />,
  '/expenses':              <WalletOutlined />,
  '/budget':                <PieChartOutlined />,
  '/org-chart':             <ApartmentOutlined />,
  '/contracts':             <AuditOutlined />,
  '/payroll':               <CreditCardOutlined />,
  '/payroll/settings':       <SettingOutlined />,
  '/payroll/my-payslips':    <FileTextOutlined />,
  '/self-service':           <UserOutlined />,
  '/invoices':              <FileTextOutlined />,
  '/crm/leads':             <FunnelPlotOutlined />,
  '/crm/deals':             <TrophyOutlined />,
  '/crm/contacts':          <ContactsOutlined />,
  '/crm/customers':         <ShopOutlined />,
  '/crm/client-contracts':  <AuditOutlined />,
  '/crm/activities':        <PhoneOutlined />,
  '/crm/forecast':          <RiseOutlined />,
  '/crm/portal':            <GlobalOutlined />,
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
  '/knowledge-base':                <BookOutlined />,
  '/accounting/financial-reports':  <FundOutlined />,
  '/import':                        <UploadOutlined />,
  '/audit-log':                     <AuditOutlined />,
  '/automation':                    <ThunderboltOutlined />,
  '/scheduled-reports':             <MailOutlined />,
};
