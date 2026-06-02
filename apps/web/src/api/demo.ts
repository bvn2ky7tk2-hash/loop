import { apiClient } from './client';

export interface DemoSnapshotItem {
  id: string;
  label: string;
  createdAt: string;
  sizeKb: number;
  rowCount: number;
  lastUsedAt: string | null;
}

export interface DemoStatus {
  isDemoMode: boolean;
  snapshotCount: number;
  lastReset: string | null;
  snapshots: DemoSnapshotItem[];
}

export interface SnapshotResult {
  id: string;
  label: string;
  createdAt: string;
  sizeKb: number;
  rowCount: number;
}

export interface ResetResult {
  message: string;
  snapshotId: string;
  resetAt: string;
}

export const demoApi = {
  getStatus: () => apiClient.get<DemoStatus>('/admin/demo/status').then((r) => r.data),
  createSnapshot: (label?: string) =>
    apiClient.post<SnapshotResult>('/admin/demo/snapshot', { label }).then((r) => r.data),
  reset: (snapshotId: string) =>
    apiClient.post<ResetResult>('/admin/demo/reset', { snapshotId }).then((r) => r.data),
  deleteSnapshot: (id: string) =>
    apiClient.delete<{ message: string }>(`/admin/demo/snapshot/${id}`).then((r) => r.data),
};
