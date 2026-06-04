import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Queue, type Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Dead Letter Queue — ghi BỀN job BullMQ thất bại vĩnh viễn (hết retry) để điều tra + replay.
 * record() gọi từ worker.on('failed') (NGOÀI CLS context) → dùng raw SQL + tenant_id tường minh.
 */
@Injectable()
export class DeadLetterService {
  private readonly logger = new Logger(DeadLetterService.name);
  private readonly connection = {
    host: process.env.REDIS_HOST ?? 'redis',
    port: Number(process.env.REDIS_PORT ?? 6379),
  };

  constructor(private readonly prisma: PrismaService) {}

  /** Gọi từ worker.on('failed'). Chỉ ghi khi job đã HẾT retry. KHÔNG bao giờ throw. */
  async record(job: Job | undefined, err: unknown): Promise<void> {
    try {
      if (!job) return;
      const max = job.opts?.attempts ?? 1;
      if ((job.attemptsMade ?? 0) < max) return; // còn retry → chưa "chết"

      const tenantId = (job.data as { tenantId?: string } | undefined)?.tenantId ?? 'loop-default-tenant-001';
      const message = String((err as Error)?.message ?? err ?? 'unknown').slice(0, 2000);
      await this.prisma.$executeRaw`
        INSERT INTO dead_letter_jobs (id, queue, job_name, payload, error, attempts_made, failed_at, tenant_id)
        VALUES (${randomUUID()}, ${job.queueName}, ${job.name}, ${JSON.stringify(job.data ?? {})}::jsonb,
                ${message}, ${job.attemptsMade ?? 0}, now(), ${tenantId})`;
      this.logger.warn(`Dead-letter: ${job.queueName}/${job.name} (job ${job.id})`);
    } catch (e) {
      this.logger.error(`Ghi dead-letter thất bại: ${(e as Error)?.message}`);
    }
  }

  /** Danh sách dead-letter (scoped tenant qua extension). */
  async list(page = 1, limit = 50) {
    const take = Math.min(Math.max(limit, 1), 200);
    const skip = (Math.max(page, 1) - 1) * take;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.deadLetterJob.findMany({ orderBy: { failedAt: 'desc' }, skip, take }),
      this.prisma.deadLetterJob.count(),
    ]);
    return { data, total, page, limit: take };
  }

  /** Replay: re-enqueue job về đúng queue gốc, đánh dấu replayedAt. */
  async replay(id: string) {
    const dl = await this.prisma.deadLetterJob.findFirst({ where: { id } });
    if (!dl) throw new NotFoundException('Không tìm thấy dead-letter job');

    const q = new Queue(dl.queue, { connection: this.connection });
    try {
      await q.add(dl.jobName, dl.payload as object, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: true,
        removeOnFail: 100,
      });
    } finally {
      await q.close();
    }
    await this.prisma.deadLetterJob.updateMany({ where: { id: dl.id }, data: { replayedAt: new Date() } });
    return { replayed: true, queue: dl.queue, jobName: dl.jobName };
  }
}
