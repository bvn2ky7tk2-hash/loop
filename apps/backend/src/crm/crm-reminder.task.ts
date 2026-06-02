import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TenantRunner } from '../common/cls/tenant-runner.service';

/**
 * E22.4 — Cron task nhắc nhở CRM activities đến hạn / quá hạn.
 * Chạy lúc 8:00 sáng mỗi ngày.
 *
 * Không inject CrmActivitiesService trực tiếp vì có thể là REQUEST-scoped.
 * Dùng PrismaService trực tiếp (singleton-safe).
 *
 * Duplicate guard: bỏ qua nếu đã gửi notification cùng loại (entityType=CrmReminder)
 * cho user trong vòng 24h qua.
 */
@Injectable()
export class CrmReminderTask {
  private readonly logger = new Logger(CrmReminderTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantRunner: TenantRunner,
  ) {}

  @Cron('0 8 * * *')
  async handleCrmReminders(): Promise<void> {
    await this.tenantRunner.forEachTenant(async (tenantId) => {
    this.logger.log('[CrmReminderTask] Bắt đầu kiểm tra CRM activities đến hạn...');

    const now = new Date();

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Cửa sổ "sắp đến hạn": hôm nay đến hết ngày mai
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Ngưỡng 24h để kiểm tra duplicate notification
    const oneDayAgo = new Date(now);
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    // 1. Query activities sắp đến hạn (hôm nay hoặc ngày mai) và chưa hoàn thành
    const upcomingActivities = await this.prisma.crmActivity.findMany({
      where: {
        completedAt: null,
        nextActionDueAt: {
          gte: today,
          lt: dayAfterTomorrow,
        },
      },
      select: {
        id: true,
        subject: true,
        createdById: true,
        nextActionDueAt: true,
      },
      orderBy: { nextActionDueAt: 'asc' },
      take: 500,
    });

    // 2. Query activities đã quá hạn (trước hôm nay) và chưa hoàn thành
    const overdueActivities = await this.prisma.crmActivity.findMany({
      where: {
        completedAt: null,
        nextActionDueAt: {
          lt: today,
        },
      },
      select: {
        id: true,
        subject: true,
        createdById: true,
        nextActionDueAt: true,
      },
      orderBy: { nextActionDueAt: 'asc' },
      take: 500,
    });

    // Nhóm theo createdById
    const upcomingByUser = groupByUser(upcomingActivities);
    const overdueByUser = groupByUser(overdueActivities);

    const allUserIds = new Set([
      ...Object.keys(upcomingByUser),
      ...Object.keys(overdueByUser),
    ]);

    if (allUserIds.size === 0) {
      this.logger.log('[CrmReminderTask] Không có activities cần nhắc nhở.');
      return;
    }

    // Lấy danh sách notification đã gửi trong 24h qua để tránh duplicate
    const recentNotifications = await this.prisma.notification.findMany({
      where: {
        entityType: 'CrmReminder',
        createdAt: { gte: oneDayAgo },
        userId: { in: Array.from(allUserIds) },
      },
      select: { userId: true, type: true },
      take: 2000,
    });

    // Map: `${userId}:${type}` → đã gửi
    const sentSet = new Set(
      recentNotifications.map((n) => `${n.userId}:${n.type}`),
    );

    let upcomingCount = 0;
    let overdueCount = 0;

    // 3. Gửi notification cho activities sắp đến hạn
    for (const [userId, activities] of Object.entries(upcomingByUser)) {
      const dedupeKey = `${userId}:TASK_DUE_TODAY`;
      if (sentSet.has(dedupeKey)) continue;

      const n = activities.length;
      const preview = activities
        .slice(0, 3)
        .map((a) => `• ${a.subject}`)
        .join('\n');
      const suffix = n > 3 ? `\n... và ${n - 3} hoạt động khác` : '';

      await this.prisma.notification.create({
        data: {
          userId,
          type: 'TASK_DUE_TODAY' as any,
          title: `CRM: ${n} hoạt động cần theo dõi hôm nay`,
          body: `${preview}${suffix}`,
          link: '/crm/activities',
          entityType: 'CrmReminder',
          payload: { activityIds: activities.map((a) => a.id) },
        },
      });
      upcomingCount++;
    }

    // 4. Gửi notification escalate cho activities đã quá hạn
    for (const [userId, activities] of Object.entries(overdueByUser)) {
      const dedupeKey = `${userId}:TASK_OVERDUE`;
      if (sentSet.has(dedupeKey)) continue;

      const n = activities.length;
      const preview = activities
        .slice(0, 3)
        .map((a) => `• ${a.subject}`)
        .join('\n');
      const suffix = n > 3 ? `\n... và ${n - 3} hoạt động khác` : '';

      await this.prisma.notification.create({
        data: {
          userId,
          type: 'TASK_OVERDUE' as any,
          title: `CRM: ${n} hoạt động ĐÃ QUÁ HẠN`,
          body: `${preview}${suffix}`,
          link: '/crm/activities',
          entityType: 'CrmReminder',
          payload: { activityIds: activities.map((a) => a.id) },
        },
      });
      overdueCount++;
    }

    this.logger.log(
      `[CrmReminderTask] Đã gửi ${upcomingCount} notification sắp đến hạn, ${overdueCount} notification quá hạn.`,
    );
    });
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function groupByUser<T extends { createdById: string }>(
  activities: T[],
): Record<string, T[]> {
  return activities.reduce<Record<string, T[]>>((acc, a) => {
    if (!acc[a.createdById]) acc[a.createdById] = [];
    acc[a.createdById].push(a);
    return acc;
  }, {});
}
