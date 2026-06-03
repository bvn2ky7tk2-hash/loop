import { Test, TestingModule } from '@nestjs/testing';
import { REQUEST } from '@nestjs/core';
import { TimesheetService } from './timesheet.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkShiftsService } from '../work-shifts/work-shifts.service';
import { TimesheetAttendanceProvider } from './providers/timesheet-attendance.provider';
import { TimesheetPeriodProvider } from './providers/timesheet-period.provider';
import { TimesheetApprovalProvider } from './providers/timesheet-approval.provider';
import {
  CheckInMethod,
  TimesheetStatus,
  WorkStatusType,
  NotificationType,
  Role,
} from '../generated/prisma';

/**
 * Characterization tests — chốt hành vi HIỆN TẠI của TimesheetService trước/sau refactor.
 *
 * Phủ 6+ method, gồm CẢ mutation lẫn read, đại diện 3 nhóm trách nhiệm:
 *   - checkIn          (attendance — TẠO timeEntry + setStatus)
 *   - getTodaySummary  (attendance — read tổng hợp giờ làm)
 *   - getTeamStatus    (attendance — read team)
 *   - generatePeriod   (period — TẠO/upsert timesheetRecord, tính OT/standardDays)
 *   - getPeriodDetail  (period — read chi tiết ngày)
 *   - approve          (approval — UPDATE status + notification)
 *
 * Prisma + WorkShiftsService mock toàn bộ. Assert prisma.create/update/upsert được gọi
 * với data đúng (mutation) và shape output (read).
 * REQUEST mock có user.tenantId để nhánh tenantWhere chạy giống production.
 */

const TENANT = 'tenant-1';
const fn = () => jest.fn();

// Mirror CHÍNH XÁC toDateOnly() trong service (local-midnight từ chuỗi/Date).
// Service: new Date(d) rồi new Date(y, m, day) theo getter local → kết quả phụ thuộc TZ
// y hệt production. Dùng cùng hàm cho fixture entry.date lẫn assertion để
// characterization khớp service trên MỌI timezone (UTC, Bangkok, New_York).
function toDateOnly(d: string | Date): Date {
  const dt = new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}
// Key ngày mà service dùng để map/đối chiếu (toDateOnly → toISOString slice).
function dateKey(ymd: string): string {
  return toDateOnly(ymd).toISOString().slice(0, 10);
}
// entry.date dùng đúng toDateOnly để map về cùng key như vòng lặp ngày của service.
function toUtcDateOnly(ymd: string): Date {
  return toDateOnly(ymd);
}

function buildPrismaMock(): any {
  return {
    timeEntry: { findUnique: fn(), create: fn(), update: fn(), findMany: fn(), upsert: fn() },
    workStatus: { create: fn(), updateMany: fn(), findFirst: fn(), findMany: fn() },
    timesheetRecord: { findUnique: fn(), findFirst: fn(), findMany: fn(), create: fn(), update: fn(), upsert: fn() },
    user: { findMany: fn(), findUnique: fn() },
    employee: { findFirst: fn() },
    holidayCalendar: { findMany: fn() },
    attendanceRecord: { findMany: fn() },
    leaveRequest: { findMany: fn() },
    notification: { create: fn(), createMany: fn(), findFirst: fn() },
    task: { findMany: fn() },
    $transaction: fn(),
  };
}

function buildWorkShiftsMock(): any {
  return {
    resolveShiftForDate: fn(),
    isOffDay: fn(),
  };
}

async function buildService(prisma: any, workShifts: any): Promise<TimesheetService> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      TimesheetService,
      TimesheetAttendanceProvider,
      TimesheetPeriodProvider,
      TimesheetApprovalProvider,
      { provide: PrismaService, useValue: prisma },
      { provide: WorkShiftsService, useValue: workShifts },
      { provide: REQUEST, useValue: { user: { tenantId: TENANT } } },
    ],
  }).compile();
  // TimesheetService là REQUEST scope → dùng resolve
  return moduleRef.resolve(TimesheetService);
}

describe('TimesheetService (characterization)', () => {
  let prisma: any;
  let workShifts: any;
  let service: TimesheetService;

  beforeEach(async () => {
    prisma = buildPrismaMock();
    workShifts = buildWorkShiftsMock();
    service = await buildService(prisma, workShifts);
  });

  // ── Attendance: checkIn (mutation) ──────────────────────────────────────────
  describe('checkIn', () => {
    it('tạo timeEntry mới và set trạng thái WORKING khi chưa chấm công', async () => {
      prisma.timeEntry.findUnique.mockResolvedValue(null);
      const created = { id: 'te-1', userId: 'u-1' };
      prisma.timeEntry.create.mockResolvedValue(created);
      prisma.workStatus.updateMany.mockResolvedValue({ count: 0 });
      prisma.workStatus.create.mockResolvedValue({ statusType: WorkStatusType.WORKING, startedAt: new Date() });

      const result = await service.checkIn('u-1', { lat: 10, lng: 20 } as any);

      expect(prisma.timeEntry.create).toHaveBeenCalledTimes(1);
      const arg = prisma.timeEntry.create.mock.calls[0][0];
      expect(arg.data.userId).toBe('u-1');
      expect(arg.data.checkInLat).toBe(10);
      expect(arg.data.checkInLng).toBe(20);
      expect(arg.data.checkInMethod).toBe(CheckInMethod.MANUAL);
      expect(arg.data.checkInAt).toBeInstanceOf(Date);
      // setStatus → endCurrentStatus (updateMany) + workStatus.create
      expect(prisma.workStatus.create).toHaveBeenCalledTimes(1);
      expect(prisma.workStatus.create.mock.calls[0][0].data.statusType).toBe(WorkStatusType.WORKING);
      expect(result).toBe(created);
    });

    it('ném ConflictException nếu đã chấm công vào hôm nay', async () => {
      prisma.timeEntry.findUnique.mockResolvedValue({ id: 'te-existing' });
      await expect(service.checkIn('u-1', {} as any)).rejects.toThrow('Đã chấm công vào hôm nay');
      expect(prisma.timeEntry.create).not.toHaveBeenCalled();
    });
  });

  // ── Attendance: getTodaySummary (read) ──────────────────────────────────────
  describe('getTodaySummary', () => {
    it('tính workingHours khi có cả checkIn và checkOut', async () => {
      const checkInAt = new Date('2026-06-03T08:00:00Z');
      const checkOutAt = new Date('2026-06-03T17:00:00Z');
      prisma.timeEntry.findUnique.mockResolvedValue({ checkInAt, checkOutAt });
      prisma.workStatus.findFirst.mockResolvedValue({ statusType: WorkStatusType.WORKING, startedAt: checkInAt });

      const result = await service.getTodaySummary('u-1');

      expect(result.checkIn).toBe(checkInAt);
      expect(result.checkOut).toBe(checkOutAt);
      expect(result.currentStatus).toBe(WorkStatusType.WORKING);
      expect(result.workingHours).toBe(9);
    });

    it('trả workingHours null khi chưa có entry', async () => {
      prisma.timeEntry.findUnique.mockResolvedValue(null);
      prisma.workStatus.findFirst.mockResolvedValue(null);
      const result = await service.getTodaySummary('u-1');
      expect(result.workingHours).toBeNull();
      expect(result.currentStatus).toBeNull();
    });
  });

  // ── Attendance: getTeamStatus (read) ────────────────────────────────────────
  describe('getTeamStatus', () => {
    it('merge user + workStatus + timeEntry theo userId', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u-1', name: 'An', employee: { code: 'E1', orgUnit: { id: 'o1', name: 'Org1' }, position: null } },
      ]);
      prisma.workStatus.findMany.mockResolvedValue([
        { userId: 'u-1', statusType: WorkStatusType.WORKING, startedAt: new Date('2026-06-03T08:00:00Z') },
      ]);
      prisma.timeEntry.findMany.mockResolvedValue([
        { userId: 'u-1', checkInAt: new Date('2026-06-03T08:00:00Z'), checkOutAt: null },
      ]);

      const result = await service.getTeamStatus(['o1']);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('u-1');
      expect(result[0].name).toBe('An');
      expect(result[0].employeeCode).toBe('E1');
      expect(result[0].currentStatus).toBe(WorkStatusType.WORKING);
      expect(result[0].todayCheckOut).toBeNull();
      // orgUnitIds=['o1'] → filter có orgUnitId in
      const where = prisma.user.findMany.mock.calls[0][0].where;
      expect(where.orgUnitId).toEqual({ in: ['o1'] });
      expect(where.isActive).toBe(true);
    });

    it('orgUnitIds=null → không filter org', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.workStatus.findMany.mockResolvedValue([]);
      prisma.timeEntry.findMany.mockResolvedValue([]);
      await service.getTeamStatus(null);
      const where = prisma.user.findMany.mock.calls[0][0].where;
      expect(where.orgUnitId).toBeUndefined();
    });
  });

  // ── Period: generatePeriod (mutation TẠO record) ────────────────────────────
  describe('generatePeriod', () => {
    it('upsert MISSING_SHIFT khi nhân viên chưa có ca ở ngày bắt đầu', async () => {
      prisma.employee.findFirst.mockResolvedValue({ id: 'emp-1' });
      workShifts.resolveShiftForDate.mockResolvedValue(null); // không có ca
      const rec = { id: 'rec-missing', status: TimesheetStatus.MISSING_SHIFT };
      prisma.timesheetRecord.upsert.mockResolvedValue(rec);

      const result = await service.generatePeriod('u-1', Role.MEMBER, {
        periodStart: '2026-06-01',
        periodEnd: '2026-06-30',
      } as any);

      expect(prisma.timesheetRecord.upsert).toHaveBeenCalledTimes(1);
      const arg = prisma.timesheetRecord.upsert.mock.calls[0][0];
      expect(arg.create.status).toBe(TimesheetStatus.MISSING_SHIFT);
      expect(arg.create.standardDays).toBe(0);
      expect(result).toBe(rec);
    });

    it('tính standardDays + OT và upsert DRAFT record', async () => {
      prisma.employee.findFirst.mockResolvedValue({ id: 'emp-1' });
      // Có ca cho mọi ngày: 08:00-17:00, break 60'
      const shift = { startTime: '08:00', endTime: '17:00', breakMinutes: 60, type: 'CA_DAY', workingDays: [1, 2, 3, 4, 5] };
      workShifts.resolveShiftForDate.mockResolvedValue(shift);
      prisma.holidayCalendar.findMany.mockResolvedValue([]);
      // 1 ngày làm việc thường giữa tuần, check in 08:00 ra 18:00 → 10h raw.
      // Dùng toUtcDateOnly để entry.date map về đúng key của vòng lặp service mọi TZ.
      const day = toUtcDateOnly('2026-06-03');
      prisma.timeEntry.findMany.mockResolvedValue([
        {
          date: day,
          checkInAt: new Date(day.getTime()),
          checkOutAt: new Date(day.getTime() + 10 * 3_600_000),
        },
      ]);
      const rec = { id: 'rec-draft', status: TimesheetStatus.DRAFT };
      prisma.timesheetRecord.upsert.mockResolvedValue(rec);

      const result = await service.generatePeriod('u-1', Role.MEMBER, {
        periodStart: '2026-06-03',
        periodEnd: '2026-06-03',
      } as any);

      expect(prisma.timesheetRecord.upsert).toHaveBeenCalledTimes(1);
      const arg = prisma.timesheetRecord.upsert.mock.calls[0][0];
      expect(arg.create.status).toBe(TimesheetStatus.DRAFT);
      expect(arg.create.userId).toBe('u-1');
      // standardDays: 1 ngày làm (T2, có ca, không lễ)
      expect(arg.create.standardDays).toBe(1);
      // workingDays: có chấm công, không off, không lễ → 1
      expect(arg.create.workingDays).toBe(1);
      // raw 10h - break 1h = 9h worked; effective shift = 9-1=8 → OT = 1h weekday
      expect(arg.create.otWeekdayHours).toBe(1);
      expect(arg.create.overtimeHours).toBe(1);
      expect(result).toBe(rec);
    });
  });

  // ── Period: getPeriodDetail (read) ──────────────────────────────────────────
  describe('getPeriodDetail', () => {
    it('trả record + days với status/dayCredit đúng', async () => {
      const record = { id: 'rec-1', status: TimesheetStatus.DRAFT };
      prisma.timesheetRecord.findFirst.mockResolvedValue(record);
      const day = toUtcDateOnly('2026-06-03');
      prisma.timeEntry.findMany.mockResolvedValue([
        {
          date: day,
          checkInAt: new Date(day.getTime()),
          checkOutAt: new Date(day.getTime() + 9 * 3_600_000),
          isManualCorrection: false,
        },
      ]);
      prisma.employee.findFirst.mockResolvedValue({ id: 'emp-1' });
      prisma.attendanceRecord.findMany.mockResolvedValue([]);
      prisma.leaveRequest.findMany.mockResolvedValue([]);
      workShifts.isOffDay.mockResolvedValue(false);

      const result = await service.getPeriodDetail('u-1', '2026-06-03', '2026-06-03');

      expect(result.record).toBe(record);
      expect(result.days).toHaveLength(1);
      const d = result.days[0];
      expect(d.date).toBe(dateKey('2026-06-03'));
      expect(d.status).toBe('present');
      expect(d.workHours).toBe(9);
      expect(d.overtimeHours).toBe(1);
      expect(d.dayCredit).toBe(1);
    });

    it('status=off khi isOffDay=true và không có entry', async () => {
      prisma.timesheetRecord.findFirst.mockResolvedValue(null);
      prisma.timeEntry.findMany.mockResolvedValue([]);
      prisma.employee.findFirst.mockResolvedValue({ id: 'emp-1' });
      prisma.attendanceRecord.findMany.mockResolvedValue([]);
      prisma.leaveRequest.findMany.mockResolvedValue([]);
      workShifts.isOffDay.mockResolvedValue(true);

      const result = await service.getPeriodDetail('u-1', '2026-06-06', '2026-06-06');
      expect(result.days[0].status).toBe('off');
      expect(result.days[0].dayCredit).toBe(0);
    });
  });

  // ── Approval: approve (mutation UPDATE) ─────────────────────────────────────
  describe('approve', () => {
    it('cập nhật status APPROVED + tạo notification', async () => {
      prisma.timesheetRecord.findUnique.mockResolvedValue({
        id: 'rec-1', userId: 'owner-1', status: TimesheetStatus.SUBMITTED,
      });
      const updated = { id: 'rec-1', status: TimesheetStatus.APPROVED };
      prisma.timesheetRecord.update.mockResolvedValue(updated);
      prisma.notification.create.mockResolvedValue({});

      const result = await service.approve('rec-1', 'approver-1');

      expect(prisma.timesheetRecord.update).toHaveBeenCalledTimes(1);
      const arg = prisma.timesheetRecord.update.mock.calls[0][0];
      expect(arg.where.id).toBe('rec-1');
      expect(arg.data.status).toBe(TimesheetStatus.APPROVED);
      expect(arg.data.approvedById).toBe('approver-1');
      expect(arg.data.lockedAt).toBeInstanceOf(Date);
      // notification gửi cho owner record
      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
      const notif = prisma.notification.create.mock.calls[0][0];
      expect(notif.data.userId).toBe('owner-1');
      expect(notif.data.type).toBe(NotificationType.TIMESHEET_APPROVED);
      expect(result).toBe(updated);
    });

    it('ném BadRequest nếu record không ở trạng thái SUBMITTED', async () => {
      prisma.timesheetRecord.findUnique.mockResolvedValue({
        id: 'rec-1', status: TimesheetStatus.DRAFT,
      });
      await expect(service.approve('rec-1', 'approver-1')).rejects.toThrow('Chỉ có thể duyệt');
      expect(prisma.timesheetRecord.update).not.toHaveBeenCalled();
    });

    it('ném NotFound nếu record không tồn tại', async () => {
      prisma.timesheetRecord.findUnique.mockResolvedValue(null);
      await expect(service.approve('rec-x', 'approver-1')).rejects.toThrow('Không tìm thấy bảng công');
    });
  });

  // ── Approval cron: checkTimesheetEscalation (gọi qua facade) ─────────────────
  describe('checkTimesheetEscalation', () => {
    it('escalate record quá hạn chưa từng escalate', async () => {
      prisma.timesheetRecord.findMany.mockResolvedValue([
        {
          id: 'rec-1',
          periodStart: new Date('2026-05-01'),
          user: { name: 'An', orgUnit: { parentId: 'parent-1', parent: {} } },
        },
      ]);
      prisma.notification.findFirst.mockResolvedValue(null); // chưa escalate
      prisma.user.findMany.mockResolvedValue([{ id: 'mgr-1' }]);
      prisma.notification.createMany.mockResolvedValue({ count: 1 });

      await service.checkTimesheetEscalation();

      expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
      const data = prisma.notification.createMany.mock.calls[0][0].data;
      expect(data[0].type).toBe(NotificationType.TIMESHEET_APPROVAL_ESCALATED);
      expect(data[0].userId).toBe('mgr-1');
    });

    it('bỏ qua record đã escalate', async () => {
      prisma.timesheetRecord.findMany.mockResolvedValue([
        { id: 'rec-1', periodStart: new Date('2026-05-01'), user: { name: 'An', orgUnit: { parentId: 'parent-1' } } },
      ]);
      prisma.notification.findFirst.mockResolvedValue({ id: 'notif-old' });

      await service.checkTimesheetEscalation();
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });
  });
});
