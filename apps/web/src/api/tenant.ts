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
  currency?:     string | null;
}

export const tenantApi = {
  getConfig: (slug?: string) =>
    apiClient.get<TenantConfig>('/tenants/config', { params: slug ? { slug } : undefined })
      .then(r => r.data),
  update: (data: Partial<TenantConfig>) =>
    apiClient.patch<TenantConfig>('/tenants/config', data).then(r => r.data),
  uploadLogo: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<{ logoUrl: string }>('/tenants/logo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};
