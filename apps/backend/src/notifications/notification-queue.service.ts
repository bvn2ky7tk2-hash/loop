import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { ClsService } from 'nestjs-cls';
import { FirebaseService } from './firebase.service';
import { MailService } from './mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CLS_TENANT_ID } from '../common/cls/cls-keys';
import { DeadLetterService } from '../common/dead-letter/dead-letter.service';

export const NOTIFICATION_QUEUE = 'notifications';

export interface DeliverJobData {
  userId: string;
  type: string;
  title: string;
  body: string;
  tenantId?: string;
}

@Injectable()
export class NotificationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private queue!: Queue<DeliverJobData>;
  private worker!: Worker<DeliverJobData>;

  constructor(
    private readonly firebase: FirebaseService,
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
    private readonly deadLetter: DeadLetterService,
  ) {}

  onModuleInit() {
    const connection = {
      host: process.env.REDIS_HOST ?? 'redis',
      port: Number(process.env.REDIS_PORT ?? 6379),
    };

    this.queue = new Queue<DeliverJobData>(NOTIFICATION_QUEUE, { connection });

    this.worker = new Worker<DeliverJobData>(
      NOTIFICATION_QUEUE,
      (job) =>
        this.cls.run(async () => {
          const t = job.data?.tenantId;
          if (t) this.cls.set(CLS_TENANT_ID, t);
          return this.process(job);
        }),
      { connection, concurrency: 5 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Notification job ${job?.id} failed`, err);
      void this.deadLetter.record(job, err);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueue(data: DeliverJobData): Promise<void> {
    const tid = this.cls.isActive() ? this.cls.get(CLS_TENANT_ID) : undefined;
    const stamped = { ...data, tenantId: data.tenantId ?? tid };
    await this.queue.add('deliver', stamped, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }

  private async process(job: Job<DeliverJobData>): Promise<void> {
    const { userId, title, body, type } = job.data;

    try {
      const tokens = await this.prisma.pushToken.findMany({
        where: { userId },
        select: { token: true },
      });
      if (tokens.length) {
        await this.firebase.sendToTokens(tokens.map((t) => t.token), title, body, { type });
      }
    } catch (e) {
      this.logger.error(`FCM delivery failed user=${userId}`, e);
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      if (user?.email) {
        await this.mail.sendNotificationEmail(user.email, user.name, title, body);
      }
    } catch (e) {
      this.logger.error(`Email delivery failed user=${userId}`, e);
    }
  }
}
