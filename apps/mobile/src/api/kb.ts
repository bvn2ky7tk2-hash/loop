import { api } from './client';

export interface KbCategory {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

export interface KbArticleListItem {
  id: string;
  title: string;
  summary?: string | null;
  category?: KbCategory | null;
  author?: { id: string; name: string } | null;
  viewCount: number;
  isPinned: boolean;
  publishedAt?: string | null;
  createdAt: string;
}

export interface KbArticleDetail extends KbArticleListItem {
  content: string;
  tags: string[];
}

interface Paginated<T> { data: T[]; meta: { total: number; page: number; limit: number } }

export const kbApi = {
  categories: () => api.get<KbCategory[]>('/kb/categories'),
  articles: (params: { page?: number; limit?: number; search?: string; categoryId?: string }) => {
    const q = new URLSearchParams({
      status: 'PUBLISHED',
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
    });
    if (params.search) q.set('search', params.search);
    if (params.categoryId) q.set('categoryId', params.categoryId);
    return api.get<Paginated<KbArticleListItem>>(`/kb/articles?${q.toString()}`);
  },
  article: (id: string) => api.get<KbArticleDetail>(`/kb/articles/${id}`),
};
