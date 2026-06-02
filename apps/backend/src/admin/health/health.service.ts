import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { validateEnv } from '../../common/env-validation';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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

    // Env validation
    const { issues: envIssues } = validateEnv();

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
      envIssues,
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

  // ─── Demo Mode ───────────────────────────────────────────────────────────

  private get snapshotPath(): string {
    return process.env.DEMO_SNAPSHOT_PATH || path.join(process.cwd(), 'demo-snapshot.sql');
  }

  private get metaPath(): string {
    return this.snapshotPath.replace(/\.sql$/, '') + '-meta.json';
  }

  private readMeta(): { lastReset: string | null; lastSnapshot: string | null; rowCount?: number } {
    try {
      return JSON.parse(fs.readFileSync(this.metaPath, 'utf8'));
    } catch {
      return { lastReset: null, lastSnapshot: null };
    }
  }

  private writeMeta(meta: { lastReset: string | null; lastSnapshot: string | null; rowCount?: number }) {
    fs.writeFileSync(this.metaPath, JSON.stringify(meta, null, 2));
  }

  getDemoStatus() {
    const meta = this.readMeta();
    const snapshotExists = fs.existsSync(this.snapshotPath);
    const snapshotSizeKb = snapshotExists
      ? Math.round(fs.statSync(this.snapshotPath).size / 1024)
      : null;
    return {
      isDemoMode: !!process.env.DEMO_MODE,
      snapshotExists,
      snapshotSizeKb,
      lastReset: meta.lastReset,
      lastSnapshot: meta.lastSnapshot,
      rowCount: meta.rowCount ?? null,
    };
  }

  async createSnapshot() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new InternalServerErrorException('DATABASE_URL chưa được cấu hình');

    try {
      // pg_dump: data only, column-inserts (INSERT statements), disable triggers for FK order
      execSync(
        `pg_dump --data-only --column-inserts --disable-triggers --no-owner --no-acl -f "${this.snapshotPath}" "${dbUrl}"`,
        { stdio: 'pipe' },
      );

      // Count rows for info
      const result = await this.prisma.$queryRaw<[{ total: bigint }]>`
        SELECT SUM(n_live_tup)::bigint AS total
        FROM pg_stat_user_tables
      `;
      const rowCount = Number(result[0]?.total ?? 0);

      const meta = this.readMeta();
      this.writeMeta({ ...meta, lastSnapshot: new Date().toISOString(), rowCount });

      return { message: 'Snapshot tạo thành công', path: this.snapshotPath, rowCount };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`Tạo snapshot thất bại: ${msg}`);
    }
  }

  async resetDemo() {
    if (!fs.existsSync(this.snapshotPath)) {
      throw new BadRequestException('Chưa có snapshot. Hãy tạo snapshot trước khi reset.');
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new InternalServerErrorException('DATABASE_URL chưa được cấu hình');

    try {
      // 1. Truncate all user tables (bypass FK via session_replication_role)
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'replica'`);
      await this.prisma.$executeRawUnsafe(`
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN (
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
              AND tablename NOT IN ('_prisma_migrations')
          )
          LOOP
            EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
          END LOOP;
        END $$
      `);
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'DEFAULT'`);

      // 2. Restore from snapshot
      execSync(`psql "${dbUrl}" -f "${this.snapshotPath}"`, { stdio: 'pipe' });

      const meta = this.readMeta();
      const now = new Date().toISOString();
      this.writeMeta({ ...meta, lastReset: now });

      return { message: 'Demo data đã được khôi phục thành công', resetAt: now };
    } catch (err: unknown) {
      // Re-enable FK in case of error
      try { await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'DEFAULT'`); } catch {}
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`Reset demo thất bại: ${msg}`);
    }
  }
}
