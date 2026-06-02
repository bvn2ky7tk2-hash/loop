import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertsService } from './alerts.service';
import { TimesheetService } from '../timesheet/timesheet.service';
import { TelegramService } from '../integrations/telegram/telegram.service';
import { TelegramCardBuilder } from '../integrations/telegram/telegram-card.builder';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertSchedulerService {
  private readonly logger = new Logger(AlertSchedulerService.name);

  constructor(
    private readonly alertsService: AlertsService,
    private readonly timesheetService: TimesheetService,
    private readonly telegramService: TelegramService,
    private readonly telegramCardBuilder: TelegramCardBuilder,
    private readonly prisma: PrismaService,
  ) {}

  // Cron tách ra AlertSchedulerTask (DEFAULT scope) — service này bị bubbling REQUEST scope
  async runAlertChecks() {
    this.logger.log('Running scheduled alert checks...');
    await Promise.all([
      this.alertsService.checkOverdueTasks(),
      this.alertsService.checkDueSoonTasks(),
      this.alertsService.checkProjectDeadline(),
      this.alertsService.checkEffortThreshold(),
      this.alertsService.checkBudgetThreshold(),
      this.timesheetService.checkTimesheetEscalation(),
    ]).catch((err) => this.logger.error('Alert check failed', err));

    this.sendTelegramDeadlineAlerts().catch(() => {});
  }

  private async sendTelegramDeadlineAlerts(): Promise<void> {
    if (!this.telegramService.getIsEnabled()) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    try {
      const tasks = await this.prisma.task.findMany({
        where: {
          dueDate: { gte: today, lte: sevenDaysFromNow },
          status: { notIn: ['DONE', 'CANCELLED'] },
          assigneeId: { not: null },
        },
        include: {
          assignee: { select: { fullName: true } },
          project: { select: { name: true } },
        },
      });

      for (const task of tasks) {
        try {
          // Deduplication check
          const existing = await this.prisma.telegramMessage.findUnique({
            where: {
              taskId_eventType_sentDate: {
                taskId: task.id,
                eventType: 'DEADLINE_ALERT',
                sentDate: today,
              },
            },
          });
          if (existing) continue;

          const card = this.telegramCardBuilder.buildTaskCard(
            {
              id: task.id,
              title: task.title,
              dueDate: task.dueDate,
              estimateHours: task.estimateHours as unknown as number,
              assigneeName: (task as unknown as { assignee?: { fullName: string } }).assignee?.fullName ?? null,
              projectName: (task as unknown as { project?: { name: string } }).project?.name ?? null,
            },
            'DEADLINE_ALERT',
          );

          const messageId = await this.telegramService.sendMessageWithId(
            card.text,
            card.reply_markup,
          );

          if (messageId) {
            await this.prisma.telegramMessage.create({
              data: {
                taskId: task.id,
                eventType: 'DEADLINE_ALERT',
                messageId,
                sentDate: today,
              },
            });
          }
        } catch (err) {
          this.logger.warn(`Telegram deadline alert failed for task ${task.id}`, err);
        }
      }
    } catch (err) {
      this.logger.warn('sendTelegramDeadlineAlerts query failed', err);
    }
  }
}
