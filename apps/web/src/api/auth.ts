import { apiClient } from './client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  moduleRoles: string[];
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ data: UserProfile }>('/auth/login', { email, password }).then((r) => r.data.data),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get<UserProfile>('/auth/me').then((r) => r.data),
  changePassword: (oldPassword: string, newPassword: string) =>
    apiClient.patch('/auth/change-password', { oldPassword, newPassword }).then((r) => r.data),
};
