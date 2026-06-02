import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JobTitle {
  id: string;
  code: string;
  name: string;
  band?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  leavePolicyId?: string | null;
  leavePolicy?: { id: string; name: string; baseAnnualDays: number; accrualMode: string } | null;
  _count?: { positions: number };
}

export interface LeavePolicyLite {
  id: string;
  name: string;
  baseAnnualDays: number;
  accrualMode: 'ANNUAL_UPFRONT' | 'MONTHLY_ACCRUAL';
}

export interface Position {
  id: string;
  code: string;
  jobTitleId: string;
  jobTitle?: { name: string };
  orgUnitId: string;
  orgUnit?: { id: string; name: string };
  headcount: number;
  isHead: boolean;
  description?: string;
  isActive: boolean;
  status?: 'FILLED' | 'VACANT' | 'OVER_CAPACITY'; // computed
  _count?: { employees: number };
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Job Titles API ───────────────────────────────────────────────────────────

export const jobTitlesApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) =>
    apiClient
      .get<PaginatedResult<JobTitle>>('/job-titles', { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<JobTitle>(`/job-titles/${id}`).then((r) => r.data),

  create: (data: {
    code: string;
    name: string;
    band?: string;
    description?: string;
    leavePolicyId?: string | null;
  }) =>
    apiClient.post<JobTitle>('/job-titles', data).then((r) => r.data),

  update: (id: string, data: Partial<JobTitle>) =>
    apiClient.patch<JobTitle>(`/job-titles/${id}`, data).then((r) => r.data),

  deactivate: (id: string) =>
    apiClient.delete(`/job-titles/${id}/deactivate`).then((r) => r.data),
};

// ─── Leave Policies API (cho dropdown gán theo chức danh) ──────────────────────

export const leavePoliciesApi = {
  list: () =>
    apiClient
      .get<PaginatedResult<LeavePolicyLite>>('/leave-policies', { params: { limit: 100 } })
      .then((r) => r.data.data),
};

// ─── Positions API ────────────────────────────────────────────────────────────

export const positionsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    orgUnitId?: string;
    jobTitleId?: string;
    isActive?: boolean;
  }) =>
    apiClient
      .get<PaginatedResult<Position>>('/positions', { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Position>(`/positions/${id}`).then((r) => r.data),

  vacant: (orgUnitId?: string) =>
    apiClient
      .get<Position[]>('/positions/vacant', { params: { orgUnitId } })
      .then((r) => r.data),

  create: (data: {
    code: string;
    jobTitleId: string;
    orgUnitId: string;
    headcount?: number;
    description?: string;
  }) =>
    apiClient.post<Position>('/positions', data).then((r) => r.data),

  update: (id: string, data: Partial<Position>) =>
    apiClient.patch<Position>(`/positions/${id}`, data).then((r) => r.data),

  setHead: (positionId: string) =>
    apiClient.patch<Position>(`/positions/${positionId}`, { isHead: true }).then((r) => r.data),

  clearHead: (positionId: string) =>
    apiClient.patch<Position>(`/positions/${positionId}`, { isHead: false }).then((r) => r.data),
};
