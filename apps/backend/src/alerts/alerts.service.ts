import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import type { NotificationType } from '../generated/prisma';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForProject(projectId: string) {
    return this.prisma.alertConfig.findMany({ where: { projectId } });
  }

  async upsert(projectId: string, dto: CreateAlertDto) {
    return this.prisma.alertConfig.upsert({
      where: { projectId_type: { projectId, type: dto.type } },
      create: {
        projectId,
        type: dto.type,
        threshold: dto.threshold,
        daysBeforeDue: dto.daysBeforeDue,
        isActive: dto.isActive ?? true,
      },
      update: {
        threshold: dto.threshold,
        daysBeforeDue: dto.daysBeforeDue,
        isActive: dto.isActive,
      },
    });
  }

  async remove(projectId: string, alertId: string) {
    const alert = await this.prisma.alertConfig.findFirst({
      where: { id: alertId, projectId },
    });
    if (!alert) throw new NotFoundException('Không tìm thấy cấu hình cảnh báo');
    return this.prisma.alertConfig.delete({ where: { id: alertId } });
  }

  async checkOverdueTasks(): Promise<void> {
    const now = new Date();
    const overdueTasks = await this.prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ['DONE', 'CANCELLED'] },
        assigneeId: { not: null },
      },
      include: {
        project: {
          include: {
            alertConfigs: { where: { type: 'TASK_OVERDUE', isActive: true } },
          },
        },
      },
    });

    for (const task of overdueTasks) {
      if (!task.project.alertConfigs.length) continue;
      await this.createTaskAlert(task, 'TASK_OVERDUE', `Task "${task.title}" đã quá hạn`);
    }
  }

  async checkDueSoonTasks(): Promise<void> {
    const alerts = await this.prisma.alertConfig.findMany({
      where: { type: 'TASK_DUE_SOON', isActive: true },
    });

    for (const alert of alerts) {
      if (!alert.daysBeforeDue) continue;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + alert.daysBeforeDue);

      const tasks = await this.prisma.task.findMany({
        where: {
          projectId: alert.projectId,
          dueDate: { gte: new Date(), lte: targetDate },
          status: { notIn: ['DONE', 'CANCELLED'] },
          assigneeId: { not: null },
        },
      });

      for (const task of tasks) {
        await this.createTaskAlert(task, 'TASK_DUE_SOON', `Task "${task.title}" sắp đến hạn`);
      }
    }
  }

  async checkProjectDeadline(): Promise<void> {
    const configs = await this.prisma.alertConfig.findMany({
      where: { type: 'RESOURCE_EXPIRING', isActive: true },
    });

    for (const config of configs) {
      if (!config.daysBeforeDue) continue;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + config.daysBeforeDue);

      const project = await this.prisma.project.findUnique({
        where: { id: config.projectId },
        select: { id: true, name: true, endDate: true, pmId: true },
      });
      if (!project || !project.endDate) continue;

      const daysLeft = Math.ceil((project.endDate.getTime() - Date.now()) / 86_400_000);
      if (daysLeft < 0 || daysLeft > config.daysBeforeDue) continue;

      await this.createProjectAlert(
        project.pmId,
        'RESOURCE_EXPIRING',
        'Dự án sắp kết thúc',
        `Dự án "${project.name}" còn ${daysLeft} ngày đến hạn`,
        { projectId: project.id },
      );
    }
  }

  async checkEffortThreshold(): Promise<void> {
    const configs = await this.prisma.alertConfig.findMany({
      where: {
        type: { in: ['EFFORT_NEAR_BUDGET', 'EFFORT_OVER_BUDGET'] },
        isActive: true,
        threshold: { not: null },
      },
    });

    for (const config of configs) {
      const project = await this.prisma.project.findUnique({
        where: { id: config.projectId },
        select: { id: true, name: true, budgetEffortMm: true, pmId: true },
      });
      if (!project?.budgetEffortMm) continue;

      const budgetHours = Number(project.budgetEffortMm) * 21 * 8;
      const tasks = await this.prisma.task.findMany({
        where: { projectId: config.projectId },
        select: { actualHours: true },
      });
      const actualHours = tasks.reduce((s, t) => s + Number(t.actualHours), 0);
      if (budgetHours <= 0) continue;

      const ratio = (actualHours / budgetHours) * 100;
      const threshold = Number(config.threshold);

      if (ratio > 100) {
        await this.createProjectAlert(
          project.pmId,
          'EFFORT_OVER_BUDGET',
          'Vượt ngân sách effort',
          `Dự án "${project.name}" đã dùng ${ratio.toFixed(1)}% ngân sách effort`,
          { projectId: project.id },
        );
      } else if (ratio >= threshold) {
        await this.createProjectAlert(
          project.pmId,
          'EFFORT_NEAR_BUDGET',
          'Sắp chạm ngân sách effort',
          `Dự án "${project.name}" đã dùng ${ratio.toFixed(1)}% ngân sách effort`,
          { projectId: project.id },
        );
      }
    }
  }

  async checkBudgetThreshold(): Promise<void> {
    const configs = await this.prisma.alertConfig.findMany({
      where: {
        type: { in: ['BUDGET_NEAR_LIMIT', 'BUDGET_EXCEEDED'] },
        isActive: true,
        threshold: { not: null },
      },
    });

    for (const config of configs) {
      const project = await this.prisma.project.findUnique({
        where: { id: config.projectId },
        select: { id: true, name: true, budgetCost: true, pmId: true },
      });
      if (!project?.budgetCost || Number(project.budgetCost) <= 0) continue;

      const totalCost = await this.calcProjectCost(config.projectId);
      const ratio = (totalCost / Number(project.budgetCost)) * 100;
      const threshold = Number(config.threshold);

      if (ratio > 100) {
        await this.createProjectAlert(
          project.pmId,
          'BUDGET_EXCEEDED',
          'Vượt ngân sách',
          `Dự án "${project.name}" đã chi ${ratio.toFixed(1)}% ngân sách`,
          { projectId: project.id },
        );
      } else if (ratio >= threshold) {
        await this.createProjectAlert(
          project.pmId,
          'BUDGET_NEAR_LIMIT',
          'Sắp chạm ngân sách',
          `Dự án "${project.name}" đã chi ${ratio.toFixed(1)}% ngân sách`,
          { projectId: project.id },
        );
      }
    }
  }

  private async calcProjectCost(projectId: string): Promise<number> {
    const timeLogs = await this.prisma.timeLog.findMany({
      where: { task: { projectId } },
      select: { userId: true, hours: true, logDate: true },
    });

    let total = 0;
    for (const log of timeLogs) {
      const employee = await this.prisma.employee.findFirst({
        where: { userId: log.userId },
        select: { id: true },
      });
      if (!employee) continue;

      const rate = await this.prisma.employeeRate.findFirst({
        where: { employeeId: employee.id, effectiveDate: { lte: log.logDate } },
        orderBy: { effectiveDate: 'desc' },
        select: { ratePerDay: true },
      });
      if (!rate) continue;

      total += (Number(log.hours) / 8) * Number(rate.ratePerDay);
    }
    return total;
  }

  private async createProjectAlert(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    payload: Record<string, unknown>,
  ) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        userId,
        type,
        payload: { path: ['projectId'], equals: payload['projectId'] as string },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (existing) return;

    await this.prisma.notification.create({
      data: { userId, type, title, body, payload: payload as never },
    });
  }

  private async createTaskAlert(
    task: { id: string; assigneeId: string | null; title: string; projectId: string },
    type: NotificationType,
    body: string,
  ) {
    if (!task.assigneeId) return;
    const employee = await this.prisma.employee.findUnique({
      where: { id: task.assigneeId },
      select: { userId: true },
    });
    if (!employee?.userId) return;

    const existing = await this.prisma.notification.findFirst({
      where: {
        userId: employee.userId,
        type,
        payload: { path: ['taskId'], equals: task.id },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (existing) return;

    await this.prisma.notification.create({
      data: {
        userId: employee.userId,
        type,
        title: 'Cảnh báo Task',
        body,
        payload: { taskId: task.id, projectId: task.projectId },
      },
    });
  }
}
