import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { ClsService } from 'nestjs-cls';
import { CLS_TENANT_ID } from '../common/cls/cls-keys';
import { DeadLetterService } from '../common/dead-letter/dead-letter.service';

export interface ProcessCompletedPayload {
  instanceId: string;
  variables: Record<string, unknown>;
  tenantId?: string;
}

const QUEUE_NAME = 'process.completed';

@Injectable()
export class ProcessEventBus implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProcessEventBus.name);
  private queue!: Queue<ProcessCompletedPayload>;
  private workers: Worker<ProcessCompletedPayload>[] = [];

  constructor(
    private readonly cls: ClsService,
    private readonly deadLetter: DeadLetterService,
  ) {}

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
    const tid = this.cls.isActive() ? this.cls.get(CLS_TENANT_ID) : undefined;
    const stamped = { ...payload, tenantId: payload.tenantId ?? tid };
    await this.queue.add('completed', stamped, {
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  onCompleted(handler: (payload: ProcessCompletedPayload) => Promise<void>): void {
    const worker = new Worker<ProcessCompletedPayload>(
      QUEUE_NAME,
      async (job) =>
        this.cls.run(async () => {
          const t = job.data?.tenantId;
          if (t) this.cls.set(CLS_TENANT_ID, t);
          return handler(job.data);
        }),
      { connection: this.connection },
    );
    worker.on('failed', (job, err) => {
      this.logger.error(`ProcessEventBus job ${job?.id} failed`, err);
      void this.deadLetter.record(job, err);
    });
    this.workers.push(worker);
  }
}
