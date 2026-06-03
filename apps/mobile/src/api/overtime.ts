import { api } from './client';

export type OtStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface OvertimeRequest {
  id: string;
  date: string;
  fromTime?: string | null;
  toTime?: string | null;
  hours: number | string;
  reason?: string | null;
  status: OtStatus;
  rejectedReason?: string | null;
  createdAt: string;
}

interface Paginated<T> { data: T[]; meta: { total: number; page: number; limit: number } }

export const overtimeApi = {
  list: (params?: { status?: OtStatus }) => {
    const q = new URLSearchParams({ page: '1', limit: '100' });
    if (params?.status) q.set('status', params.status);
    return api.get<Paginated<OvertimeRequest>>(`/overtime?${q.toString()}`);
  },
  create: (data: { date: string; fromTime?: string; toTime?: string; hours: number; reason?: string }) =>
    api.post<OvertimeRequest>('/overtime', data),
  cancel: (id: string) => api.patch<OvertimeRequest>(`/overtime/${id}/cancel`, {}),
};
