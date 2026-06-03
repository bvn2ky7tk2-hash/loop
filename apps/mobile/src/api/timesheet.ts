import { api } from './client';

export type WorkStatusType = 'WORKING' | 'WFH' | 'MEETING' | 'BREAK' | 'OFF' | 'BUSINESS_TRIP';
export type CheckInMethod = 'MANUAL' | 'GPS' | 'WIFI';
export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

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
  status: 'present' | 'absent';
  isManualCorrection: boolean;
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
}

export interface PeriodDetail {
  record: TimesheetRecord | null;
  days: TimeEntryDay[];
}

export const timesheetApi = {
  todaySummary: () => api.get<TodaySummary>('/timesheets/me/today'),
  setStatus: (statusType: WorkStatusType, note?: string) =>
    api.post<{ currentStatus: WorkStatusType; since: string }>('/timesheets/status', { statusType, note }),
  checkIn: (params?: { lat?: number; lng?: number; method?: CheckInMethod }) =>
    api.post('/timesheets/checkin', params ?? {}),
  checkOut: (params?: { lat?: number; lng?: number }) =>
    api.post('/timesheets/checkout', params ?? {}),
  generatePeriod: (periodStart: string, periodEnd: string) =>
    api.post<TimesheetRecord>('/timesheets/period/generate', { periodStart, periodEnd }),
  periodDetail: (start: string, end: string) =>
    api.get<PeriodDetail>(`/timesheets/period?start=${start}&end=${end}`),
  submit: (id: string) => api.post<TimesheetRecord>(`/timesheets/${id}/submit`),
  manualDayEntry: (date: string, hours: number) =>
    api.patch<{ date: string; hours: number }>('/timesheets/day', { date, hours }),
};
