import { apiClient } from './client';

export interface Employee {
  id: string;
  code: string;
  fullName: string;
  level: string;
  techStack: string[];
  orgUnitId?: string;
  startDate?: string;
  birthdate?: string;
  email?: string;
  cccd?: string;
  cccdIssueDate?: string;
  cccdIssuePlace?: string;
  userId?: string;
  user?: { name: string; email: string };
  currentRate?: number;
  activeProjectCount?: number;
}

export interface EmployeeRate {
  id: string;
  ratePerDay: number;
  effectiveDate: string;
  currency: string;
}

export const employeesApi = {
  list: () => apiClient.get<Employee[]>('/employees').then((r) => r.data),
  get: (id: string) => apiClient.get<Employee>(`/employees/${id}`).then((r) => r.data),
  create: (data: Partial<Employee> & { password?: string }) =>
    apiClient.post<Employee>('/employees', data).then((r) => r.data),
  update: (id: string, data: Partial<Employee>) =>
    apiClient.put<Employee>(`/employees/${id}`, data).then((r) => r.data),
  getRates: (id: string) =>
    apiClient.get<EmployeeRate[]>(`/employees/${id}/rates`).then((r) => r.data),
  addRate: (id: string, data: { ratePerDay: number; effectiveDate: string; currency?: string }) =>
    apiClient.post<EmployeeRate>(`/employees/${id}/rates`, data).then((r) => r.data),
  getProjectHistory: (id: string) =>
    apiClient.get<{ id: string; role: string; allocationPct: number; startDate: string; endDate: string; project: { id: string; name: string; code: string; type: string } }[]>(
      `/employees/${id}/project-history`
    ).then((r) => r.data),
};
