import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TrainingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ReviewStatus   = 'DRAFT' | 'SUBMITTED' | 'APPROVED';

export interface TrainingProgram {
  id:            string;
  title:         string;
  type:          string;
  durationHours: number;
  description:   string | null;
  createdAt:     string;
}

export interface TrainingRecord {
  id:         string;
  programId:  string;
  employeeId: string;
  startDate:  string;
  endDate:    string | null;
  status:     TrainingStatus;
  score:      string | null;
  notes:      string | null;
  program?:   { id: string; title: string; type: string };
  employee?:  { id: string; fullName: string; code: string; orgUnit?: { name: string } | null; position?: { jobTitle?: { name: string } | null } | null };
}

export interface PerformanceReview {
  id:           string;
  employeeId:   string;
  reviewerId:   string;
  period:       string;
  score:        string | null;
  strengths:    string | null;
  improvements: string | null;
  goals:        string | null;
  status:       ReviewStatus;
  submittedAt:  string | null;
  approvedAt:   string | null;
  createdAt:    string;
  employee?:    { id: string; fullName: string; code: string; orgUnit?: { name: string } | null; position?: { jobTitle?: { name: string } | null } | null };
  reviewer?:    { id: string; fullName: string; code: string; orgUnit?: { name: string } | null; position?: { jobTitle?: { name: string } | null } | null };
}

export interface PaginatedResult<T> {
  data: T[]; total: number; page: number; limit: number; totalPages: number;
}

// ─── Training ────────────────────────────────────────────────────────────────

export function useGetTrainingPrograms() {
  return useQuery({
    queryKey: ['training', 'programs'],
    queryFn: () => apiClient.get<TrainingProgram[]>('/hr/training/programs').then(r => r.data),
  });
}

export function useCreateTrainingProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { title: string; type: string; durationHours: number; description?: string }) =>
      apiClient.post<TrainingProgram>('/hr/training/programs', dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training'] }),
  });
}

export function useGetTrainingRecords(params: { page?: number; limit?: number; employeeId?: string; orgUnitId?: string; status?: string }) {
  return useQuery({
    queryKey: ['training', 'records', params],
    queryFn: () => apiClient.get<PaginatedResult<TrainingRecord>>('/hr/training/records', { params }).then(r => r.data),
  });
}

export function useCreateTrainingRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { programId: string; employeeId: string; startDate: string; endDate?: string; status?: string; score?: number; notes?: string }) =>
      apiClient.post<TrainingRecord>('/hr/training/records', dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'records'] }),
  });
}

export function useUpdateTrainingRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; status?: string; score?: number; endDate?: string; notes?: string }) =>
      apiClient.patch<TrainingRecord>(`/hr/training/records/${id}`, dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'records'] }),
  });
}

export function useGetTrainingStats() {
  return useQuery({
    queryKey: ['training', 'stats'],
    queryFn: () => apiClient.get('/hr/training/stats').then(r => r.data),
  });
}

// ─── Performance Review ──────────────────────────────────────────────────────

export function useGetPerformanceReviews(params: { page?: number; limit?: number; employeeId?: string; orgUnitId?: string; period?: string; status?: string }) {
  return useQuery({
    queryKey: ['performance', params],
    queryFn: () => apiClient.get<PaginatedResult<PerformanceReview>>('/hr/performance', { params }).then(r => r.data),
  });
}

export function useCreatePerformanceReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { employeeId: string; reviewerId: string; period: string; score?: number; strengths?: string; improvements?: string; goals?: string }) =>
      apiClient.post<PerformanceReview>('/hr/performance', dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance'] }),
  });
}

export function useUpdatePerformanceReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; score?: number; strengths?: string; improvements?: string; goals?: string; status?: ReviewStatus }) =>
      apiClient.patch<PerformanceReview>(`/hr/performance/${id}`, dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['performance'] }),
  });
}

export function useGetPerformanceStats(period?: string) {
  return useQuery({
    queryKey: ['performance', 'stats', period],
    queryFn: () => apiClient.get('/hr/performance/stats', { params: period ? { period } : {} }).then(r => r.data),
  });
}
