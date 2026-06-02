import { apiClient } from './client';

export interface DemoStatus {
  isDemoMode: boolean;
  snapshotExists: boolean;
  snapshotSizeKb: number | null;
  lastReset: string | null;
  lastSnapshot: string | null;
  rowCount: number | null;
}

export interface SnapshotResult {
  message: string;
  path: string;
  rowCount: number;
}

export interface ResetResult {
  message: string;
  resetAt: string;
}

export const demoApi = {
  getStatus: () => apiClient.get<DemoStatus>('/admin/demo/status').then((r) => r.data),
  createSnapshot: () => apiClient.post<SnapshotResult>('/admin/demo/snapshot').then((r) => r.data),
  reset: () => apiClient.post<ResetResult>('/admin/demo/reset').then((r) => r.data),
};
