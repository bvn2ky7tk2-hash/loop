import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ModuleRef, ContextIdFactory } from '@nestjs/core';
import { EscalationTask } from './escalation.task';
import { TenantRunner } from '../common/cls/tenant-runner.service';

/**
 * Cron wrapper (DEFAULT scope) cho EscalationTask (bị scope bubbling sang REQUEST
 * do inject NotificationsService REQUEST scope).
 */
@Injectable()
export class EscalationCronTask {
  private readonly logger = new Logger(EscalationCronTask.name);
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly tenantRunner: TenantRunner,
  ) {}

  @Cron('0,30 * * * *')
  async runEscalation() {
    await this.tenantRunner.forEachTenant(async (tenantId) => {
      try {
        const contextId = ContextIdFactory.create();
        this.moduleRef.registerRequestByContextId({}, contextId);
        const svc = await this.moduleRef.resolve(EscalationTask, contextId, { strict: false });
        await svc.runEscalation();
      } catch (e) {
        this.logger.error(`runEscalation lỗi: ${(e as Error)?.message}`);
      }
    });
  }
}
