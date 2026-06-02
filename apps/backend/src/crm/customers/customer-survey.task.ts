import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ModuleRef, ContextIdFactory } from '@nestjs/core';
import { CustomerSurveyService } from './customer-survey.service';

/**
 * Cron wrapper (DEFAULT scope) cho CustomerSurveyService (REQUEST scope).
 * @nestjs/schedule không đăng ký được @Cron trên provider REQUEST scope, nên tách ra đây
 * và resolve service theo contextId mỗi lần chạy (chạy global, không lọc tenant).
 */
@Injectable()
export class CustomerSurveyTask {
  private readonly logger = new Logger(CustomerSurveyTask.name);
  constructor(private readonly moduleRef: ModuleRef) {}

  @Cron('0 9 * * *')
  async dailySurveyCron() {
    try {
      const contextId = ContextIdFactory.create();
      this.moduleRef.registerRequestByContextId({}, contextId);
      const svc = await this.moduleRef.resolve(CustomerSurveyService, contextId, { strict: false });
      await svc.dailySurveyCron();
    } catch (e) {
      this.logger.error(`dailySurveyCron lỗi: ${(e as Error)?.message}`);
    }
  }
}
