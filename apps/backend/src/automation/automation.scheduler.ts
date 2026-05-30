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
    const rule = await this.prisma.automationRule.findUnique({ where: { key } });
    if (!rule?.isActive) { this.logger.debug(`${key} inactive — skip`); return; }
    const start = Date.now();
    try {
      await this.svc.executeRule(key);
      await this.svc.logRun(rule.id, 'SUCCESS', null, Date.now() - start);
    } catch (err: any) {
      this.logger.error(`${key} failed: ${err.message}`);
      await this.svc.logRun(rule.id, 'FAILED', err?.message ?? 'Unknown error', Date.now() - start);
    }
  }

  @Cron('0 17 * * 5')   // Thứ 6 17h
  async timesheetCron()  { await this.run('timesheet-reminder'); }

  @Cron('0 9 * * *')    // Mỗi ngày 9h
  async contractCron()   { await this.run('contract-expiry'); }

  @Cron('0 10 * * *')   // Mỗi ngày 10h
  async leaveCron()      { await this.run('leave-escalation'); }

  @Cron('0 9 * * 1')    // Thứ 2 9h
  async okrCron()        { await this.run('okr-checkin-reminder'); }
}
