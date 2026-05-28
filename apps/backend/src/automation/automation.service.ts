import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listRules() {
    return this.prisma.automationRule.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async toggleRule(key: string, isActive: boolean) {
    const rule = await this.prisma.automationRule.findUnique({ where: { key } });
    if (!rule) throw new NotFoundException('Rule không tồn tại');
    return this.prisma.automationRule.update({ where: { key }, data: { isActive } });
  }

  async getStats() {
    const [totalRules, activeRules, lastRule] = await Promise.all([
      this.prisma.automationRule.count(),
      this.prisma.automationRule.count({ where: { isActive: true } }),
      this.prisma.automationRule.findFirst({ where: { lastRunAt: { not: null } }, orderBy: { lastRunAt: 'desc' } }),
    ]);
    return { totalRules, activeRules, lastRunAt: lastRule?.lastRunAt ?? null };
  }

  async runRule(key: string) {
    const rule = await this.prisma.automationRule.findUnique({ where: { key } });
    if (!rule) throw new NotFoundException('Rule không tồn tại');
    await this.executeRule(key);
    return this.prisma.automationRule.update({
      where: { key },
      data: { lastRunAt: new Date(), runCount: { increment: 1 } },
    });
  }

  async executeRule(key: string) {
    switch (key) {
      case 'timesheet-reminder':   return this.timesheetReminder();
      case 'contract-expiry':      return this.contractExpiryAlert();
      case 'leave-escalation':     return this.leaveEscalation();
      case 'okr-checkin-reminder': return this.okrCheckInReminder();
      default: this.logger.warn(`Unknown rule key: ${key}`);
    }
  }

  // ─── Rule implementations ───────────────────────────────────────────────────

  async timesheetReminder() {
    this.logger.log('Running timesheet-reminder');
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    // Tìm users có employee, check xem tuần này đã nộp timesheet chưa
    const employees = await this.prisma.employee.findMany({
      where: { isActive: true, userId: { not: null } },
      select: { userId: true, fullName: true },
    });

    for (const emp of employees) {
      if (!emp.userId) continue;
      const hasTimesheet = await this.prisma.timesheetRecord.count({
        where: {
          userId: emp.userId,
          periodStart: { gte: weekStart },
          status: { in: ['SUBMITTED', 'APPROVED'] },
        },
      });
      if (!hasTimesheet) {
        await this.notifications.createInApp(emp.userId, {
          title: 'Nhắc nộp timesheet',
          body: 'Bạn chưa nộp timesheet tuần này. Vui lòng nộp trước cuối ngày hôm nay.',
          type: 'REMINDER',
          link: '/timesheet',
        });
      }
    }
    this.logger.log('timesheet-reminder complete');
  }

  async contractExpiryAlert() {
    this.logger.log('Running contract-expiry');
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const expiringContracts = await this.prisma.contract.findMany({
      where: { status: 'ACTIVE', endDate: { lte: in30Days, gte: new Date() } },
      include: { employee: { select: { fullName: true } } },
    });

    if (!expiringContracts.length) return;

    // Notify HR (ADMIN) users
    const hrUsers = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'LEADERSHIP'] }, isActive: true },
      select: { id: true },
    });

    for (const contract of expiringContracts) {
      const date = contract.endDate?.toLocaleDateString('vi-VN') ?? '';
      for (const hr of hrUsers) {
        await this.notifications.createInApp(hr.id, {
          title: 'Hợp đồng sắp hết hạn',
          body: `Hợp đồng của ${contract.employee.fullName} sẽ hết hạn vào ${date}. Cần gia hạn trước thời hạn.`,
          type: 'ALERT',
          link: '/contracts',
        });
      }
    }
    this.logger.log(`contract-expiry: notified ${expiringContracts.length} contracts`);
  }

  async leaveEscalation() {
    this.logger.log('Running leave-escalation');
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const pendingLeaves = await this.prisma.leaveRequest.findMany({
      where: { status: 'PENDING', createdAt: { lte: twoDaysAgo } },
      include: { employee: { select: { fullName: true } } },
    });

    // Notify admin/leadership users
    const managers = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'LEADERSHIP'] }, isActive: true },
      select: { id: true },
    });

    for (const leave of pendingLeaves) {
      const days = Math.floor((Date.now() - leave.createdAt.getTime()) / 86400000);
      for (const mgr of managers) {
        await this.notifications.createInApp(mgr.id, {
          title: 'Đơn nghỉ phép tồn đọng',
          body: `Đơn nghỉ phép của ${leave.employee.fullName} đã chờ ${days} ngày. Vui lòng xử lý sớm.`,
          type: 'ALERT',
          link: '/leaves',
        });
      }
    }
    this.logger.log(`leave-escalation: ${pendingLeaves.length} pending leaves`);
  }

  async okrCheckInReminder() {
    this.logger.log('Running okr-checkin-reminder');
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const staleObjectives = await this.prisma.okrObjective.findMany({
      where: { status: 'ACTIVE', updatedAt: { lte: fourteenDaysAgo } },
      include: { owner: { select: { id: true } } },
    });

    for (const obj of staleObjectives) {
      await this.notifications.createInApp(obj.owner.id, {
        title: 'Nhắc cập nhật OKR',
        body: `OKR "${obj.title}" chưa được cập nhật 14 ngày. Hãy check-in tiến độ.`,
        type: 'REMINDER',
        link: '/hr/okr',
      });
    }
    this.logger.log(`okr-checkin-reminder: ${staleObjectives.length} stale objectives`);
  }
}
