import { apiClient } from './client';

export interface TenantConfig {
  id:            string;
  name:          string;
  slug:          string;
  logoUrl?:      string | null;
  faviconUrl?:   string | null;
  primaryColor?: string | null;
  customDomain?: string | null;
  address?:      string | null;
  timezone:      string;
}

export const tenantApi = {
  getConfig: (slug?: string) =>
    apiClient.get<TenantConfig>('/tenant/config', { params: slug ? { slug } : undefined })
      .then(r => r.data),
  update: (data: Partial<TenantConfig>) =>
    apiClient.patch<TenantConfig>('/tenant/config', data).then(r => r.data),
};
