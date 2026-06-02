import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ModuleRef, ContextIdFactory } from '@nestjs/core';
import { FeedService } from './feed.service';

/**
 * Cron wrapper (DEFAULT scope) cho FeedService (REQUEST scope).
 */
@Injectable()
export class FeedTask {
  private readonly logger = new Logger(FeedTask.name);
  constructor(private readonly moduleRef: ModuleRef) {}

  private async resolve() {
    const contextId = ContextIdFactory.create();
    this.moduleRef.registerRequestByContextId({}, contextId);
    return this.moduleRef.resolve(FeedService, contextId, { strict: false });
  }

  @Cron('0 8 * * *')
  async autoPostBirthdays() {
    try {
      const svc = await this.resolve();
      await svc.autoPostBirthdays();
    } catch (e) {
      this.logger.error(`autoPostBirthdays lỗi: ${(e as Error)?.message}`);
    }
  }

  @Cron('5 8 * * *')
  async autoPostAnniversaries() {
    try {
      const svc = await this.resolve();
      await svc.autoPostAnniversaries();
    } catch (e) {
      this.logger.error(`autoPostAnniversaries lỗi: ${(e as Error)?.message}`);
    }
  }
}
