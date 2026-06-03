import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BugSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type BugStatus =
  | 'OPEN' | 'PENDING' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type BugItemType = 'BUG' | 'ISSUE';

export interface BugAttachment {
  id: string; bugId: string; filename: string;
  mimeType: string; sizeBytes: number; createdAt: string;
}

export interface BugComment {
  id: string; bugId: string; authorId: string; content: string;
  createdAt: string; author: { id: string; name: string };
}

export interface Bug {
  id: string;
  projectId: string;
  reporterId: string;
  assigneeId?: string;
  title: string;
  description?: string;
  severity: BugSeverity;
  status: BugStatus;
  itemType: BugItemType;
  isCR: boolean;
  requesterName?: string;
  dueDate?: string;
  estimatedHours?: number;
  affectedModule?: string;
  resolutionNote?: string;
  resolvedAt?: string;
  closedAt?: string;
  pmApproverId?: string;
  approvalNote?: string;
  approvedAt?: string;
  isOverdue?: boolean;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
  reporter?: { id: string; name: string };
  assignee?: { id: string; name: string };
  pmApprover?: { id: string; name: string };
  tags?: { bugId: string; tag: string }[];
  attachments?: BugAttachment[];
}

export interface PaginatedBugs {
  data: Bug[];
  meta: { total: number; page: number; pageSize: number };
}

export interface CreateBugInput {
  projectId: string;
  taskIds?: string[];
  title: string;
  description?: string;
  severity?: BugSeverity;
  assigneeId?: string;
  itemType?: BugItemType;
  isCR?: boolean;
  requesterName?: string;
  dueDate?: string;
  estimatedHours?: number;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const bugKeys = {
  all:    ['bugs'] as const,
  mine:   ()           => ['bugs', 'mine'] as const,
  detail: (id: string) => ['bugs', id] as const,
  comments: (id: string) => ['bug-comments', id] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export const useMyBugs = () =>
  useQuery<Bug[]>({
    queryKey: bugKeys.mine(),
    queryFn:  () => api.get<Bug[]>('/bugs/my'),
  });

export const useMyBugsCount = () =>
  useQuery<{ total: number }>({
    queryKey: [...bugKeys.mine(), 'count'],
    queryFn:  () => api.get<{ total: number }>('/bugs/my/count'),
    staleTime: 60_000,
  });

export const useBug = (id: string) =>
  useQuery<Bug>({
    queryKey: bugKeys.detail(id),
    queryFn:  () => api.get<Bug>(`/bugs/${id}`),
    enabled:  !!id,
  });

export const useCreateBug = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBugInput) => api.post<Bug>('/bugs', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bugKeys.all }),
  });
};

export const useTransitionBug = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, toStatus }: { id: string; toStatus: BugStatus }) =>
      api.patch<Bug>(`/bugs/${id}/transition`, { toStatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: bugKeys.all }),
  });
};

export const useAssignBug = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId?: string }) =>
      api.patch<Bug>(`/bugs/${id}/assign`, { assigneeId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: bugKeys.all }),
  });
};

export const useApproveBug = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: 'APPROVED' | 'REJECTED'; note?: string }) =>
      api.patch<Bug>(`/bugs/${id}/approve`, { decision, note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: bugKeys.all }),
  });
};

export const useBugComments = (bugId: string) =>
  useQuery<BugComment[]>({
    queryKey: bugKeys.comments(bugId),
    queryFn:  () => api.get<BugComment[]>(`/bugs/${bugId}/comments`),
    enabled:  !!bugId,
  });

export const useAddBugComment = (bugId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      api.post<BugComment>(`/bugs/${bugId}/comments`, { content }),
    onSuccess: () => qc.invalidateQueries({ queryKey: bugKeys.comments(bugId) }),
  });
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export const BUG_TRANSITIONS: Record<BugStatus, BugStatus[]> = {
  OPEN:           ['PENDING', 'IN_PROGRESS', 'CANCELLED'],
  PENDING:        ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS:    ['RESOLVED', 'CANCELLED'],
  RESOLVED:       ['CLOSED', 'IN_PROGRESS'],
  CLOSED:         [],
  CANCELLED:      [],
  PENDING_REVIEW: [],
  APPROVED:       [],
  REJECTED:       [],
};

export const CR_TRANSITIONS: Record<BugStatus, BugStatus[]> = {
  OPEN:           ['PENDING_REVIEW', 'CANCELLED'],
  PENDING_REVIEW: ['CANCELLED'],
  APPROVED:       ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS:    ['RESOLVED', 'CANCELLED'],
  RESOLVED:       ['CLOSED', 'IN_PROGRESS'],
  CLOSED:         [],
  CANCELLED:      [],
  REJECTED:       [],
  PENDING:        [],
};

export const STATUS_LABEL: Record<BugStatus, string> = {
  OPEN: 'Mở', PENDING: 'Chờ xử lý', PENDING_REVIEW: 'Chờ duyệt CR',
  APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết', CLOSED: 'Đóng', CANCELLED: 'Huỷ',
};

export const STATUS_COLOR: Record<BugStatus, string> = {
  OPEN: '#64748B', PENDING: '#D97706', PENDING_REVIEW: '#EA580C',
  APPROVED: '#0891B2', REJECTED: '#DC2626', IN_PROGRESS: '#2563EB',
  RESOLVED: '#16A34A', CLOSED: '#374151', CANCELLED: '#DC2626',
};

export const SEVERITY_COLOR: Record<BugSeverity, string> = {
  CRITICAL: '#DC2626', HIGH: '#EA580C', MEDIUM: '#D97706', LOW: '#16A34A',
};

export const SEVERITY_BG: Record<BugSeverity, string> = {
  CRITICAL: '#FEF2F2', HIGH: '#FFF7ED', MEDIUM: '#FFFBEB', LOW: '#F0FDF4',
};
