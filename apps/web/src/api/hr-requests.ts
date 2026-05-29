/**
 * hr-requests.ts — Thin wrapper re-exporting từ leaves + overtime API
 * dùng cho trang HrRequestsPage (HR duyệt tập trung đơn nghỉ + OT).
 */
import { leavesApi } from './leaves';
import type { LeaveRequest, PaginatedLeaves, LeaveFilterParams } from './leaves';
import { otApi } from './overtime';
import type { OvertimeRequest, PaginatedOvertime, OtListParams } from './overtime';

export type { LeaveRequest, OvertimeRequest };

export const hrRequestsApi = {
  // ─── Leave requests ────────────────────────────────────────────────────────
  listLeaves: (params?: LeaveFilterParams): Promise<PaginatedLeaves> =>
    leavesApi.list(params),

  approveLeave: (id: string): Promise<LeaveRequest> =>
    leavesApi.approve(id, { status: 'APPROVED' }),

  rejectLeave: (id: string, rejectedReason: string): Promise<LeaveRequest> =>
    leavesApi.approve(id, { status: 'REJECTED', rejectedReason }),

  // ─── OT requests ──────────────────────────────────────────────────────────
  listOt: (params?: OtListParams): Promise<PaginatedOvertime> =>
    otApi.list(params),

  approveOt: (id: string): Promise<OvertimeRequest> =>
    otApi.approveDirectly(id),

  rejectOt: (id: string, rejectedReason: string): Promise<OvertimeRequest> =>
    otApi.reject(id, { rejectedReason }),
};
