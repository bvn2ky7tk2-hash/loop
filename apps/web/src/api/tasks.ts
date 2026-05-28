import { apiClient } from './client';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'PENDING_APPROVAL' | 'RETURNED' | 'CANCELLED';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  progress: number;
  level: number;
  estimateHours: number;
  actualHours: number;
  dueDate?: string;
  startDate?: string;
  createdAt?: string;
  assigneeId?: string;
  parentId?: string;
  projectId: string;
  children?: Task[];
  assignee?: { fullName: string; user?: { name: string } };
  project?: { id: string; code: string; name: string };
}

export const tasksApi = {
  tree: (projectId: string) =>
    apiClient.get<Task[]>(`/projects/${projectId}/tasks`).then((r) => r.data),
  get: (id: string) => apiClient.get<Task>(`/tasks/${id}`).then((r) => r.data),
  create: (projectId: string, data: Partial<Task>) =>
    apiClient.post<Task>(`/projects/${projectId}/tasks`, data).then((r) => r.data),
  update: (id: string, data: Partial<Task>) =>
    apiClient.put<Task>(`/tasks/${id}`, data).then((r) => r.data),
  approve: (id: string) => apiClient.post(`/tasks/${id}/approve`).then((r) => r.data),
  returnTask: (id: string, reason: string) =>
    apiClient.post(`/tasks/${id}/return`, { reason }).then((r) => r.data),
  resubmit: (id: string) => apiClient.post(`/tasks/${id}/resubmit`).then((r) => r.data),
  cancel: (id: string) => apiClient.post(`/tasks/${id}/cancel`).then((r) => r.data),
  updateProgress: (id: string, progressPct: number) =>
    apiClient.put(`/tasks/${id}/progress`, { progressPct }).then((r) => r.data),
  logEffort: (id: string, data: { hours: number; logDate: string; note?: string }) =>
    apiClient.post(`/tasks/${id}/log-effort`, data).then((r) => r.data),
  myTasksCount: (): Promise<{ total: number }> =>
    apiClient.get<{ total: number }>('/tasks/mine/count').then((r) => r.data),
  myTasks: (params?: { projectId?: string; employeeId?: string }): Promise<Task[]> =>
    apiClient.get<{ data: Task[] }>('/tasks/mine', { params }).then((r) => r.data.data),
  moveStatus: (id: string, status: TaskStatus, dueDate?: string): Promise<Task> =>
    apiClient.put<Task>(`/tasks/${id}/status`, { status, dueDate }).then((r) => r.data),
  pendingApproval: (): Promise<Task[]> =>
    apiClient.get<{ data: Task[] }>('/tasks/pending-approval').then((r) => r.data.data),
};
