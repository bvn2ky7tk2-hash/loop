import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CommentAuthor {
  id:   string;
  name: string;
}

export interface Comment {
  id:         string;
  entityType: string;
  entityId:   string;
  authorId:   string;
  content:    string;
  parentId?:  string | null;
  createdAt:  string;
  updatedAt:  string;
  author:     CommentAuthor;
  replies?:   Comment[];
}

export interface CreateCommentDto {
  entityType: string;
  entityId:   string;
  content:    string;
  parentId?:  string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

const commentKeys = {
  list: (entityType: string, entityId: string) =>
    ['comments', entityType, entityId] as const,
};

export function useGetComments(entityType: string, entityId: string) {
  return useQuery<Comment[]>({
    queryKey: commentKeys.list(entityType, entityId),
    queryFn:  async () => {
      const res = await apiClient.get<Comment[]>('/comments', {
        params: { entityType, entityId },
      });
      return res.data;
    },
    enabled: !!entityType && !!entityId,
  });
}

export function useCreateComment(entityType: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCommentDto) =>
      apiClient.post<Comment>('/comments', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentKeys.list(entityType, entityId) });
    },
  });
}

export function useDeleteComment(entityType: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/comments/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentKeys.list(entityType, entityId) });
    },
  });
}
