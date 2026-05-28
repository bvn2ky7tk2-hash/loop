import { apiClient } from './client';

export interface ScreenDto {
  id: string;
  module: string;
  route: string;
  label: string;
  icon: string | null;
  permCode: string | null;
  sortOrder: number;
  isActive: boolean;
}

export const screensApi = {
  listAll: () =>
    apiClient.get<ScreenDto[]>('/admin/screens').then((r) => r.data),
};
