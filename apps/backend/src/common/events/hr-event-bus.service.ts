import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';

export type HrEventType = 'contract.expiring' | 'performance.approved' | 'offboarding.started' | 'payroll.processed';

export interface HrEvent {
  type: HrEventType;
  refId: string;
  employeeId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

const QUEUE_PREFIX = 'hr';

@Injectable()
export class HrEventBus implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HrEventBus.name);
  private queues = new Map<HrEventType, Queue<HrEvent>>();
  private workers: Worker<HrEvent>[] = [];

  private get connection() {
    return {
      host: process.env['REDIS_HOST'] ?? 'localhost',
      port: Number(process.env['REDIS_PORT'] ?? 6379),
    };
  }

  onModuleInit() {
    const types: HrEventType[] = ['contract.expiring', 'performance.approved', 'offboarding.started', 'payroll.processed'];
    for (const type of types) {
      const queueName = `${QUEUE_PREFIX}.${type}`;
      this.queues.set(type, new Queue<HrEvent>(queueName, { connection: this.connection }));
    }
    this.logger.log(`HrEventBus queues initialized (${types.join(', ')})`);
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }

  async emit(event: HrEvent): Promise<void> {
    const queue = this.queues.get(event.type);
    if (!queue) {
      this.logger.warn(`HrEventBus: unknown event type "${event.type}"`);
      return;
    }
    await queue.add(event.type, event, {
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  on(type: HrEventType, handler: (e: HrEvent) => Promise<void> | void): void {
    const queueName = `${QUEUE_PREFIX}.${type}`;
    const worker = new Worker<HrEvent>(
      queueName,
      async (job) => handler(job.data),
      { connection: this.connection },
    );
    worker.on('failed', (job, err) => {
      this.logger.error(`HrEventBus job ${job?.id} (${type}) failed`, err);
    });
    this.workers.push(worker);
  }
}
