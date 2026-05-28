import { apiClient } from './client';

export interface AuditLogRecord {
  id: string;
  userId: string | null;
  action: string;
  module: string | null;
  entity: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; name: string } | null;
}

export interface AuditLogListParams {
  userId?: string;
  module?: string;
  action?: string;
  entity?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogs {
  data: AuditLogRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const auditLogsApi = {
  list: (params: AuditLogListParams) =>
    apiClient
      .get<PaginatedAuditLogs>('/audit-logs', { params })
      .then((r) => r.data),

  exportUrl: (params: AuditLogListParams): string => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
    });
    return `/api/v1/audit-logs/export?${query.toString()}`;
  },
};
