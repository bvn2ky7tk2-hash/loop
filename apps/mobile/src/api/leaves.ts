import { api } from './client';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveType {
  id: string;
  name: string;
  maxDaysPerYear: number;
  requiresApproval: boolean;
}

export interface LeaveRequest {
  id: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
  approver?: { id: string; fullName: string };
  rejectionReason?: string;
}

export interface LeaveBalance {
  leaveType: LeaveType;
  entitled: number;
  used: number;
  pending: number;
  remaining: number;
}

export const leavesApi = {
  list: () =>
    api.get<{ data: LeaveRequest[]; meta: { total: number } }>('/leaves?page=1&limit=100'),
  balances: () => api.get<LeaveBalance[]>('/leaves/balance'),
  leaveTypes: () => api.get<LeaveType[]>('/leaves/types'),
  create: (data: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => api.post<LeaveRequest>('/leaves', data),
  cancel: (id: string) => api.patch<LeaveRequest>(`/leaves/${id}/cancel`, {}),
};
