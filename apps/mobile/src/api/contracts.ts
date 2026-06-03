import { api } from './client';

export type ContractType = 'PROBATION' | 'FIXED_12' | 'FIXED_24' | 'FIXED_36' | 'INDEFINITE' | 'PART_TIME' | 'SEASONAL';
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export interface Contract {
  id: string;
  type: ContractType;
  status: ContractStatus;
  startDate: string;
  endDate?: string | null;
  salaryMonthly: number | string;
  insuranceSalary?: number | string | null;
  signedAt?: string | null;
  renewalCount: number;
  note?: string | null;
  employee?: { id: string; fullName: string; code: string } | null;
}

interface Paginated<T> { data: T[]; meta: { total: number; page: number; limit: number } }

export const contractsApi = {
  mine: () => api.get<Paginated<Contract>>('/contracts/mine?page=1&limit=100'),
};
