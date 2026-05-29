import { apiClient } from './client';

export type InsuranceEnrollmentStatus = 'ACTIVE' | 'TERMINATED' | 'SUSPENDED';
export type InsuranceEventType = 'ENROLL' | 'TERMINATE' | 'SALARY_CHANGE' | 'SUSPEND';

export interface InsuranceEnrollment {
  id: string;
  employeeId: string;
  employee?: { id: string; fullName: string; code: string; orgUnitId: string };
  bhxhBookNumber?: string;
  insuranceSalary: number;
  startDate: string;
  endDate?: string;
  status: InsuranceEnrollmentStatus;
  events?: InsuranceEvent[];
  socialInsuranceBook?: SocialInsuranceBook;
}

export interface InsuranceEvent {
  id: string;
  enrollmentId: string;
  eventType: InsuranceEventType;
  insuranceSalary?: number;
  effectiveDate: string;
  reason?: string;
  createdAt: string;
}

export interface SocialInsuranceBook {
  id: string;
  bookNumber: string;
  issueDate?: string;
  issueAuthority?: string;
  receivedByEmployee: boolean;
  receivedDate?: string;
}

export interface InsuranceDashboard {
  totalActive: number;
  thisMonth: { enrolled: number; terminated: number; salaryChanged: number };
  missingBook: number;
  bookNotReceived: number;
}

export interface InsuranceD02Preview {
  enrolled: Array<{ employeeCode: string; fullName: string; insuranceSalary: number; effectiveDate: string; reason?: string }>;
  terminated: Array<{ employeeCode: string; fullName: string; insuranceSalary: number; effectiveDate: string; reason?: string }>;
  salaryChanged: Array<{ employeeCode: string; fullName: string; oldSalary: number; newSalary: number; effectiveDate: string }>;
}

export const hrInsuranceApi = {
  listEnrollments: (params?: {
    page?: number;
    limit?: number;
    orgUnitId?: string;
    status?: string;
    search?: string;
  }) =>
    apiClient
      .get('/hr-insurance/enrollments', { params })
      .then((r) => r.data),

  getByEmployee: (employeeId: string) =>
    apiClient
      .get<InsuranceEnrollment>(`/hr-insurance/enrollments/employee/${employeeId}`)
      .then((r) => r.data),

  enroll: (data: {
    employeeId: string;
    insuranceSalary: number;
    startDate: string;
    bhxhBookNumber?: string;
  }) =>
    apiClient.post('/hr-insurance/enrollments', data).then((r) => r.data),

  createEvent: (data: {
    enrollmentId: string;
    eventType: InsuranceEventType;
    insuranceSalary?: number;
    effectiveDate: string;
    reason?: string;
  }) =>
    apiClient.post('/hr-insurance/events', data).then((r) => r.data),

  getDashboard: () =>
    apiClient.get<InsuranceDashboard>('/hr-insurance/dashboard').then((r) => r.data),

  upsertBook: (data: {
    employeeId: string;
    bookNumber: string;
    issueDate?: string;
    issueAuthority?: string;
  }) =>
    apiClient.post('/hr-insurance/books', data).then((r) => r.data),

  updateBook: (id: string, data: { receivedByEmployee?: boolean; receivedDate?: string }) =>
    apiClient.patch(`/hr-insurance/books/${id}`, data).then((r) => r.data),

  exportD02: (year: number, month: number) =>
    apiClient
      .get<InsuranceD02Preview>('/hr-insurance/export/d02', { params: { year, month } })
      .then((r) => r.data),
};
