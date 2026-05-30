import { apiClient } from './client';

export interface Project {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  customer?: string;
  customerId?: string;
  budgetEffortMm?: number;
  budgetCost?: number;
  currency?: string;
  progress: number;
  pmId: string;
  pm?: { id: string; name: string };
  _count?: { members: number; tasks: number };
}

export interface Allocation {
  id: string;
  employeeId: string;
  role: string;
  level: string;
  allocationPct: number;
  ratePerDay?: number;
  startDate: string;
  endDate: string;
  employee?: { id: string; fullName: string; code: string; level: string };
}

export const projectsApi = {
  list: () => apiClient.get<{ data: Project[]; total: number }>('/projects').then((r) => r.data.data),
  get: (id: string) => apiClient.get<Project>(`/projects/${id}`).then((r) => r.data),
  create: (data: Partial<Project>) =>
    apiClient.post<Project>('/projects', data).then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    apiClient.put(`/projects/${id}/status`, { status }).then((r) => r.data),
  getMembers: (id: string) =>
    apiClient.get<Allocation[]>(`/projects/${id}/members`).then((r) => r.data),
  addMember: (id: string, data: Partial<Allocation> & { employeeId: string }) =>
    apiClient.post<Allocation>(`/projects/${id}/members`, data).then((r) => r.data),
  updateMember: (projectId: string, memberId: string, data: Partial<Allocation>) =>
    apiClient.put(`/projects/${projectId}/members/${memberId}`, data).then((r) => r.data),
  removeMember: (projectId: string, memberId: string) =>
    apiClient.delete(`/projects/${projectId}/members/${memberId}`),
  updateProject: (id: string, data: Partial<Project>) =>
    apiClient.put<Project>(`/projects/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/projects/${id}`),
};

// ── Journal API ──────────────────────────────────────────────────────────────

export interface JournalItem {
  id: string;
  text: string;
  status?: 'OPEN' | 'CONVERTED' | 'IGNORED';
  taskId?: string;
}

export interface ProjectJournal {
  id: string;
  projectId: string;
  date: string;
  title: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  participants: string[];
  content: string;
  resolvedItems: JournalItem[];
  unresolvedItems: JournalItem[];
  attachments?: unknown;
  createdById: string;
  createdBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateJournalPayload {
  date: string;
  title: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  participants?: string[];
  content: string;
  resolvedItems?: JournalItem[];
  unresolvedItems?: JournalItem[];
}

export const projectJournalApi = {
  list: (projectId: string, page = 1, limit = 50) =>
    apiClient
      .get<{ data: ProjectJournal[]; total: number; page: number; limit: number; totalPages: number }>(
        `/projects/${projectId}/journals?page=${page}&limit=${limit}`,
      )
      .then((r) => r.data),

  create: (projectId: string, data: CreateJournalPayload) =>
    apiClient.post<ProjectJournal>(`/projects/${projectId}/journals`, data).then((r) => r.data),

  update: (
    journalId: string,
    data: Partial<CreateJournalPayload> & { resolvedItems?: JournalItem[]; unresolvedItems?: JournalItem[] },
  ) =>
    apiClient.patch<ProjectJournal>(`/projects/journals/${journalId}`, data).then((r) => r.data),

  unresolvedSummary: (projectId: string) =>
    apiClient
      .get<{ total: number; open: number; resolved: number }>(`/projects/${projectId}/journals/unresolved`)
      .then((r) => r.data),

  convertToTask: (journalId: string, itemId: string, data: { taskTitle: string; assigneeId?: string }) =>
    apiClient
      .post<{ taskId: string }>(`/projects/journals/${journalId}/items/${itemId}/convert`, data)
      .then((r) => r.data),
};
