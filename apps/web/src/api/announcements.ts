import { apiClient } from './client';

export interface SystemAnnouncement {
  id: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL';
  targetRole?: string | null;
  startAt: string;
  endAt?: string | null;
  tenantId?: string | null;
  createdById?: string | null;
  createdAt: string;
}

export interface CreateAnnouncementDto {
  message: string;
  type?: 'INFO' | 'WARNING' | 'CRITICAL';
  targetRole?: string;
  startAt: string;
  endAt?: string;
}

export interface PaginatedAnnouncements {
  data: SystemAnnouncement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const announcementsApi = {
  getActive: () => apiClient.get<SystemAnnouncement[]>('/announcements/active').then((r) => r.data),

  list: (page = 1, limit = 50) =>
    apiClient.get<PaginatedAnnouncements>('/admin/announcements', { params: { page, limit } }).then((r) => r.data),

  create: (dto: CreateAnnouncementDto) =>
    apiClient.post<SystemAnnouncement>('/admin/announcements', dto).then((r) => r.data),

  update: (id: string, dto: Partial<CreateAnnouncementDto>) =>
    apiClient.patch<SystemAnnouncement>(`/admin/announcements/${id}`, dto).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/admin/announcements/${id}`),
};
