import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ModuleRef, ContextIdFactory } from '@nestjs/core';
import { AlertSchedulerService } from './alert-scheduler.service';
import { TenantRunner } from '../common/cls/tenant-runner.service';

/**
 * Cron wrapper (DEFAULT scope) cho AlertSchedulerService.
 * Service này bị "scope bubbling" sang REQUEST (inject AlertsService/TimesheetService
 * REQUEST scope) nên @nestjs/schedule không đăng ký @Cron trực tiếp được.
 */
@Injectable()
export class AlertSchedulerTask {
  private readonly logger = new Logger(AlertSchedulerTask.name);
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly tenantRunner: TenantRunner,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runAlertChecks() {
    await this.tenantRunner.forEachTenant(async (tenantId) => {
      try {
        const contextId = ContextIdFactory.create();
        this.moduleRef.registerRequestByContextId({}, contextId);
        const svc = await this.moduleRef.resolve(AlertSchedulerService, contextId, { strict: false });
        await svc.runAlertChecks();
      } catch (e) {
        this.logger.error(`runAlertChecks lỗi: ${(e as Error)?.message}`);
      }
    });
  }
}
