import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Số ngày công chuẩn và số giờ/ngày theo quy định nội bộ
const WORK_DAYS_PER_MONTH = 26;
const HOURS_PER_DAY = 8;

@Injectable()
export class ProjectCostService {
  private readonly logger = new Logger(ProjectCostService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * E20.1 — Chạy daily snapshot chi phí cho tất cả project đang ACTIVE.
   * Mỗi project: tính labor cost từ TimeLog, expense cost từ Expense đã APPROVED,
   * upsert ProjectCostSnapshot cho hôm nay, và tạo/update ProjectCostByEmployee.
   */
  async snapshotAllActiveProjects(): Promise<void> {
    this.logger.log('[ProjectCostService] Bắt đầu snapshot chi phí dự án...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Lấy tối đa 100 project ACTIVE, chưa bị xóa mềm
    const projects = await this.prisma.project.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: {
        id: true,
        startDate: true,
        budgetCost: true,
        budgetHours: true,
      },
      take: 100,
    });

    this.logger.log(`[ProjectCostService] Xử lý ${projects.length} dự án ACTIVE`);

    for (const project of projects) {
      try {
        await this.snapshotProject(project, today);
      } catch (err) {
        // Không để lỗi 1 project dừng toàn bộ cron
        this.logger.error(
          `[ProjectCostService] Lỗi snapshot project ${project.id}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log('[ProjectCostService] Hoàn tất snapshot.');
  }

  private async snapshotProject(
    project: { id: string; startDate: Date; budgetCost: any; budgetHours: any },
    snapshotDate: Date,
  ): Promise<void> {
    // ── 1. Labor cost từ TimeLog (task thuộc project) ──────────────────────────
    const timeLogs = await this.prisma.timeLog.findMany({
      where: {
        task: { projectId: project.id },
        logDate: { gte: project.startDate, lte: snapshotDate },
      },
      select: {
        hours: true,
        userId: true,
        user: {
          select: {
            employee: {
              select: {
                id: true,
                contracts: {
                  where: { status: 'ACTIVE', deletedAt: null },
                  select: { salaryMonthly: true },
                  orderBy: { startDate: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    // Tổng hợp giờ + cost theo employeeId
    const employeeMap = new Map<
      string,
      { totalHours: number; ratePerHour: number; laborCost: number }
    >();

    for (const log of timeLogs) {
      const employee = log.user?.employee;
      if (!employee) continue;

      const empId = employee.id;
      const contract = employee.contracts[0];
      // rate = salaryMonthly / (26 ngày * 8 giờ)
      const ratePerHour = contract
        ? Number(contract.salaryMonthly) / (WORK_DAYS_PER_MONTH * HOURS_PER_DAY)
        : 0;

      const hours = Number(log.hours);
      const cost = hours * ratePerHour;

      const existing = employeeMap.get(empId);
      if (existing) {
        existing.totalHours += hours;
        existing.laborCost += cost;
      } else {
        employeeMap.set(empId, {
          totalHours: hours,
          ratePerHour,
          laborCost: cost,
        });
      }
    }

    const totalLaborCost = Array.from(employeeMap.values()).reduce(
      (sum, e) => sum + e.laborCost,
      0,
    );

    // ── 2. Expense cost — chỉ tính Expense đã APPROVED ───────────────────────
    const expenseAgg = await this.prisma.expense.aggregate({
      where: {
        projectId: project.id,
        status: 'APPROVED',
      },
      _sum: { totalAmount: true },
    });
    const totalExpenseCost = Number(expenseAgg._sum.totalAmount ?? 0);

    // ── 3. Utilization rate = totalCost / budgetCost (0 nếu chưa set) ─────────
    const totalCost = totalLaborCost + totalExpenseCost;
    const budgetCost = project.budgetCost ? Number(project.budgetCost) : 0;
    const utilizationRate = budgetCost > 0 ? totalCost / budgetCost : 0;

    // ── 4. Upsert ProjectCostSnapshot ─────────────────────────────────────────
    const _existingSnapshot = await this.prisma.projectCostSnapshot.findFirst({
      where: {
        projectId: project.id,
        snapshotDate,
      },
    });
    const snapshot = _existingSnapshot
      ? await this.prisma.projectCostSnapshot.update({
          where: { id: _existingSnapshot.id },
          data: {
            totalLaborCost,
            totalExpenseCost,
            totalCost,
            utilizationRate,
          },
        })
      : await this.prisma.projectCostSnapshot.create({
          data: {
            projectId: project.id,
            snapshotDate,
            totalLaborCost,
            totalExpenseCost,
            totalCost,
            utilizationRate,
          },
        });

    // ── 5. Upsert ProjectCostByEmployee ───────────────────────────────────────
    for (const [employeeId, data] of employeeMap.entries()) {
      // Không có composite unique trong schema → dùng findFirst + update/create
      const existing = await this.prisma.projectCostByEmployee.findFirst({
        where: { snapshotId: snapshot.id, employeeId },
        select: { id: true },
      });
      if (existing) {
        await this.prisma.projectCostByEmployee.update({
          where: { id: existing.id },
          data: {
            hours: data.totalHours,
            ratePerHour: data.ratePerHour,
            cost: data.laborCost,
          },
        });
      } else {
        await this.prisma.projectCostByEmployee.create({
          data: {
            snapshotId: snapshot.id,
            employeeId,
            hours: data.totalHours,
            ratePerHour: data.ratePerHour,
            cost: data.laborCost,
          },
        });
      }
    }

    this.logger.debug(
      `[ProjectCostService] Project ${project.id}: laborCost=${totalLaborCost.toFixed(0)}, expense=${totalExpenseCost.toFixed(0)}, util=${(utilizationRate * 100).toFixed(1)}%`,
    );
  }

  /**
   * Trả về snapshot mới nhất + trend 30 ngày gần nhất cho 1 project.
   */
  async getProjectCostSummary(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true, name: true, budgetCost: true, budgetHours: true },
    });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');

    // Snapshot mới nhất
    const latestSnapshot = await this.prisma.projectCostSnapshot.findFirst({
      where: { projectId },
      orderBy: { snapshotDate: 'desc' },
      include: {
        employeeBreakdown: {
          include: {
            employee: { select: { id: true, fullName: true, code: true } },
          },
          orderBy: { cost: 'desc' },
          take: 50,
        },
      },
    });

    // Trend 30 ngày gần nhất (cho sparkline chart)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trend = await this.prisma.projectCostSnapshot.findMany({
      where: {
        projectId,
        snapshotDate: { gte: thirtyDaysAgo },
      },
      orderBy: { snapshotDate: 'asc' },
      select: {
        snapshotDate: true,
        totalLaborCost: true,
        totalExpenseCost: true,
        totalCost: true,
        utilizationRate: true,
      },
      take: 30,
    });

    return {
      project,
      latestSnapshot,
      trend,
    };
  }
}
