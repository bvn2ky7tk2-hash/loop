import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

const QUEUE_NAMES = ['automation', 'notifications', 'payslip', 'process-events', 'finance-events'];

export interface QueueJobInfo {
  id: string | undefined;
  name: string;
  status: string;
  data: unknown;
  failReason?: string;
  attemptsMade: number;
  timestamp: number;
}

@Injectable()
export class QueuesService {
  private getConnection() {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    };
  }

  async listQueues() {
    const connection = this.getConnection();
    const results = [];

    for (const name of QUEUE_NAMES) {
      const queue = new Queue(name, { connection });
      try {
        const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
        results.push({
          name,
          waiting:   counts.waiting   ?? 0,
          active:    counts.active    ?? 0,
          completed: counts.completed ?? 0,
          failed:    counts.failed    ?? 0,
          delayed:   counts.delayed   ?? 0,
          paused:    counts.paused    ?? 0,
        });
      } catch {
        results.push({ name, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 });
      } finally {
        await queue.close();
      }
    }

    return results;
  }

  async getJobs(queueName: string, status: string, page = 1, limit = 50): Promise<{ data: QueueJobInfo[]; total: number }> {
    const connection = this.getConnection();
    const queue = new Queue(queueName, { connection });

    try {
      const validStatus = ['waiting', 'active', 'completed', 'failed', 'delayed'] as const;
      type JobStatus = typeof validStatus[number];
      const jobStatus: JobStatus = (validStatus.includes(status as JobStatus) ? status : 'failed') as JobStatus;

      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const [jobs, total] = await Promise.all([
        queue.getJobs([jobStatus], start, end),
        queue.getJobCountByTypes(jobStatus),
      ]);

      const data: QueueJobInfo[] = jobs.map((job) => ({
        id: job.id,
        name: job.name,
        status: jobStatus,
        data: job.data,
        failReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
      }));

      return { data, total };
    } finally {
      await queue.close();
    }
  }

  async retryJob(queueName: string, jobId: string): Promise<void> {
    const connection = this.getConnection();
    const queue = new Queue(queueName, { connection });

    try {
      const job = await queue.getJob(jobId);
      if (!job) throw new Error(`Job ${jobId} không tồn tại trong queue ${queueName}`);
      await job.retry('failed');
    } finally {
      await queue.close();
    }
  }
}
