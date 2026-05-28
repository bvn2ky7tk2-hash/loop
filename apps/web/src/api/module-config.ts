import { apiClient } from './client';

export interface ModuleConfig {
  id: string;
  moduleId: string;
  isEnabled: boolean;
  displayName: string;
  description?: string;
  isCore: boolean;
  updatedAt: string;
}

export const moduleConfigApi = {
  listModules: () =>
    apiClient.get<ModuleConfig[]>('/module-config').then((r) => r.data),

  toggleModule: (moduleId: string, isEnabled: boolean) =>
    apiClient.put<ModuleConfig>(`/module-config/${moduleId}/toggle`, { isEnabled }).then((r) => r.data),

  getModuleStatus: (moduleId: string) =>
    apiClient.get<{ isEnabled: boolean }>(`/module-config/${moduleId}/status`).then((r) => r.data),
};
