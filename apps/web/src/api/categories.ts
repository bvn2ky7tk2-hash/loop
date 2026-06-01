import { apiClient } from './client';

export interface Category {
  id: string;
  type: string;
  code: string;
  name: string;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
  metadata?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryType {
  type: string;
  count: number;
}

export const categoriesApi = {
  list: (params?: { type?: string; parentId?: string; search?: string }) =>
    apiClient.get<Category[]>('/categories', { params }).then((r) => r.data),
  types: () => apiClient.get<CategoryType[]>('/categories/types').then((r) => r.data),
  create: (data: { type: string; code: string; name: string; parentId?: string; sortOrder?: number; isActive?: boolean }) =>
    apiClient.post<Category>('/categories', data).then((r) => r.data),
  update: (id: string, data: Partial<{ code: string; name: string; parentId: string | null; sortOrder: number; isActive: boolean }>) =>
    apiClient.patch<Category>(`/categories/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/categories/${id}`).then((r) => r.data),
};
