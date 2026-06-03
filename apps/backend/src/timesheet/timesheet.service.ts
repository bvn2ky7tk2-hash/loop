import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Role } from '../generated/prisma';
import { CheckInDto, CheckOutDto } from './dto/checkin.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { GeneratePeriodDto, RejectTimesheetDto } from './dto/generate-period.dto';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { TimesheetAttendanceProvider } from './providers/timesheet-attendance.provider';
import { TimesheetPeriodProvider } from './providers/timesheet-period.provider';
import { TimesheetApprovalProvider } from './providers/timesheet-approval.provider';

/**
 * Facade — giữ nguyên chữ ký public + hành vi, delegate sang provider theo trách nhiệm:
 *   - Attendance/status  → TimesheetAttendanceProvider
 *   - Period (tính công) → TimesheetPeriodProvider
 *   - Approval/cron      → TimesheetApprovalProvider
 *
 * checkTimesheetEscalation vẫn gọi được qua TimesheetService (alert-scheduler phụ thuộc).
 */
@Injectable({ scope: Scope.REQUEST })
export class TimesheetService extends TenantAwareService {
  constructor(
    private readonly attendance: TimesheetAttendanceProvider,
    private readonly period: TimesheetPeriodProvider,
    private readonly approval: TimesheetApprovalProvider,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  // ── Attendance / Status ───────────────────────────────────────────────────────

  checkIn(userId: string, dto: CheckInDto) {
    return this.attendance.checkIn(userId, dto);
  }

  checkOut(userId: string, dto: CheckOutDto) {
    return this.attendance.checkOut(userId, dto);
  }

  setStatus(userId: string, dto: UpdateStatusDto) {
    return this.attendance.setStatus(userId, dto);
  }

  getTodaySummary(userId: string) {
    return this.attendance.getTodaySummary(userId);
  }

  getTeamStatus(orgUnitIds: string[] | null) {
    return this.attendance.getTeamStatus(orgUnitIds);
  }

  // ── Period (tính công) ─────────────────────────────────────────────────────────

  getWorkDaysInPeriod(start: Date, end: Date, employeeId?: string): Promise<Date[]> {
    return this.period.getWorkDaysInPeriod(start, end, employeeId);
  }

  generatePeriod(callerId: string, callerRole: Role, dto: GeneratePeriodDto) {
    return this.period.generatePeriod(callerId, callerRole, dto);
  }

  getPeriodDetail(userId: string, periodStart: string, periodEnd: string) {
    return this.period.getPeriodDetail(userId, periodStart, periodEnd);
  }

  manualDayEntry(userId: string, date: string, hours: number) {
    return this.period.manualDayEntry(userId, date, hours);
  }

  getProjectSummary(projectId: string, year: number, month: number, caller: { id: string; role: Role }) {
    return this.period.getProjectSummary(projectId, year, month, caller);
  }

  // ── Approval / Cron ────────────────────────────────────────────────────────────

  submit(id: string, userId: string) {
    return this.approval.submit(id, userId);
  }

  approve(id: string, approverId: string) {
    return this.approval.approve(id, approverId);
  }

  reject(id: string, approverId: string, dto: RejectTimesheetDto) {
    return this.approval.reject(id, approverId, dto);
  }

  getPendingApproval(orgUnitIds: string[] | null) {
    return this.approval.getPendingApproval(orgUnitIds);
  }

  checkTimesheetEscalation(): Promise<void> {
    return this.approval.checkTimesheetEscalation();
  }
}
