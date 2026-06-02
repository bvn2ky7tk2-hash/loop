import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ModuleRef, ContextIdFactory } from '@nestjs/core';
import { AutomationScheduler } from './automation.scheduler';

/**
 * Cron wrapper (DEFAULT scope) cho AutomationScheduler (bị scope bubbling sang REQUEST).
 */
@Injectable()
export class AutomationCronTask {
  private readonly logger = new Logger(AutomationCronTask.name);
  constructor(private readonly moduleRef: ModuleRef) {}

  private async resolve() {
    const contextId = ContextIdFactory.create();
    this.moduleRef.registerRequestByContextId({}, contextId);
    return this.moduleRef.resolve(AutomationScheduler, contextId, { strict: false });
  }

  @Cron('0 17 * * 5')
  async timesheetCron() {
    try { await (await this.resolve()).timesheetCron(); }
    catch (e) { this.logger.error(`timesheetCron lỗi: ${(e as Error)?.message}`); }
  }

  @Cron('0 9 * * *')
  async contractCron() {
    try { await (await this.resolve()).contractCron(); }
    catch (e) { this.logger.error(`contractCron lỗi: ${(e as Error)?.message}`); }
  }

  @Cron('0 10 * * *')
  async leaveCron() {
    try { await (await this.resolve()).leaveCron(); }
    catch (e) { this.logger.error(`leaveCron lỗi: ${(e as Error)?.message}`); }
  }

  @Cron('0 9 * * 1')
  async okrCron() {
    try { await (await this.resolve()).okrCron(); }
    catch (e) { this.logger.error(`okrCron lỗi: ${(e as Error)?.message}`); }
  }
}
