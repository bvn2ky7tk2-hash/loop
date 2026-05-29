import { apiClient } from './client';

export type ShiftType = 'HANH_CHINH' | 'CA_SANG' | 'CA_CHIEU' | 'CA_DEM' | 'LINH_HOAT';
export type ScheduleRepeatType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface WorkShift {
  id: string;
  name: string;
  code: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isActive: boolean;
  description?: string;
  createdAt?: string;
}

export interface ShiftAssignment {
  id: string;
  employeeId: string;
  employee: { id: string; fullName: string; code?: string };
  shiftId: string;
  shift: { id: string; name: string; code: string };
  effectiveFrom: string;
  effectiveTo?: string | null;
  note?: string | null;
}

export interface WorkSchedulePhase {
  id: string;
  shiftId?: string | null;
  shift?: { id: string; name: string; code: string; type: ShiftType; startTime: string; endTime: string } | null;
  phaseOrder: number;
}

export interface WorkScheduleEnrollment {
  id: string;
  scheduleId: string;
  employeeId?: string | null;
  employee?: { id: string; fullName: string; code?: string } | null;
  orgUnitId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  note?: string | null;
}

export interface WorkSchedule {
  id: string;
  name: string;
  description?: string | null;
  repeatType: ScheduleRepeatType;
  isActive: boolean;
  phases: WorkSchedulePhase[];
  _count?: { enrollments: number };
  createdAt?: string;
}

export interface CreateShiftDto {
  name: string;
  code: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  isActive?: boolean;
  description?: string;
}

export interface CreateAssignmentDto {
  employeeId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  note?: string;
}

export interface CreateScheduleTemplateDto {
  name: string;
  description?: string;
  repeatType: ScheduleRepeatType;
  phases: { shiftId?: string; phaseOrder: number }[];
}

export interface EnrollEmployeesDto {
  employeeIds?: string[];
  orgUnitId?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  note?: string;
}

export interface SwapShiftDto {
  employeeId: string;
  dates: string[];
  newShiftId: string;
  reason?: string;
}

export interface RecalculateDto {
  employeeId: string;
  year: number;
  month: number;
}

export const workShiftsApi = {
  // ── Ca làm việc ──────────────────────────────────────────────────────────────
  listShifts: () =>
    apiClient.get<WorkShift[]>('/work-shifts').then((r) => r.data),

  createShift: (dto: CreateShiftDto) =>
    apiClient.post<WorkShift>('/work-shifts', dto).then((r) => r.data),

  updateShift: (id: string, dto: Partial<CreateShiftDto>) =>
    apiClient.patch<WorkShift>(`/work-shifts/${id}`, dto).then((r) => r.data),

  deleteShift: (id: string) =>
    apiClient.delete(`/work-shifts/${id}`).then((r) => r.data),

  // ── Phân công ca ─────────────────────────────────────────────────────────────
  listAssignments: (params?: { employeeId?: string; shiftId?: string }) =>
    apiClient
      .get('/work-shifts/assignments', { params })
      .then((r) => Array.isArray(r.data) ? r.data : (r.data?.data ?? []) as ShiftAssignment[]),

  createAssignment: (dto: CreateAssignmentDto) =>
    apiClient
      .post<ShiftAssignment>('/work-shifts/assignments', dto)
      .then((r) => r.data),

  deleteAssignment: (id: string) =>
    apiClient.delete(`/work-shifts/assignments/${id}`).then((r) => r.data),

  // ── Lịch làm việc xoay ca (template) ────────────────────────────────────────
  listSchedules: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient
      .get('/work-shifts/schedules', { params })
      .then((r) => Array.isArray(r.data) ? r.data : (r.data?.data ?? []) as WorkSchedule[]),

  createSchedule: (dto: CreateScheduleTemplateDto) =>
    apiClient.post<WorkSchedule>('/work-shifts/schedules', dto).then((r) => r.data),

  deleteSchedule: (id: string) =>
    apiClient.delete(`/work-shifts/schedules/${id}`).then((r) => r.data),

  // ── Enrollment ───────────────────────────────────────────────────────────────
  enrollEmployees: (scheduleId: string, dto: EnrollEmployeesDto) =>
    apiClient.post(`/work-shifts/schedules/${scheduleId}/enroll`, dto).then((r) => r.data),

  listEnrollments: (scheduleId: string) =>
    apiClient
      .get(`/work-shifts/schedules/${scheduleId}/enrollments`)
      .then((r) => r.data as WorkScheduleEnrollment[]),

  removeEnrollment: (enrollmentId: string) =>
    apiClient.delete(`/work-shifts/enrollments/${enrollmentId}`).then((r) => r.data),

  // ── Tiện ích bảng công ───────────────────────────────────────────────────────
  swapShift: (dto: SwapShiftDto) =>
    apiClient.post<{ updated: number }>('/work-shifts/swap-shift', dto).then((r) => r.data),

  recalculate: (dto: RecalculateDto) =>
    apiClient.post<{ updated: number; total: number }>('/work-shifts/recalculate', dto).then((r) => r.data),
};
