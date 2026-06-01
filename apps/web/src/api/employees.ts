import { apiClient } from './client';

export interface Employee {
  id: string;
  code: string;
  fullName: string;
  level: string;
  techStack: string[];
  orgUnitId?: string;
  orgUnit?: { id: string; name: string };
  positionId?: string | null;
  position?: { id: string; code: string; jobTitle?: { name: string } } | null;
  jobTitleId?: string | null;
  jobTitle?: { id: string; name: string } | null;
  leavePolicyId?: string | null;
  directManagerId?: string | null;
  startDate?: string;
  birthdate?: string;
  email?: string;
  // Thông tin cá nhân mở rộng
  gender?: string | null;
  maritalStatus?: string | null;
  phoneNumber?: string | null;
  hometown?: string | null;
  placeOfBirth?: string | null;
  ethnicity?: string | null;
  religion?: string | null;
  nationality?: string | null;
  // Giấy tờ tùy thân
  idType?: string | null;
  idNumber?: string | null;
  idIssueDate?: string | null;
  idIssuePlace?: string | null;
  cccd?: string | null;
  cccdIssueDate?: string | null;
  cccdIssuePlace?: string | null;
  // Địa chỉ
  permanentAddress?: string | null;
  currentAddress?: string | null;
  // Ngân hàng
  bankAccount?: string | null;
  bankName?: string | null;
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

export interface PaginatedResult<T> { data: T[]; total: number; page: number; limit: number; }

export const employeesApi = {
  me: () => apiClient.get<Employee>('/employees/me').then((r) => r.data),
  list: (params?: { page?: number; limit?: number; orgUnitId?: string }) =>
    apiClient.get<PaginatedResult<Employee>>('/employees', { params: { limit: 500, ...params } })
      .then((r) => r.data.data),
  get: (id: string) => apiClient.get<Employee>(`/employees/${id}`).then((r) => r.data),
  create: (data: Partial<Employee> & { password?: string }) =>
    apiClient.post<Employee>('/employees', data).then((r) => r.data),
  update: (id: string, data: Partial<Employee>) =>
    apiClient.put<Employee>(`/employees/${id}`, data).then((r) => r.data),
  getRates: (id: string) =>
    apiClient.get<PaginatedResult<EmployeeRate>>(`/employees/${id}/rates`).then((r) => r.data.data),
  addRate: (id: string, data: { ratePerDay: number; effectiveDate: string; currency?: string }) =>
    apiClient.post<EmployeeRate>(`/employees/${id}/rates`, data).then((r) => r.data),
  getProjectHistory: (id: string) =>
    apiClient.get<PaginatedResult<{ id: string; role: string; allocationPct: number; startDate: string; endDate: string; project: { id: string; name: string; code: string; type: string } }>>(
      `/employees/${id}/project-history`
    ).then((r) => r.data.data),
};
