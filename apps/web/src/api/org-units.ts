import { apiClient } from './client';
import type { OrgUnit } from '@loop/shared';

export interface OrgUnitTree extends OrgUnit {
  code: string;
  parentId?: string | null;
  children: OrgUnitTree[];
  _count?: { users: number };
}

export const orgUnitsApi = {
  getTree: () => apiClient.get<OrgUnitTree[]>('/org-units').then((r) => r.data),
  create: (data: { name: string; code: string; parentId?: string }) =>
    apiClient.post<OrgUnitTree>('/org-units', data).then((r) => r.data),
  update: (id: string, data: { name?: string; code?: string; parentId?: string | null }) =>
    apiClient.put<OrgUnitTree>(`/org-units/${id}`, data).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/org-units/${id}`),
};
