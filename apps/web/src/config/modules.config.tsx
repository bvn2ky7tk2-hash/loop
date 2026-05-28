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
    label: 'Projects',
    description: 'Quản lý dự án, công việc, bug & vấn đề',
    icon: <ProjectOutlined />,
    color: '#2563EB',
    gatePermission: 'projects:read',
    topItems: [
      { key: '/', label: 'Dashboard', visible: true },
    ],
    groups: [
      {
        key: 'g-work', label: 'Work', visible: true,
        items: [
          { key: '/my-tasks',  label: 'Kanban Board', visible: true },
          { key: '/tasks',     label: 'My Tasks',     visible: true },
          { key: '/timeline',  label: 'Timeline',     visible: true },
        ],
      },
      {
        key: 'g-bugs', label: 'Bugs & Issues', visible: true,
        items: [
          { key: '/my-bugs',        label: 'My Bugs',        visible: true },
          { key: '/bugs',           label: 'Bug Management', visible: true },
          { key: '/bugs/dashboard', label: 'Bug Dashboard',  visible: true },
        ],
      },
      {
        key: 'g-projects', label: 'Projects', visible: true,
        items: [
          { key: '/projects', label: 'All Projects', visible: true },
        ],
      },
    ],
  },

  // ─── Workflow (BPM) ────────────────────────────────────────────────────────
  {
    id: 'bpm',
    label: 'Workflow',
    description: 'Thiết kế và vận hành quy trình nghiệp vụ',
    icon: <ApartmentOutlined />,
    color: '#1D4ED8',
    gatePermission: 'bpm:read',
    topItems: [
      { key: '/', label: 'Dashboard', visible: true },
    ],
    groups: [
      {
        key: 'g-bpm', label: 'Workflow', visible: true,
        items: [
          { key: '/processes/inbox',     label: 'Inbox',     visible: true },
          { key: '/processes',           label: 'Processes', visible: true },
          { key: '/processes/instances', label: 'Monitor',   visible: true },
        ],
      },
    ],
  },

  // ─── Timesheet ────────────────────────────────────────────────────────────
  {
    id: 'timesheet',
    label: 'Timesheet',
    description: 'Ghi giờ làm việc, phê duyệt và chấm công',
    icon: <ClockCircleOutlined />,
    color: '#D97706',
    gatePermission: 'timesheets:read',
    topItems: [
      { key: '/', label: 'Dashboard', visible: true },
    ],
    groups: [
      {
        key: 'g-timesheet', label: 'Timesheet', visible: true,
        items: [
          { key: '/timesheet',           label: 'My Timesheet', visible: true },
          { key: '/timesheet/approvals', label: 'Approvals',    visible: true },
          { key: '/timesheet/project',   label: 'Project Log',  visible: true },
          { key: '/timesheet/manager',   label: 'Attendance',   visible: true },
        ],
      },
    ],
  },

  // ─── Reports ──────────────────────────────────────────────────────────────
  {
    id: 'reports',
    label: 'Reports',
    description: 'Phân tích, thống kê và báo cáo dự án',
    icon: <FundOutlined />,
    color: '#0891B2',
    gatePermission: 'reports:read',
    topItems: [
      { key: '/', label: 'Dashboard', visible: true },
    ],
    groups: [
      {
        key: 'g-reports', label: 'Reports', visible: true,
        items: [
          { key: '/reports', label: 'Summary', visible: true },
        ],
      },
    ],
  },

  // ─── HR ───────────────────────────────────────────────────────────────────
  {
    id: 'hr',
    label: 'HR',
    description: 'Nhân sự, sơ đồ tổ chức và quản lý nghỉ phép',
    icon: <IdcardOutlined />,
    color: '#059669',
    gatePermission: 'employees:read',
    topItems: [
      { key: '/', label: 'Dashboard', visible: true },
    ],
    groups: [
      {
        key: 'g-hr', label: 'Human Resources', visible: true,
        items: [
          { key: '/personnel',  label: 'Employees',     visible: true },
          { key: '/org-chart',  label: 'Org Chart',     visible: true },
          { key: '/contracts',  label: 'Contracts',     visible: true },
          { key: '/leaves',     label: 'Leave Requests', visible: true },
        ],
      },
      {
        key: 'g-hr-dev', label: 'Development', visible: true,
        items: [
          { key: '/hr/training',    label: 'Training',           visible: true },
          { key: '/hr/performance', label: 'Performance Review', visible: true },
        ],
      },
      {
        key: 'g-hr-self', label: 'Self Service', visible: true,
        items: [
          { key: '/payroll/my-payslips', label: 'My Payslips', visible: true },
        ],
      },
    ],
  },

  // ─── Finance ──────────────────────────────────────────────────────────────
  {
    id: 'finance',
    label: 'Finance',
    description: 'Lương, chi phí, ngân sách và hóa đơn',
    icon: <BankOutlined />,
    color: '#0D9488',
    gatePermission: 'finance:read',
    topItems: [
      { key: '/', label: 'Dashboard', visible: true },
    ],
    groups: [
      {
        key: 'g-finance', label: 'Finance', visible: true,
        items: [
          { key: '/cost',     label: 'Cost',     visible: true },
          { key: '/budget',   label: 'Budget',   visible: true },
          { key: '/expenses', label: 'Expenses', visible: true },
          { key: '/payroll',          label: 'Payroll',           visible: true },
          { key: '/payroll/settings', label: 'Payroll Settings',   visible: true },
          { key: '/invoices',              label: 'Invoices',          visible: true },
          { key: '/accounting/accounts',   label: 'Chart of Accounts', visible: true },
          { key: '/accounting/journal',    label: 'Journal',           visible: true },
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
      { key: '/', label: 'Dashboard', visible: true },
    ],
    groups: [
      {
        key: 'g-crm-pipeline', label: 'Pipeline', visible: true,
        items: [
          { key: '/crm/leads',    label: 'Leads',    visible: true },
          { key: '/crm/deals',    label: 'Deals',    visible: true },
          { key: '/crm/contacts', label: 'Contacts', visible: true },
        ],
      },
      {
        key: 'g-crm-customers', label: 'Customers', visible: true,
        items: [
          { key: '/crm/customers', label: 'All Customers', visible: true },
        ],
      },
      {
        key: 'g-crm-contracts', label: 'Contracts', visible: true,
        items: [
          { key: '/crm/client-contracts', label: 'Hợp đồng KH', visible: true },
        ],
      },
    ],
  },

  // ─── Recruitment ──────────────────────────────────────────────────────────
  {
    id: 'recruit',
    label: 'Recruitment',
    description: 'Vị trí tuyển dụng, ứng viên và phỏng vấn',
    icon: <SolutionOutlined />,
    color: '#0EA5E9',
    gatePermission: 'recruit:read',
    topItems: [
      { key: '/', label: 'Dashboard', visible: true },
    ],
    groups: [
      {
        key: 'g-recruit-pipeline', label: 'Pipeline', visible: true,
        items: [
          { key: '/recruit/pipeline',    label: 'Pipeline',    visible: true },
          { key: '/recruit/candidates',  label: 'Candidates',  visible: true },
          { key: '/recruit/interviews',  label: 'Interviews',  visible: true },
        ],
      },
      {
        key: 'g-recruit-jobs', label: 'Jobs', visible: true,
        items: [
          { key: '/recruit/jobs', label: 'Job Openings', visible: true },
        ],
      },
    ],
  },

  // ─── Assets ───────────────────────────────────────────────────────────────
  {
    id: 'asset',
    label: 'Assets',
    description: 'Tài sản công ty, cấp phát và bảo trì',
    icon: <LaptopOutlined />,
    color: '#B45309',
    gatePermission: 'asset:read',
    topItems: [
      { key: '/', label: 'Dashboard', visible: true },
    ],
    groups: [
      {
        key: 'g-asset-main', label: 'Asset Management', visible: true,
        items: [
          { key: '/assets',             label: 'All Assets',   visible: true },
          { key: '/assets/assignments', label: 'Assignments',  visible: true },
          { key: '/assets/maintenance', label: 'Maintenance',  visible: true },
        ],
      },
    ],
  },

  // ─── Admin ────────────────────────────────────────────────────────────────
  {
    id: 'admin',
    label: 'Admin',
    description: 'Cài đặt hệ thống, người dùng và phân quyền',
    icon: <SettingOutlined />,
    color: '#475569',
    gatePermission: ['admin:users', 'admin:permissions', 'admin:settings'],
    topItems: [],
    groups: [
      {
        key: 'g-system', label: 'System', visible: true,
        items: [
          { key: '/users',        label: 'Users',        visible: true },
          { key: '/permissions',  label: 'Permissions',  visible: true },
          { key: '/alerts',       label: 'Alerts',       visible: true },
          { key: '/settings',     label: 'Menu Config',  visible: true },
          { key: '/integrations', label: 'Integrations', visible: true },
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
  '/invoices':              <FileTextOutlined />,
  '/crm/leads':             <FunnelPlotOutlined />,
  '/crm/deals':             <TrophyOutlined />,
  '/crm/contacts':          <ContactsOutlined />,
  '/crm/customers':         <ShopOutlined />,
  '/crm/client-contracts':  <AuditOutlined />,
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
};
