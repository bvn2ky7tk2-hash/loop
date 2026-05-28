import { apiClient } from './client';

const BASE = '/admin/permissions';

export interface PermissionDef {
  code: string;
  module: string;
  action: string;
  description?: string;
}

export interface ModuleRole {
  code: string;
  name: string;
  domain: string;
  description?: string;
  isSystem: boolean;
  _count?: { permissions: number; userRoles: number };
}

export interface UserOverride {
  permissionCode: string;
  granted: boolean;
}

export const permissionsApi = {
  listAll: () => apiClient.get<PermissionDef[]>(`${BASE}`).then((r) => r.data),

  // System role permissions
  getRolePermissions: (role: string) =>
    apiClient.get<string[]>(`${BASE}/roles/${role}`).then((r) => r.data),
  setRolePermissions: (role: string, codes: string[]) =>
    apiClient.put<string[]>(`${BASE}/roles/${role}`, { codes }).then((r) => r.data),

  // Module roles
  listModuleRoles: () =>
    apiClient.get<ModuleRole[]>(`${BASE}/module-roles`).then((r) => r.data),
  createModuleRole: (data: { code: string; name: string; domain: string; description?: string }) =>
    apiClient.post<ModuleRole>(`${BASE}/module-roles`, data).then((r) => r.data),
  deleteModuleRole: (roleCode: string) =>
    apiClient.delete(`${BASE}/module-roles/${roleCode}`),
  getModuleRolePermissions: (roleCode: string) =>
    apiClient.get<string[]>(`${BASE}/module-roles/${roleCode}/permissions`).then((r) => r.data),
  setModuleRolePermissions: (roleCode: string, codes: string[]) =>
    apiClient.put<string[]>(`${BASE}/module-roles/${roleCode}/permissions`, { codes }).then((r) => r.data),

  // User module roles
  getUserModuleRoles: (userId: string) =>
    apiClient.get<{ code: string; name: string; domain: string }[]>(`${BASE}/users/${userId}/module-roles`).then((r) => r.data),
  assignModuleRole: (userId: string, roleCode: string) =>
    apiClient.post(`${BASE}/users/${userId}/module-roles`, { roleCode }),
  removeModuleRole: (userId: string, roleCode: string) =>
    apiClient.delete(`${BASE}/users/${userId}/module-roles/${roleCode}`),

  // User overrides
  getUserOverrides: (userId: string) =>
    apiClient.get<UserOverride[]>(`${BASE}/users/${userId}/overrides`).then((r) => r.data),
  upsertOverride: (userId: string, permissionCode: string, granted: boolean) =>
    apiClient.put(`${BASE}/users/${userId}/overrides`, { permissionCode, granted }),
  deleteOverride: (userId: string, permissionCode: string) =>
    apiClient.delete(`${BASE}/users/${userId}/overrides/${permissionCode}`),

  // Effective permissions
  getUserEffective: (userId: string) =>
    apiClient.get<string[]>(`${BASE}/users/${userId}/effective`).then((r) => r.data),
};
