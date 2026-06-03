import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { TimesheetStatus, NotificationType, Role } from '../../generated/prisma';
import type { RejectTimesheetDto } from '../dto/generate-period.dto';
import { TenantAwareService } from '../../common/services/tenant-aware.service';

@Injectable({ scope: Scope.REQUEST })
export class TimesheetApprovalProvider extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async submit(id: string, userId: string) {
    const record = await this.findRecordOrFail(id);
    if (record.userId !== userId) throw new ForbiddenException();
    if (record.status !== TimesheetStatus.DRAFT) {
      throw new BadRequestException('Chỉ có thể nộp bảng công ở trạng thái Bản nháp');
    }

    const updated = await this.prisma.timesheetRecord.update({
      where: { id },
      data: { status: TimesheetStatus.SUBMITTED, submittedAt: new Date() },
    });

    // Notify manager (simplified — find users in parent org unit with PM/ADMIN role)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { orgUnit: { include: { parent: true } } },
    });
    if (user?.orgUnit?.parentId) {
      const managers = await this.prisma.user.findMany({
        where: {
          orgUnitId: user.orgUnit.parentId,
          role: { in: [Role.PM, Role.ADMIN] },
        },
      });
      if (managers.length) {
        await this.prisma.notification.createMany({
          data: managers.map((m) => ({
            userId: m.id,
            type: NotificationType.TIMESHEET_SUBMITTED,
            title: 'Bảng công chờ duyệt',
            body: `${user.name} đã nộp bảng công tháng ${updated.periodStart.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}`,
            payload: { timesheetId: id },
          })),
        });
      }
    }

    return updated;
  }

  // ── Approve ─────────────────────────────────────────────────────────────────

  async approve(id: string, approverId: string) {
    const record = await this.findRecordOrFail(id);
    if (record.status !== TimesheetStatus.SUBMITTED) {
      throw new BadRequestException('Chỉ có thể duyệt bảng công ở trạng thái Đã nộp');
    }

    const updated = await this.prisma.timesheetRecord.update({
      where: { id },
      data: {
        status: TimesheetStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: approverId,
        lockedAt: new Date(),
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: record.userId,
        type: NotificationType.TIMESHEET_APPROVED,
        title: 'Bảng công đã được duyệt',
        body: `Bảng công của bạn đã được phê duyệt`,
        payload: { timesheetId: id },
      },
    });

    return updated;
  }

  // ── Reject ──────────────────────────────────────────────────────────────────

  async reject(id: string, _approverId: string, dto: RejectTimesheetDto) {
    const record = await this.findRecordOrFail(id);
    if (record.status !== TimesheetStatus.SUBMITTED) {
      throw new BadRequestException('Chỉ có thể từ chối bảng công ở trạng thái Đã nộp');
    }

    const updated = await this.prisma.timesheetRecord.update({
      where: { id },
      data: {
        status: TimesheetStatus.REJECTED,
        rejectionReason: dto.reason,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: record.userId,
        type: NotificationType.TIMESHEET_REJECTED,
        title: 'Bảng công bị từ chối',
        body: `Lý do: ${dto.reason}`,
        payload: { timesheetId: id },
      },
    });

    return updated;
  }

  // ── Pending Approval List ───────────────────────────────────────────────────

  async getPendingApproval(orgUnitIds: string[] | null) {
    const threshold48h = new Date(Date.now() - 48 * 3_600_000);
    const userOrgFilter = orgUnitIds === null ? {} : { orgUnitId: { in: orgUnitIds } };
    const records = await this.prisma.timesheetRecord.findMany({
      where: {
        status: TimesheetStatus.SUBMITTED,
        user: userOrgFilter,
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { submittedAt: 'asc' },
      take: 500,
    });

    return records.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.user.name,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      submittedAt: r.submittedAt,
      isOverdue: r.submittedAt ? r.submittedAt < threshold48h : false,
    }));
  }

  // ── Auto-Escalation (called by scheduler) ───────────────────────────────────

  async checkTimesheetEscalation(): Promise<void> {
    const threshold48h = new Date(Date.now() - 48 * 3_600_000);

    const overdueRecords = await this.prisma.timesheetRecord.findMany({
      where: {
        status: TimesheetStatus.SUBMITTED,
        submittedAt: { lt: threshold48h },
      },
      include: {
        user: {
          include: { orgUnit: { include: { parent: true } } },
        },
      },
      take: 500,
    });

    for (const record of overdueRecords) {
      // Skip if escalation notification already sent for this record
      const alreadyEscalated = await this.prisma.notification.findFirst({
        where: {
          type: NotificationType.TIMESHEET_APPROVAL_ESCALATED,
          payload: { path: ['timesheetId'], equals: record.id },
        },
      });
      if (alreadyEscalated) continue;

      const parentOrgUnitId = record.user.orgUnit?.parentId;
      if (!parentOrgUnitId) continue;

      const escalationTargets = await this.prisma.user.findMany({
        where: {
          orgUnitId: parentOrgUnitId,
          role: { in: [Role.PM, Role.ADMIN, Role.LEADERSHIP] },
          isActive: true,
        },
      });
      if (!escalationTargets.length) continue;

      const month = record.periodStart.toLocaleDateString('vi-VN', {
        month: '2-digit',
        year: 'numeric',
      });

      await this.prisma.notification.createMany({
        data: escalationTargets.map((m) => ({
          userId: m.id,
          type: NotificationType.TIMESHEET_APPROVAL_ESCALATED,
          title: 'Bảng công cần duyệt khẩn',
          body: `Bảng công tháng ${month} của ${record.user.name} đã chờ duyệt hơn 48 giờ`,
          payload: { timesheetId: record.id, employeeName: record.user.name },
        })),
      });
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async findRecordOrFail(id: string) {
    const record = await this.prisma.timesheetRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Không tìm thấy bảng công');
    return record;
  }
}
