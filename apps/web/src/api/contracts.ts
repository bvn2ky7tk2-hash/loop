import { apiClient } from './client';

// Loại HĐ theo BLLĐ 2019 (Điều 20)
export type ContractType =
  | 'PROBATION'   // Thử việc (≤60 ngày phổ thông, ≤180 ngày quản lý)
  | 'FIXED_12'    // Xác định thời hạn 12 tháng
  | 'FIXED_24'    // Xác định thời hạn 24 tháng
  | 'FIXED_36'    // Xác định thời hạn 36 tháng
  | 'INDEFINITE'  // Không xác định thời hạn (vô thời hạn)
  | 'PART_TIME'   // Bán thời gian
  | 'SEASONAL';   // Thời vụ / Công việc cụ thể

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
  employee: {
    id: string;
    fullName: string;
    code: string;
    level?: string | null;
    orgUnit?: { id: string; name: string; code: string } | null;
    position?: { id: string; code: string; jobTitle?: { id: string; name: string } | null } | null;
  };
  type: ContractType;
  status: ContractStatus;
  startDate: string;
  endDate?: string | null;
  salaryMonthly: number;
  insuranceSalary?: number | null;
  currency: string;
  note?: string | null;
  signedAt?: string | null;
  renewalCount: number;
  previousContractId?: string | null;
  previousContract?: { id: string; type: ContractType; startDate: string; endDate?: string | null } | null;
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
  insuranceSalary?: number | null;
  currency?: string;
  note?: string;
  signedAt?: string;
  allowances?: ContractAllowanceInputItem[];
}

export interface RenewContractDto {
  type: ContractType;
  startDate: string;
  endDate?: string;
  salaryMonthly?: number;
  note?: string;
  signedAt?: string;
  signedById?: string;
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
  list: (params: { employeeId?: string; orgUnitId?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedContracts>('/contracts', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<Contract>(`/contracts/${id}`).then((r) => r.data),

  create: (data: CreateContractDto) =>
    apiClient.post<Contract>('/contracts', data).then((r) => r.data),

  update: (id: string, data: Partial<CreateContractDto> & { status?: ContractStatus }) =>
    apiClient.patch<Contract>(`/contracts/${id}`, data).then((r) => r.data),

  renew: (id: string, data: RenewContractDto) =>
    apiClient.post<Contract>(`/contracts/${id}/renew`, data).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/contracts/${id}`),
};
