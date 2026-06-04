import { Injectable, Logger } from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import { ClsService } from 'nestjs-cls';
import { ScheduledReportsService } from './scheduled-reports.service';
import { CLS_TENANT_ID } from '../common/cls/cls-keys';
import { TenantRunner } from '../common/cls/tenant-runner.service';
import { DeadLetterService } from '../common/dead-letter/dead-letter.service';

export const SCHEDULED_REPORTS_QUEUE = 'scheduled-reports';

@Injectable()
export class ScheduledReportsProcessor {
  private readonly logger = new Logger(ScheduledReportsProcessor.name);
  private worker!: Worker;

  constructor(
    private readonly svc: ScheduledReportsService,
    private readonly cls: ClsService,
    private readonly tenantRunner: TenantRunner,
    private readonly deadLetter: DeadLetterService,
  ) {}

  init(connection: { host: string; port: number }) {
    this.worker = new Worker(
      SCHEDULED_REPORTS_QUEUE,
      async (job: Job) => this.process(job),
      { connection, concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.name} (${job?.id}) thất bại`, err);
      void this.deadLetter.record(job, err);
    });
    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.name} hoàn thành`);
    });
  }

  async close() {
    await this.worker?.close();
  }

  private async dispatch(jobName: string): Promise<void> {
    if (jobName === 'weekly-digest') {
      await this.svc.sendWeeklyDigest();
    } else if (jobName === 'scheduled-reports') {
      await this.svc.sendScheduledReports();
    } else {
      this.logger.warn(`Job không xác định: ${jobName}`);
    }
  }

  private async process(job: Job): Promise<void> {
    const tid = job.data?.tenantId as string | undefined;
    if (tid) {
      // Job nhắm 1 tenant cụ thể.
      await this.cls.run(async () => {
        this.cls.set(CLS_TENANT_ID, tid);
        await this.dispatch(job.name);
      });
    } else {
      // Cron chung → chạy cho từng tenant trong CLS context riêng.
      await this.tenantRunner.forEachTenant(async () => this.dispatch(job.name));
    }
  }
}
