import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import { CreateBudgetPlanDto } from './dto/create-budget-plan.dto';
import { Decimal } from '../generated/prisma/runtime/client';
import { ProcessStarterService } from '../processes/process-starter.service';

@Injectable({ scope: Scope.REQUEST })
export class BudgetService extends TenantAwareService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processStarter: ProcessStarterService,
    @Inject(REQUEST) req: any,
  ) {
    super(req);
  }

  // ── Danh sách kế hoạch ngân sách ──────────────────────────────────────────
  async findAll(
    query: {
      fiscalYear?: number;
      orgUnitId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: any = {};
    if (query.fiscalYear) where.fiscalYear = query.fiscalYear;
    if (query.orgUnitId) where.orgUnitId = query.orgUnitId;
    if (query.status) where.status = query.status;

    const db = this.prisma as any;
    const [data, total] = await this.prisma.$transaction([
      db.budgetPlan.findMany({
        where,
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.budgetPlan.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  // ── Chi tiết kế hoạch ngân sách ───────────────────────────────────────────
  async findOne(id: string): Promise<any> {
    const db = this.prisma as any;
    const plan = await db.budgetPlan.findUnique({
      where: { id },
      include: {
        lines: {
          include: { transactions: { orderBy: { createdAt: 'desc' }, take: 50 } },
        },
        orgUnit: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
    if (!plan) throw new NotFoundException(`Kế hoạch ngân sách ${id} không tìm thấy`);
    return plan;
  }

  // ── Tạo kế hoạch ngân sách ────────────────────────────────────────────────
  async create(dto: CreateBudgetPlanDto, userId: string): Promise<any> {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Kế hoạch ngân sách phải có ít nhất một dòng ngân sách');
    }

    // Validate: tổng dòng ngân sách phải bằng totalAmount
    const lineTotal = dto.lines.reduce(
      (sum, l) => sum + parseFloat(l.allocatedAmount),
      0,
    );
    const planTotal = parseFloat(dto.totalAmount);
    if (Math.abs(lineTotal - planTotal) > 0.01) {
      throw new BadRequestException(
        `Tổng dòng ngân sách (${lineTotal.toLocaleString('vi-VN')}) phải bằng tổng kế hoạch (${planTotal.toLocaleString('vi-VN')})`,
      );
    }

    const db = this.prisma as any;
    const plan = await this.prisma.$transaction(async (tx: any) => {
      const created = await tx.budgetPlan.create({
        data: {
          name: dto.name,
          fiscalYear: dto.fiscalYear,
          type: dto.type,
          orgUnitId: dto.orgUnitId ?? null,
          projectId: dto.projectId ?? null,
          totalAmount: new Decimal(dto.totalAmount),
          note: dto.note ?? null,
          createdById: userId,
          status: 'DRAFT',
          lines: {
            create: dto.lines.map((l) => ({
              category: l.category,
              description: l.description ?? null,
              allocatedAmount: new Decimal(l.allocatedAmount),
              alertThreshold: l.alertThreshold ?? 80,
            })),
          },
        },
        include: { lines: true },
      });
      return created;
    });

    return plan;
  }

  // ── Nộp phê duyệt kế hoạch ngân sách ─────────────────────────────────────
  async submit(id: string): Promise<any> {
    const plan = await this.findOne(id);
    if (plan.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ có thể nộp kế hoạch ở trạng thái DRAFT');
    }

    const db = this.prisma as any;
    const updated = await db.budgetPlan.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
      include: { lines: true },
    });

    // Khởi tạo quy trình duyệt ngân sách (BPM) nếu đã cấu hình
    await this.processStarter.startForEntity({
      definitionKey: 'budget-approval',
      entityType: 'BUDGET_PLAN',
      entityId: plan.id,
      startedByUserId: plan.createdById ?? '',
      variables: { planName: plan.name, fiscalYear: plan.fiscalYear, totalAmount: Number(plan.totalAmount) },
      taskName: `Duyệt ngân sách: ${plan.name}`,
    });

    return updated;
  }

  // ── Phê duyệt kế hoạch ngân sách ─────────────────────────────────────────
  async approve(id: string, userId: string): Promise<any> {
    const plan = await this.findOne(id);
    if (plan.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Chỉ có thể duyệt kế hoạch ở trạng thái PENDING_APPROVAL');
    }

    const db = this.prisma as any;
    return db.budgetPlan.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: { lines: true },
    });
  }

  // ── Từ chối kế hoạch ngân sách ────────────────────────────────────────────
  async reject(id: string, reason: string): Promise<any> {
    const plan = await this.findOne(id);
    if (plan.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Chỉ có thể từ chối kế hoạch ở trạng thái PENDING_APPROVAL');
    }

    const db = this.prisma as any;
    return db.budgetPlan.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
      },
      include: { lines: true },
    });
  }

  // ── Tóm tắt kế hoạch ngân sách ────────────────────────────────────────────
  async getSummary(id: string): Promise<{
    plan: any;
    totalAllocated: number;
    totalUsed: number;
    totalCommitted: number;
    totalRemaining: number;
    usedPct: number;
    lines: Array<{
      id: string;
      category: string;
      allocatedAmount: number;
      usedAmount: number;
      committedAmount: number;
      remaining: number;
      usedPct: number;
      isWarning: boolean;
    }>;
  }> {
    const plan = await this.findOne(id);

    const totalAllocated = plan.lines.reduce(
      (s: number, l: any) => s + parseFloat(l.allocatedAmount),
      0,
    );
    const totalUsed = plan.lines.reduce(
      (s: number, l: any) => s + parseFloat(l.usedAmount),
      0,
    );
    const totalCommitted = plan.lines.reduce(
      (s: number, l: any) => s + parseFloat(l.committedAmount),
      0,
    );
    const totalRemaining = totalAllocated - totalUsed - totalCommitted;

    return {
      plan,
      totalAllocated,
      totalUsed,
      totalCommitted,
      totalRemaining,
      usedPct: totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0,
      lines: plan.lines.map((l: any) => {
        const allocated = parseFloat(l.allocatedAmount);
        const used = parseFloat(l.usedAmount);
        const committed = parseFloat(l.committedAmount);
        const remaining = allocated - used - committed;
        const usedPct = allocated > 0 ? (used / allocated) * 100 : 0;
        return {
          id: l.id,
          category: l.category,
          allocatedAmount: allocated,
          usedAmount: used,
          committedAmount: committed,
          remaining,
          usedPct,
          isWarning: usedPct >= l.alertThreshold,
        };
      }),
    };
  }

  // ── Kiểm tra ngân sách còn đủ không ──────────────────────────────────────
  async checkBudget(
    orgUnitId: string,
    category: string,
    fiscalYear: number,
    amount: number,
  ): Promise<{
    allowed: boolean;
    lineId?: string;
    remaining: number;
    usedPct: number;
    isWarning: boolean;
  }> {
    const db = this.prisma as any;

    // Tìm BudgetLine ACTIVE khớp với orgUnit + category + fiscalYear
    const line = await db.budgetLine.findFirst({
      where: {
        category,
        plan: {
          status: 'ACTIVE',
          fiscalYear,
          orgUnitId,
        },
      },
      include: { plan: { select: { status: true } } },
    });

    if (!line) {
      // Không có ngân sách cho danh mục này — cho phép nhưng cảnh báo
      this.logger.warn(
        `Không tìm thấy ngân sách active cho orgUnit=${orgUnitId}, category=${category}, fiscalYear=${fiscalYear}`,
      );
      return { allowed: true, remaining: 0, usedPct: 0, isWarning: true };
    }

    const allocated = parseFloat(line.allocatedAmount);
    const used = parseFloat(line.usedAmount);
    const committed = parseFloat(line.committedAmount);
    const remaining = allocated - used - committed;
    const usedPct = allocated > 0 ? ((used + amount) / allocated) * 100 : 0;
    const allowed = remaining >= amount;

    if (!allowed) {
      return { allowed: false, lineId: line.id, remaining, usedPct, isWarning: true };
    }

    return {
      allowed: true,
      lineId: line.id,
      remaining,
      usedPct,
      isWarning: usedPct >= line.alertThreshold,
    };
  }

  // ── Ghi giao dịch ngân sách ───────────────────────────────────────────────
  async recordTransaction(
    lineId: string,
    sourceType: string,
    sourceId: string,
    amount: number,
    type: 'ACTUAL' | 'COMMITTED',
  ): Promise<void> {
    const db = this.prisma as any;

    await this.prisma.$transaction(async (tx: any) => {
      await tx.budgetTransaction.create({
        data: {
          lineId,
          sourceType,
          sourceId,
          amount: new Decimal(amount),
          type,
        },
      });

      // Cập nhật usedAmount hoặc committedAmount tương ứng
      if (type === 'ACTUAL') {
        await tx.budgetLine.update({
          where: { id: lineId },
          data: { usedAmount: { increment: amount } },
        });
      } else {
        await tx.budgetLine.update({
          where: { id: lineId },
          data: { committedAmount: { increment: amount } },
        });
      }
    });

    // Log warning nếu usedPct >= alertThreshold sau khi cập nhật
    const updatedLine = await db.budgetLine.findUnique({
      where: { id: lineId },
      select: { allocatedAmount: true, usedAmount: true, alertThreshold: true, category: true },
    });
    if (updatedLine) {
      const pct =
        parseFloat(updatedLine.usedAmount) / parseFloat(updatedLine.allocatedAmount) * 100;
      if (pct >= updatedLine.alertThreshold) {
        this.logger.warn(
          `Cảnh báo ngân sách: dòng ${lineId} (${updatedLine.category}) đã dùng ${pct.toFixed(1)}% — vượt ngưỡng ${updatedLine.alertThreshold}%`,
        );
      }
    }
  }
}
