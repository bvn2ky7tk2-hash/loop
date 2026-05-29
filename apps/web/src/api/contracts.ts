import { apiClient } from './client';

export type ContractType = 'FULL_TIME' | 'PART_TIME' | 'PROBATION' | 'FREELANCE';
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export interface ContractAllowanceItem {
  id: string;
  allowanceTypeId: string;
  allowanceType: { id: string; name: string };
  amount: number;
  note?: string | null;
}

export interface ContractAllowanceInputItem {
  allowanceTypeId: string;
  amount: number;
  note?: string;
}

export interface Contract {
  id: string;
  employeeId: string;
  employee: { id: string; fullName: string; position?: string | null };
  type: ContractType;
  status: ContractStatus;
  startDate: string;
  endDate?: string | null;
  salaryMonthly: number;
  currency: string;
  note?: string | null;
  signedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  allowances: ContractAllowanceItem[];
}

export interface CreateContractDto {
  employeeId: string;
  type: ContractType;
  startDate: string;
  endDate?: string;
  salaryMonthly: number;
  currency?: string;
  note?: string;
  signedAt?: string;
  allowances?: ContractAllowanceInputItem[];
}

export interface PaginatedContracts {
  data: Contract[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const contractsApi = {
  list: (params: { employeeId?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedContracts>('/contracts', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<Contract>(`/contracts/${id}`).then((r) => r.data),

  create: (data: CreateContractDto) =>
    apiClient.post<Contract>('/contracts', data).then((r) => r.data),

  update: (id: string, data: Partial<CreateContractDto> & { status?: ContractStatus }) =>
    apiClient.patch<Contract>(`/contracts/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/contracts/${id}`),
};
