import { apiClient } from './client';

export interface DelegationRule {
  id: string;
  delegatorId: string;
  delegateId: string;
  delegate: { id: string; name: string; email: string };
  moduleTypes: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  note?: string;
  tenantId?: string;
  createdAt: string;
}

export interface CreateDelegationPayload {
  delegateId: string;
  moduleTypes: string[];
  startDate: string;
  endDate: string;
  note?: string;
}

export interface PaginatedDelegations {
  data: DelegationRule[];
  meta: { total: number; page: number; limit: number };
}

export const delegationApi = {
  list: (page = 1, limit = 50) =>
    apiClient
      .get<PaginatedDelegations>('/delegation/rules', { params: { page, limit } })
      .then((r) => r.data),

  create: (payload: CreateDelegationPayload) =>
    apiClient
      .post<DelegationRule>('/delegation/rules', payload)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient
      .delete(`/delegation/rules/${id}`)
      .then((r) => r.data),
};
