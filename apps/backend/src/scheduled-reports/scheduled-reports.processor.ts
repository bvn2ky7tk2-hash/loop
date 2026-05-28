import { Injectable, Logger } from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import { ScheduledReportsService } from './scheduled-reports.service';

export const SCHEDULED_REPORTS_QUEUE = 'scheduled-reports';

@Injectable()
export class ScheduledReportsProcessor {
  private readonly logger = new Logger(ScheduledReportsProcessor.name);
  private worker!: Worker;

  constructor(private readonly svc: ScheduledReportsService) {}

  init(connection: { host: string; port: number }) {
    this.worker = new Worker(
      SCHEDULED_REPORTS_QUEUE,
      async (job: Job) => this.process(job),
      { connection, concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.name} (${job?.id}) thất bại`, err);
    });
    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.name} hoàn thành`);
    });
  }

  async close() {
    await this.worker?.close();
  }

  private async process(job: Job): Promise<void> {
    if (job.name === 'weekly-digest') {
      await this.svc.sendWeeklyDigest();
    } else if (job.name === 'scheduled-reports') {
      await this.svc.sendScheduledReports();
    } else {
      this.logger.warn(`Job không xác định: ${job.name}`);
    }
  }
}
