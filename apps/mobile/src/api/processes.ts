import { api } from './client';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select';
  required: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: { label: string; value: string }[];
}

export interface ProcessDefinition {
  id: string;
  name: string;
  description?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'DEPRECATED';
  version: number;
  formFields?: FormField[] | null;
  taskFormFields?: FormField[] | null;
}

export interface ProcessInstance {
  id: string;
  definitionId: string;
  status: 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'ERROR';
  variables: Record<string, unknown>;
  startedAt: string;
  definition: { id: string; name: string; version: number };
  startedByUser: { id: string; name: string };
}

export interface ProcessUserTask {
  id: string;
  instanceId: string;
  activityId: string;
  name: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  assigneeId: string | null;
  assignee: { id: string; name: string } | null;
  createdAt: string;
  instance: {
    id: string;
    status: string;
    variables: Record<string, unknown>;
    definition: { id: string; name: string; version: number; taskFormFields?: FormField[] | null };
  };
}

interface PagedResponse<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
}

export const processesApi = {
  getDefinitions: (page = 1, pageSize = 20) =>
    api.get<PagedResponse<ProcessDefinition>>(
      `/processes/definitions?page=${page}&pageSize=${pageSize}`,
    ),

  getInstances: (page = 1, pageSize = 20, status?: string) =>
    api.get<PagedResponse<ProcessInstance>>(
      `/processes/instances?page=${page}&pageSize=${pageSize}${status ? `&status=${status}` : ''}`,
    ),

  startInstance: (definitionId: string, variables?: Record<string, unknown>) =>
    api.post<{ data: ProcessInstance }>('/processes/instances', { definitionId, variables }),

  cancelInstance: (instanceId: string) =>
    api.patch<{ data: ProcessInstance }>(`/processes/instances/${instanceId}/cancel`, {}),

  getUserTasks: (page = 1, pageSize = 20, instanceId?: string) =>
    api.get<PagedResponse<ProcessUserTask>>(
      `/processes/user-tasks?page=${page}&pageSize=${pageSize}${instanceId ? `&instanceId=${instanceId}` : ''}`,
    ),

  claimTask: (taskId: string) =>
    api.patch<{ data: ProcessUserTask }>(`/processes/user-tasks/${taskId}/claim`, {}),

  completeTask: (taskId: string, variables?: Record<string, unknown>) =>
    api.post<{ data: ProcessUserTask }>(`/processes/user-tasks/${taskId}/complete`, { variables }),
};
