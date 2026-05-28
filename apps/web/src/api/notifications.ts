import { apiClient } from './client';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
  payload?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
}

export interface NotificationFeed {
  data: AppNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** @deprecated Dùng AppNotification thay thế */
export type Notification = AppNotification;

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    apiClient
      .get<NotificationFeed>('/notifications', {
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
          ...(params?.unreadOnly ? { unreadOnly: 'true' } : {}),
        },
      })
      .then((r) => r.data),

  /** Trả về số unread — dùng cho badge trên topbar */
  unreadCount: () =>
    apiClient
      .get<{ count: number }>('/notifications/unread-count')
      .then((r) => r.data.count),

  markRead: (id: string) =>
    apiClient.post(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    apiClient.post('/notifications/read-all').then((r) => r.data),
};
