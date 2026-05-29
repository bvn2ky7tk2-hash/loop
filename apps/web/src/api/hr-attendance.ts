import { apiClient } from './client';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY' | 'OT';
export type MonthlyAttendanceStatus = 'OPEN' | 'LOCKED';
export type HolidayType = 'NATIONAL_HOLIDAY' | 'COMPENSATORY_DAY';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee?: { fullName: string; code: string };
  date: string;
  checkIn?: string;
  checkOut?: string;
  totalHours?: number;
  status: AttendanceStatus;
  leaveType?: string;
  isManual: boolean;
  note?: string;
  plannedStart?: string;
  plannedEnd?: string;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  overtimeMinutes?: number;
  shiftId?: string;
}

export interface MonthlyAttendance {
  id: string;
  employeeId: string;
  employee?: { fullName: string; code: string; orgUnit?: { name: string } };
  year: number;
  month: number;
  workDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  otHours: number;
  absentDays: number;
  holidayDays: number;
  status: MonthlyAttendanceStatus;
  lockedAt?: string;
}

export interface HolidayCalendar {
  id: string;
  year: number;
  date: string;
  name: string;
  type: HolidayType;
}

export interface LeavePolicy {
  id: string;
  name: string;
  baseAnnualDays: number;
  seniorityBonus: Array<{ yearsFrom: number; bonus: number }>;
  maxCarryOver: number;
  carryOverExpiry?: string;
  carryOverExpiryAction: 'CLEAR' | 'PAY_OUT';
  isActive: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const hrAttendanceApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    employeeId?: string;
    orgUnitId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: AttendanceStatus;
  }) => apiClient.get('/hr-attendance', { params }).then(r => r.data),

  upsert: (data: Partial<AttendanceRecord> & { employeeId: string; date: string }) =>
    apiClient.post('/hr-attendance/upsert', data).then(r => r.data),

  getCalendar: (employeeId: string, year: number, month: number) =>
    apiClient.get(`/hr-attendance/calendar/${employeeId}`, { params: { year, month } }).then(r => r.data),

  summarize: (data: { year: number; month: number; orgUnitId?: string }) =>
    apiClient.post('/hr-attendance/summarize', data).then(r => r.data),

  lock: (data: { year: number; month: number; orgUnitId?: string }) =>
    apiClient.post('/hr-attendance/lock', data).then(r => r.data),

  monthlyReport: (params?: { year?: number; month?: number; orgUnitId?: string }) =>
    apiClient.get('/hr-attendance/monthly', { params }).then(r => r.data),
};

export const leavePoliciesApi = {
  list: () =>
    apiClient.get<PaginatedResult<LeavePolicy>>('/leave-policies').then(r => r.data),

  get: (id: string) =>
    apiClient.get<LeavePolicy>(`/leave-policies/${id}`).then(r => r.data),

  create: (data: Partial<LeavePolicy>) =>
    apiClient.post<LeavePolicy>('/leave-policies', data).then(r => r.data),

  update: (id: string, data: Partial<LeavePolicy>) =>
    apiClient.patch<LeavePolicy>(`/leave-policies/${id}`, data).then(r => r.data),

  assign: (data: { employeeId: string; leavePolicyId: string }) =>
    apiClient.post('/leave-policies/assign', data).then(r => r.data),

  computeEntitlement: (employeeId: string, year: number) =>
    apiClient.get(`/leave-policies/entitlement/${employeeId}`, { params: { year } }).then(r => r.data),
};

export const hrHolidaysApi = {
  list: (year?: number) =>
    apiClient.get<HolidayCalendar[]>('/hr-holidays', { params: { year } }).then(r => r.data),

  create: (data: { date: string; name: string; type: HolidayType }) =>
    apiClient.post<HolidayCalendar>('/hr-holidays', data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/hr-holidays/${id}`).then(r => r.data),

  seedVN: () =>
    apiClient.post('/hr-holidays/seed-vn').then(r => r.data),
};
