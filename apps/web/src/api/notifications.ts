import { apiClient } from './client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  payload?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
}

export const notificationsApi = {
  list: (unread?: boolean) =>
    apiClient
      .get<Notification[]>('/notifications', { params: unread ? { unread: 'true' } : {} })
      .then((r) => r.data),
  unreadCount: () =>
    apiClient.get<{ count: number }>('/notifications/unread-count').then((r) => r.data.count),
  markRead: (id: string) => apiClient.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.put('/notifications/read-all').then((r) => r.data),
};
