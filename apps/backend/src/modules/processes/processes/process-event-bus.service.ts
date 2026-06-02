import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';

export interface ProcessCompletedPayload {
  instanceId: string;
  variables: Record<string, unknown>;
}

const QUEUE_NAME = 'process.completed';

@Injectable()
export class ProcessEventBus implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProcessEventBus.name);
  private queue!: Queue<ProcessCompletedPayload>;
  private workers: Worker<ProcessCompletedPayload>[] = [];

  private get connection() {
    return {
      host: process.env['REDIS_HOST'] ?? 'localhost',
      port: Number(process.env['REDIS_PORT'] ?? 6379),
    };
  }

  onModuleInit() {
    this.queue = new Queue<ProcessCompletedPayload>(QUEUE_NAME, {
      connection: this.connection,
    });
    this.logger.log(`ProcessEventBus queue "${QUEUE_NAME}" initialized`);
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((w) => w.close()));
    await this.queue?.close();
  }

  async emitCompleted(payload: ProcessCompletedPayload): Promise<void> {
    await this.queue.add('completed', payload, {
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  onCompleted(handler: (payload: ProcessCompletedPayload) => Promise<void>): void {
    const worker = new Worker<ProcessCompletedPayload>(
      QUEUE_NAME,
      async (job) => handler(job.data),
      { connection: this.connection },
    );
    worker.on('failed', (job, err) => {
      this.logger.error(`ProcessEventBus job ${job?.id} failed`, err);
    });
    this.workers.push(worker);
  }
}
