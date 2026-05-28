import api from './auth';

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
export interface AssetDashboardData {
  totalAssets: number;
  assignedAssets: number;
  inMaintenance: number;
  dueSoon: number;
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
};
