import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ScheduledReportsProcessor, SCHEDULED_REPORTS_QUEUE } from './scheduled-reports.processor';

@Injectable()
export class ScheduledReportsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledReportsScheduler.name);
  private queue!: Queue;

  constructor(private readonly processor: ScheduledReportsProcessor) {}

  async onModuleInit() {
    const connection = {
      host: process.env.REDIS_HOST ?? 'redis',
      port: Number(process.env.REDIS_PORT ?? 6379),
    };

    this.queue = new Queue(SCHEDULED_REPORTS_QUEUE, { connection });
    this.processor.init(connection);

    try {
      // Xóa jobs lặp cũ để tránh duplicate khi restart
      const repeatableJobs = await this.queue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await this.queue.removeRepeatableByKey(job.key);
      }

      // Weekly digest: mỗi thứ 2 lúc 8h sáng (giờ Việt Nam UTC+7 → cron UTC = 1h)
      await this.queue.add(
        'weekly-digest',
        {},
        {
          repeat: { pattern: '0 1 * * 1' }, // UTC 01:00 = 08:00 VN
          jobId: 'weekly-digest-cron',
        },
      );

      // Check scheduled reports: mỗi ngày lúc 7h sáng VN (UTC = 0h)
      await this.queue.add(
        'scheduled-reports',
        {},
        {
          repeat: { pattern: '0 0 * * *' }, // UTC 00:00 = 07:00 VN
          jobId: 'scheduled-reports-cron',
        },
      );

      this.logger.log('Scheduled Reports cron jobs đã được đăng ký');
    } catch (err) {
      // Không để lỗi Redis khởi động crash server — log warning
      this.logger.warn('Không thể đăng ký cron jobs (Redis chưa sẵn sàng?)', err);
    }
  }

  async onModuleDestroy() {
    await this.processor.close();
    await this.queue?.close();
  }

  /** Trigger manual — dùng cho sendNow trong controller */
  async triggerNow(jobName: 'weekly-digest' | 'scheduled-reports'): Promise<void> {
    await this.queue.add(jobName, {}, { attempts: 1 });
  }
}
