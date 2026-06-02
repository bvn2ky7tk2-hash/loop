import { apiClient } from './client';

export type HrDecisionType =
  | 'HIRE'
  | 'PROBATION_END'
  | 'TRANSFER'
  | 'POSITION_CHANGE'
  | 'SALARY_CHANGE'
  | 'COMMENDATION'
  | 'DISCIPLINE'
  | 'TERMINATION'
  | 'PROMOTION'
  | 'SECONDMENT';

export type HrDecisionStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface HrDecision {
  id: string;
  decisionNumber?: string;
  type: HrDecisionType;
  employeeId: string;
  employee?: {
    id: string;
    fullName: string;
    code: string;
    orgUnit?: { name: string } | null;
    position?: { jobTitle?: { name: string } | null } | null;
  };
  signedDate?: string;
  effectiveDate: string;
  content?: string;
  signedBy?: string;
  notes?: string;
  status: HrDecisionStatus;
  fromOrgUnitId?: string;
  toOrgUnitId?: string;
  fromPositionId?: string;
  toPositionId?: string;
  fromSalary?: number;
  toSalary?: number;
  pdfPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HrDecisionListParams {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
  type?: HrDecisionType;
  status?: HrDecisionStatus;
  orgUnitId?: string;
  effectiveDateFrom?: string;
  effectiveDateTo?: string;
}

export const hrDecisionsApi = {
  list: (params?: HrDecisionListParams) =>
    apiClient
      .get<PaginatedResult<HrDecision>>('/hr-decisions', { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<HrDecision>(`/hr-decisions/${id}`).then((r) => r.data),

  byEmployee: (employeeId: string) =>
    apiClient
      .get<HrDecision[]>(`/hr-decisions/by-employee/${employeeId}`)
      .then((r) => r.data),

  create: (data: Partial<HrDecision>) =>
    apiClient.post<HrDecision>('/hr-decisions', data).then((r) => r.data),

  update: (id: string, data: Partial<HrDecision>) =>
    apiClient.patch<HrDecision>(`/hr-decisions/${id}`, data).then((r) => r.data),

  submit: (id: string) =>
    apiClient.post(`/hr-decisions/${id}/submit`).then((r) => r.data),

  approve: (id: string) =>
    apiClient.post(`/hr-decisions/${id}/approve`).then((r) => r.data),

  reject: (id: string, reason: string) =>
    apiClient
      .post(`/hr-decisions/${id}/reject`, { reason })
      .then((r) => r.data),
};
