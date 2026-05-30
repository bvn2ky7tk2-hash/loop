import { apiClient } from './client';

export interface UserPermissionRow {
  userId: string;
  userName: string;
  email: string;
  role: string;
  permissions: string[];
  moduleRoles: string[];
}

export const permissionAuditApi = {
  getMatrix: () =>
    apiClient.get<UserPermissionRow[]>('/admin/permissions/audit').then((r) => r.data),

  search: (action: string) =>
    apiClient.get<UserPermissionRow[]>('/admin/permissions/search', { params: { action } }).then((r) => r.data),

  exportExcel: () =>
    apiClient.get('/admin/permissions/audit/export', { responseType: 'blob' }).then((r) => {
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `permission-audit-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    }),
};
