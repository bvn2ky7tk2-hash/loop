import { apiClient } from './client';

export interface TopEmployee {
  userId: string;
  name: string;
  code: string;
  level: string;
  orgUnit: string;
  totalHours: number;
}

export interface BurndownData {
  project: { id: string; name: string; startDate: string; endDate: string; budgetEffortMm: number | null };
  summary: { totalEstimate: number; totalActual: number; doneEstimate: number; progress: number };
  burndown: { date: string; dailyHours: number; cumulativeHours: number }[];
}

export interface OrgSummary {
  id: string; name: string; code: string; employeeCount: number; projectCount: number;
}

export interface MonthlyHours {
  month: string;
  totalHours: number;
}

export type ReportType =
  | 'PROJECT_COST'
  | 'PERSONNEL_ALLOCATION'
  | 'TASK_PROGRESS'
  | 'ALERT_HISTORY'
  | 'TIMESHEET_SUMMARY';

export interface BugStats {
  byStatus: { status: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  byProject: { projectId: string; projectName: string; projectCode: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
}

export interface HrStats {
  leave: {
    byStatus: { status: string; count: number }[];
    byType: { typeId: string; typeName: string; color: string; count: number }[];
  };
  expense: {
    byStatus: { status: string; count: number }[];
    byCategory: { category: string; count: number; totalAmount: number }[];
  };
}

export interface GenerateReportParams {
  reportType: ReportType;
  startDate: string;
  endDate: string;
  projectIds?: string[];
  employeeIds?: string[];
}

export const reportsApi = {
  topEmployees: (limit = 10) =>
    apiClient.get<TopEmployee[]>('/reports/top-employees', { params: { limit } }).then((r) => r.data),
  projectBurndown: (projectId: string) =>
    apiClient.get<BurndownData>(`/reports/project-burndown/${projectId}`).then((r) => r.data),
  orgSummary: () =>
    apiClient.get<OrgSummary[]>('/reports/org-summary').then((r) => r.data),
  monthlyHours: (months = 6) =>
    apiClient.get<MonthlyHours[]>('/reports/monthly-hours', { params: { months } }).then((r) => r.data),
  bugStats: () =>
    apiClient.get<BugStats>('/reports/bug-stats').then((r) => r.data),
  hrStats: () =>
    apiClient.get<HrStats>('/reports/hr-stats').then((r) => r.data),

  generate: async (params: GenerateReportParams): Promise<void> => {
    const res = await apiClient.post('/reports/generate', params, { responseType: 'blob' });
    const cd = res.headers['content-disposition'] ?? '';
    const match = cd.match(/filename="(.+)"/);
    const filename = match?.[1] ?? `loop-report-${params.reportType}.xlsx`;
    const url = URL.createObjectURL(new Blob([res.data as BlobPart]));
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },
};
