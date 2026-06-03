import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { ClsService } from 'nestjs-cls';
import { CLS_TENANT_ID } from '../cls/cls-keys';

export type ProjectEventType = 'milestone.completed' | 'cost.threshold' | 'project.closed';

export interface ProjectEvent {
  type: ProjectEventType;
  refId: string;
  projectId: string;
  amount?: number;
  metadata?: Record<string, unknown>;
  tenantId?: string;
}

const QUEUE_PREFIX = 'project';

@Injectable()
export class ProjectEventBus implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProjectEventBus.name);
  private queues = new Map<ProjectEventType, Queue<ProjectEvent>>();
  private workers: Worker<ProjectEvent>[] = [];

  constructor(private readonly cls: ClsService) {}

  private get connection() {
    return {
      host: process.env['REDIS_HOST'] ?? 'localhost',
      port: Number(process.env['REDIS_PORT'] ?? 6379),
    };
  }

  onModuleInit() {
    const types: ProjectEventType[] = ['milestone.completed', 'cost.threshold', 'project.closed'];
    for (const type of types) {
      const queueName = `${QUEUE_PREFIX}.${type}`;
      this.queues.set(type, new Queue<ProjectEvent>(queueName, { connection: this.connection }));
    }
    this.logger.log(`ProjectEventBus queues initialized (${types.join(', ')})`);
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }

  async emit(event: ProjectEvent): Promise<void> {
    const queue = this.queues.get(event.type);
    if (!queue) {
      this.logger.warn(`ProjectEventBus: unknown event type "${event.type}"`);
      return;
    }
    const tid = this.cls.isActive() ? this.cls.get(CLS_TENANT_ID) : undefined;
    const stamped = { ...event, tenantId: event.tenantId ?? tid };
    await queue.add(event.type, stamped, {
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  on(type: ProjectEventType, handler: (e: ProjectEvent) => Promise<void> | void): void {
    const queueName = `${QUEUE_PREFIX}.${type}`;
    const worker = new Worker<ProjectEvent>(
      queueName,
      async (job) =>
        this.cls.run(async () => {
          const t = job.data?.tenantId;
          if (t) this.cls.set(CLS_TENANT_ID, t);
          return handler(job.data);
        }),
      { connection: this.connection },
    );
    worker.on('failed', (job, err) => {
      this.logger.error(`ProjectEventBus job ${job?.id} (${type}) failed`, err);
    });
    this.workers.push(worker);
  }
}
