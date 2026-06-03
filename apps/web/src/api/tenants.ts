import { apiClient } from './client';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  customDomain?: string;
  address?: string;
  timezone?: string;
  isActive: boolean;
  isDefault: boolean;
  // Quota giới hạn gói — null = không giới hạn
  maxUsers?: number | null;
  maxProjects?: number | null;
  maxEmployees?: number | null;
  maxStorageMb?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantUsageItem {
  used: number;
  max: number | null;
}

export interface TenantUsage {
  users: TenantUsageItem;
  projects: TenantUsageItem;
  employees: TenantUsageItem;
  storage: { usedBytes: number; maxMb: number | null };
}

export interface TenantModule {
  moduleId: string;
  isEnabled: boolean;
  displayName: string;
  description?: string | null;
  isCore: boolean;
}

export interface CreateTenantPayload {
  name: string;
  slug: string;
  primaryColor?: string;
  timezone?: string;
  address?: string;
  logoUrl?: string;
  faviconUrl?: string;
  customDomain?: string;
  isActive?: boolean;
  isDefault?: boolean;
  maxUsers?: number | null;
  maxProjects?: number | null;
  maxEmployees?: number | null;
  maxStorageMb?: number | null;
}

export type UpdateTenantPayload = Partial<CreateTenantPayload>;

export const tenantsApi = {
  list: () => apiClient.get<Tenant[]>('/tenants').then((r) => r.data),
  get: (id: string) => apiClient.get<Tenant>(`/tenants/${id}`).then((r) => r.data),
  create: (data: CreateTenantPayload) => apiClient.post<Tenant>('/tenants', data).then((r) => r.data),
  update: (id: string, data: UpdateTenantPayload) =>
    apiClient.patch<Tenant>(`/tenants/${id}`, data).then((r) => r.data),
  deactivate: (id: string) => apiClient.delete(`/tenants/${id}`),
  getCurrent: () => apiClient.get<Tenant>('/tenants/current').then((r) => r.data),
  usage: (id: string) => apiClient.get<TenantUsage>(`/tenants/${id}/usage`).then((r) => r.data),
  modules: (id: string) => apiClient.get<TenantModule[]>(`/tenants/${id}/modules`).then((r) => r.data),
  setModule: (id: string, moduleId: string, isEnabled: boolean) =>
    apiClient.put<{ moduleId: string; isEnabled: boolean }>(`/tenants/${id}/modules/${moduleId}`, { isEnabled }).then((r) => r.data),
};
