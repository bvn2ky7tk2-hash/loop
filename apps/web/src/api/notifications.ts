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
  /** resourceId dùng cho inline approve/reject (EXPENSE_PENDING, LEAVE_PENDING) */
  resourceId?: string;
}

/** Types yêu cầu action — được đếm riêng trên badge */
export const ACTIONABLE_TYPES = new Set([
  'EXPENSE_PENDING',
  'LEAVE_PENDING',
  'TASK_ASSIGNED',
  'BUG_ASSIGNED',
]);

/** Đếm số notification actionable (chưa đọc VÀ cần action) */
export function countActionable(items: AppNotification[]): number {
  return items.filter((n) => !n.isRead && ACTIONABLE_TYPES.has(n.type)).length;
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

/** API inline approve/reject dùng trong NotificationBell */
export const inlineActionApi = {
  approveExpense: (id: string) =>
    apiClient.patch(`/expenses/${id}/approve`, {}).then((r) => r.data),
  rejectExpense: (id: string) =>
    apiClient.patch(`/expenses/${id}/reject`, { reason: 'Từ chối' }).then((r) => r.data),
  approveLeave: (id: string) =>
    apiClient.patch(`/leaves/${id}`, { status: 'APPROVED' }).then((r) => r.data),
  rejectLeave: (id: string) =>
    apiClient.patch(`/leaves/${id}`, { status: 'REJECTED' }).then((r) => r.data),
};
