import { apiClient } from './client';

const BASE = '/payroll';

export type PayrollStatus = 'DRAFT' | 'PROCESSING' | 'REVIEWED' | 'APPROVED' | 'PAID';
export type PayrollPeriodType = 'REGULAR' | 'ADJUSTMENT' | 'MONTH_13';
export type SalaryColumnSource = 'CONTRACT_SALARY' | 'ALLOWANCE_TYPE' | 'FIXED_VALUE' | 'FORMULA';
export type SalaryColumnType = 'EARNING' | 'DEDUCTION';
export type AllowanceCalculationMode = 'FIXED' | 'PER_WORK_DAY';

export interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PayrollStatus;
  type?: PayrollPeriodType;
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
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  overtimeHours: number;
  baseSalary: number;
  grossSalary: number;
  overtimePay: number;
  allowances: number;
  deductions: number;
  bonus: number;
  bhxhEmployee: number;
  bhytEmployee: number;
  bhtnEmployee: number;
  bhxhEmployer: number;
  bhytEmployer: number;
  bhtnEmployer: number;
  tnldEmployer: number;
  taxableIncome: number;
  selfDeduction: number;
  dependentDeduction: number;
  dependentCount: number;
  pitAmount: number;
  netSalary: number;
  totalLaborCost: number;
  note?: string;
  overrideNote?: string;
  configSnapshot?: Record<string, any>;
  employee: {
    id: string;
    code?: string;
    fullName: string;
    user: { id: string; name: string; email: string };
    orgUnit?: { id: string; name: string } | null;
    position?: { jobTitle?: { id: string; name: string } | null } | null;
  };
}

export interface InsuranceConfig {
  id: string;
  tenantId?: string | null;
  effectiveFrom: string;
  bhxhEmployeeRate: number;
  bhytEmployeeRate: number;
  bhtnEmployeeRate: number;
  bhxhEmployerRate: number;
  bhytEmployerRate: number;
  bhtnEmployerRate: number;
  tnldRate: number;
  bhxhCeilingMultiple: number;
  wageBase: number;
  bhxhCeiling?: number;
  createdAt: string;
}

export interface TaxBracket {
  id: string;
  tenantId?: string | null;
  name: string;
  effectiveFrom: string;
  brackets: Array<{ from: number; to: number | null; rate: number }>;
  createdAt: string;
}

export interface TaxDeductionConfig {
  id: string;
  tenantId?: string | null;
  effectiveFrom: string;
  selfDeduction: number;
  dependentDeduction: number;
  createdAt: string;
}

export interface SalaryColumn {
  id: string;
  tenantId?: string | null;
  name: string;
  type: SalaryColumnType;
  source: SalaryColumnSource;
  allowanceTypeId?: string | null;
  fixedValue?: number | null;
  formula?: string | null;
  isBhxhExempt: boolean;
  isPitExempt: boolean;
  pitExemptCeiling?: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  allowanceType?: { id: string; name: string } | null;
}

export interface AllowanceType {
  id: string;
  name: string;
  defaultAmount: number;
  calculationMode: AllowanceCalculationMode;
  isBhxhExempt: boolean;
  isPitExempt: boolean;
  pitExemptCeiling?: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Dependent {
  id: string;
  name: string;
  relationship: string;
  taxId?: string | null;
  registeredFrom: string;
  registeredTo?: string | null;
}

export interface EmployeeTaxProfile {
  id: string;
  employeeId: string;
  taxId?: string | null;
  residencyStatus: 'RESIDENT' | 'NON_RESIDENT';
  wageZone: number;
  dependents: Dependent[];
}

export const payrollApi = {
  // ── My Payslips ────────────────────────────────────────────────────────────
  getMyRecords: () =>
    apiClient.get<any[]>(`${BASE}/my-records`).then(r => r.data),

  // ── Periods ────────────────────────────────────────────────────────────────
  listPeriods: (page = 1, limit = 20) =>
    apiClient.get<PaginatedResult<PayrollPeriod>>(`${BASE}/periods`, { params: { page, limit } }).then(r => r.data),

  createPeriod: (data: { name: string; startDate: string; endDate: string }) =>
    apiClient.post<PayrollPeriod>(`${BASE}/periods`, data).then(r => r.data),

  generatePayroll: (periodId: string) =>
    apiClient.post<{ periodId: string; generated: number; status: string }>(`${BASE}/periods/${periodId}/generate`).then(r => r.data),

  reviewPeriod: (periodId: string) =>
    apiClient.post<PayrollPeriod>(`${BASE}/periods/${periodId}/review`).then(r => r.data),

  rerunPeriod: (periodId: string) =>
    apiClient.post<{ periodId: string; generated: number; status: string }>(`${BASE}/periods/${periodId}/rerun`).then(r => r.data),

  approvePeriod: (periodId: string) =>
    apiClient.post<PayrollPeriod>(`${BASE}/periods/${periodId}/approve`).then(r => r.data),

  markPaid: (periodId: string) =>
    apiClient.post<PayrollPeriod>(`${BASE}/periods/${periodId}/pay`).then(r => r.data),

  calculate13thMonth: (periodId: string) =>
    apiClient.post<{ periodId: string; generated: number; year: number; status: string }>(`${BASE}/periods/${periodId}/calculate-13th`).then(r => r.data),

  createMonth13Period: (data: { name: string; startDate: string; endDate: string }) =>
    apiClient.post<PayrollPeriod>(`${BASE}/periods`, { ...data, type: 'MONTH_13' }).then(r => r.data),

  // ── Records ────────────────────────────────────────────────────────────────
  getPeriodRecords: (periodId: string, page = 1, limit = 50) =>
    apiClient.get<PaginatedResult<PayrollRecord>>(`${BASE}/periods/${periodId}/records`, { params: { page, limit } }).then(r => r.data),

  updateRecord: (recordId: string, data: { bonus?: number; deductions?: number; note?: string }) =>
    apiClient.patch<PayrollRecord>(`${BASE}/records/${recordId}`, data).then(r => r.data),

  // ── Insurance Config ───────────────────────────────────────────────────────
  listInsuranceConfigs: (page = 1, limit = 20) =>
    apiClient.get<PaginatedResult<InsuranceConfig>>(`${BASE}/insurance-configs`, { params: { page, limit } }).then(r => r.data),

  getActiveInsuranceConfig: () =>
    apiClient.get<InsuranceConfig>(`${BASE}/insurance-configs/active`).then(r => r.data),

  createInsuranceConfig: (data: Omit<InsuranceConfig, 'id' | 'createdAt' | 'bhxhCeiling'>) =>
    apiClient.post<InsuranceConfig>(`${BASE}/insurance-configs`, data).then(r => r.data),

  deleteInsuranceConfig: (id: string) =>
    apiClient.delete(`${BASE}/insurance-configs/${id}`).then(r => r.data),

  updateInsuranceConfig: (id: string, data: Partial<InsuranceConfig>) =>
    apiClient.patch<InsuranceConfig>(`${BASE}/insurance-configs/${id}`, data).then(r => r.data),

  // ── Tax Bracket ────────────────────────────────────────────────────────────
  listTaxBrackets: (page = 1, limit = 20) =>
    apiClient.get<PaginatedResult<TaxBracket>>(`${BASE}/tax-brackets`, { params: { page, limit } }).then(r => r.data),

  getActiveTaxBracket: () =>
    apiClient.get<TaxBracket>(`${BASE}/tax-brackets/active`).then(r => r.data),

  createTaxBracket: (data: { name: string; effectiveFrom: string; brackets: TaxBracket['brackets'] }) =>
    apiClient.post<TaxBracket>(`${BASE}/tax-brackets`, data).then(r => r.data),

  deleteTaxBracket: (id: string) =>
    apiClient.delete(`${BASE}/tax-brackets/${id}`).then(r => r.data),

  updateTaxBracket: (id: string, data: Partial<TaxBracket>) =>
    apiClient.patch<TaxBracket>(`${BASE}/tax-brackets/${id}`, data).then(r => r.data),

  // ── Tax Deduction ──────────────────────────────────────────────────────────
  listTaxDeductions: (page = 1, limit = 20) =>
    apiClient.get<PaginatedResult<TaxDeductionConfig>>(`${BASE}/tax-deductions`, { params: { page, limit } }).then(r => r.data),

  getActiveTaxDeduction: () =>
    apiClient.get<TaxDeductionConfig>(`${BASE}/tax-deductions/active`).then(r => r.data),

  createTaxDeduction: (data: { effectiveFrom: string; selfDeduction: number; dependentDeduction: number }) =>
    apiClient.post<TaxDeductionConfig>(`${BASE}/tax-deductions`, data).then(r => r.data),

  // ── Salary Columns ─────────────────────────────────────────────────────────
  // Backend trả SalaryColumn[] trực tiếp (không phân trang)
  listSalaryColumns: () =>
    apiClient.get<SalaryColumn[]>(`${BASE}/salary-columns`).then(r => r.data),

  createSalaryColumn: (data: Partial<SalaryColumn>) =>
    apiClient.post<SalaryColumn>(`${BASE}/salary-columns`, data).then(r => r.data),

  updateSalaryColumn: (id: string, data: Partial<SalaryColumn>) =>
    apiClient.patch<SalaryColumn>(`${BASE}/salary-columns/${id}`, data).then(r => r.data),

  // ── Allowance Types ────────────────────────────────────────────────────────
  listAllowanceTypes: () =>
    apiClient.get<AllowanceType[]>(`${BASE}/allowance-types`).then(r => r.data),

  createAllowanceType: (data: Omit<AllowanceType, 'id' | 'createdAt'>) =>
    apiClient.post<AllowanceType>(`${BASE}/allowance-types`, data).then(r => r.data),

  updateAllowanceType: (id: string, data: Partial<Omit<AllowanceType, 'id' | 'createdAt'>>) =>
    apiClient.patch<AllowanceType>(`${BASE}/allowance-types/${id}`, data).then(r => r.data),

  // ── Employee Tax Profile ───────────────────────────────────────────────────
  getEmployeeTaxProfile: (employeeId: string) =>
    apiClient.get<EmployeeTaxProfile>(`${BASE}/employees/${employeeId}/tax-profile`).then(r => r.data),

  upsertEmployeeTaxProfile: (employeeId: string, data: { taxId?: string; residencyStatus: string; wageZone: number }) =>
    apiClient.put<EmployeeTaxProfile>(`${BASE}/employees/${employeeId}/tax-profile`, data).then(r => r.data),

  // ── Dependents ─────────────────────────────────────────────────────────────
  listDependents: (employeeId: string) =>
    apiClient.get<Dependent[]>(`${BASE}/employees/${employeeId}/dependents`).then(r => r.data),

  addDependent: (employeeId: string, data: { name: string; relationship: string; taxId?: string; registeredFrom: string }) =>
    apiClient.post<Dependent>(`${BASE}/employees/${employeeId}/dependents`, data).then(r => r.data),

  terminateDependent: (employeeId: string, dependentId: string, data: { registeredTo: string }) =>
    apiClient.patch<Dependent>(`${BASE}/employees/${employeeId}/dependents/${dependentId}/terminate`, data).then(r => r.data),

  deleteDependent: (employeeId: string, dependentId: string) =>
    apiClient.delete(`${BASE}/employees/${employeeId}/dependents/${dependentId}`).then(r => r.data),

  // ── Lấy presigned URL phiếu lương PDF ────────────────────────────────────
  getPayslipUrl: (recordId: string) =>
    apiClient.get<{ url: string | null; pending: boolean }>(`${BASE}/records/${recordId}/payslip`).then(r => r.data),

  // ── Báo cáo thuế TNCN năm (05-QTT-TNCN) ─────────────────────────────────
  downloadPitAnnual: async (year: number) => {
    const res = await apiClient.get(`${BASE}/reports/pit-annual`, {
      params: { year },
      responseType: 'blob',
    });
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `05-QTT-TNCN-${year}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Báo cáo chi phí lao động theo kỳ ────────────────────────────────────
  downloadLaborCost: async (periodId: string, periodName: string) => {
    const res = await apiClient.get(`${BASE}/reports/labor-cost/${periodId}`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chi-phi-lao-dong-${periodName.replace(/\s+/g, '-')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
