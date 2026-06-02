import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ModuleRef, ContextIdFactory } from '@nestjs/core';
import { LeadFollowUpService } from './lead-followup.service';

/**
 * Cron wrapper (DEFAULT scope) cho LeadFollowUpService (REQUEST scope).
 */
@Injectable()
export class LeadFollowUpTask {
  private readonly logger = new Logger(LeadFollowUpTask.name);
  constructor(private readonly moduleRef: ModuleRef) {}

  @Cron('0 8 * * *')
  async dailyFollowUpNotification() {
    try {
      const contextId = ContextIdFactory.create();
      this.moduleRef.registerRequestByContextId({}, contextId);
      const svc = await this.moduleRef.resolve(LeadFollowUpService, contextId, { strict: false });
      await svc.dailyFollowUpNotification();
    } catch (e) {
      this.logger.error(`dailyFollowUpNotification lỗi: ${(e as Error)?.message}`);
    }
  }
}
