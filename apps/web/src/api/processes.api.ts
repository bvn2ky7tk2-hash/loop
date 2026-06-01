import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DefinitionStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED';
export type InstanceStatus = 'RUNNING' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED' | 'ERROR';
export type UserTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface CriterionConfig {
  key: string;
  label: string;
  weight: number; // 0-100, tổng các criteria phải = 100
}

export interface CriteriaGridValue {
  scores: Record<string, number>;
  weightedTotal: number;
}

export type FormField =
  | {
      name: string;
      label: string;
      type: 'text' | 'number' | 'date' | 'time' | 'textarea' | 'select';
      required?: boolean;
      placeholder?: string;
      options?: { label: string; value: string }[];
      min?: number;
      max?: number;
    }
  | {
      name: string;
      label: string;
      type: 'criteria_grid';
      required?: boolean;
      criteria: CriterionConfig[];
      scoreMin: number;
      scoreMax: number;
    };

// ─── Step Config Types ────────────────────────────────────────────────────────

export type AssigneeMode = 'fixed' | 'orgunit' | 'requester_manager' | 'variable';
export type SystemRole = 'ADMIN' | 'PM' | 'MEMBER' | 'LEADERSHIP';

export interface AssigneeConfig {
  mode: AssigneeMode;
  userId?: string;          // mode=fixed
  orgUnitId?: string;       // mode=orgunit
  role?: SystemRole;        // mode=orgunit — filter theo system role
  variablePath?: string;    // mode=variable
}

export interface NotificationTrigger {
  enabled: boolean;
  recipients: string[];     // 'assignee' | 'requester' | 'requester_manager' | 'user:{id}' | '{{variables.X}}'
  subject: string;
  bodyTemplate: string;
}

export interface StepNotificationConfig {
  taskAssigned?: NotificationTrigger;
  taskCompleted?: NotificationTrigger;
}

export interface StepConfigItem {
  assigneeConfig?: AssigneeConfig;
  notificationConfig?: StepNotificationConfig;
}

export type StepConfigMap = Record<string, StepConfigItem>;

// ─── Process Definition ───────────────────────────────────────────────────────

export interface ProcessDefinition {
  id: string;
  name: string;
  description?: string;
  version: number;
  bpmnXml?: string;
  formFields?: FormField[] | null;
  taskFormFields?: Record<string, FormField[]> | null;
  stepConfig?: StepConfigMap | null;
  orgUnitId: string;
  status: DefinitionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessInstance {
  id: string;
  definitionId: string;
  projectId?: string;
  startedBy: string;
  status: InstanceStatus;
  variables: Record<string, unknown>;
  tokenState: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  definition?: { id: string; name: string; version: number; bpmnXml?: string };
  startedByUser?: { id: string; name: string };
  userTasks?: ProcessUserTask[];
}

export interface ProcessUserTask {
  id: string;
  instanceId: string;
  activityId: string;
  name: string;
  assigneeId?: string;
  candidateRoles: string[];
  formData?: Record<string, unknown>;
  status: UserTaskStatus;
  dueDate?: string;
  completedAt?: string;
  instance?: {
    id: string;
    status: InstanceStatus;
    variables?: Record<string, unknown>;
    startedByUser?: {
      id: string;
      name: string;
      employee?: {
        code: string;
        fullName: string;
        orgUnit?: { name: string } | null;
        position?: { jobTitle?: { name: string } | null } | null;
      } | null;
    };
    definition?: {
      id: string;
      name: string;
      version: number;
      taskFormFields?: Record<string, FormField[]> | null;
    };
  };
  assignee?: { id: string; name: string };
}

export interface ProcessActivityLog {
  id: string;
  instanceId: string;
  activityId: string;
  activityName: string;
  activityType: string;
  performedBy?: string;
  startedAt: string;
  completedAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
}

export interface SingleResponse<T> {
  data: T;
}

// ─── API functions ────────────────────────────────────────────────────────────

export const processesApi = {
  // Definitions
  listDefinitions: (params?: { page?: number; pageSize?: number }) =>
    apiClient
      .get<PaginatedResponse<ProcessDefinition>>('/processes/definitions', { params })
      .then((r) => r.data),

  getDefinition: (id: string) =>
    apiClient
      .get<SingleResponse<ProcessDefinition>>(`/processes/definitions/${id}`)
      .then((r) => r.data),

  createDefinition: (data: { name: string; description?: string; bpmnXml: string }) =>
    apiClient
      .post<SingleResponse<ProcessDefinition>>('/processes/definitions', data)
      .then((r) => r.data),

  updateDefinition: (
    id: string,
    data: {
      name?: string;
      description?: string;
      bpmnXml?: string;
      formFields?: FormField[] | null;
      taskFormFields?: Record<string, FormField[]> | null;
      stepConfig?: StepConfigMap | null;
    },
  ) =>
    apiClient
      .put<SingleResponse<ProcessDefinition>>(`/processes/definitions/${id}`, data)
      .then((r) => r.data),

  patchDefinitionStatus: (id: string, status: DefinitionStatus) =>
    apiClient
      .patch<SingleResponse<ProcessDefinition>>(`/processes/definitions/${id}/status`, { status })
      .then((r) => r.data),

  deleteDefinition: (id: string) =>
    apiClient.delete(`/processes/definitions/${id}`).then((r) => r.data),

  // Instances
  listInstances: (params?: { page?: number; pageSize?: number; definitionId?: string; status?: InstanceStatus }) =>
    apiClient
      .get<PaginatedResponse<ProcessInstance>>('/processes/instances', { params })
      .then((r) => r.data),

  getInstance: (id: string) =>
    apiClient
      .get<SingleResponse<ProcessInstance>>(`/processes/instances/${id}`)
      .then((r) => r.data),

  startInstance: (data: { definitionId: string; projectId?: string; variables?: Record<string, unknown> }) =>
    apiClient
      .post<SingleResponse<ProcessInstance>>('/processes/instances', data)
      .then((r) => r.data),

  cancelInstance: (id: string) =>
    apiClient
      .patch<SingleResponse<ProcessInstance>>(`/processes/instances/${id}/cancel`)
      .then((r) => r.data),

  getActivityLog: (id: string) =>
    apiClient
      .get<SingleResponse<ProcessActivityLog[]>>(`/processes/instances/${id}/activity-log`)
      .then((r) => r.data),

  // User Tasks
  countUserTasks: (): Promise<{ total: number }> =>
    apiClient.get<{ total: number }>('/processes/user-tasks/count').then((r) => r.data),

  listUserTasks: (params?: { page?: number; pageSize?: number; instanceId?: string }) =>
    apiClient
      .get<PaginatedResponse<ProcessUserTask>>('/processes/user-tasks', { params })
      .then((r) => r.data),

  getUserTask: (id: string) =>
    apiClient
      .get<SingleResponse<ProcessUserTask>>(`/processes/user-tasks/${id}`)
      .then((r) => r.data),

  claimTask: (id: string) =>
    apiClient
      .patch<SingleResponse<ProcessUserTask>>(`/processes/user-tasks/${id}/claim`)
      .then((r) => r.data),

  completeTask: (id: string, variables?: Record<string, unknown>) =>
    apiClient
      .post<SingleResponse<ProcessUserTask>>(`/processes/user-tasks/${id}/complete`, { variables })
      .then((r) => r.data),

  returnTask: (id: string, reason?: string) =>
    apiClient
      .post<SingleResponse<ProcessUserTask>>(`/processes/user-tasks/${id}/return`, { reason })
      .then((r) => r.data),

  batchApprove: (taskIds: string[], decision: 'APPROVE' | 'REJECT') =>
    apiClient
      .post<{ data: { id: string; status: 'ok' | 'error'; message?: string }[]; meta: { total: number; ok: number; errors: number } }>(
        '/processes/user-tasks/batch-approve',
        { taskIds, decision },
      )
      .then((r) => r.data),
};

// ─── TanStack Query Hooks ─────────────────────────────────────────────────────

export function useDefinitions(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ['process-definitions', params],
    queryFn: () => processesApi.listDefinitions(params),
  });
}

export function useDefinition(id: string) {
  return useQuery({
    queryKey: ['process-definition', id],
    queryFn: () => processesApi.getDefinition(id),
    enabled: !!id,
  });
}

export function useCreateDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: processesApi.createDefinition,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['process-definitions'] }),
  });
}

export function useUpdateDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        description?: string;
        bpmnXml?: string;
        formFields?: FormField[] | null;
        taskFormFields?: Record<string, FormField[]> | null;
        stepConfig?: StepConfigMap | null;
      };
    }) => processesApi.updateDefinition(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['process-definitions'] });
    },
  });
}

export function usePatchDefinitionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DefinitionStatus }) =>
      processesApi.patchDefinitionStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['process-definitions'] }),
  });
}

export function useDeleteDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => processesApi.deleteDefinition(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['process-definitions'] }),
  });
}

export function useInstances(params?: { page?: number; pageSize?: number; definitionId?: string; status?: InstanceStatus }) {
  return useQuery({
    queryKey: ['process-instances', params],
    queryFn: () => processesApi.listInstances(params),
  });
}

export function useInstance(id: string) {
  return useQuery({
    queryKey: ['process-instance', id],
    queryFn: () => processesApi.getInstance(id),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useStartInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: processesApi.startInstance,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['process-instances'] }),
  });
}

export function useCancelInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: processesApi.cancelInstance,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['process-instances'] }),
  });
}

export function useActivityLog(id: string) {
  return useQuery({
    queryKey: ['process-activity-log', id],
    queryFn: () => processesApi.getActivityLog(id),
    enabled: !!id,
  });
}

export function useUserTasks(params?: { page?: number; pageSize?: number; instanceId?: string }) {
  return useQuery({
    queryKey: ['process-user-tasks', params],
    queryFn: () => processesApi.listUserTasks(params),
  });
}

export function useUserTask(id: string) {
  return useQuery({
    queryKey: ['process-user-task', id],
    queryFn: () => processesApi.getUserTask(id),
    enabled: !!id,
  });
}

export function useClaimTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: processesApi.claimTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['process-user-tasks'] }),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, variables }: { id: string; variables?: Record<string, unknown> }) =>
      processesApi.completeTask(id, variables),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['process-user-tasks'] });
      qc.invalidateQueries({ queryKey: ['process-instances'] });
    },
  });
}

export function useReturnTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      processesApi.returnTask(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['process-user-tasks'] }),
  });
}
