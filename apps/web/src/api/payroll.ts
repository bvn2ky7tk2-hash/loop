import { apiClient } from './client';

const BASE = '/payroll';

export type PayrollStatus = 'DRAFT' | 'PROCESSING' | 'APPROVED' | 'PAID';

export interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PayrollStatus;
  processedAt?: string;
  processedBy?: { id: string; name: string };
  _count?: { records: number };
}

export interface PayrollRecord {
  id: string;
  periodId: string;
  employeeId: string;
  workDays: number;
  leaveDays: number;
  overtimeHours: number;
  baseSalary: number;
  deductions: number;
  bonus: number;
  netSalary: number;
  note?: string;
  employee: {
    id: string;
    user: { id: string; name: string; email: string };
  };
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const payrollApi = {
  listPeriods: (page = 1, limit = 20) =>
    apiClient.get<PaginatedResult<PayrollPeriod>>(`${BASE}/periods`, { params: { page, limit } }).then(r => r.data),

  createPeriod: (data: { name: string; startDate: string; endDate: string }) =>
    apiClient.post<PayrollPeriod>(`${BASE}/periods`, data).then(r => r.data),

  generatePayroll: (periodId: string) =>
    apiClient.post<{ periodId: string; generated: number; status: string }>(`${BASE}/periods/${periodId}/generate`).then(r => r.data),

  getPeriodRecords: (periodId: string, page = 1, limit = 50) =>
    apiClient.get<PaginatedResult<PayrollRecord>>(`${BASE}/periods/${periodId}/records`, { params: { page, limit } }).then(r => r.data),

  updateRecord: (recordId: string, data: { bonus?: number; deductions?: number; note?: string }) =>
    apiClient.patch<PayrollRecord>(`${BASE}/records/${recordId}`, data).then(r => r.data),

  approvePeriod: (periodId: string) =>
    apiClient.post<PayrollPeriod>(`${BASE}/periods/${periodId}/approve`).then(r => r.data),

  markPaid: (periodId: string) =>
    apiClient.post<PayrollPeriod>(`${BASE}/periods/${periodId}/pay`).then(r => r.data),
};
