import { api } from './client';

export type InsuranceStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';

export interface InsuranceEvent {
  id: string;
  eventType: string;
  insuranceSalary?: number | string | null;
  effectiveDate: string;
  reason?: string | null;
}

export interface InsuranceEnrollment {
  id: string;
  bhxhBookNumber?: string | null;
  insuranceSalary: number | string;
  startDate: string;
  endDate?: string | null;
  status: InsuranceStatus;
  events?: InsuranceEvent[];
  socialInsuranceBook?: { bookNumber?: string | null } | null;
}

export interface MyEnrollmentResponse {
  employee: { id: string; fullName: string; code: string } | null;
  enrollment: InsuranceEnrollment | null;
}

export const insuranceApi = {
  mine: () => api.get<MyEnrollmentResponse>('/hr-insurance/my-enrollment'),
};
