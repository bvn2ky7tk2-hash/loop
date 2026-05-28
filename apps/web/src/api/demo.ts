import { apiClient } from './client';

export interface DemoStatus {
  isDemoMode: boolean;
  lastReset: string | null;
}

export const demoApi = {
  getStatus: () => apiClient.get<DemoStatus>('/admin/demo/status').then((r) => r.data),
  reset: () => apiClient.post<{ message: string; status: string }>('/admin/demo/reset').then((r) => r.data),
};
