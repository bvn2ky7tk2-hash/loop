import { apiClient as api } from './client';

export interface AutomationRule {
  id: string;
  key: string;
  name: string;
  description?: string;
  cronExpr: string;
  isActive: boolean;
  lastRunAt?: string;
  runCount: number;
  createdAt: string;
}

export interface AutomationStats {
  totalRules: number;
  activeRules: number;
  lastRunAt: string | null;
}

export const automationApi = {
  getStats: () => api.get<AutomationStats>('/automation/stats').then(r => r.data),
  listRules: () => api.get<AutomationRule[]>('/automation/rules').then(r => r.data),
  toggleRule: (key: string, isActive: boolean) =>
    api.put<AutomationRule>(`/automation/rules/${key}/toggle`, { isActive }).then(r => r.data),
  triggerRule: (key: string) =>
    api.post<AutomationRule>(`/automation/trigger/${key}`).then(r => r.data),
};
