import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MailService } from '../notifications/mail.service';
import { PayslipGeneratorService, PayslipPayload } from './payslip-generator.service';
import { NotificationType } from '../generated/prisma';
import { CLS_TENANT_ID } from '../common/cls/cls-keys';
import dayjs from 'dayjs';

export const PAYSLIP_QUEUE = 'payslip-generation';

export interface PayslipJobData {
  recordId: string;
  periodId: string;
  tenantId?: string;
}

@Injectable()
export class PayslipQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PayslipQueueService.name);
  private queue!: Queue<PayslipJobData>;
  private worker!: Worker<PayslipJobData>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
    private readonly generator: PayslipGeneratorService,
    private readonly cls: ClsService,
  ) {}

  onModuleInit() {
    const connection = {
      host: process.env.REDIS_HOST ?? 'redis',
      port: Number(process.env.REDIS_PORT ?? 6379),
    };

    this.queue = new Queue<PayslipJobData>(PAYSLIP_QUEUE, { connection });

    this.worker = new Worker<PayslipJobData>(
      PAYSLIP_QUEUE,
      (job) =>
        this.cls.run(async () => {
          const t = job.data?.tenantId;
          if (t) this.cls.set(CLS_TENANT_ID, t);
          return this.process(job);
        }),
      { connection, concurrency: 3 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Payslip job ${job?.id} failed`, err);
    });

    this.worker.on('completed', (job) => {
      this.logger.log(`Payslip job ${job.id} completed`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueueOne(recordId: string): Promise<string> {
    const tid = this.cls.isActive() ? this.cls.get(CLS_TENANT_ID) : undefined;
    const job = await this.queue.add('payslip', { recordId, periodId: '', tenantId: tid }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
      removeOnComplete: 50,
      removeOnFail: 20,
    });
    return job.id!;
  }

  async checkJob(jobId: string): Promise<{ status: string; url?: string }> {
    const job = await this.queue.getJob(jobId);
    if (!job) return { status: 'NOT_FOUND' };
    const state = await job.getState();
    if (state === 'completed') return { status: 'DONE', url: job.returnvalue?.url };
    if (state === 'failed') return { status: 'FAILED' };
    if (state === 'active') return { status: 'PROCESSING' };
    return { status: 'QUEUED' };
  }

  async enqueueAll(periodId: string): Promise<void> {
    const records = await this.prisma.payrollRecord.findMany({
      where: { periodId },
      select: { id: true },
    });

    const tid = this.cls.isActive() ? this.cls.get(CLS_TENANT_ID) : undefined;
    const jobs = records.map((r) => ({
      name: 'generate',
      data: { recordId: r.id, periodId, tenantId: tid },
      opts: {
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 10_000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    }));

    await this.queue.addBulk(jobs);
    this.logger.log(`Enqueued ${jobs.length} payslip jobs for period ${periodId}`);
  }

  private async process(job: Job<PayslipJobData>): Promise<void> {
    const { recordId, periodId } = job.data;

    const record = await this.prisma.payrollRecord.findUnique({
      where: { id: recordId },
      include: {
        period: true,
        employee: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!record) {
      this.logger.warn(`PayrollRecord ${recordId} not found, skipping`);
      return;
    }

    if (!record.employee.user) {
      this.logger.warn(`PayrollRecord ${recordId}: employee has no user, skipping`);
      return;
    }

    const period = record.period;
    const user = record.employee.user;
    const generatedAt = dayjs().format('DD/MM/YYYY HH:mm');

    const payload: PayslipPayload = {
      employeeName: user.name,
      employeeEmail: user.email,
      periodName: period.name,
      startDate: dayjs(period.startDate).format('DD/MM/YYYY'),
      endDate: dayjs(period.endDate).format('DD/MM/YYYY'),
      baseSalary: Number(record.baseSalary),
      overtimePay: Number(record.overtimePay),
      allowances: Number(record.allowances),
      bonus: Number(record.bonus),
      grossSalary: Number(record.grossSalary),
      bhxhEmployee: Number(record.bhxhEmployee),
      bhytEmployee: Number(record.bhytEmployee),
      bhtnEmployee: Number(record.bhtnEmployee),
      taxableIncome: Number(record.taxableIncome),
      selfDeduction: Number(record.selfDeduction),
      dependentDeduction: Number(record.dependentDeduction),
      dependentCount: record.dependentCount,
      pitAmount: Number(record.pitAmount),
      netSalary: Number(record.netSalary),
      workDays: Number(record.workDays),
      leaveDays: Number(record.leaveDays),
      paidLeaveDays: Number(record.paidLeaveDays),
      unpaidLeaveDays: Number(record.unpaidLeaveDays),
      overtimeHours: Number(record.overtimeHours),
      totalLaborCost: Number(record.totalLaborCost),
      generatedAt,
    };

    const pdfBuffer = await this.generator.generate(payload);

    const year = dayjs(period.startDate).year();
    const safeName = user.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const safePeriod = period.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const filename = `payslip-${safePeriod}-${safeName}.pdf`;
    const { storagePath } = await this.storage.upload({
      folder: `payslips/${year}/${periodId}`,
      filename,
      buffer: pdfBuffer,
      size: pdfBuffer.length,
      mimeType: 'application/pdf',
      // Worker đã set CLS tenant (Cụm 2) → path per-tenant thay vì shared/.
      tenantId: this.cls.isActive() ? this.cls.get<string>(CLS_TENANT_ID) : undefined,
    });

    await this.prisma.payrollRecord.update({
      where: { id: recordId },
      data: { payslipPath: storagePath },
    });

    await this.prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.PAYSLIP_ISSUED,
        title: `Phiếu lương ${period.name} đã sẵn sàng`,
        body: `Phiếu lương kỳ ${period.name} của bạn đã được phát hành. Lương thực nhận: ${Number(record.netSalary).toLocaleString('vi-VN')} đ`,
      },
    });

    await this.mail.sendPayslipEmail(
      user.email,
      user.name,
      period.name,
      storagePath,
      Number(record.netSalary),
    );
  }
}
