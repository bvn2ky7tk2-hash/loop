import { apiClient } from './client';

export interface DashboardSummary {
  projects: {
    total: number;
    byStatus: Record<string, number>;
  };
  tasks: {
    total: number;
    byStatus: Record<string, number>;
  };
  employees: { total: number };
  overdueTasks: {
    id: string; title: string; dueDate: string;
    project: { name: string; code: string };
  }[];
  upcomingTasks: {
    id: string; title: string; dueDate: string;
    project: { name: string; code: string };
  }[];
  recentTimeLogs: {
    id: string; hours: number; logDate: string;
    task: { title: string };
    user: { name: string };
  }[];
}

export const dashboardApi = {
  getSummary: () => apiClient.get<DashboardSummary>('/dashboard').then((r) => r.data),
};
