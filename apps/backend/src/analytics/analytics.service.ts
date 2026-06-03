import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { isTenantEnforced } from '../common/config/tenant.config';

const CACHE_TTL = 300; // 5 phút

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private async cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Fail-safe SaaS: key ':default' (tenantId rỗng) khi enforcement bật → KHÔNG cache
    // (tránh đụng key chéo tenant). Data vẫn đúng nhờ CLS extension scope.
    if (isTenantEnforced() && /:(default|undefined|null)$/.test(key)) return fn();
    const hit = await this.redis.get(key).catch(() => null);
    if (hit) return JSON.parse(hit) as T;
    const data = await fn();
    await this.redis.setex(key, CACHE_TTL, JSON.stringify(data)).catch(() => {});
    return data;
  }

  // ─── Overview: tổng hợp toàn bộ KPI cho lãnh đạo ──────────────────────────

  async getOverview(tenantId?: string) {
    const key = `analytics:overview:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcOverview(tenantId));
  }

  private async calcOverview(tenantId?: string) {
    const now          = new Date();
    const yearStart    = new Date(now.getFullYear(), 0, 1);
    const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const in30Days     = new Date(now.getTime() + 30 * 86_400_000);
    const in60Days     = new Date(now.getTime() + 60 * 86_400_000);
    const last30Days   = new Date(now.getTime() - 30 * 86_400_000);

    const tid = tenantId ?? null;
    const tWhere = (extra?: Record<string, unknown>) =>
      ({ ...(tid ? { tenantId: tid } : {}), ...extra }) as Record<string, unknown>;

    const [
      revenueYtdAgg,
      revenueMonthAgg,
      revenuePrevMonthAgg,
      arAgg,
      overdueInvoices,
      expenseYtdAgg,
      headcount,
      newHiresThisMonth,
      leaversThisYear,
      openLeaveRequests,
      activeProjects,
      overdueProjects,
      totalTasks,
      doneTasks,
      overdueTasks,
      openDeals,
      wonDealsThisMonth,
      pendingApprovals,
      expiringContracts30d,
      expiringContracts60d,
      budgetLines,
      okrKeyResults,
      okrObjectivesCount,
      attendanceRecords,
    ] = await Promise.all([
      // Revenue YTD
      this.prisma.invoice.aggregate({
        where: { ...tWhere(), type: 'SALES', status: 'PAID', paidAt: { gte: yearStart }, deletedAt: null },
        _sum: { totalAmount: true },
      }),
      // Revenue tháng này
      this.prisma.invoice.aggregate({
        where: { ...tWhere(), type: 'SALES', status: 'PAID', paidAt: { gte: monthStart }, deletedAt: null },
        _sum: { totalAmount: true },
      }),
      // Revenue tháng trước
      this.prisma.invoice.aggregate({
        where: { ...tWhere(), type: 'SALES', status: 'PAID', paidAt: { gte: prevMonthStart, lt: monthStart }, deletedAt: null },
        _sum: { totalAmount: true },
      }),
      // AR chờ thu
      this.prisma.invoice.aggregate({
        where: { ...tWhere(), type: 'SALES', status: { in: ['SENT', 'OVERDUE'] }, deletedAt: null },
        _sum: { totalAmount: true },
      }),
      // Invoice quá hạn
      this.prisma.invoice.findMany({
        where: { ...tWhere(), status: 'OVERDUE', deletedAt: null },
        select: { code: true, totalAmount: true, dueDate: true },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      // Chi phí YTD (PURCHASE invoices PAID)
      this.prisma.invoice.aggregate({
        where: { ...tWhere(), type: 'PURCHASE', status: 'PAID', paidAt: { gte: yearStart }, deletedAt: null },
        _sum: { totalAmount: true },
      }),
      // Headcount
      this.prisma.employee.count({ where: { ...(tid ? { tenantId: tid } : {}), isActive: true } }),
      // Nhân viên mới tháng này
      this.prisma.employee.count({ where: { ...(tid ? { tenantId: tid } : {}), startDate: { gte: monthStart } } }),
      // Nghỉ việc năm nay
      this.prisma.employee.count({ where: { ...(tid ? { tenantId: tid } : {}), endDate: { gte: yearStart, lte: now } } }),
      // Đơn nghỉ phép đang chờ duyệt
      this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      // Dự án đang hoạt động
      this.prisma.project.count({ where: { ...tWhere(), status: 'ACTIVE', deletedAt: null } }),
      // Dự án trễ deadline
      this.prisma.project.count({ where: { ...tWhere(), status: 'ACTIVE', endDate: { lt: now }, deletedAt: null } }),
      // Tổng tasks
      this.prisma.task.count({ where: tWhere() }),
      // Tasks hoàn thành
      this.prisma.task.count({ where: { ...tWhere(), status: 'DONE' } }),
      // Tasks overdue
      this.prisma.task.count({ where: { ...tWhere(), dueDate: { lt: now }, status: { notIn: ['DONE', 'CANCELLED'] } } }),
      // Deals đang mở
      this.prisma.deal.findMany({
        where: { ...tWhere(), stage: { notIn: ['WON', 'LOST'] }, deletedAt: null },
        select: { value: true, probability: true, stage: true },
        take: 2000,
      }),
      // Deals won tháng này
      this.prisma.deal.count({ where: { ...tWhere(), stage: 'WON', wonAt: { gte: monthStart }, deletedAt: null } }),
      // Phê duyệt đang chờ
      this.prisma.processUserTask.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      // Hợp đồng hết hạn trong 30 ngày
      this.prisma.contract.findMany({
        where: { ...tWhere(), endDate: { gte: now, lte: in30Days }, status: 'ACTIVE', deletedAt: null },
        include: { employee: { select: { fullName: true } } },
        orderBy: { endDate: 'asc' },
        take: 10,
      }),
      // Hợp đồng hết hạn trong 60 ngày
      this.prisma.contract.findMany({
        where: { ...tWhere(), endDate: { gte: now, lte: in60Days }, status: 'ACTIVE', deletedAt: null },
        include: { employee: { select: { fullName: true } } },
        orderBy: { endDate: 'asc' },
        take: 20,
      }),
      // Budget lines
      this.prisma.budgetLine.findMany({
        where: {},
        select: { category: true, allocatedAmount: true, usedAmount: true, alertThreshold: true },
        take: 500,
      }),
      // OKR key results để tính progress trung bình
      this.prisma.okrKeyResult.findMany({
        where: {},
        select: { targetValue: true, currentValue: true },
        take: 1000,
      }),
      // Tổng OKR objectives
      this.prisma.okrObjective.count({ where: {} }),
      // Chấm công 30 ngày gần nhất
      this.prisma.attendanceRecord.findMany({
        where: { date: { gte: last30Days } },
        select: { status: true },
        take: 10000,
      }),
    ]);

    // ── Tài chính ──────────────────────────────────────────────────────────────
    const revYtd   = Number(revenueYtdAgg._sum.totalAmount ?? 0);
    const revMonth = Number(revenueMonthAgg._sum.totalAmount ?? 0);
    const revPrev  = Number(revenuePrevMonthAgg._sum.totalAmount ?? 0);
    const expYtd   = Number(expenseYtdAgg._sum.totalAmount ?? 0);
    const arAmount = Number(arAgg._sum.totalAmount ?? 0);
    const revGrowth = revPrev > 0 ? Math.round(((revMonth - revPrev) / revPrev) * 100 * 10) / 10 : 0;
    const grossProfit = revYtd - expYtd;
    const grossMargin = revYtd > 0 ? Math.round((grossProfit / revYtd) * 100 * 10) / 10 : 0;

    // ── CRM ────────────────────────────────────────────────────────────────────
    const pipelineValue = openDeals.reduce((s, d) => {
      return s + Number(d.value ?? 0) * (d.probability ?? 50) / 100;
    }, 0);
    const stageBreakdown = openDeals.reduce((acc: Record<string, number>, d) => {
      acc[d.stage] = (acc[d.stage] ?? 0) + 1;
      return acc;
    }, {});

    // ── Nhân sự ────────────────────────────────────────────────────────────────
    const attritionRate = headcount > 0
      ? Math.round((leaversThisYear / headcount) * 100 * 10) / 10
      : 0;

    // ── Dự án ──────────────────────────────────────────────────────────────────
    const taskCompletionRate = totalTasks > 0
      ? Math.round((doneTasks / totalTasks) * 100)
      : 0;

    // ── Budget ─────────────────────────────────────────────────────────────────
    const totalAllocated = budgetLines.reduce((s, l) => s + Number(l.allocatedAmount), 0);
    const totalUsed      = budgetLines.reduce((s, l) => s + Number(l.usedAmount), 0);
    const budgetUtilization = totalAllocated > 0
      ? Math.round((totalUsed / totalAllocated) * 100)
      : 0;
    const budgetAtRisk = budgetLines
      .filter(l => {
        const alloc = Number(l.allocatedAmount);
        const used  = Number(l.usedAmount);
        return alloc > 0 && Math.round((used / alloc) * 100) >= l.alertThreshold;
      })
      .slice(0, 5)
      .map(l => ({
        lineName: l.category,
        utilization: Math.round((Number(l.usedAmount) / Number(l.allocatedAmount)) * 100),
      }));

    // ── OKR ── tính progress TB từ key results ─────────────────────────────────
    const okrProgressList = okrKeyResults
      .filter(kr => Number(kr.targetValue) > 0)
      .map(kr => Math.min(100, Math.round((Number(kr.currentValue) / Number(kr.targetValue)) * 100)));
    const okrAvgProgress = okrProgressList.length > 0
      ? Math.round(okrProgressList.reduce((s, v) => s + v, 0) / okrProgressList.length)
      : 0;

    // ── Chấm công ─────────────────────────────────────────────────────────────
    const presentDays = attendanceRecords.filter(a => a.status === 'PRESENT').length;
    const attendanceRate = attendanceRecords.length > 0
      ? Math.round((presentDays / attendanceRecords.length) * 100)
      : 0;

    // ── Cảnh báo thông minh ────────────────────────────────────────────────────
    const alerts: Array<{ type: string; level: 'error' | 'warning' | 'info'; message: string }> = [];
    if (overdueInvoices.length > 0) {
      alerts.push({ type: 'finance', level: 'error', message: `${overdueInvoices.length} hóa đơn quá hạn chưa thu` });
    }
    if (expiringContracts30d.length > 0) {
      alerts.push({ type: 'hr', level: 'error', message: `${expiringContracts30d.length} hợp đồng hết hạn trong 30 ngày` });
    }
    if (budgetAtRisk.length > 0) {
      alerts.push({ type: 'budget', level: 'warning', message: `${budgetAtRisk.length} hạng mục ngân sách vượt ngưỡng cảnh báo` });
    }
    if (overdueProjects > 0) {
      alerts.push({ type: 'project', level: 'warning', message: `${overdueProjects} dự án đang trễ deadline` });
    }
    if (overdueTasks > 0) {
      alerts.push({ type: 'task', level: 'warning', message: `${overdueTasks} công việc chưa hoàn thành đã quá hạn` });
    }
    if (pendingApprovals > 5) {
      alerts.push({ type: 'approval', level: 'info', message: `${pendingApprovals} phê duyệt đang chờ xử lý` });
    }
    if (openLeaveRequests > 0) {
      alerts.push({ type: 'leave', level: 'info', message: `${openLeaveRequests} đơn nghỉ phép chưa duyệt` });
    }

    return {
      kpis: {
        revenue:    { ytd: revYtd, thisMonth: revMonth, growth: revGrowth },
        finance:    { grossProfit, grossMargin, arOutstanding: arAmount, expenseYtd: expYtd },
        headcount:  { total: headcount, newThisMonth: newHiresThisMonth, attritionRate },
        projects:   { active: activeProjects, overdue: overdueProjects, taskCompletion: taskCompletionRate, overdueTasks },
        crm:        { pipelineValue: Math.round(pipelineValue), wonThisMonth: wonDealsThisMonth, stageBreakdown },
        budget:     { utilization: budgetUtilization, allocated: totalAllocated, used: totalUsed },
        okr:        { avgProgress: okrAvgProgress, totalObjectives: okrObjectivesCount },
        attendance: { rate: attendanceRate },
      },
      risks: {
        overdueInvoices: overdueInvoices.map(inv => ({
          code: inv.code,
          amount: Number(inv.totalAmount),
          daysOverdue: inv.dueDate
            ? Math.max(0, Math.floor((now.getTime() - inv.dueDate.getTime()) / 86_400_000))
            : 0,
        })),
        expiringContracts: expiringContracts60d.map(c => ({
          name: c.employee.fullName,
          endDate: c.endDate?.toISOString().split('T')[0] ?? null,
          daysLeft: c.endDate
            ? Math.floor((c.endDate.getTime() - now.getTime()) / 86_400_000)
            : null,
        })),
        budgetAtRisk,
        pendingApprovals,
      },
      alerts,
    };
  }

  // ─── Xu hướng doanh thu 6 tháng ────────────────────────────────────────────

  async getRevenueTrend(tenantId?: string) {
    const key = `analytics:revenue-trend:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcRevenueTrend(tenantId));
  }

  private async calcRevenueTrend(tenantId?: string) {
    const tid = tenantId ?? null;
    const now = new Date();
    const months: Array<{ month: string; start: Date; end: Date }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end:   new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
      });
    }

    const results = await Promise.all(
      months.map(m =>
        this.prisma.invoice.aggregate({
          where: {
            ...(tid ? { tenantId: tid } : {}),
            type: 'SALES',
            status: 'PAID',
            paidAt: { gte: m.start, lte: m.end },
            deletedAt: null,
          },
          _sum: { totalAmount: true },
        }),
      ),
    );

    return months.map((m, i) => ({
      month:   m.month,
      revenue: Math.round(Number(results[i]._sum.totalAmount ?? 0) / 1_000_000),
    }));
  }

  // ─── Headcount theo phòng ban ───────────────────────────────────────────────

  async getHeadcountByDept(tenantId?: string) {
    const key = `analytics:headcount-dept:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcHeadcountByDept(tenantId));
  }

  private async calcHeadcountByDept(tenantId?: string) {
    const tid = tenantId ?? null;
    const rows = await this.prisma.employee.findMany({
      where: { ...(tid ? { tenantId: tid } : {}), isActive: true },
      select: { orgUnitId: true },
      take: 5000,
    });

    const countByUnit: Record<string, number> = {};
    for (const r of rows) {
      const key = r.orgUnitId ?? '__unassigned__';
      countByUnit[key] = (countByUnit[key] ?? 0) + 1;
    }

    const orgUnitIds = Object.keys(countByUnit).filter(k => k !== '__unassigned__');
    const units = await this.prisma.orgUnit.findMany({
      where: { id: { in: orgUnitIds } },
      select: { id: true, name: true },
    });
    const unitMap = Object.fromEntries(units.map(u => [u.id, u.name]));

    return Object.entries(countByUnit)
      .map(([id, count]) => ({
        dept: id === '__unassigned__' ? 'Chưa phân bổ' : (unitMap[id] ?? id),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}
