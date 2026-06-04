import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { ClsService } from 'nestjs-cls';
import { CLS_TENANT_ID } from '../common/cls/cls-keys';
import { DeadLetterService } from '../common/dead-letter/dead-letter.service';
import { HrAttendanceService } from './hr-attendance.service';

export const ATTENDANCE_REBUILD_QUEUE = 'attendance-rebuild';

// Job 'day'  → tính lại 1 NV × các ngày (thêm/sửa/xóa 1 lần quẹt)
// Job 'month'→ tính lại cả tháng cho toàn bộ NV (sau import hàng loạt)
export interface RebuildDayJob { kind: 'day'; employeeId: string; dates: string[]; tenantId?: string }
export interface RebuildMonthJob { kind: 'month'; year: number; month: number; orgUnitId?: string; tenantId?: string }
type RebuildJob = RebuildDayJob | RebuildMonthJob;

@Injectable()
export class AttendanceRebuildQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AttendanceRebuildQueueService.name);
  private queue!: Queue<RebuildJob>;
  private worker!: Worker<RebuildJob>;

  constructor(
    private readonly attendance: HrAttendanceService,
    private readonly cls: ClsService,
    private readonly deadLetter: DeadLetterService,
  ) {}

  onModuleInit() {
    const connection = {
      host: process.env.REDIS_HOST ?? 'redis',
      port: Number(process.env.REDIS_PORT ?? 6379),
    };

    this.queue = new Queue<RebuildJob>(ATTENDANCE_REBUILD_QUEUE, { connection });

    this.worker = new Worker<RebuildJob>(
      ATTENDANCE_REBUILD_QUEUE,
      (job) =>
        this.cls.run(async () => {
          const t = job.data?.tenantId;
          if (t) this.cls.set(CLS_TENANT_ID, t);
          return this.process(job);
        }),
      { connection, concurrency: 4 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Rebuild job ${job?.id} failed`, err);
      void this.deadLetter.record(job, err);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  private tenant(): string | undefined {
    return this.cls.isActive() ? this.cls.get<string>(CLS_TENANT_ID) : undefined;
  }

  /** Thêm/sửa 1 lần quẹt → tính lại NV đó cho các ngày bị ảnh hưởng (dedupe theo emp+ngày). */
  async enqueueDay(employeeId: string, dates: string[]): Promise<void> {
    if (!this.queue || dates.length === 0) return;
    const tenantId = this.tenant();
    // jobId KHÔNG được chứa ':' (BullMQ reserved) → dùng '_'. Dedupe theo emp+ngày.
    try {
      await this.queue.addBulk(
        dates.map((date) => ({
          name: 'day',
          data: { kind: 'day' as const, employeeId, dates: [date], tenantId },
          opts: {
            jobId: `day_${tenantId ?? 'default'}_${employeeId}_${date}`,
            // Debounce 2s: nhiều lần quẹt sát nhau (vào/ra) gộp vào 1 job, khi chạy
            // mới đọc đủ tất cả giờ quẹt trong ngày → tránh tính thiếu (MISSING_CHECKOUT).
            delay: 2_000,
            attempts: 3,
            backoff: { type: 'exponential' as const, delay: 5_000 },
            removeOnComplete: 200,
            removeOnFail: 50,
          },
        })),
      );
    } catch (e) {
      // Tự động tính lại là best-effort — không để lỗi queue làm hỏng việc lưu quẹt.
      this.logger.error(`enqueueDay thất bại (emp=${employeeId})`, e as Error);
    }
  }

  /** Sau import hàng loạt → tính lại cả tháng cho toàn bộ NV (1 job/tháng). */
  async enqueueMonth(year: number, month: number, orgUnitId?: string): Promise<void> {
    if (!this.queue) return;
    const tenantId = this.tenant();
    try {
      await this.queue.add(
        'month',
        { kind: 'month', year, month, orgUnitId, tenantId },
        {
          jobId: `month_${tenantId ?? 'default'}_${year}-${month}_${orgUnitId ?? 'all'}`,
          attempts: 2,
          backoff: { type: 'exponential', delay: 15_000 },
          removeOnComplete: 50,
          removeOnFail: 20,
        },
      );
    } catch (e) {
      this.logger.error(`enqueueMonth thất bại (${year}-${month})`, e as Error);
    }
  }

  private async process(job: Job<RebuildJob>): Promise<void> {
    const data = job.data;
    if (data.kind === 'day') {
      for (const date of data.dates) {
        await this.attendance.recomputeEmployeeDay(data.employeeId, date);
      }
    } else if (data.kind === 'month') {
      await this.attendance.summarizeMonth({ year: data.year, month: data.month, orgUnitId: data.orgUnitId });
    }
  }
}
