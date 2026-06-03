import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { ClsService } from 'nestjs-cls';
import { BpmnEngineService } from '../engine/bpmn-engine.service';
import { CLS_TENANT_ID } from '../../common/cls/cls-keys';

export const PROCESS_TIMERS_QUEUE = 'process-timers';

export interface TimerJobData {
  instanceId: string;
  activityId: string;
  scheduledAt: string;
  tenantId?: string;
}

@Injectable()
export class TimerEventService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TimerEventService.name);
  private queue!: Queue<TimerJobData>;
  private worker!: Worker<TimerJobData>;

  constructor(
    private readonly engineService: BpmnEngineService,
    private readonly cls: ClsService,
  ) {}

  onModuleInit() {
    const connection = {
      host: process.env.REDIS_HOST ?? 'redis',
      port: Number(process.env.REDIS_PORT ?? 6379),
    };

    this.queue = new Queue<TimerJobData>(PROCESS_TIMERS_QUEUE, { connection });

    this.worker = new Worker<TimerJobData>(
      PROCESS_TIMERS_QUEUE,
      (job) =>
        this.cls.run(async () => {
          const t = job.data?.tenantId;
          if (t) this.cls.set(CLS_TENANT_ID, t);
          return this.process(job);
        }),
      { connection, concurrency: 3 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Timer job ${job?.id} failed`, err);
    });

    this.worker.on('completed', (job) => {
      this.logger.debug(`Timer job ${job.id} completed for instance=${job.data.instanceId} activity=${job.data.activityId}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  /**
   * Enqueue một timer event để được trigger sau delay (ms).
   */
  async scheduleTimer(
    instanceId: string,
    activityId: string,
    delayMs: number,
  ): Promise<void> {
    const jobId = `timer-${instanceId}-${activityId}`;

    // Xoá job cũ nếu có (prevent duplicate)
    const existingJob = await this.queue.getJob(jobId);
    if (existingJob) {
      await existingJob.remove();
    }

    const tid = this.cls.isActive() ? this.cls.get(CLS_TENANT_ID) : undefined;
    await this.queue.add(
      'fire-timer',
      {
        instanceId,
        activityId,
        scheduledAt: new Date().toISOString(),
        tenantId: tid,
      },
      {
        jobId,
        delay: delayMs,
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );

    this.logger.debug(`Scheduled timer for instance=${instanceId} activity=${activityId} delay=${delayMs}ms`);
  }

  /**
   * Huỷ timer đã schedule (khi instance bị cancel).
   */
  async cancelTimer(instanceId: string, activityId: string): Promise<void> {
    const jobId = `timer-${instanceId}-${activityId}`;
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.debug(`Cancelled timer for instance=${instanceId} activity=${activityId}`);
    }
  }

  private async process(job: Job<TimerJobData>): Promise<void> {
    const { instanceId, activityId } = job.data;
    this.logger.log(`Firing timer event for instance=${instanceId} activity=${activityId}`);

    await this.engineService.triggerTimerEvent(instanceId, activityId);
  }
}
