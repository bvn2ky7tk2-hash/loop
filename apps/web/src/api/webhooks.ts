import { apiClient } from './client';

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookLog {
  id: string;
  endpointId: string;
  event: string;
  payload: unknown;
  statusCode: number | null;
  response: string | null;
  success: boolean;
  attemptCount: number;
  sentAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateWebhookDto {
  name: string;
  url: string;
  secret?: string;
  events: string[];
}

export interface UpdateWebhookDto {
  name?: string;
  url?: string;
  secret?: string;
  events?: string[];
}

export const webhooksApi = {
  listEndpoints: (page = 1, limit = 50) =>
    apiClient
      .get<PaginatedResult<WebhookEndpoint>>('/webhooks', { params: { page, limit } })
      .then((r) => r.data),

  createEndpoint: (dto: CreateWebhookDto) =>
    apiClient.post<WebhookEndpoint>('/webhooks', dto).then((r) => r.data),

  updateEndpoint: (id: string, dto: UpdateWebhookDto) =>
    apiClient.patch<WebhookEndpoint>(`/webhooks/${id}`, dto).then((r) => r.data),

  deleteEndpoint: (id: string) =>
    apiClient.delete(`/webhooks/${id}`).then((r) => r.data),

  toggleEndpoint: (id: string, isActive: boolean) =>
    apiClient.put<WebhookEndpoint>(`/webhooks/${id}/toggle`, { isActive }).then((r) => r.data),

  listLogs: (endpointId: string, page = 1, limit = 50) =>
    apiClient
      .get<PaginatedResult<WebhookLog>>(`/webhooks/${endpointId}/logs`, { params: { page, limit } })
      .then((r) => r.data),

  sendTest: (id: string) =>
    apiClient
      .post<{ success: boolean; statusCode: number | null; response: string | null }>(`/webhooks/test/${id}`)
      .then((r) => r.data),
};
