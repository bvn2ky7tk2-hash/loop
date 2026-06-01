import { apiClient } from './client';

export type WorkStatusType = 'WORKING' | 'WFH' | 'MEETING' | 'BREAK' | 'OFF' | 'BUSINESS_TRIP';
export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'MISSING_SHIFT';
export type CheckInMethod = 'MANUAL' | 'GPS' | 'WIFI';

export interface TodaySummary {
  checkIn: string | null;
  checkOut: string | null;
  currentStatus: WorkStatusType | null;
  since: string | null;
  workingHours: number | null;
}

export interface TimeEntryDay {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: number | null;
  overtimeHours: number;
  status: 'present' | 'absent' | 'off' | 'leave';
  isManualCorrection: boolean;
  dayCredit: number;
  leaveInfo: { name: string; color: string; isPaid: boolean } | null;
  // Từ AttendanceRecord (HR-verified)
  plannedStart: string | null;
  plannedEnd: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
}

export interface TimesheetRecord {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  workingDays: number;
  standardDays: number;
  overtimeHours: number;
  leaveDays: number;
  status: TimesheetStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  lockedAt: string | null;
}

export interface PeriodDetail {
  record: TimesheetRecord | null;
  days: TimeEntryDay[];
}

export interface TeamMemberStatus {
  userId: string;
  name: string;
  employeeCode?: string | null;
  orgUnit?: { id: string; name: string } | null;
  position?: { jobTitle?: { id: string; name: string } | null } | null;
  currentStatus: WorkStatusType | null;
  since: string | null;
  todayCheckIn: string | null;
  todayCheckOut: string | null;
}

export interface PendingApprovalItem {
  id: string;
  userId: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  submittedAt: string | null;
  isOverdue: boolean;
}

export interface ProjectSummaryMember {
  employeeId: string;
  name: string;
  daily: Record<string, number>;
  total: number;
}

export interface ProjectSummary {
  members: ProjectSummaryMember[];
  dailyTotal: Record<string, number>;
  grandTotal: number;
}

export const timesheetApi = {
  checkIn: (params?: { lat?: number; lng?: number; method?: CheckInMethod }) =>
    apiClient.post('/timesheets/checkin', params ?? {}).then((r) => r.data),

  checkOut: (params?: { lat?: number; lng?: number }) =>
    apiClient.post('/timesheets/checkout', params ?? {}).then((r) => r.data),

  todaySummary: (): Promise<TodaySummary> =>
    apiClient.get('/timesheets/me/today').then((r) => r.data),

  setStatus: (statusType: WorkStatusType, note?: string): Promise<{ currentStatus: WorkStatusType; since: string }> =>
    apiClient.post('/timesheets/status', { statusType, note }).then((r) => r.data),

  teamStatus: (): Promise<TeamMemberStatus[]> =>
    apiClient.get('/timesheets/team-status').then((r) => r.data),

  generatePeriod: (periodStart: string, periodEnd: string, userId?: string): Promise<TimesheetRecord> =>
    apiClient.post('/timesheets/period/generate', { periodStart, periodEnd, userId }).then((r) => r.data),

  periodDetail: (start: string, end: string, userId?: string): Promise<PeriodDetail> =>
    apiClient
      .get('/timesheets/period', { params: { start, end, ...(userId ? { userId } : {}) } })
      .then((r) => r.data),

  submit: (id: string): Promise<TimesheetRecord> =>
    apiClient.post(`/timesheets/${id}/submit`).then((r) => r.data),

  approve: (id: string): Promise<TimesheetRecord> =>
    apiClient.post(`/timesheets/${id}/approve`).then((r) => r.data),

  reject: (id: string, reason: string): Promise<TimesheetRecord> =>
    apiClient.post(`/timesheets/${id}/reject`, { reason }).then((r) => r.data),

  pendingApproval: (): Promise<PendingApprovalItem[]> =>
    apiClient.get('/timesheets/pending-approval').then((r) => r.data),

  projectSummary: (projectId: string, year: number, month: number): Promise<ProjectSummary> =>
    apiClient
      .get('/timesheets/project-summary', { params: { projectId, year, month } })
      .then((r) => r.data),
};
