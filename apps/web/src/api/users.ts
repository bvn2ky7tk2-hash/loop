import { apiClient } from './client';
import type { UserProfile } from '@loop/shared';

export interface UserEmployeeInfo {
  code?: string;
  fullName: string;
  orgUnit?: { name: string } | null;
  jobTitle?: { name: string } | null;
  position?: { code: string; jobTitle?: { name: string } | null } | null;
}

export interface UserRecord extends UserProfile {
  name: string;
  isActive: boolean;
  createdAt: string;
  orgUnitName: string | null;
  orgUnitId?: string;
  employee?: UserEmployeeInfo | null;
}

export const usersApi = {
  list: () => apiClient.get<UserRecord[]>('/users').then((r) => r.data),
  search: (q: string) =>
    apiClient.get<{ id: string; name: string }[]>('/users', { params: { search: q, limit: 10 } }).then((r) => r.data),
  create: (data: { email: string; name: string; password: string; role: string; orgUnitId: string; employeeId?: string }) =>
    apiClient.post<UserRecord>('/users', data).then((r) => r.data),
  update: (id: string, data: { name?: string; email?: string; role?: string; orgUnitId?: string; isActive?: boolean }) =>
    apiClient.put<UserRecord>(`/users/${id}`, data).then((r) => r.data),
  changePassword: (id: string, newPassword: string) =>
    apiClient.put(`/users/${id}/password`, { newPassword }),
};
