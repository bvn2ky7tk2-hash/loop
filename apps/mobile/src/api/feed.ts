import { api } from './client';

export type FeedPostType = 'ANNOUNCEMENT' | 'KUDOS' | 'BIRTHDAY' | 'DOCUMENT' | 'ANNIVERSARY';

export interface FeedReaction { id: string; emoji: string; userId: string }

export interface FeedPost {
  id: string;
  type: FeedPostType;
  title?: string | null;
  content: string;
  imageUrl?: string | null;
  isPinned: boolean;
  author?: { id: string; name: string } | null;
  reactions?: FeedReaction[];
  createdAt: string;
}

interface Paginated<T> { data: T[]; meta: { total: number; page: number; limit: number } }

export const feedApi = {
  list: (params?: { type?: FeedPostType }) => {
    const q = new URLSearchParams({ page: '1', limit: '50' });
    if (params?.type) q.set('type', params.type);
    return api.get<Paginated<FeedPost>>(`/feed?${q.toString()}`);
  },
  create: (data: { type: FeedPostType; title?: string; content: string }) =>
    api.post<FeedPost>('/feed', data),
  react: (id: string, emoji: string) => api.post<unknown>(`/feed/${id}/react`, { emoji }),
  remove: (id: string) => api.delete<void>(`/feed/${id}`),
};
