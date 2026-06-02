import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ModuleRef, ContextIdFactory } from '@nestjs/core';
import { InvoicesService } from './invoices.service';

/**
 * Cron wrapper (DEFAULT scope) cho InvoicesService (REQUEST scope).
 */
@Injectable()
export class InvoicesTask {
  private readonly logger = new Logger(InvoicesTask.name);
  constructor(private readonly moduleRef: ModuleRef) {}

  @Cron('0 8 * * *')
  async markOverdueInvoices() {
    try {
      const contextId = ContextIdFactory.create();
      this.moduleRef.registerRequestByContextId({}, contextId);
      const svc = await this.moduleRef.resolve(InvoicesService, contextId, { strict: false });
      await svc.markOverdueInvoices();
    } catch (e) {
      this.logger.error(`markOverdueInvoices lỗi: ${(e as Error)?.message}`);
    }
  }
}
