import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BugSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type BugStatus   = 'OPEN' | 'PENDING' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type BugItemType = 'BUG' | 'ISSUE';

export interface BugTask {
  bugId:  string;
  taskId: string;
  task?:  { id: string; title: string };
}

export interface BugAttachment {
  id:          string;
  bugId:       string;
  uploaderId:  string;
  filename:    string;
  storagePath: string;
  mimeType:    string;
  sizeBytes:   number;
  createdAt:   string;
}

export interface Bug {
  id:          string;
  projectId:   string;
  reporterId:  string;
  assigneeId?: string;
  title:       string;
  description?: string;
  severity:    BugSeverity;
  status:      BugStatus;
  itemType:       BugItemType;
  isCR:           boolean;
  requesterName?: string;
  dueDate?:       string;
  estimatedHours?: number;
  affectedModule?: string;
  resolutionNote?: string;
  resolvedAt?:    string;
  closedAt?:      string;
  pmApproverId?:  string;
  approvalNote?:  string;
  approvedAt?:    string;
  pmApprover?:    { id: string; name: string };
  tags?:          { bugId: string; tag: string }[];
  isOverdue?:     boolean;
  createdAt:   string;
  updatedAt:   string;
  project?:    { id: string; name: string };
  reporter?:   { id: string; name: string };
  assignee?:   { id: string; name: string };
  tasks?:      BugTask[];
  attachments?: BugAttachment[];
}

export interface BugFilterDto {
  projectId?:     string;
  status?:        BugStatus | BugStatus[];
  severity?:      BugSeverity | BugSeverity[];
  assigneeId?:    string;
  reporterId?:    string;
  createdFrom?:   string;
  createdTo?:     string;
  page?:          number;
  pageSize?:      number;
  itemType?:      BugItemType;
  isCR?:          boolean;
  requesterName?: string;
  overdue?:       boolean;
}

export interface BugStatsFilterDto {
  projectId?: string;
}

export interface BugStatsByStatus {
  open: number; pending: number; pendingReview: number; approved: number;
  inProgress: number; resolved: number; closed: number; cancelled: number; rejected: number;
}

export interface BugStatsBySeverity {
  critical: number; high: number; medium: number; low: number;
}

export interface BugTrendEntry {
  date: string; created: number; resolved: number;
}

export interface BugStats {
  byStatus:       BugStatsByStatus;
  bySeverity:     BugStatsBySeverity;
  openByProject:  { projectId: string; projectName: string; open: number; critical: number; total: number }[];
  openByTask:     { taskId: string; taskTitle: string; projectName: string; openCount: number }[];
  openByAssignee: { assigneeId: string; assigneeName: string; open: number; critical: number; total: number }[];
  openByReporter: { reporterId: string; reporterName: string; open: number; critical: number; total: number }[];
  trend:          BugTrendEntry[];
}

export interface PaginatedBugs {
  data: Bug[];
  meta: { total: number; page: number; pageSize: number };
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const bugKeys = {
  all:    ['bugs'] as const,
  list:   (f: BugFilterDto)       => [...bugKeys.all, 'list', f] as const,
  mine:   ()                       => [...bugKeys.all, 'mine'] as const,
  detail: (id: string)             => [...bugKeys.all, id] as const,
  stats:  (f: BugStatsFilterDto)  => [...bugKeys.all, 'stats', f] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const useGetBugs = (filters: BugFilterDto) =>
  useQuery<PaginatedBugs>({
    queryKey: bugKeys.list(filters),
    queryFn:  () => apiClient.get<PaginatedBugs>('/bugs', { params: filters }).then((r) => r.data),
  });

export const useGetMyBugs = () =>
  useQuery<Bug[]>({
    queryKey: bugKeys.mine(),
    queryFn:  () => apiClient.get<{ data: Bug[] }>('/bugs/my').then((r) => r.data.data ?? []),
  });

export const useGetMyBugsCount = () =>
  useQuery<{ total: number }>({
    queryKey: [...bugKeys.mine(), 'count'],
    queryFn:  () => apiClient.get<{ total: number }>('/bugs/my/count').then((r) => r.data),
    staleTime:      30_000,
    refetchInterval: 30_000,
  });

export const useGetBug = (id: string) =>
  useQuery<Bug>({
    queryKey: bugKeys.detail(id),
    queryFn:  () => apiClient.get<Bug>(`/bugs/${id}`).then((r) => r.data),
    enabled:  !!id,
  });

export const useGetBugStats = (filters: BugStatsFilterDto = {}) =>
  useQuery<BugStats>({
    queryKey: bugKeys.stats(filters),
    queryFn:  () => apiClient.get<BugStats>('/bugs/stats', { params: filters }).then((r) => r.data),
  });

export const useCreateBug = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      projectId: string; taskIds?: string[]; title: string;
      description?: string; severity?: BugSeverity; assigneeId?: string;
      itemType?:      BugItemType;
      isCR?:          boolean;
      requesterName?: string;
      dueDate?:       string;
      estimatedHours?: number;
      affectedModule?: string;
      tags?:          string[];
    }) => apiClient.post<Bug>('/bugs', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bugKeys.all }),
  });
};

export interface UpdateBugData {
  title?:       string;
  description?: string;
  severity?:    BugSeverity;
  taskIds?:     string[];
  assigneeId?:  string | null;
}

export const useUpdateBug = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBugData }) =>
      apiClient.put<Bug>(`/bugs/${id}`, data).then((r) => r.data),
    onSuccess: (bug) => {
      qc.invalidateQueries({ queryKey: bugKeys.all });
      qc.invalidateQueries({ queryKey: bugKeys.detail(bug.id) });
    },
  });
};

export const useTransitionBug = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, toStatus }: { id: string; toStatus: BugStatus }) =>
      apiClient.patch<Bug>(`/bugs/${id}/transition`, { toStatus }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bugKeys.all }),
  });
};

export const useAssignBug = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId?: string }) =>
      apiClient.patch<Bug>(`/bugs/${id}/assign`, { assigneeId }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bugKeys.all }),
  });
};

export const useUploadBugAttachment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return apiClient.post<BugAttachment>(`/bugs/${id}/attachments`, form).then((r) => r.data);
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: bugKeys.detail(id) });
    },
  });
};

export const useGetAttachmentUrl = (attId: string, enabled = true) =>
  useQuery<{ url: string }>({
    queryKey: ['bug-attachment-url', attId],
    queryFn:  () => apiClient.get<{ url: string }>(`/bugs/any/attachments/${attId}/url`).then((r) => r.data),
    enabled:  !!attId && enabled,
    staleTime: 50 * 60 * 1000, // presigned URL valid 1h, refetch after 50min
  });

export const useDeleteBug = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/bugs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: bugKeys.all }),
  });
};

export const useApproveBug = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: 'APPROVED' | 'REJECTED'; note?: string }) =>
      apiClient.patch<Bug>(`/bugs/${id}/approve`, { decision, note }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bugKeys.all }),
  });
};

// ─── Comments ────────────────────────────────────────────────────────────────

export interface BugComment {
  id:        string;
  bugId:     string;
  authorId:  string;
  content:   string;
  createdAt: string;
  updatedAt: string;
  author:    { id: string; name: string };
}

export const useGetBugComments = (bugId: string) =>
  useQuery<BugComment[]>({
    queryKey: ['bug-comments', bugId],
    queryFn:  () => apiClient.get<BugComment[]>(`/bugs/${bugId}/comments`).then((r) => r.data),
    enabled:  !!bugId,
  });

export const useAddBugComment = (bugId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiClient.post<BugComment>(`/bugs/${bugId}/comments`, { content }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bug-comments', bugId] }),
  });
};

export const useUpdateBugComment = (bugId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      apiClient.put<BugComment>(`/bugs/${bugId}/comments/${commentId}`, { content }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bug-comments', bugId] }),
  });
};

export const useDeleteBugComment = (bugId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => apiClient.delete(`/bugs/${bugId}/comments/${commentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bug-comments', bugId] }),
  });
};
