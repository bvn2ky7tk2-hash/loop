import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface SavedFilterPreset {
  id: string;
  pageKey: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: string;
}

const savedFilterKeys = {
  list: (pageKey: string) => ['saved-filters', pageKey] as const,
};

export function useSavedFilters(pageKey: string) {
  return useQuery<SavedFilterPreset[]>({
    queryKey: savedFilterKeys.list(pageKey),
    queryFn: async () => {
      const res = await apiClient.get<SavedFilterPreset[]>('/saved-filters', {
        params: { pageKey },
      });
      return res.data;
    },
    enabled: !!pageKey,
    staleTime: 30_000,
  });
}

export function useCreateSavedFilter(pageKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { pageKey: string; name: string; filters: Record<string, unknown> }) =>
      apiClient.post<SavedFilterPreset>('/saved-filters', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: savedFilterKeys.list(pageKey) });
    },
  });
}

export function useDeleteSavedFilter(pageKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/saved-filters/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: savedFilterKeys.list(pageKey) });
    },
  });
}
