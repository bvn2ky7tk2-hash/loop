import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  items: string[];
  publishedAt: string;
  createdAt: string;
}

export interface CreateChangelogDto {
  version: string;
  title: string;
  items: string[];
  publishedAt: string;
}

const changelogKeys = {
  latest: () => ['changelog', 'latest'] as const,
  all:    () => ['changelog', 'all']    as const,
};

export function useLatestChangelog() {
  return useQuery<ChangelogEntry[]>({
    queryKey: changelogKeys.latest(),
    queryFn: async () => {
      const res = await apiClient.get<ChangelogEntry[]>('/changelog', { params: { limit: 5 } });
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useAllChangelogs(page = 1, limit = 20) {
  return useQuery<{ data: ChangelogEntry[]; total: number; page: number; totalPages: number }>({
    queryKey: [...changelogKeys.all(), page, limit],
    queryFn: async () => {
      const res = await apiClient.get('/changelog/all', { params: { page, limit } });
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useCreateChangelog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateChangelogDto) =>
      apiClient.post<ChangelogEntry>('/changelog', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: changelogKeys.latest() });
      qc.invalidateQueries({ queryKey: changelogKeys.all() });
    },
  });
}

export function useDeleteChangelog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/changelog/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: changelogKeys.latest() });
      qc.invalidateQueries({ queryKey: changelogKeys.all() });
    },
  });
}
