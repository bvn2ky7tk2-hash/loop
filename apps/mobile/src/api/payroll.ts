import { api } from './client';

// Decimal của Prisma serialize sang JSON là string → dùng number | string rồi Number() khi hiển thị.
type Dec = number | string;

export interface PayrollRecord {
  id: string;
  periodName: string;
  periodStart: string;
  periodEnd: string;
  workDays: Dec;
  overtimeHours: Dec;
  baseSalary: Dec;
  grossSalary: Dec;
  overtimePay: Dec;
  allowances: Dec;
  bonus: Dec;
  deductions: Dec;
  bhxhEmployee: Dec;
  bhytEmployee: Dec;
  bhtnEmployee: Dec;
  pitAmount: Dec;
  netSalary: Dec;
  payslipPath?: string | null;
}

export const payrollApi = {
  myRecords: () => api.get<PayrollRecord[]>('/payroll/my-records'),
  payslipUrl: (recordId: string) =>
    api.get<{ url: string | null; pending: boolean }>(`/payroll/records/${recordId}/payslip`),
};
