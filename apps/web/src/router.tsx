import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { AppLayout } from './components/layout/AppLayout';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const OrgPage = lazy(() => import('./pages/org/OrgPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const PersonnelPage = lazy(() => import('./pages/personnel/PersonnelPage'));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const TasksPage = lazy(() => import('./pages/tasks/TasksPage'));
const GanttPage = lazy(() => import('./pages/gantt/GanttPage'));
const CostPage = lazy(() => import('./pages/cost/CostPage'));
const AlertsPage = lazy(() => import('./pages/alerts/AlertsPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const TimesheetPage = lazy(() => import('./pages/timesheet/TimesheetPage'));
const TimesheetApprovalsPage = lazy(() => import('./pages/timesheet/TimesheetApprovalsPage'));
const TimesheetManagerPage = lazy(() => import('./pages/timesheet/TimesheetManagerPage'));
const ProjectTimesheetPage = lazy(() => import('./pages/timesheet/ProjectTimesheetPage'));
const MyTasksPage = lazy(() => import('./pages/my-tasks/MyTasksPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const IntegrationsPage = lazy(() => import('./pages/settings/IntegrationsPage'));
const ProcessListPage = lazy(() => import('./pages/processes/ProcessListPage'));
const ProcessModelerPage = lazy(() => import('./pages/processes/ProcessModelerPage'));
const ProcessInstancesPage = lazy(() => import('./pages/processes/ProcessInstancesPage'));
const ProcessMonitorPage = lazy(() => import('./pages/processes/ProcessMonitorPage'));
const ProcessInboxPage = lazy(() => import('./pages/processes/ProcessInboxPage'));
const BugListPage = lazy(() => import('./pages/bugs/BugListPage'));
const MyBugsPage = lazy(() => import('./pages/bugs/MyBugsPage'));
const BugDashboardPage = lazy(() => import('./pages/bugs/BugDashboardPage'));
const PermissionsPage = lazy(() => import('./pages/permissions/PermissionsPage'));
const OrgChartPage = lazy(() => import('./pages/org/OrgChartPage'));
const ContractsPage = lazy(() => import('./pages/contracts/ContractsPage'));
const LeavePage = lazy(() => import('./pages/leaves/LeavePage'));
const ExpensePage = lazy(() => import('./pages/expenses/ExpensePage'));
const BudgetPage = lazy(() => import('./pages/budget/BudgetPage'));
const FinanceBudgetPage = lazy(() => import('./pages/finance/BudgetPage'));
const PayrollPage = lazy(() => import('./pages/payroll/PayrollPage'));
const PayrollSettingsPage = lazy(() => import('./pages/payroll/PayrollSettingsPage'));
const MyPayslipsPage = lazy(() => import('./pages/payroll/MyPayslipsPage'));
const InvoicesPage          = lazy(() => import('./pages/invoices/InvoicesPage'));
const RecruitJobsPage       = lazy(() => import('./pages/recruit/JobsPage'));
const RecruitCandidatesPage = lazy(() => import('./pages/recruit/CandidatesPage'));
const RecruitInterviewsPage = lazy(() => import('./pages/recruit/InterviewsPage'));
const RecruitPipelinePage   = lazy(() => import('./pages/recruit/PipelinePage'));
const CrmCustomersPage       = lazy(() => import('./pages/crm/CustomersPage'));
const CrmContactsPage        = lazy(() => import('./pages/crm/ContactsPage'));
const CrmLeadsPage           = lazy(() => import('./pages/crm/LeadsPage'));
const CrmDealsPage           = lazy(() => import('./pages/crm/DealsPage'));
const CrmClientContractsPage = lazy(() => import('./pages/crm/ClientContractsPage'));
const CrmActivitiesPage      = lazy(() => import('./pages/crm/ActivitiesPage'));
const CrmForecastPage        = lazy(() => import('./pages/crm/ForecastPage'));
const SelfServicePage        = lazy(() => import('./pages/self-service/SelfServicePage'));
const AssetsPage            = lazy(() => import('./pages/assets/AssetsPage'));
const AssetAssignmentsPage  = lazy(() => import('./pages/assets/AssignmentsPage'));
const AssetMaintenancePage  = lazy(() => import('./pages/assets/MaintenancePage'));
const ChartOfAccountsPage   = lazy(() => import('./pages/accounting/ChartOfAccountsPage'));
const JournalPage           = lazy(() => import('./pages/accounting/JournalPage'));
const FinancialReportsPage  = lazy(() => import('./pages/accounting/FinancialReportsPage'));
const HrTrainingPage        = lazy(() => import('./pages/hr/TrainingPage'));
const HrPerformancePage     = lazy(() => import('./pages/hr/PerformancePage'));
const SkillMatrixPage       = lazy(() => import('./pages/hr/SkillMatrixPage'));
const OkrPage               = lazy(() => import('./pages/hr/OkrPage'));
// HR v4.0
const HrJobTitlesPage       = lazy(() => import('./pages/hr/JobTitlesPage'));
const HrPositionsPage       = lazy(() => import('./pages/hr/PositionsPage'));
const HrDecisionsPage       = lazy(() => import('./pages/hr/HrDecisionsPage'));
const HrInsurancePage       = lazy(() => import('./pages/hr/InsurancePage'));
const HrProfile360Page      = lazy(() => import('./pages/hr/EmployeeProfile360Page'));
const HrLeavePolicyPage     = lazy(() => import('./pages/hr/LeavePolicyPage'));
const HrAttendancePage      = lazy(() => import('./pages/hr/AttendancePage'));
const HrHolidaysPage        = lazy(() => import('./pages/hr/HolidaysPage'));
const OvertimePage          = lazy(() => import('./pages/hr/OvertimePage'));
const MyOvertimePage        = lazy(() => import('./pages/hr/MyOvertimePage'));
const HrShiftsPage          = lazy(() => import('./pages/hr/HrShiftsPage'));
const KnowledgeBasePage     = lazy(() => import('./pages/knowledge-base/KnowledgeBasePage'));
const PortalManagePage      = lazy(() => import('./pages/crm/PortalManagePage'));
const CustomerPortalPage    = lazy(() => import('./pages/portal/CustomerPortalPage'));
const VendorsPage           = lazy(() => import('./pages/procurement/VendorsPage'));
const PurchaseOrdersPage    = lazy(() => import('./pages/procurement/PurchaseOrdersPage'));
const ImportPage            = lazy(() => import('./pages/admin/ImportPage'));
const AuditLogPage          = lazy(() => import('./pages/audit-log/AuditLogPage'));
const AutomationPage        = lazy(() => import('./pages/admin/AutomationPage'));
const ScheduledReportsPage  = lazy(() => import('./pages/admin/ScheduledReportsPage'));
const HealthPage            = lazy(() => import('./pages/admin/HealthPage'));
const DemoModePage          = lazy(() => import('./pages/admin/DemoModePage'));
const ModuleConfigPage      = lazy(() => import('./pages/admin/ModuleConfigPage'));
const OnboardingWizardPage  = lazy(() => import('./pages/admin/OnboardingWizardPage'));
const FeedPage              = lazy(() => import('./pages/feed/FeedPage'));
const FinanceDashboard      = lazy(() => import('./pages/dashboard/FinanceDashboard'));
const CrmDashboard          = lazy(() => import('./pages/dashboard/CrmDashboard'));
const AssetDashboard        = lazy(() => import('./pages/dashboard/AssetDashboard'));
const OpsDashboard          = lazy(() => import('./pages/dashboard/OpsDashboard'));
const MeDashboard           = lazy(() => import('./pages/dashboard/MeDashboard'));
const AdminDashboard        = lazy(() => import('./pages/dashboard/AdminDashboard'));
const RoomBookingPage       = lazy(() => import('./pages/assets/RoomBookingPage'));
const RoomManagePage        = lazy(() => import('./pages/assets/RoomManagePage'));
const VehicleBookingPage    = lazy(() => import('./pages/assets/VehicleBookingPage'));
const CalendarPage          = lazy(() => import('./pages/calendar/CalendarPage'));
const TenantSettingsPage    = lazy(() => import('./pages/settings/TenantSettingsPage'));
const TenantsPage           = lazy(() => import('./pages/admin/TenantsPage'));
const HrAnalyticsPage        = lazy(() => import('./pages/hr/HrAnalyticsPage'));
const UtilizationPage        = lazy(() => import('./pages/reports/UtilizationPage'));
const PayrollAnalyticsPage   = lazy(() => import('./pages/payroll/PayrollAnalyticsPage'));
const CrmAnalyticsPage       = lazy(() => import('./pages/crm/CrmAnalyticsPage'));
const ApprovalInboxPage      = lazy(() => import('./pages/approvals/ApprovalInboxPage'));
const ExecutiveDashboardPage = lazy(() => import('./pages/dashboard/ExecutiveDashboardPage'));
const ReportBuilderPage      = lazy(() => import('./pages/reports/ReportBuilderPage'));
const ProjectAnalyticsPage   = lazy(() => import('./pages/projects/ProjectAnalyticsPage'));
const FinanceAnalyticsPage   = lazy(() => import('./pages/finance/FinanceAnalyticsPage'));
const SalaryBandPage         = lazy(() => import('./pages/hr/SalaryBandPage'));
const DelegationPage         = lazy(() => import('./pages/settings/DelegationPage'));

const Loader = () => (
  <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Spin size="large" />
  </div>
);

function wrap(Component: React.ComponentType) {
  return (
    <Suspense fallback={<Loader />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: wrap(LoginPage),
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/feed" replace /> },
      { path: 'org', element: <Navigate to="/personnel" replace /> },
      { path: 'personnel', element: wrap(PersonnelPage) },
      { path: 'projects', element: wrap(ProjectsPage) },
      { path: 'tasks', element: wrap(TasksPage) },
      { path: 'my-tasks',      element: wrap(MyTasksPage) },
      { path: 'self-service',  element: wrap(SelfServicePage) },
      { path: 'timeline', element: wrap(GanttPage) },
      { path: 'cost', element: wrap(CostPage) },
      { path: 'alerts', element: wrap(AlertsPage) },
      { path: 'reports', element: wrap(ReportsPage) },
      { path: 'timesheet', element: wrap(TimesheetPage) },
      { path: 'timesheet/approvals', element: wrap(TimesheetApprovalsPage) },
      { path: 'timesheet/manager', element: wrap(TimesheetManagerPage) },
      { path: 'timesheet/project', element: wrap(ProjectTimesheetPage) },
      { path: 'settings',      element: wrap(SettingsPage) },
      { path: 'integrations', element: wrap(IntegrationsPage) },
      { path: 'users', element: wrap(UsersPage) },
      { path: 'processes', element: wrap(ProcessListPage) },
      { path: 'processes/modeler/:id', element: wrap(ProcessModelerPage) },
      { path: 'processes/instances', element: wrap(ProcessInstancesPage) },
      { path: 'processes/instances/:id', element: wrap(ProcessMonitorPage) },
      { path: 'processes/inbox', element: wrap(ProcessInboxPage) },
      { path: 'bugs',             element: wrap(BugListPage) },
      { path: 'bugs/dashboard',  element: wrap(BugDashboardPage) },
      { path: 'my-bugs',         element: wrap(MyBugsPage) },
      { path: 'permissions',     element: wrap(PermissionsPage) },
      { path: 'org-chart',       element: wrap(OrgChartPage) },
      { path: 'contracts',       element: wrap(ContractsPage) },
      { path: 'leaves',          element: wrap(LeavePage) },
      { path: 'my-overtime',     element: wrap(MyOvertimePage) },
      { path: 'expenses',        element: wrap(ExpensePage) },
      { path: 'budget',          element: wrap(BudgetPage) },
      { path: 'finance/budget',  element: wrap(FinanceBudgetPage) },
      { path: 'payroll',          element: wrap(PayrollPage) },
      { path: 'payroll/settings',   element: wrap(PayrollSettingsPage) },
      { path: 'payroll/my-payslips', element: wrap(MyPayslipsPage) },
      { path: 'invoices',             element: wrap(InvoicesPage) },
      { path: 'recruit/jobs',         element: wrap(RecruitJobsPage) },
      { path: 'recruit/candidates',   element: wrap(RecruitCandidatesPage) },
      { path: 'recruit/interviews',   element: wrap(RecruitInterviewsPage) },
      { path: 'recruit/pipeline',     element: wrap(RecruitPipelinePage) },
      { path: 'crm/customers',         element: wrap(CrmCustomersPage) },
      { path: 'crm/contacts',          element: wrap(CrmContactsPage) },
      { path: 'crm/leads',             element: wrap(CrmLeadsPage) },
      { path: 'crm/deals',             element: wrap(CrmDealsPage) },
      { path: 'crm/client-contracts',  element: wrap(CrmClientContractsPage) },
      { path: 'crm/activities',        element: wrap(CrmActivitiesPage) },
      { path: 'crm/forecast',          element: wrap(CrmForecastPage) },
      { path: 'crm/portal',            element: wrap(PortalManagePage) },
      { path: 'assets',             element: wrap(AssetsPage) },
      { path: 'assets/assignments', element: wrap(AssetAssignmentsPage) },
      { path: 'assets/maintenance', element: wrap(AssetMaintenancePage) },
      { path: 'accounting/accounts', element: wrap(ChartOfAccountsPage) },
      { path: 'accounting/journal',        element: wrap(JournalPage) },
      { path: 'accounting/financial-reports', element: wrap(FinancialReportsPage) },
      { path: 'hr/training',         element: wrap(HrTrainingPage) },
      { path: 'hr/performance',      element: wrap(HrPerformancePage) },
      { path: 'hr/skill-matrix',     element: wrap(SkillMatrixPage) },
      { path: 'hr/okr',             element: wrap(OkrPage) },
      // HR v4.0
      { path: 'hr/job-titles',       element: wrap(HrJobTitlesPage) },
      { path: 'hr/positions',        element: wrap(HrPositionsPage) },
      { path: 'hr/decisions',        element: wrap(HrDecisionsPage) },
      { path: 'hr/insurance',        element: wrap(HrInsurancePage) },
      { path: 'hr/employees/:employeeId', element: wrap(HrProfile360Page) },
      { path: 'hr/leave-policies',   element: wrap(HrLeavePolicyPage) },
      { path: 'hr/attendance',       element: wrap(HrAttendancePage) },
      { path: 'hr/holidays',         element: wrap(HrHolidaysPage) },

      { path: 'hr/overtime',         element: wrap(OvertimePage) },
      { path: 'hr/shifts',           element: wrap(HrShiftsPage) },
      { path: 'knowledge-base',       element: wrap(KnowledgeBasePage) },
      { path: 'procurement/vendors',  element: wrap(VendorsPage) },
      { path: 'procurement/orders',   element: wrap(PurchaseOrdersPage) },
      { path: 'import',               element: wrap(ImportPage) },
      { path: 'audit-log',            element: wrap(AuditLogPage) },
      { path: 'automation',           element: wrap(AutomationPage) },
      { path: 'scheduled-reports',    element: wrap(ScheduledReportsPage) },
      { path: 'admin/health',         element: wrap(HealthPage) },
      { path: 'admin/demo',           element: wrap(DemoModePage) },
      { path: 'module-config',        element: wrap(ModuleConfigPage) },
      { path: 'onboarding',           element: wrap(OnboardingWizardPage) },
      { path: 'feed',                 element: wrap(FeedPage) },
      { path: 'dashboard/work',       element: <Navigate to="/feed" replace /> },
      { path: 'dashboard/people',     element: <Navigate to="/feed" replace /> },
      { path: 'dashboard/finance',    element: wrap(FinanceDashboard) },
      { path: 'dashboard/crm',        element: wrap(CrmDashboard) },
      { path: 'dashboard/asset',      element: wrap(AssetDashboard) },
      { path: 'dashboard/ops',        element: wrap(OpsDashboard) },
      { path: 'dashboard/me',         element: wrap(MeDashboard) },
      { path: 'dashboard/admin',      element: wrap(AdminDashboard) },
      { path: 'assets/room-booking',  element: wrap(RoomBookingPage) },
      { path: 'assets/rooms',         element: wrap(RoomManagePage) },
      { path: 'assets/vehicles',      element: wrap(VehicleBookingPage) },
      { path: 'calendar',             element: wrap(CalendarPage) },
      { path: 'settings/tenant',      element: wrap(TenantSettingsPage) },
      { path: 'admin/tenants',        element: wrap(TenantsPage) },
      { path: 'hr/analytics',          element: wrap(HrAnalyticsPage) },
      { path: 'payroll/analytics',    element: wrap(PayrollAnalyticsPage) },
      { path: 'crm/analytics',        element: wrap(CrmAnalyticsPage) },
      { path: 'approvals/inbox',      element: wrap(ApprovalInboxPage) },
      { path: 'dashboard/executive',  element: wrap(ExecutiveDashboardPage) },
      { path: 'reports/builder',      element: wrap(ReportBuilderPage) },
      { path: 'reports/utilization',   element: wrap(UtilizationPage) },
      { path: 'projects/analytics',   element: wrap(ProjectAnalyticsPage) },
      { path: 'finance/analytics',    element: wrap(FinanceAnalyticsPage) },
      { path: 'hr/salary-bands',      element: wrap(SalaryBandPage) },
      { path: 'settings/delegation',  element: wrap(DelegationPage) },
    ],
  },
  { path: 'portal/:token', element: wrap(CustomerPortalPage) },
  { path: '*', element: <Navigate to="/" replace /> },
]);
