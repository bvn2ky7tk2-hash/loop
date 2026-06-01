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

// ─── Today Events ─────────────────────────────────────────────────────────
export interface TodayEventPerson {
  id: string;
  name: string;
  dept: string;
}

export interface TodayAnniversaryPerson extends TodayEventPerson {
  years: number;
}

export interface TodayEvents {
  birthdays: TodayEventPerson[];
  anniversaries: TodayAnniversaryPerson[];
  newHires: TodayEventPerson[];
}

// ─── Attendance & Payroll ─────────────────────────────────────────────────
export interface AttendanceDashboardData {
  pendingLeaves: number;
  pendingOT: number;
  lateThisMonth: number;
  otHoursThisMonth: number;
  monthlyPayrollTotal: number;
  latestPeriodName: string | null;
  latestPeriodStatus: string | null;
}

export interface AttendanceTrendItem {
  date: string;      // 'YYYY-MM-DD'
  present: number;
  late: number;
}

// ─── Recruit ──────────────────────────────────────────────────────────────
export interface CandidateByStageItem {
  stage: string;
  count: number;
}

export interface RecruitDashboardData {
  openJobs: number;
  totalCandidates: number;
  newCandidatesThisMonth: number;
  interviewsThisWeek: number;
  hiredThisMonth: number;
  byStage: CandidateByStageItem[];
}

// ─── API ──────────────────────────────────────────────────────────────────
export const dashboardV3Api = {
  getWork: (): Promise<WorkDashboardData> =>
    api.get('/dashboard/work').then((r) => r.data),

  getPeople: (): Promise<PeopleDashboardData> =>
    api.get('/dashboard/people').then((r) => r.data),

  getFinance: (): Promise<FinanceDashboardData> =>
    api.get('/dashboard/finance').then((r) => r.data),

  getCrm: (): Promise<CrmDashboardData> =>
    api.get('/dashboard/crm').then((r) => r.data),

  getAsset: (): Promise<AssetDashboardData> =>
    api.get('/dashboard/asset').then((r) => r.data),

  getOps: (): Promise<OpsDashboardData> =>
    api.get('/dashboard/ops').then((r) => r.data),

  getMe: (): Promise<MeDashboardData> =>
    api.get('/dashboard/me').then((r) => r.data),

  getAdmin: (): Promise<AdminDashboardData> =>
    api.get('/dashboard/admin').then((r) => r.data),

  getFinanceSummary: (): Promise<FinanceSummaryItem[]> =>
    api.get('/dashboard/finance-summary').then((r) => r.data),

  getMyTasksSummary: (): Promise<MyTasksSummary> =>
    api.get('/dashboard/my-tasks-summary').then((r) => r.data),

  getWorkTrend: (): Promise<WorkTrendItem[]> =>
    api.get('/dashboard/work-trend').then((r) => r.data),

  getPeopleByDept: (): Promise<PeopleByDeptItem[]> =>
    api.get('/dashboard/people-by-dept').then((r) => r.data),

  getTodayEvents: (): Promise<TodayEvents> =>
    api.get('/dashboard/today-events').then((r) => r.data),

  getAttendance: (): Promise<AttendanceDashboardData> =>
    api.get('/dashboard/attendance').then((r) => r.data),

  getAttendanceTrend: (): Promise<AttendanceTrendItem[]> =>
    api.get('/dashboard/attendance-trend').then((r) => r.data),

  getRecruit: (): Promise<RecruitDashboardData> =>
    api.get('/dashboard/recruit').then((r) => r.data),
};
