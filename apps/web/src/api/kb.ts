import { apiClient } from './client';

export type KbStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface KbCategory {
  id:          string;
  name:        string;
  description?: string | null;
  icon?:       string | null;
  color?:      string | null;
  sortOrder:   number;
  createdAt:   string;
  _count?:     { articles: number };
}

export interface KbArticle {
  id:          string;
  title:       string;
  slug:        string;
  content:     string;
  summary?:    string | null;
  categoryId:  string;
  category?:   { id: string; name: string; color?: string | null; icon?: string | null };
  authorId:    string;
  author?:     { id: string; name: string };
  status:      KbStatus;
  tags:        string[];
  viewCount:   number;
  isPinned:    boolean;
  publishedAt?: string | null;
  createdAt:   string;
  updatedAt:   string;
}

export interface KbStats {
  totalArticles:  number;
  publishedCount: number;
  draftCount:     number;
  categoryCount:  number;
  totalViews:     number;
}

const BASE = '/kb';

export const kbApi = {
  stats: () =>
    apiClient.get<KbStats>(`${BASE}/stats`).then(r => r.data),

  listCategories: () =>
    apiClient.get<KbCategory[]>(`${BASE}/categories`).then(r => r.data),

  createCategory: (data: { name: string; description?: string; icon?: string; color?: string; sortOrder?: number }) =>
    apiClient.post<KbCategory>(`${BASE}/categories`, data).then(r => r.data),

  updateCategory: (id: string, data: Partial<{ name: string; description: string; icon: string; color: string; sortOrder: number }>) =>
    apiClient.put<KbCategory>(`${BASE}/categories/${id}`, data).then(r => r.data),

  deleteCategory: (id: string) =>
    apiClient.delete(`${BASE}/categories/${id}`).then(r => r.data),

  listArticles: (params?: { categoryId?: string; status?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: KbArticle[]; total: number; totalPages: number }>(`${BASE}/articles`, { params }).then(r => r.data),

  getArticle: (id: string) =>
    apiClient.get<KbArticle>(`${BASE}/articles/${id}`).then(r => r.data),

  createArticle: (data: { title: string; content: string; summary?: string; categoryId: string; status?: KbStatus; tags?: string[]; isPinned?: boolean }) =>
    apiClient.post<KbArticle>(`${BASE}/articles`, data).then(r => r.data),

  updateArticle: (id: string, data: Partial<{ title: string; content: string; summary: string; categoryId: string; status: KbStatus; tags: string[]; isPinned: boolean }>) =>
    apiClient.put<KbArticle>(`${BASE}/articles/${id}`, data).then(r => r.data),

  deleteArticle: (id: string) =>
    apiClient.delete(`${BASE}/articles/${id}`).then(r => r.data),
};
