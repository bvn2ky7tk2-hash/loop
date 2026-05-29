import { apiClient } from './client';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveType {
  id: string;
  name: string;
  maxDaysPerYear: number;
  isPaid: boolean;
  color: string;
  isActive: boolean;
  processDefinitionKey?: string | null;
}

export interface ProcessDefinitionRef {
  id: string;
  key: string | null;
  name: string;
  status: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: LeaveStatus;
  processInstanceId?: string | null;
  approvedById?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
  employee?: { id: string; fullName: string; code: string };
  leaveType?: LeaveType;
  approvedBy?: { id: string; name: string };
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalDays: number;
  usedDays: number;
  leaveType?: LeaveType;
}

export interface PaginatedLeaves {
  data:       LeaveRequest[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'time' | 'select';
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface LeaveFilterParams {
  page?: number;
  pageSize?: number;
  status?: LeaveStatus;
  employeeId?: string;
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
  myOnly?: boolean;
}

export const leavesApi = {
  list: (params?: LeaveFilterParams) =>
    apiClient.get<PaginatedLeaves>('/leaves', { params }).then((r) => r.data),
  getOne: (id: string) =>
    apiClient.get<LeaveRequest>(`/leaves/${id}`).then((r) => r.data),
  create: (data: {
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    days: number;
    reason?: string;
  }) => apiClient.post<LeaveRequest>('/leaves', data).then((r) => r.data),
  approve: (id: string, data: { status: 'APPROVED' | 'REJECTED'; rejectedReason?: string }) =>
    apiClient.patch<LeaveRequest>(`/leaves/${id}/approve`, data).then((r) => r.data),
  cancel: (id: string) =>
    apiClient.patch<LeaveRequest>(`/leaves/${id}/cancel`, {}).then((r) => r.data),
  getBalance: (employeeId: string, year?: number) =>
    apiClient
      .get<LeaveBalance[]>(`/leaves/balance/${employeeId}`, { params: { year } })
      .then((r) => r.data),
  getTypes: (): Promise<LeaveType[]> =>
    apiClient.get<LeaveType[]>('/leaves/types').then((r) => r.data),
  updateType: (id: string, data: { processDefinitionKey?: string | null }): Promise<LeaveType> =>
    apiClient.patch<LeaveType>(`/leaves/types/${id}`, data).then((r) => r.data),
  getFormSchema: (): Promise<{ fields: FormField[] }> =>
    apiClient.get<{ fields: FormField[] }>('/leaves/form-schema').then((r) => r.data),
};

export const processDefsApi = {
  listActive: (): Promise<ProcessDefinitionRef[]> =>
    apiClient
      .get('/processes/definitions', { params: { pageSize: 100 } })
      .then((r) => (r.data.data ?? r.data) as ProcessDefinitionRef[]),
};
