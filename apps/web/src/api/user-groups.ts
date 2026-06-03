import { apiClient } from './client';

const BASE = '/admin/user-groups';

export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
  _count?: { members: number; permissions: number };
  orgAccess?: { orgUnitId: string; includeChildren: boolean }[];
}

export interface UserGroupDetail extends Omit<UserGroup, 'orgAccess'> {
  permissions: { permCode: string }[];
  members: { user: { id: string; name: string; email: string; role: string; orgUnitId?: string } }[];
  orgAccess: { orgUnit: { id: string; name: string; code: string }; includeChildren: boolean }[];
}

export const userGroupsApi = {
  list: () => apiClient.get<UserGroup[]>(BASE).then(r => r.data),
  get: (id: string) => apiClient.get<UserGroupDetail>(`${BASE}/${id}`).then(r => r.data),
  create: (data: { name: string; description?: string; isDefault?: boolean }) =>
    apiClient.post<UserGroup>(BASE, data).then(r => r.data),
  update: (id: string, data: { name?: string; description?: string; isDefault?: boolean }) =>
    apiClient.put<UserGroup>(`${BASE}/${id}`, data).then(r => r.data),
  remove: (id: string) => apiClient.delete(`${BASE}/${id}`),

  getPermissions: (id: string) =>
    apiClient.get<string[]>(`${BASE}/${id}/permissions`).then(r => r.data),
  setPermissions: (id: string, permCodes: string[]) =>
    apiClient.put<{ permCodes: string[] }>(`${BASE}/${id}/permissions`, { permCodes }).then(r => r.data),

  addMember: (id: string, userId: string) =>
    apiClient.post(`${BASE}/${id}/members`, { userId }),
  removeMember: (id: string, userId: string) =>
    apiClient.delete(`${BASE}/${id}/members/${userId}`),

  setOrgAccess: (id: string, orgAccess: { orgUnitId: string; includeChildren: boolean }[]) =>
    apiClient.put(`${BASE}/${id}/org-access`, { orgAccess }).then(r => r.data),
};
