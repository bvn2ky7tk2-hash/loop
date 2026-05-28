import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';
import { Queue } from 'bullmq';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    const timestamp = new Date().toISOString();
    const redisConnection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    };

    // Database check
    const dbResult = await this.checkDatabase();

    // Redis check
    const redisResult = await this.checkRedis(redisConnection);

    // Queue stats
    const queues = await this.checkQueues(redisConnection);

    // Storage check
    const storage = this.checkStorage();

    // Memory
    const mem = process.memoryUsage();

    return {
      timestamp,
      database: dbResult,
      redis: redisResult,
      queues,
      storage,
      uptime: process.uptime(),
      memory: {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss,
      },
    };
  }

  private async checkDatabase(): Promise<{ status: 'ok' | 'error'; responseMs: number }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', responseMs: Date.now() - start };
    } catch {
      return { status: 'error', responseMs: Date.now() - start };
    }
  }

  private async checkRedis(
    connection: { host: string; port: number },
  ): Promise<{ status: 'ok' | 'error'; responseMs: number }> {
    const start = Date.now();
    const redis = new Redis({ ...connection, lazyConnect: true, connectTimeout: 3000 });
    try {
      await redis.connect();
      await redis.ping();
      return { status: 'ok', responseMs: Date.now() - start };
    } catch {
      return { status: 'error', responseMs: Date.now() - start };
    } finally {
      redis.disconnect();
    }
  }

  private async checkQueues(connection: { host: string; port: number }) {
    const queueNames = ['automation', 'notifications', 'payslip'];
    const results = [];

    for (const name of queueNames) {
      const queue = new Queue(name, { connection });
      try {
        const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed');
        results.push({
          name,
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          completed: counts.completed ?? 0,
          failed: counts.failed ?? 0,
        });
      } catch {
        results.push({ name, waiting: 0, active: 0, completed: 0, failed: 0 });
      } finally {
        await queue.close();
      }
    }

    return results;
  }

  private checkStorage(): { status: 'ok' | 'error' } {
    const hasMinioConfig =
      !!process.env.MINIO_ENDPOINT &&
      !!process.env.MINIO_ACCESS_KEY &&
      !!process.env.MINIO_SECRET_KEY;
    return { status: hasMinioConfig ? 'ok' : 'error' };
  }

  // Demo mode state (in-memory for simplicity)
  private demoLastReset: string | null = null;

  getDemoStatus() {
    return {
      isDemoMode: !!process.env.DEMO_MODE,
      lastReset: this.demoLastReset,
    };
  }

  resetDemo() {
    this.demoLastReset = new Date().toISOString();
    return { message: 'Demo reset queued', status: 'ok' };
  }
}
