import { apiClient } from './client';
import type { OrgUnit } from '@loop/shared';

export interface LeaderInfo {
  id: string;
  fullName: string;
  code: string;
}

export interface OrgUnitTree extends OrgUnit {
  code: string;
  parentId: string | null;
  headJobTitleId?: string | null;
  headJobTitle?: { id: string; name: string } | null;
  children: OrgUnitTree[];
  _count?: { users: number };
  head?: { id: string; fullName: string; jobTitleName: string } | null;
  leaderInfo?: LeaderInfo | null;
}

export const orgUnitsApi = {
  getTree: () => apiClient.get<OrgUnitTree[]>('/org-units').then((r) => r.data),
  create: (data: { name: string; code: string; parentId?: string; headJobTitleId?: string }) =>
    apiClient.post<OrgUnitTree>('/org-units', data).then((r) => r.data),
  update: (id: string, data: { name?: string; code?: string; parentId?: string | null; headJobTitleId?: string | null; leaderId?: string | null }) =>
    apiClient.put<OrgUnitTree>(`/org-units/${id}`, data).then((r) => r.data),
  setLeader: (orgUnitId: string, leaderId: string | null) =>
    apiClient.patch<OrgUnitTree>(`/org-units/${orgUnitId}`, { leaderId }).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/org-units/${id}`),
};
