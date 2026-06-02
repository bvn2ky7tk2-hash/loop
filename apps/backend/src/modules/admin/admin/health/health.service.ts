import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';

interface DemoSnapshot {
  id: string;
  label: string;
  createdAt: string;
  sizeKb: number;
  rowCount: number;
  filePath: string;
  lastUsedAt: string | null;
}
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

  // ─── Demo Mode (multi-snapshot) ─────────────────────────────────────────

  private get snapshotsDir(): string {
    return process.env.DEMO_SNAPSHOTS_DIR || path.join(process.cwd(), 'demo-snapshots');
  }

  private get indexPath(): string {
    return path.join(this.snapshotsDir, 'index.json');
  }

  private ensureDir() {
    if (!fs.existsSync(this.snapshotsDir)) fs.mkdirSync(this.snapshotsDir, { recursive: true });
  }

  private readIndex(): DemoSnapshot[] {
    try {
      return JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));
    } catch {
      return [];
    }
  }

  private writeIndex(snapshots: DemoSnapshot[]) {
    this.ensureDir();
    fs.writeFileSync(this.indexPath, JSON.stringify(snapshots, null, 2));
  }

  getDemoStatus() {
    const snapshots = this.readIndex().map(s => ({
      ...s,
      filePath: undefined,
    }));
    const lastReset = snapshots
      .filter(s => s.lastUsedAt)
      .sort((a, b) => (b.lastUsedAt! > a.lastUsedAt! ? 1 : -1))[0]?.lastUsedAt ?? null;

    return {
      isDemoMode: !!process.env.DEMO_MODE,
      snapshotCount: snapshots.length,
      lastReset,
      snapshots,
    };
  }

  async createSnapshot(label?: string) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new InternalServerErrorException('DATABASE_URL chưa được cấu hình');

    this.ensureDir();

    const id = `snap_${Date.now()}`;
    const fileName = `${id}.sql`;
    const filePath = path.join(this.snapshotsDir, fileName);
    const createdAt = new Date().toISOString();
    const displayLabel = label?.trim() || `Snapshot ${new Date(createdAt).toLocaleString('vi-VN')}`;

    try {
      execSync(
        `pg_dump --data-only --column-inserts --disable-triggers --no-owner --no-acl -f "${filePath}" "${dbUrl}"`,
        { stdio: 'pipe' },
      );

      const result = await this.prisma.$queryRaw<[{ total: bigint }]>`
        SELECT SUM(n_live_tup)::bigint AS total FROM pg_stat_user_tables
      `;
      const rowCount = Number(result[0]?.total ?? 0);
      const sizeKb = Math.round(fs.statSync(filePath).size / 1024);

      const snapshot: DemoSnapshot = { id, label: displayLabel, createdAt, sizeKb, rowCount, filePath, lastUsedAt: null };
      const snapshots = this.readIndex();
      snapshots.unshift(snapshot);
      this.writeIndex(snapshots);

      return { id, label: displayLabel, createdAt, sizeKb, rowCount };
    } catch (err: unknown) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`Tạo snapshot thất bại: ${msg}`);
    }
  }

  async resetDemo(snapshotId: string) {
    const snapshots = this.readIndex();
    const snap = snapshots.find(s => s.id === snapshotId);
    if (!snap) throw new BadRequestException(`Snapshot "${snapshotId}" không tồn tại`);
    if (!fs.existsSync(snap.filePath)) throw new BadRequestException('File snapshot không tìm thấy trên disk');

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new InternalServerErrorException('DATABASE_URL chưa được cấu hình');

    try {
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'replica'`);
      await this.prisma.$executeRawUnsafe(`
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN (
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations')
          )
          LOOP
            EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
          END LOOP;
        END $$
      `);
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'DEFAULT'`);

      execSync(`psql "${dbUrl}" -f "${snap.filePath}"`, { stdio: 'pipe' });

      const now = new Date().toISOString();
      const updated = snapshots.map(s => s.id === snapshotId ? { ...s, lastUsedAt: now } : s);
      this.writeIndex(updated);

      return { message: `Đã khôi phục snapshot "${snap.label}"`, snapshotId, resetAt: now };
    } catch (err: unknown) {
      try { await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'DEFAULT'`); } catch {}
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`Reset demo thất bại: ${msg}`);
    }
  }

  deleteSnapshot(snapshotId: string) {
    const snapshots = this.readIndex();
    const snap = snapshots.find(s => s.id === snapshotId);
    if (!snap) throw new BadRequestException(`Snapshot "${snapshotId}" không tồn tại`);

    if (fs.existsSync(snap.filePath)) fs.unlinkSync(snap.filePath);
    this.writeIndex(snapshots.filter(s => s.id !== snapshotId));

    return { message: `Đã xóa snapshot "${snap.label}"` };
  }
}
