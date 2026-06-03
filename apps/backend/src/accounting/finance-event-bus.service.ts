import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { ClsService } from 'nestjs-cls';
import { CLS_TENANT_ID } from '../common/cls/cls-keys';

export type FinanceEventType = 'invoice.paid' | 'expense.approved' | 'payroll.approved' | 'po.received' | 'po.paid';

export interface FinanceEvent {
  type:      FinanceEventType;
  refId:     string;   // invoiceId / expenseId / payrollPeriodId
  amount:    number;
  currency?: string;
  userId:    string;
  tenantId?: string;
}

const QUEUE_PREFIX = 'finance';

@Injectable()
export class FinanceEventBus implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FinanceEventBus.name);
  private queues = new Map<FinanceEventType, Queue<FinanceEvent>>();
  private workers: Worker<FinanceEvent>[] = [];

  constructor(private readonly cls: ClsService) {}

  private get connection() {
    return {
      host: process.env['REDIS_HOST'] ?? 'localhost',
      port: Number(process.env['REDIS_PORT'] ?? 6379),
    };
  }

  onModuleInit() {
    const types: FinanceEventType[] = ['invoice.paid', 'expense.approved', 'payroll.approved', 'po.received', 'po.paid'];
    for (const type of types) {
      const queueName = `${QUEUE_PREFIX}.${type}`;
      this.queues.set(type, new Queue<FinanceEvent>(queueName, { connection: this.connection }));
    }
    this.logger.log(`FinanceEventBus queues initialized (${types.join(', ')})`);
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }

  async emit(event: FinanceEvent): Promise<void> {
    const queue = this.queues.get(event.type);
    if (!queue) {
      this.logger.warn(`FinanceEventBus: unknown event type "${event.type}"`);
      return;
    }
    const tid = this.cls.isActive() ? this.cls.get(CLS_TENANT_ID) : undefined;
    const stamped = { ...event, tenantId: event.tenantId ?? tid };
    await queue.add(event.type, stamped, {
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  on(type: FinanceEventType, handler: (e: FinanceEvent) => Promise<void> | void): void {
    const queueName = `${QUEUE_PREFIX}.${type}`;
    const worker = new Worker<FinanceEvent>(
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
      this.logger.error(`FinanceEventBus job ${job?.id} (${type}) failed`, err);
    });
    this.workers.push(worker);
  }
}
