import { apiClient } from './client';

export type ReportFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
export type ReportFormat = 'EXCEL' | 'PDF';

export interface ScheduledReport {
  id: string;
  name: string;
  template: string;
  recipients: string[];
  frequency: ReportFrequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  hour: number;
  format: ReportFormat;
  isActive: boolean;
  lastSentAt?: string | null;
  sentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledReportListResponse {
  data: ScheduledReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const scheduledReportsApi = {
  list: (page = 1, limit = 50) =>
    apiClient
      .get<ScheduledReportListResponse>('/scheduled-reports', { params: { page, limit } })
      .then((r) => r.data),

  create: (data: Partial<ScheduledReport>) =>
    apiClient.post<ScheduledReport>('/scheduled-reports', data).then((r) => r.data),

  update: (id: string, data: Partial<ScheduledReport>) =>
    apiClient.put<ScheduledReport>(`/scheduled-reports/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/scheduled-reports/${id}`).then((r) => r.data),

  sendNow: (id: string) =>
    apiClient.post(`/scheduled-reports/${id}/send`).then((r) => r.data),
};
