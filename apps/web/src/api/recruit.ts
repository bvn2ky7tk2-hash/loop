import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type JobStatus      = 'OPEN' | 'ON_HOLD' | 'CLOSED';
export type CandidateStage = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
export type InterviewType   = 'PHONE' | 'TECHNICAL' | 'HR' | 'FINAL';
export type InterviewResult = 'PASS' | 'FAIL' | 'PENDING';
export type EmployeeLevel   = 'JUNIOR' | 'MID' | 'SENIOR' | 'EXPERT';
export type LeadSource      = 'WEBSITE' | 'REFERRAL' | 'SOCIAL' | 'EVENT' | 'COLD_OUTREACH' | 'OTHER';

export interface JobOpening {
  id:           string;
  code:         string;
  title:        string;
  orgUnitId:    string;
  level:        EmployeeLevel;
  headcount:    number;
  status:       JobStatus;
  requirements?: string;
  salaryFrom?:  string;
  salaryTo?:    string;
  closedAt?:    string;
  createdAt:    string;
  updatedAt:    string;
  orgUnit?:     { id: string; name: string };
  _count?:      { candidates: number };
}

export interface Candidate {
  id:                string;
  name:              string;
  email?:            string;
  phone?:            string;
  cvStoragePath?:    string;
  jobOpeningId:      string;
  stage:             CandidateStage;
  assigneeId?:       string;
  source?:           LeadSource;
  expectedSalary?:   string;
  educationLevel?:   string;
  address?:          string;
  yearsOfExperience?: number;
  currentPosition?:  string;
  currentCompany?:   string;
  skills?:           string[];
  birthdate?:        string;
  employeeId?:       string;
  processInstanceId?: string;
  notes?:            string;
  createdAt:         string;
  updatedAt:         string;
  jobOpening?:       { id: string; title: string; code: string };
  assignee?:         { id: string; name: string };
  interviews?:       Interview[];
}

export interface Interview {
  id:           string;
  candidateId:  string;
  type:         InterviewType;
  scheduledAt:  string;
  location?:    string;
  meetingUrl?:  string;
  interviewers: string[];
  result:       InterviewResult;
  score?:       number;
  notes?:       string;
  createdAt:    string;
  updatedAt:    string;
  candidate?:   { id: string; name: string; jobOpening?: { title: string } };
}

export interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const recruitKeys = {
  jobs: {
    all:    ['recruit-jobs'] as const,
    list:   (p: object) => ['recruit-jobs', 'list', p] as const,
    detail: (id: string) => ['recruit-jobs', id] as const,
  },
  candidates: {
    all:    ['recruit-candidates'] as const,
    list:   (p: object) => ['recruit-candidates', 'list', p] as const,
    detail: (id: string) => ['recruit-candidates', id] as const,
  },
  interviews: {
    all:      ['recruit-interviews'] as const,
    byCandidate: (id: string) => ['recruit-interviews', 'candidate', id] as const,
  },
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface JobFilterParams { status?: JobStatus; orgUnitId?: string; level?: EmployeeLevel; page?: number; limit?: number; }

export const useGetJobs = (params: JobFilterParams = {}) =>
  useQuery<PaginatedResult<JobOpening>>({
    queryKey: recruitKeys.jobs.list(params),
    queryFn:  () => apiClient.get<PaginatedResult<JobOpening>>('/recruit/jobs', { params }).then(r => r.data),
  });

export const useGetJob = (id: string) =>
  useQuery<JobOpening>({
    queryKey: recruitKeys.jobs.detail(id),
    queryFn:  () => apiClient.get<JobOpening>(`/recruit/jobs/${id}`).then(r => r.data),
    enabled:  !!id,
  });

export const useCreateJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; title: string; orgUnitId: string; level?: EmployeeLevel; headcount?: number; requirements?: string; salaryFrom?: number; salaryTo?: number }) =>
      apiClient.post<JobOpening>('/recruit/jobs', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: recruitKeys.jobs.all }),
  });
};

export const useUpdateJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ title: string; level: EmployeeLevel; headcount: number; requirements: string; salaryFrom: number; salaryTo: number }> }) =>
      apiClient.put<JobOpening>(`/recruit/jobs/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: recruitKeys.jobs.all }),
  });
};

export const useCloseJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<JobOpening>(`/recruit/jobs/${id}/close`, {}).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: recruitKeys.jobs.all }),
  });
};

export const useDeleteJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/recruit/jobs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: recruitKeys.jobs.all }),
  });
};

// ─── Candidates ───────────────────────────────────────────────────────────────

export interface CandidateFilterParams { jobOpeningId?: string; stage?: CandidateStage; assigneeId?: string; page?: number; limit?: number; }

export const useGetCandidates = (params: CandidateFilterParams = {}) =>
  useQuery<PaginatedResult<Candidate>>({
    queryKey: recruitKeys.candidates.list(params),
    queryFn:  () => apiClient.get<PaginatedResult<Candidate>>('/recruit/candidates', { params }).then(r => r.data),
  });

export const useGetCandidate = (id: string) =>
  useQuery<Candidate>({
    queryKey: recruitKeys.candidates.detail(id),
    queryFn:  () => apiClient.get<Candidate>(`/recruit/candidates/${id}`).then(r => r.data),
    enabled:  !!id,
  });

export const useCreateCandidate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email?: string; phone?: string; jobOpeningId: string; source?: LeadSource; expectedSalary?: number; assigneeId?: string }) =>
      apiClient.post<Candidate>('/recruit/candidates', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: recruitKeys.candidates.all }),
  });
};

export const useUpdateCandidate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; email: string; phone: string; source: LeadSource; expectedSalary: number; notes: string; assigneeId: string }> }) =>
      apiClient.put<Candidate>(`/recruit/candidates/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: recruitKeys.candidates.all }),
  });
};

export const useTransitionCandidateStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: CandidateStage }) =>
      apiClient.patch<Candidate>(`/recruit/candidates/${id}/stage`, { stage }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: recruitKeys.candidates.all }),
  });
};

export const useDeleteCandidate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/recruit/candidates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: recruitKeys.candidates.all }),
  });
};

export interface HireCandidatePayload {
  employeeCode: string;
  startDate:    string;
  ratePerDay:   number;
  orgUnitId:    string;
}

export const useHireCandidate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: HireCandidatePayload }) =>
      apiClient.post<Candidate>(`/recruit/candidates/${id}/hire`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitKeys.candidates.all });
    },
  });
};

// ─── Interviews ───────────────────────────────────────────────────────────────

export const useGetInterviewsByCandidate = (candidateId: string) =>
  useQuery<Interview[]>({
    queryKey: recruitKeys.interviews.byCandidate(candidateId),
    queryFn:  () => apiClient.get<Interview[]>('/recruit/interviews', { params: { candidateId } }).then(r => r.data),
    enabled:  !!candidateId,
  });

export const useGetAllInterviews = (params: { page?: number; limit?: number } = {}) =>
  useQuery<PaginatedResult<Interview>>({
    queryKey: [...recruitKeys.interviews.all, params],
    queryFn:  () => apiClient.get<PaginatedResult<Interview>>('/recruit/interviews', { params }).then(r => r.data),
  });

export const useCreateInterview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { candidateId: string; type: InterviewType; scheduledAt: string; location?: string; meetingUrl?: string; interviewers?: string[] }) =>
      apiClient.post<Interview>('/recruit/interviews', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: recruitKeys.interviews.all }),
  });
};

export const useSetInterviewResult = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { result: InterviewResult; score?: number; notes?: string } }) =>
      apiClient.patch<Interview>(`/recruit/interviews/${id}/result`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruitKeys.interviews.all });
      qc.invalidateQueries({ queryKey: recruitKeys.candidates.all });
    },
  });
};
