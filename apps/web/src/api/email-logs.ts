import { apiClient } from './client';

export interface EmailLog {
  id: string;
  toEmail: string;
  subject: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  module?: string | null;
  error?: string | null;
  sentAt?: string | null;
  tenantId?: string | null;
  createdAt: string;
}

export interface EmailLogListResult {
  data: EmailLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EmailLogFilter {
  status?: string;
  module?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export const emailLogsApi = {
  list: (filter: EmailLogFilter = {}) =>
    apiClient.get<EmailLogListResult>('/admin/email-logs', { params: filter }).then((r) => r.data),

  retry: (id: string) => apiClient.post(`/admin/email-logs/${id}/retry`).then((r) => r.data),
};
