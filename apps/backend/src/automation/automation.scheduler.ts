import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationService } from './automation.service';

@Injectable()
export class AutomationScheduler {
  private readonly logger = new Logger(AutomationScheduler.name);

  constructor(
    private readonly svc: AutomationService,
    private readonly prisma: PrismaService,
  ) {}

  private async run(key: string) {
    const rule = await this.prisma.automationRule.findFirst({ where: { key } });
    if (!rule?.isActive) { this.logger.debug(`${key} inactive — skip`); return; }
    try {
      // executeRule đã tự logRun bên trong — không cần gọi thêm ở đây
      await this.svc.executeRule(rule.id);
    } catch (err: any) {
      this.logger.error(`${key} failed: ${err.message}`);
    }
  }

  // Cron tách ra AutomationCronTask (DEFAULT scope) — scheduler này bị bubbling REQUEST scope
  async timesheetCron()  { await this.run('timesheet-reminder'); }
  async contractCron()   { await this.run('contract-expiry'); }
  async leaveCron()      { await this.run('leave-escalation'); }
  async okrCron()        { await this.run('okr-checkin-reminder'); }
}
