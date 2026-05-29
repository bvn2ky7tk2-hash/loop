import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FeedPostType = 'ANNOUNCEMENT' | 'KUDOS' | 'BIRTHDAY' | 'DOCUMENT' | 'ANNIVERSARY';

export interface FeedAuthor {
  id:   string;
  name: string;
}

export interface FeedReaction {
  id:    string;
  emoji: string;
  user:  FeedAuthor;
}

export interface FeedPost {
  id:          string;
  type:        FeedPostType;
  authorId:    string;
  title?:      string | null;
  content:     string;
  targetOrgId?: string | null;
  isPinned:    boolean;
  imageUrl?:   string | null;
  targetYears?: number | null;
  targetName?: string | null;
  createdAt:   string;
  updatedAt:   string;
  author:      FeedAuthor;
  reactions:   FeedReaction[];
}

export interface FeedStats {
  total:       number;
  thisMonth:   number;
  kudos:       number;
  anniversary: number;
}

export interface CreateFeedPostDto {
  type:         FeedPostType;
  title?:       string;
  content:      string;
  targetOrgId?: string;
  isPinned?:    boolean;
  imageUrl?:    string;
  targetYears?: number;
  targetName?:  string;
}

export interface PaginatedFeedResult {
  data:       FeedPost[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const feedKeys = {
  all:   ['feed'] as const,
  list:  (page: number, limit: number, type?: FeedPostType) => ['feed', 'list', page, limit, type] as const,
  stats: ['feed', 'stats'] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useGetFeedStats() {
  return useQuery<FeedStats>({
    queryKey: feedKeys.stats,
    queryFn:  () => apiClient.get<FeedStats>('/feed/stats').then((r) => r.data),
  });
}

export function useGetFeedPosts(page = 1, limit = 20, type?: FeedPostType) {
  return useQuery<PaginatedFeedResult>({
    queryKey: feedKeys.list(page, limit, type),
    queryFn:  () =>
      apiClient
        .get<PaginatedFeedResult>('/feed', { params: { page, limit, ...(type ? { type } : {}) } })
        .then((r) => r.data),
  });
}

export function useCreateFeedPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateFeedPostDto) =>
      apiClient.post<FeedPost>('/feed', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

export function useDeleteFeedPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/feed/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

export function useReactFeedPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) =>
      apiClient.post(`/feed/${id}/react`, { emoji }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}
