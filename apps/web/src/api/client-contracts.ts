import { apiClient } from './client';

export type ClientContractType   = 'SERVICE' | 'PRODUCT' | 'SUPPORT' | 'SLA' | 'OTHER';
export type ClientContractStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type MilestoneStatus      = 'PENDING' | 'INVOICED' | 'PAID';

export interface ContractMilestone {
  id:         string;
  contractId: string;
  name:       string;
  dueDate:    string;
  amount:     number;
  status:     MilestoneStatus;
  paidAt?:    string | null;
  notes?:     string | null;
  createdAt:  string;
}

export interface ClientContract {
  id:          string;
  contractNo?: string | null;
  title:       string;
  customerId:  string;
  dealId?:     string | null;
  type:        ClientContractType;
  value?:      number | null;
  currency:    string;
  startDate:   string;
  endDate?:    string | null;
  signedAt?:   string | null;
  status:      ClientContractStatus;
  notes?:      string | null;
  createdAt:   string;
  customer:    { id: string; code: string; name: string };
  milestones:  ContractMilestone[];
}

export interface ContractStats {
  total:       number;
  byStatus:    Partial<Record<ClientContractStatus, number>>;
  activeValue: number;
}

const BASE = '/crm/client-contracts';

export const clientContractsApi: any = {
  stats: () =>
    apiClient.get<ContractStats>(`${BASE}/stats`).then(r => r.data),

  list: (params?: { customerId?: string; status?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: ClientContract[]; total: number; totalPages: number }>(BASE, { params }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<ClientContract>(`${BASE}/${id}`).then(r => r.data),

  create: (data: {
    contractNo?: string; title: string; customerId: string; dealId?: string;
    type: ClientContractType; value?: number; currency?: string;
    startDate: string; endDate?: string; signedAt?: string;
    status?: ClientContractStatus; notes?: string;
  }) => apiClient.post<ClientContract>(BASE, data).then(r => r.data),

  update: (id: string, data: Partial<Parameters<typeof clientContractsApi.create>[0]>) =>
    apiClient.put<ClientContract>(`${BASE}/${id}`, data).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete(`${BASE}/${id}`).then(r => r.data),

  addMilestone: (contractId: string, data: { name: string; dueDate: string; amount: number; status?: MilestoneStatus; notes?: string }) =>
    apiClient.post<ContractMilestone>(`${BASE}/${contractId}/milestones`, data).then(r => r.data),

  updateMilestone: (contractId: string, milestoneId: string, data: Partial<{ name: string; dueDate: string; amount: number; status: MilestoneStatus; paidAt: string; notes: string }>) =>
    apiClient.patch<ContractMilestone>(`${BASE}/${contractId}/milestones/${milestoneId}`, data).then(r => r.data),

  deleteMilestone: (contractId: string, milestoneId: string) =>
    apiClient.delete(`${BASE}/${contractId}/milestones/${milestoneId}`).then(r => r.data),
};
