import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, UserTaskStatus } from '../generated/prisma';

/**
 * E23.6 — Task Escalation Engine
 * Chạy mỗi 30 phút, tìm task quá hạn và leo thang theo mức:
 *   Level 1 (>= 1d): notify assignee + manager trực tiếp
 *   Level 2 (>= 3d): notify thêm manager.manager
 *   Level 3 (>= 7d): notify thêm tất cả ADMIN
 */
@Injectable()
export class EscalationTask {
  private readonly logger = new Logger(EscalationTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Cron tách ra EscalationCronTask (DEFAULT scope) — task này bị bubbling REQUEST scope
  async runEscalation(): Promise<void> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Lấy tất cả task ACTIVE đã quá hạn và chưa escalate trong 24h
    const overdueTasks = await this.prisma.processUserTask.findMany({
      where: {
        status: { in: [UserTaskStatus.PENDING, UserTaskStatus.IN_PROGRESS] },
        dueDate: { lt: now },
        OR: [
          { lastEscalatedAt: null },
          { lastEscalatedAt: { lt: oneDayAgo } },
        ],
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            orgUnitId: true,
            role: true,
          },
        },
        instance: {
          select: {
            id: true,
            startedBy: true,
            definition: { select: { name: true } },
          },
        },
      },
      take: 200,
    });

    if (!overdueTasks.length) return;

    this.logger.log(`EscalationTask: tìm thấy ${overdueTasks.length} task quá hạn`);

    for (const task of overdueTasks) {
      try {
        await this.escalateTask(task, now);
      } catch (err) {
        this.logger.warn(`Escalation failed taskId=${task.id}`, err);
      }
    }
  }

  private async escalateTask(
    task: {
      id: string;
      name: string;
      dueDate: Date | null;
      assigneeId: string | null;
      assignee: { id: string; name: string; email: string | null; orgUnitId: string | null; role: string } | null;
      instance: { id: string; startedBy: string; definition: { name: string } };
    },
    now: Date,
  ): Promise<void> {
    if (!task.dueDate) return;

    const overdueDays = (now.getTime() - task.dueDate.getTime()) / 86_400_000;
    const processName = task.instance.definition.name;
    const taskName = task.name;

    const recipientIds = new Set<string>();

    // Level 1: assignee
    if (task.assigneeId) recipientIds.add(task.assigneeId);

    // Tìm manager (leader của phòng ban)
    let managerId: string | null = null;
    let managerManagerId: string | null = null;

    if (task.assignee?.orgUnitId) {
      const orgUnit = await this.prisma.orgUnit.findUnique({
        where: { id: task.assignee.orgUnitId },
        select: { leaderId: true, parentId: true },
      });

      if (orgUnit?.leaderId) {
        const leaderEmployee = await this.prisma.employee.findUnique({
          where: { id: orgUnit.leaderId },
          select: { userId: true },
        });
        if (leaderEmployee?.userId && leaderEmployee.userId !== task.assigneeId) {
          managerId = leaderEmployee.userId;
        }
      }

      // Level 2: tìm manager của manager
      if (orgUnit?.parentId) {
        const parentOrgUnit = await this.prisma.orgUnit.findUnique({
          where: { id: orgUnit.parentId },
          select: { leaderId: true },
        });
        if (parentOrgUnit?.leaderId) {
          const parentLeaderEmployee = await this.prisma.employee.findUnique({
            where: { id: parentOrgUnit.leaderId },
            select: { userId: true },
          });
          if (parentLeaderEmployee?.userId) {
            managerManagerId = parentLeaderEmployee.userId;
          }
        }
      }
    }

    // Level 1 (>= 1d): assignee + manager
    if (overdueDays >= 1) {
      if (managerId) recipientIds.add(managerId);
    }

    // Level 2 (>= 3d): + manager.manager
    if (overdueDays >= 3 && managerManagerId) {
      recipientIds.add(managerManagerId);
    }

    // Level 3 (>= 7d): + tất cả ADMIN trong tenant
    if (overdueDays >= 7) {
      const admins = await this.prisma.user.findMany({
        where: {
          role: 'ADMIN' as never,
          isActive: true,
        },
        select: { id: true },
        take: 20,
      });
      admins.forEach((a) => recipientIds.add(a.id));
    }

    const level = overdueDays >= 7 ? 3 : overdueDays >= 3 ? 2 : 1;
    const overdueDaysRounded = Math.floor(overdueDays);
    const title = `Task quá hạn ${overdueDaysRounded}d (Level ${level}): ${taskName}`;
    const body = `Task "${taskName}" trong quy trình "${processName}" đã quá hạn ${overdueDaysRounded} ngày. Vui lòng xử lý hoặc leo thang.`;

    // Gửi notification cho tất cả recipients
    for (const recipientId of recipientIds) {
      try {
        await this.notificationsService.createAndDeliver(
          recipientId,
          NotificationType.SYSTEM_ALERT,
          title,
          body,
          { processUserTaskId: task.id, instanceId: task.instance.id, escalationLevel: level },
        );
      } catch (err) {
        this.logger.warn(`Escalation notify failed userId=${recipientId} taskId=${task.id}`, err);
      }
    }

    // Cập nhật lastEscalatedAt
    await this.prisma.processUserTask.update({
      where: { id: task.id },
      data: { lastEscalatedAt: new Date() },
    });

    this.logger.log(
      `Escalated taskId=${task.id} level=${level} overdueDays=${overdueDaysRounded} recipients=${recipientIds.size}`,
    );
  }
}
