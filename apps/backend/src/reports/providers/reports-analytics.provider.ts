import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma';
import { TenantAwareService } from '../../common/services/tenant-aware.service';

/**
 * Nhóm 1 — Analytics reads.
 * Mọi method chỉ đọc dữ liệu để tổng hợp/thống kê, không sinh Excel.
 * Tenant scope kế thừa từ TenantAwareService (REQUEST scope như service gốc).
 */
@Injectable({ scope: Scope.REQUEST })
export class ReportsAnalyticsProvider extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async getTopEmployeesByHours(limit = 10) {
    const logs = await this.prisma.timeLog.groupBy({
      by: ['userId'],
      _sum: { hours: true },
      orderBy: { _sum: { hours: 'desc' } },
      take: limit,
    });

    const userIds = logs.map((l) => l.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    const employees = await this.prisma.employee.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, code: true, level: true, orgUnit: { select: { name: true } } },
    });

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    const empMap = Object.fromEntries(employees.map((e) => [e.userId!, e]));

    return logs.map((l) => ({
      userId: l.userId,
      name: userMap[l.userId]?.name ?? '—',
      code: empMap[l.userId]?.code ?? '—',
      level: empMap[l.userId]?.level ?? '—',
      orgUnit: empMap[l.userId]?.orgUnit?.name ?? '—',
      totalHours: Number(l._sum.hours ?? 0),
    }));
  }

  async getProjectBurndown(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: this.tenantWhere({ id: projectId }),
      select: { id: true, name: true, startDate: true, endDate: true, budgetEffortMm: true },
    });
    if (!project) return null;

    const tasks = await this.prisma.task.findMany({
      where: this.tenantWhere({ projectId }),
      select: { estimateHours: true, actualHours: true, status: true, createdAt: true },
      // Giới hạn an toàn — đủ cho mọi dự án thực tế
      take: 5000,
    });

    const totalEstimate = tasks.reduce((s, t) => s + Number(t.estimateHours), 0);
    const totalActual = tasks.reduce((s, t) => s + Number(t.actualHours), 0);
    const doneEstimate = tasks
      .filter((t) => t.status === 'DONE')
      .reduce((s, t) => s + Number(t.estimateHours), 0);

    const timeLogs = await this.prisma.timeLog.findMany({
      where: { task: { projectId } },
      select: { hours: true, logDate: true },
      orderBy: { logDate: 'asc' },
      take: 10000,
    });

    const dailyHours: Record<string, number> = {};
    for (const log of timeLogs) {
      const day = log.logDate.toISOString().split('T')[0];
      dailyHours[day] = (dailyHours[day] ?? 0) + Number(log.hours);
    }

    let cumulative = 0;
    const burndown = Object.entries(dailyHours).map(([date, hours]) => {
      cumulative += hours;
      return { date, dailyHours: hours, cumulativeHours: cumulative };
    });

    return {
      project: {
        id: project.id,
        name: project.name,
        startDate: project.startDate,
        endDate: project.endDate,
        budgetEffortMm: project.budgetEffortMm,
      },
      summary: {
        totalEstimate,
        totalActual,
        doneEstimate,
        progress: totalEstimate > 0 ? Math.round((doneEstimate / totalEstimate) * 100) : 0,
      },
      burndown,
    };
  }

  async getOrgUnitSummary() {
    const orgUnits = await this.prisma.orgUnit.findMany({
      where: this.tenantWhere(),
      include: {
        _count: { select: { employees: true, projects: true } },
      },
      // Giới hạn an toàn — tránh dump toàn bộ DB khi số org-unit tăng lớn
      take: 5000,
    });

    return orgUnits.map((o) => ({
      id: o.id,
      name: o.name,
      code: o.code,
      employeeCount: o._count.employees,
      projectCount: o._count.projects,
    }));
  }

  async getMonthlyTimeLogs(months = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const logs = await this.prisma.timeLog.findMany({
      where: { logDate: { gte: since } },
      select: { hours: true, logDate: true },
      take: 50000,
    });

    const monthlyMap: Record<string, number> = {};
    for (const log of logs) {
      const key = log.logDate.toISOString().substring(0, 7);
      monthlyMap[key] = (monthlyMap[key] ?? 0) + Number(log.hours);
    }

    return Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, totalHours]) => ({ month, totalHours }));
  }

  async getBugStats() {
    const tid = this.getTenantId();
    const bugWhere = tid ? { tenantId: tid } : undefined;
    const [byStatus, bySeverity, byProject, monthlyTrend] = await Promise.all([
      this.prisma.bug.groupBy({
        by: ['status'],
        where: bugWhere,
        _count: { id: true },
      }),
      this.prisma.bug.groupBy({
        by: ['severity'],
        where: bugWhere,
        _count: { id: true },
      }),
      this.prisma.bug.groupBy({
        by: ['projectId'],
        where: bugWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 8,
      }),
      this.prisma.$queryRaw<{ month: string; count: bigint }[]>`
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
        FROM bugs
        WHERE created_at >= NOW() - INTERVAL '6 months'
          ${tid ? Prisma.sql`AND tenant_id = ${tid}` : Prisma.sql``}
        GROUP BY month
        ORDER BY month ASC
      `,
    ]);

    const projectIds = byProject.map((b) => b.projectId);
    const projects = await this.prisma.project.findMany({
      where: this.tenantWhere({ id: { in: projectIds } }),
      select: { id: true, name: true, code: true },
    });
    const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

    return {
      byStatus: byStatus.map((b) => ({ status: b.status, count: b._count.id })),
      bySeverity: bySeverity.map((b) => ({ severity: b.severity, count: b._count.id })),
      byProject: byProject.map((b) => ({
        projectId: b.projectId,
        projectName: projectMap[b.projectId]?.name ?? '—',
        projectCode: projectMap[b.projectId]?.code ?? '—',
        count: b._count.id,
      })),
      monthlyTrend: monthlyTrend.map((r) => ({ month: r.month, count: Number(r.count) })),
    };
  }

  async getHrStats() {
    const tid = this.getTenantId();
    const leaveWhere = tid ? { tenantId: tid } : undefined;
    const [leaveByStatus, leaveByType, expenseByStatus, expenseByCategory] = await Promise.all([
      this.prisma.leaveRequest.groupBy({ by: ['status'], where: leaveWhere, _count: { id: true } }),
      this.prisma.leaveRequest.groupBy({
        by: ['leaveTypeId'],
        where: leaveWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 8,
      }),
      // Expense không có tenantId — query toàn bộ
      this.prisma.expense.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.expense.groupBy({
        by: ['category'],
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
    ]);

    const leaveTypeIds = leaveByType.map((l) => l.leaveTypeId);
    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { id: { in: leaveTypeIds } },
      select: { id: true, name: true, color: true },
    });
    const ltMap = Object.fromEntries(leaveTypes.map((t) => [t.id, t]));

    return {
      leave: {
        byStatus: leaveByStatus.map((l) => ({ status: l.status, count: l._count.id })),
        byType: leaveByType.map((l) => ({
          typeId: l.leaveTypeId,
          typeName: ltMap[l.leaveTypeId]?.name ?? '—',
          color: ltMap[l.leaveTypeId]?.color ?? '#2563EB',
          count: l._count.id,
        })),
      },
      expense: {
        byStatus: expenseByStatus.map((e) => ({ status: e.status, count: e._count.id })),
        byCategory: expenseByCategory.map((e) => ({
          category: e.category,
          count: e._count.id,
          totalAmount: Number(e._sum.totalAmount ?? 0),
        })),
      },
    };
  }

  // ── L-08: HR Analytics ───────────────────────────────────────────────────

  async getTurnoverRate(year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate   = new Date(year, 11, 31, 23, 59, 59);
    const [leavers, avgHeadcount] = await Promise.all([
      this.prisma.employee.count({
        where: this.tenantWhere({ endDate: { gte: startDate, lte: endDate } }),
      }),
      this.prisma.employee.count({ where: this.tenantWhere({ isActive: true }) }),
    ]);
    return {
      year,
      leavers,
      avgHeadcount,
      turnoverRate:
        avgHeadcount > 0
          ? Math.round((leavers / avgHeadcount) * 100 * 10) / 10
          : 0,
    };
  }

  async getHeadcountTrend(months = 6) {
    const results: { month: string; count: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year  = date.getFullYear();
      const month = date.getMonth(); // 0-indexed
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      const periodStart = new Date(year, month, 1);
      const periodEnd   = new Date(year, month + 1, 0, 23, 59, 59);

      const count = await this.prisma.employee.count({
        where: this.tenantWhere({
          startDate: { lte: periodEnd },
          OR: [
            { endDate: null },
            { endDate: { gte: periodStart } },
          ],
          isActive: true,
        }),
      });
      results.push({ month: monthStr, count });
    }
    return results;
  }

  // ── L-05: Utilization Rate ────────────────────────────────────────────────

  async getUtilization(period: string, departmentId?: string) {
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month - 1, 0 + new Date(year, month, 0).getDate());

    // Số ngày làm việc trong tháng (bỏ T7/CN)
    let workingDays = 0;
    const d = new Date(startDate);
    while (d <= endDate) {
      if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
      d.setDate(d.getDate() + 1);
    }
    const availableHours = workingDays * 8;

    const whereEmployee: any = this.tenantWhere({ deletedAt: null, isActive: true });
    if (departmentId) whereEmployee.orgUnitId = departmentId;

    const employees = await this.prisma.employee.findMany({
      where: whereEmployee,
      select: {
        id: true, fullName: true, code: true, userId: true,
        orgUnit: { select: { name: true } },
      },
      take: 200,
    });

    const userIds = employees.map((e) => e.userId).filter(Boolean) as string[];

    // Gộp time logs theo userId
    const timeLogs = await this.prisma.timeLog.findMany({
      where: {
        userId: { in: userIds },
        logDate: { gte: startDate, lte: endDate },
      },
      select: { userId: true, hours: true },
      take: 50000,
    });

    const hoursMap: Record<string, number> = {};
    for (const t of timeLogs) {
      hoursMap[t.userId] = (hoursMap[t.userId] ?? 0) + Number(t.hours);
    }

    const results = employees.map((emp) => {
      const actualHours = emp.userId ? (hoursMap[emp.userId] ?? 0) : 0;
      return {
        employeeId: emp.id,
        name: `${emp.code} — ${emp.fullName}`,
        department: emp.orgUnit?.name ?? '—',
        actualHours,
        availableHours,
        utilizationPct: availableHours > 0
          ? Math.round((actualHours / availableHours) * 100)
          : 0,
      };
    });

    return results.sort((a, b) => b.utilizationPct - a.utilizationPct);
  }

  // ── L-06: Period Comparison Summary ──────────────────────────────────────

  async getSummary(period: string, comparePeriod?: string) {
    const getPeriodData = async (p: string) => {
      const [yr, mo] = p.split('-').map(Number);
      const start = new Date(yr, mo - 1, 1);
      const end   = new Date(yr, mo - 1, new Date(yr, mo, 0).getDate(), 23, 59, 59);

      const [revenue, expenses, newProjects, newEmployees] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: this.tenantWhere({ type: 'SALES' as any, status: 'PAID' as any, createdAt: { gte: start, lte: end }, deletedAt: null }),
          _sum: { totalAmount: true },
        }),
        // Expense không có tenantId
        this.prisma.expense.aggregate({
          where: { createdAt: { gte: start, lte: end } },
          _sum: { totalAmount: true },
        }),
        this.prisma.project.count({ where: this.tenantWhere({ createdAt: { gte: start, lte: end }, deletedAt: null }) }),
        this.prisma.employee.count({ where: this.tenantWhere({ startDate: { gte: start, lte: end } }) }),
      ]);

      return {
        period: p,
        revenue:      Number(revenue._sum.totalAmount  ?? 0),
        expenses:     Number(expenses._sum.totalAmount ?? 0),
        newProjects,
        newEmployees,
      };
    };

    const current = await getPeriodData(period);
    if (!comparePeriod) return { current };

    const previous = await getPeriodData(comparePeriod);
    const delta = {
      revenue:     current.revenue  - previous.revenue,
      revenuePct:  previous.revenue > 0
        ? Math.round(((current.revenue - previous.revenue) / previous.revenue) * 100)
        : 0,
      expenses:    current.expenses - previous.expenses,
      newProjects: current.newProjects - previous.newProjects,
      newEmployees:current.newEmployees - previous.newEmployees,
    };

    return { current, previous, delta };
  }
}
