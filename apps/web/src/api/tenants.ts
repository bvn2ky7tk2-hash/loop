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
  createdAt: string;
  updatedAt: string;
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
};
