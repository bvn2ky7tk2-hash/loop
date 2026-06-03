// @ts-ignore - API type inference
import { apiClient } from './client';

export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'DEMO' | 'SITE_VISIT' | 'SURVEY' | 'TASK';

export interface CrmActivity {
  id:              string;
  type:            ActivityType;
  subject:         string;
  content?:        string | null;
  customerId?:     string | null;
  dealId?:         string | null;
  contactId?:      string | null;
  leadId?:         string | null;
  scheduledAt?:    string | null;
  completedAt?:    string | null;
  duration?:       number | null;
  outcome?:        string | null;
  nextAction?:     string | null;
  nextActionDueAt?: string | null;
  createdById:     string;
  createdAt:       string;
  customer?:       { id: string; code: string; name: string } | null;
  createdBy:       { id: string; name: string; email: string };
}

export interface ActivityStats {
  total:    number;
  byType:   Partial<Record<ActivityType, number>>;
  todayDue: number;
}

const BASE = '/crm/activities';

export interface CreateCrmActivityInput {
  type: ActivityType; subject: string; content?: string;
  customerId?: string; dealId?: string; contactId?: string; leadId?: string;
  scheduledAt?: string; completedAt?: string; duration?: number;
  outcome?: string; nextAction?: string; nextActionDueAt?: string;
}

export const crmActivitiesApi = {
  stats: () =>
    apiClient.get<ActivityStats>(`${BASE}/stats`).then(r => r.data),

  list: (params?: { customerId?: string; dealId?: string; leadId?: string; type?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: CrmActivity[]; total: number; totalPages: number }>(BASE, { params }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<CrmActivity>(`${BASE}/${id}`).then(r => r.data),

  create: (data: CreateCrmActivityInput) => apiClient.post<CrmActivity>(BASE, data).then(r => r.data),

  update: (id: string, data: Partial<CreateCrmActivityInput>) =>
    apiClient.patch<CrmActivity>(`${BASE}/${id}`, data).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete(`${BASE}/${id}`).then(r => r.data),
};
