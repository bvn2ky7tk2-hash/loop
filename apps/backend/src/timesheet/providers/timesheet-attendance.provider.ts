import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckInMethod, WorkStatusType } from '../../generated/prisma';
import type { CheckInDto, CheckOutDto } from '../dto/checkin.dto';
import type { UpdateStatusDto } from '../dto/update-status.dto';
import { TenantAwareService } from '../../common/services/tenant-aware.service';
import { toDateOnly } from '../timesheet.util';

@Injectable({ scope: Scope.REQUEST })
export class TimesheetAttendanceProvider extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  // ── Check-in ────────────────────────────────────────────────────────────────

  async checkIn(userId: string, dto: CheckInDto) {
    const today = toDateOnly(new Date());
    const existing = await this.prisma.timeEntry.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    if (existing) {
      throw new ConflictException('Đã chấm công vào hôm nay');
    }

    const entry = await this.prisma.timeEntry.create({
      data: {
        userId,
        date: today,
        checkInAt: new Date(),
        checkInLat: dto.lat ?? null,
        checkInLng: dto.lng ?? null,
        checkInMethod: dto.method ?? CheckInMethod.MANUAL,
        // TimesheetRecord chưa có tenantId (v6 task)
      },
    });

    // Also set working status if not already set
    await this.setStatus(userId, { statusType: WorkStatusType.WORKING });

    return entry;
  }

  // ── Check-out ───────────────────────────────────────────────────────────────

  async checkOut(userId: string, dto: CheckOutDto) {
    const today = toDateOnly(new Date());
    const entry = await this.prisma.timeEntry.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    if (!entry) {
      throw new NotFoundException('Chưa chấm công vào hôm nay');
    }
    if (entry.checkOutAt) {
      throw new ConflictException('Đã chấm công ra hôm nay');
    }

    const updated = await this.prisma.timeEntry.update({
      where: { id: entry.id },
      data: {
        checkOutAt: new Date(),
        checkOutLat: dto.lat ?? null,
        checkOutLng: dto.lng ?? null,
      },
    });

    // End current work status
    await this.endCurrentStatus(userId);

    return updated;
  }

  // ── Quick Status Update ─────────────────────────────────────────────────────

  async setStatus(userId: string, dto: UpdateStatusDto) {
    await this.endCurrentStatus(userId);

    const status = await this.prisma.workStatus.create({
      data: {
        userId,
        statusType: dto.statusType,
        startedAt: new Date(),
        note: dto.note ?? null,
      },
    });

    return { currentStatus: status.statusType, since: status.startedAt };
  }

  private async endCurrentStatus(userId: string) {
    await this.prisma.workStatus.updateMany({
      where: { userId, endedAt: null },
      data: { endedAt: new Date() },
    });
  }

  // ── Today Summary ───────────────────────────────────────────────────────────

  async getTodaySummary(userId: string) {
    const today = toDateOnly(new Date());
    const [entry, currentStatus] = await Promise.all([
      this.prisma.timeEntry.findUnique({
        where: { userId_date: { userId, date: today } },
      }),
      this.prisma.workStatus.findFirst({
        where: { userId, endedAt: null },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    let workingHours: number | null = null;
    if (entry?.checkInAt && entry.checkOutAt) {
      workingHours =
        (entry.checkOutAt.getTime() - entry.checkInAt.getTime()) / 3_600_000;
    } else if (entry?.checkInAt) {
      workingHours =
        (Date.now() - entry.checkInAt.getTime()) / 3_600_000;
    }

    return {
      checkIn: entry?.checkInAt ?? null,
      checkOut: entry?.checkOutAt ?? null,
      currentStatus: currentStatus?.statusType ?? null,
      since: currentStatus?.startedAt ?? null,
      workingHours: workingHours !== null ? +workingHours.toFixed(2) : null,
    };
  }

  // ── Team Status (Manager / Leadership) ──────────────────────────────────────

  async getTeamStatus(orgUnitIds: string[] | null) {
    const today = toDateOnly(new Date());
    const orgWhere = orgUnitIds === null ? {} : { orgUnitId: { in: orgUnitIds } };

    const users = await this.prisma.user.findMany({
      where: { ...orgWhere, isActive: true },
      select: {
        id: true,
        name: true,
        employee: {
          select: {
            code: true,
            orgUnit: { select: { id: true, name: true } },
            position: { select: { jobTitle: { select: { id: true, name: true } } } },
          },
        },
      },
      take: 500,
    });

    const userIds = users.map((u) => u.id);

    const [statuses, entries] = await Promise.all([
      this.prisma.workStatus.findMany({
        where: { userId: { in: userIds }, endedAt: null },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.timeEntry.findMany({
        where: { userId: { in: userIds }, date: today },
      }),
    ]);

    const statusMap = new Map(statuses.map((s) => [s.userId, s]));
    const entryMap = new Map(entries.map((e) => [e.userId, e]));

    return users.map((u) => {
      const ws = statusMap.get(u.id);
      const te = entryMap.get(u.id);
      return {
        userId: u.id,
        name: u.name,
        employeeCode: u.employee?.code ?? null,
        orgUnit: u.employee?.orgUnit ?? null,
        position: u.employee?.position ?? null,
        currentStatus: ws?.statusType ?? null,
        since: ws?.startedAt ?? null,
        todayCheckIn: te?.checkInAt ?? null,
        todayCheckOut: te?.checkOutAt ?? null,
      };
    });
  }
}
