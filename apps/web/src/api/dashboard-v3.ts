import { apiClient as api } from './client';

// ─── Work ──────────────────────────────────────────────────────────────────
export interface WorkDashboardData {
  myOpenTasks: number;
  myOverdueTasks: number;
  openBugs: number;
  pendingBpmTasks: number;
  timesheetHoursThisWeek: number;
}

// ─── People ────────────────────────────────────────────────────────────────
export interface PeopleDashboardData {
  headcount: number;
  openPositions: number;
  pendingLeaves: number;
  expiringContracts: number;
  pendingTimesheetApprovals: number;
}

// ─── Finance ───────────────────────────────────────────────────────────────
export interface FinanceDashboardData {
  pendingExpenses: number;
  outstandingInvoices: number;
  outstandingInvoicesValue: number;
  monthlyPayroll: number;
  budgetUtilization: number;
}

// ─── CRM ──────────────────────────────────────────────────────────────────
export interface CrmDashboardData {
  openLeads: number;
  activeDeals: number;
  totalPipelineValue: number;
  activitiesThisWeek: number;
}

// ─── Asset ────────────────────────────────────────────────────────────────
export interface AssetCategoryItem {
  category: string;
  count: number;
}

export interface AssetDashboardData {
  totalAssets: number;
  assignedAssets: number;
  inMaintenance: number;
  dueSoon: number;
  byCategory?: AssetCategoryItem[];
}

// ─── Ops ──────────────────────────────────────────────────────────────────
export interface OpsDashboardData {
  activeProcesses: number;
  pendingUserTasks: number;
  automationRulesActive: number;
  failedJobs: number;
}

// ─── Me ───────────────────────────────────────────────────────────────────
export interface MeDashboardData {
  myPendingTasks: number;
  myOpenBugs: number;
  leaveBalance: number;
  nextPayslipDate: string | null;
}

// ─── Admin ────────────────────────────────────────────────────────────────
export interface AdminDashboardData {
  totalUsers: number;
  activeUsers: number;
  recentlyActiveUsers: number;
  totalModules: number;
  systemStatus: string;
}

// ─── Finance Summary (6 tháng) ────────────────────────────────────────────
export interface FinanceSummaryItem {
  month: string;      // 'YYYY-MM'
  revenue: number;
  expense: number;
}

// ─── My Tasks Summary ─────────────────────────────────────────────────────
export interface MyTasksSummary {
  todo: number;
  inProgress: number;
  review: number;
  done: number;
}

// ─── Work Trend (7 ngày) ──────────────────────────────────────────────────
export interface WorkTrendItem {
  date: string;       // 'YYYY-MM-DD'
  completed: number;
}

// ─── People By Dept ───────────────────────────────────────────────────────
export interface PeopleByDeptItem {
  dept: string;
  count: number;
}

// ─── API ──────────────────────────────────────────────────────────────────
export const dashboardV3Api = {
  getWork: (): Promise<WorkDashboardData> =>
    api.get('/api/v1/dashboard/work').then((r) => r.data),

  getPeople: (): Promise<PeopleDashboardData> =>
    api.get('/api/v1/dashboard/people').then((r) => r.data),

  getFinance: (): Promise<FinanceDashboardData> =>
    api.get('/api/v1/dashboard/finance').then((r) => r.data),

  getCrm: (): Promise<CrmDashboardData> =>
    api.get('/api/v1/dashboard/crm').then((r) => r.data),

  getAsset: (): Promise<AssetDashboardData> =>
    api.get('/api/v1/dashboard/asset').then((r) => r.data),

  getOps: (): Promise<OpsDashboardData> =>
    api.get('/api/v1/dashboard/ops').then((r) => r.data),

  getMe: (): Promise<MeDashboardData> =>
    api.get('/api/v1/dashboard/me').then((r) => r.data),

  getAdmin: (): Promise<AdminDashboardData> =>
    api.get('/api/v1/dashboard/admin').then((r) => r.data),

  getFinanceSummary: (): Promise<FinanceSummaryItem[]> =>
    api.get('/api/v1/dashboard/finance-summary').then((r) => r.data),

  getMyTasksSummary: (): Promise<MyTasksSummary> =>
    api.get('/api/v1/dashboard/my-tasks-summary').then((r) => r.data),

  getWorkTrend: (): Promise<WorkTrendItem[]> =>
    api.get('/api/v1/dashboard/work-trend').then((r) => r.data),

  getPeopleByDept: (): Promise<PeopleByDeptItem[]> =>
    api.get('/api/v1/dashboard/people-by-dept').then((r) => r.data),
};
