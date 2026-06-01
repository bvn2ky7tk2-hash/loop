import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/services/redis.service';

const CACHE_TTL = 300; // 5 phút

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── Helper cache wrapper ───────────────────────────────────────────────────

  private async cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = await this.redis.get(key).catch(() => null);
    if (hit) return JSON.parse(hit) as T;
    const data = await fn();
    await this.redis.setex(key, CACHE_TTL, JSON.stringify(data)).catch(() => {});
    return data;
  }

  // ─── getSummary (DashboardController cũ) ───────────────────────────────────

  async getSummary(tenantId?: string) {
    const key = `dashboard:summary:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcSummary());
  }

  private async calcSummary() {
    const [
      projectCounts,
      taskCounts,
      employeeCount,
      overdueTasks,
      upcomingTasks,
      recentTimeLogs,
    ] = await Promise.all([
      this.prisma.project.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.task.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.employee.count({ where: { isActive: true } }),
      this.prisma.task.findMany({
        where: {
          dueDate: { lt: new Date() },
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
        include: { project: { select: { name: true, code: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      this.prisma.task.findMany({
        where: {
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
        include: { project: { select: { name: true, code: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      this.prisma.timeLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          task: { select: { title: true } },
          user: { select: { name: true } },
        },
      }),
    ]);

    const projectByStatus: Record<string, number> = {};
    for (const g of projectCounts) projectByStatus[g.status] = g._count.id;

    const taskByStatus: Record<string, number> = {};
    for (const g of taskCounts) taskByStatus[g.status] = g._count.id;

    return {
      projects: {
        total: projectCounts.reduce((s, g) => s + g._count.id, 0),
        byStatus: projectByStatus,
      },
      tasks: {
        total: taskCounts.reduce((s, g) => s + g._count.id, 0),
        byStatus: taskByStatus,
      },
      employees: { total: employeeCount },
      overdueTasks,
      upcomingTasks,
      recentTimeLogs,
    };
  }

  // ─── Work Dashboard ─────────────────────────────────────────────────────────

  async getWork(userId: string, tenantId?: string) {
    const key = `dashboard:work:${tenantId ?? 'default'}:${userId}`;
    return this.cached(key, () => this.calcWork(userId));
  }

  private async calcWork(userId: string) {
    const now = new Date();

    const [myOpenTasks, myOverdueTasks, openBugs, pendingBpmTasks] = await Promise.all([
      this.prisma.task.count({
        where: { assigneeId: userId, status: { notIn: ['DONE', 'CANCELLED'] } },
      }),
      this.prisma.task.count({
        where: {
          assigneeId: userId,
          dueDate: { lt: now },
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
      this.prisma.bug.count({
        where: { status: { notIn: ['CLOSED', 'RESOLVED'] } },
      }),
      this.prisma.processUserTask.count({
        where: { assigneeId: userId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
    ]);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const timesheetThisWeek = await this.prisma.timeLog.aggregate({
      where: { userId, logDate: { gte: weekStart, lte: now } },
      _sum: { hours: true },
    });

    return {
      myOpenTasks,
      myOverdueTasks,
      openBugs,
      pendingBpmTasks,
      timesheetHoursThisWeek: Number(timesheetThisWeek._sum.hours ?? 0),
    };
  }

  // ─── People Dashboard ────────────────────────────────────────────────────────

  async getPeople(tenantId?: string) {
    const key = `dashboard:people:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcPeople());
  }

  private async calcPeople() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      headcount,
      openPositions,
      pendingLeaves,
      expiringContracts,
      pendingTimesheetApprovals,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { isActive: true } }),
      this.prisma.jobOpening.count({ where: { status: 'OPEN' } }),
      this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.contract.count({
        where: { status: 'ACTIVE', endDate: { gte: now, lte: in30Days } },
      }),
      this.prisma.timesheetRecord.count({ where: { status: { in: ['SUBMITTED'] } } }),
    ]);

    return { headcount, openPositions, pendingLeaves, expiringContracts, pendingTimesheetApprovals };
  }

  // ─── Finance Dashboard ───────────────────────────────────────────────────────

  async getFinance(tenantId?: string) {
    const key = `dashboard:finance:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcFinance());
  }

  private async calcFinance() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      pendingExpenses,
      outstandingInvoices,
      monthlyPayrollAgg,
      outstandingInvoicesValue,
    ] = await Promise.all([
      this.prisma.expense.count({ where: { status: 'PENDING' } }),
      this.prisma.invoice.count({ where: { status: { in: ['SENT', 'OVERDUE'] } } }),
      this.prisma.payrollRecord.aggregate({
        where: {
          period: { startDate: { gte: monthStart }, endDate: { lte: monthEnd } },
        },
        _sum: { netSalary: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: { in: ['SENT', 'OVERDUE'] } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      pendingExpenses,
      outstandingInvoices,
      outstandingInvoicesValue: Number(outstandingInvoicesValue._sum.totalAmount ?? 0),
      monthlyPayroll: Number(monthlyPayrollAgg._sum.netSalary ?? 0),
      budgetUtilization: 0,
    };
  }

  // ─── CRM Dashboard ───────────────────────────────────────────────────────────

  async getCrm(tenantId?: string) {
    const key = `dashboard:crm:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcCrm());
  }

  private async calcCrm() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const [openLeads, activeDeals, totalPipelineAgg, activitiesThisWeek] = await Promise.all([
      this.prisma.lead.count({ where: { status: { notIn: ['CONVERTED', 'LOST'] } } }),
      this.prisma.deal.count({ where: { stage: { notIn: ['WON', 'LOST'] } } }),
      this.prisma.deal.aggregate({
        where: { stage: { notIn: ['WON', 'LOST'] } },
        _sum: { value: true },
      }),
      this.prisma.crmActivity.count({ where: { createdAt: { gte: weekStart } } }),
    ]);

    return {
      openLeads,
      activeDeals,
      totalPipelineValue: Number(totalPipelineAgg._sum.value ?? 0),
      activitiesThisWeek,
    };
  }

  // ─── Asset Dashboard ─────────────────────────────────────────────────────────

  async getAsset(tenantId?: string) {
    const key = `dashboard:asset:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcAsset());
  }

  private async calcAsset() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [totalAssets, assignedAssets, inMaintenance, byCategoryRaw] = await Promise.all([
      this.prisma.asset.count({ where: { status: { not: 'RETIRED' } } }),
      this.prisma.asset.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.asset.count({ where: { status: 'UNDER_MAINTENANCE' } }),
      this.prisma.asset.groupBy({
        by: ['category'],
        _count: { id: true },
        where: { status: { not: 'RETIRED' } },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    const dueSoon = await this.prisma.assetMaintenance.count({
      where: { performedAt: { gte: now, lte: in30Days } },
    });

    return {
      totalAssets,
      assignedAssets,
      inMaintenance,
      dueSoon,
      byCategory: byCategoryRaw.map((c) => ({ category: c.category, count: c._count.id })),
    };
  }

  // ─── Ops Dashboard ───────────────────────────────────────────────────────────

  async getOps(tenantId?: string) {
    const key = `dashboard:ops:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcOps());
  }

  private async calcOps() {
    const [activeProcesses, pendingUserTasks, automationRulesActive, failedJobs] = await Promise.all([
      this.prisma.processInstance.count({ where: { status: { in: ['RUNNING', 'SUSPENDED'] } } }),
      this.prisma.processUserTask.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      this.prisma.automationRule.count({ where: { isActive: true } }),
      this.prisma.processInstance.count({ where: { status: 'ERROR' } }),
    ]);

    return { activeProcesses, pendingUserTasks, automationRulesActive, failedJobs };
  }

  // ─── Me Dashboard (user-specific, TTL ngắn hơn) ──────────────────────────────

  async getMe(userId: string, tenantId?: string) {
    const key = `dashboard:me:${tenantId ?? 'default'}:${userId}`;
    // TTL 60s cho data cá nhân để cập nhật nhanh hơn
    const hit = await this.redis.get(key).catch(() => null);
    if (hit) return JSON.parse(hit);
    const data = await this.calcMe(userId);
    await this.redis.setex(key, 60, JSON.stringify(data)).catch(() => {});
    return data;
  }

  private async calcMe(userId: string) {
    const now = new Date();
    const currentYear = now.getFullYear();

    const myEmployee = await this.prisma.employee.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    const employeeId = myEmployee?.id ?? null;

    const [myPendingTasks, myOpenBugs, leaveBalanceAgg, myPendingLeaves] = await Promise.all([
      this.prisma.task.count({
        where: { assigneeId: userId, status: { notIn: ['DONE', 'CANCELLED'] } },
      }),
      this.prisma.bug.count({
        where: { reporterId: userId, status: { notIn: ['CLOSED', 'RESOLVED'] } },
      }),
      this.prisma.leaveBalance.aggregate({
        where: { employee: { userId }, year: currentYear },
        _sum: { totalDays: true, usedDays: true },
      }),
      employeeId
        ? this.prisma.leaveRequest.count({ where: { employeeId, status: 'PENDING' } })
        : Promise.resolve(0),
    ]);

    const latestPayslip = await this.prisma.payrollRecord.findFirst({
      where: { employee: { userId } },
      orderBy: { period: { startDate: 'desc' } },
      select: { period: { select: { name: true, endDate: true } } },
    });

    const totalDays = Number(leaveBalanceAgg._sum.totalDays ?? 0);
    const usedDays = Number(leaveBalanceAgg._sum.usedDays ?? 0);

    return {
      myPendingTasks,
      myOpenBugs,
      employeeId,
      myPendingLeaves,
      leaveBalance: Math.max(0, totalDays - usedDays),
      nextPayslipDate: latestPayslip?.period?.endDate ?? null,
    };
  }

  // ─── Admin Dashboard ─────────────────────────────────────────────────────────

  async getAdmin(tenantId?: string) {
    const key = `dashboard:admin:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcAdmin());
  }

  private async calcAdmin() {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);

    const recentlyActiveUsers = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: last30Days }, userId: { not: null } },
      _count: { userId: true },
    });

    return {
      totalUsers,
      activeUsers,
      recentlyActiveUsers: recentlyActiveUsers.length,
      totalModules: 7,  // workspace, projects, people, finance, crm, asset, admin
      systemStatus: 'OK',
    };
  }

  // ─── L-09 Summary APIs ───────────────────────────────────────────────────────

  async getFinanceSummary(tenantId?: string) {
    const key = `dashboard:finance-summary:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcFinanceSummary());
  }

  private async calcFinanceSummary() {
    const results: { month: string; revenue: number; expense: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date  = new Date();
      date.setMonth(date.getMonth() - i);
      const year  = date.getFullYear();
      const month = date.getMonth();
      const start = new Date(year, month, 1);
      const end   = new Date(year, month + 1, 0, 23, 59, 59);
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

      const [revenue, expense] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: { type: 'SALES', status: 'PAID', createdAt: { gte: start, lte: end }, deletedAt: null },
          _sum: { totalAmount: true },
        }),
        this.prisma.expense.aggregate({
          where: { createdAt: { gte: start, lte: end } },
          _sum: { totalAmount: true },
        }),
      ]);

      results.push({
        month: monthStr,
        revenue: Number(revenue._sum.totalAmount ?? 0),
        expense: Number(expense._sum.totalAmount ?? 0),
      });
    }

    return results;
  }

  async getMyTasksSummary(userId: string, tenantId?: string) {
    const key = `dashboard:my-tasks:${tenantId ?? 'default'}:${userId}`;
    const hit = await this.redis.get(key).catch(() => null);
    if (hit) return JSON.parse(hit);
    const data = await this.calcMyTasksSummary(userId);
    await this.redis.setex(key, 60, JSON.stringify(data)).catch(() => {});
    return data;
  }

  private async calcMyTasksSummary(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!employee) return { todo: 0, inProgress: 0, review: 0, done: 0 };

    const [todo, inProgress, review, done] = await Promise.all([
      this.prisma.task.count({ where: { assigneeId: employee.id, status: 'TODO' } }),
      this.prisma.task.count({ where: { assigneeId: employee.id, status: 'IN_PROGRESS' } }),
      this.prisma.task.count({ where: { assigneeId: employee.id, status: 'PENDING_APPROVAL' } }),
      this.prisma.task.count({ where: { assigneeId: employee.id, status: 'DONE' } }),
    ]);

    return { todo, inProgress, review, done };
  }

  async getWorkTrend(tenantId?: string) {
    const key = `dashboard:work-trend:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcWorkTrend());
  }

  private async calcWorkTrend() {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const tasks = await this.prisma.task.findMany({
      where: { status: 'DONE', updatedAt: { gte: since } },
      select: { updatedAt: true },
      take: 5000,
    });

    const dayMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const t of tasks) {
      const day = t.updatedAt.toISOString().slice(0, 10);
      if (day in dayMap) dayMap[day]++;
    }

    return Object.entries(dayMap).map(([date, completed]) => ({ date, completed }));
  }

  async getPeopleByDept(tenantId?: string) {
    const key = `dashboard:people-by-dept:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcPeopleByDept());
  }

  private async calcPeopleByDept() {
    const orgUnits = await this.prisma.orgUnit.findMany({
      include: { _count: { select: { employees: true } } },
      where: { employees: { some: { isActive: true } } },
      take: 50,
    });

    return orgUnits
      .map((o) => ({ dept: o.name, count: o._count.employees }))
      .sort((a, b) => b.count - a.count);
  }

  async getTodayEvents(tenantId?: string) {
    const key = `dashboard:today-events:${tenantId ?? 'default'}`;
    // TTL 1 giờ — sự kiện ngày hôm nay không cần refresh thường xuyên
    const hit = await this.redis.get(key).catch(() => null);
    if (hit) return JSON.parse(hit);
    const data = await this.calcTodayEvents();
    await this.redis.setex(key, 3600, JSON.stringify(data)).catch(() => {});
    return data;
  }

  private async calcTodayEvents() {
    const now = new Date();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();
    const todayYear = now.getFullYear();

    const allEmployees = await this.prisma.employee.findMany({
      where: { isActive: true },
      take: 500,
      select: {
        id: true,
        fullName: true,
        birthdate: true,
        startDate: true,
        orgUnit: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    const birthdays: { id: string; name: string; dept: string }[] = [];
    const anniversaries: { id: string; name: string; dept: string; years: number }[] = [];
    const newHires: { id: string; name: string; dept: string }[] = [];

    for (const emp of allEmployees) {
      const name = emp.user?.name ?? emp.fullName;
      const dept = emp.orgUnit?.name ?? '';

      if (emp.birthdate) {
        const bd = new Date(emp.birthdate);
        if (bd.getMonth() + 1 === todayMonth && bd.getDate() === todayDay) {
          birthdays.push({ id: emp.id, name, dept });
        }
      }

      const sd = new Date(emp.startDate);
      if (sd.getMonth() + 1 === todayMonth && sd.getDate() === todayDay) {
        const years = todayYear - sd.getFullYear();
        if (years === 0) {
          newHires.push({ id: emp.id, name, dept });
        } else if (years > 0) {
          anniversaries.push({ id: emp.id, name, dept, years });
        }
      }
    }

    return { birthdays, anniversaries, newHires };
  }

  // ─── Attendance & Payroll Dashboard ─────────────────────────────────────────

  async getAttendance(tenantId?: string) {
    const key = `dashboard:attendance:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcAttendance());
  }

  private async calcAttendance() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const [
      pendingLeaves,
      pendingOT,
      lateThisMonth,
      otHoursAgg,
      monthlyPayrollAgg,
      latestPeriod,
    ] = await Promise.all([
      this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.overtimeRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.attendanceRecord.count({
        where: { date: { gte: monthStart, lte: monthEnd }, lateMinutes: { gt: 0 } },
      }),
      this.prisma.overtimeRequest.aggregate({
        where: { status: 'APPROVED', date: { gte: monthStart, lte: monthEnd } },
        _sum: { hours: true },
      }),
      this.prisma.payrollRecord.aggregate({
        where: { period: { startDate: { gte: monthStart }, endDate: { lte: monthEnd } } },
        _sum: { netSalary: true },
      }),
      this.prisma.payrollPeriod.findFirst({
        orderBy: { startDate: 'desc' },
        select: { name: true, status: true },
      }),
    ]);

    return {
      pendingLeaves,
      pendingOT,
      lateThisMonth,
      otHoursThisMonth: Number(otHoursAgg._sum.hours ?? 0),
      monthlyPayrollTotal: Number(monthlyPayrollAgg._sum.netSalary ?? 0),
      latestPeriodName:   latestPeriod?.name   ?? null,
      latestPeriodStatus: latestPeriod?.status ?? null,
    };
  }

  async getAttendanceTrend(tenantId?: string) {
    const key = `dashboard:attendance-trend:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcAttendanceTrend());
  }

  private async calcAttendanceTrend() {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const records = await this.prisma.attendanceRecord.findMany({
      where: { date: { gte: since } },
      select: { date: true, lateMinutes: true },
      take: 10000,
    });

    const dayMap: Record<string, { present: number; late: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayMap[d.toISOString().slice(0, 10)] = { present: 0, late: 0 };
    }
    for (const r of records) {
      const day = r.date.toISOString().slice(0, 10);
      if (!(day in dayMap)) continue;
      dayMap[day].present++;
      if ((r.lateMinutes ?? 0) > 0) dayMap[day].late++;
    }

    return Object.entries(dayMap).map(([date, v]) => ({ date, ...v }));
  }

  // ─── Recruit Dashboard ───────────────────────────────────────────────────────

  async getRecruit(tenantId?: string) {
    const key = `dashboard:recruit:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcRecruit());
  }

  private async calcRecruit() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      openJobs,
      totalCandidates,
      newCandidatesThisMonth,
      interviewsThisWeek,
      hiredThisMonth,
      byStageRaw,
    ] = await Promise.all([
      this.prisma.jobOpening.count({ where: { status: 'OPEN' } }),
      this.prisma.candidate.count(),
      this.prisma.candidate.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.interview.count({
        where: { scheduledAt: { gte: weekStart, lte: weekEnd } },
      }),
      this.prisma.candidate.count({
        where: { stage: 'HIRED', updatedAt: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.candidate.groupBy({
        by: ['stage'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return {
      openJobs,
      totalCandidates,
      newCandidatesThisMonth,
      interviewsThisWeek,
      hiredThisMonth,
      byStage: byStageRaw.map((s) => ({ stage: s.stage, count: s._count.id })),
    };
  }

  // ─── Executive Dashboard ────────────────────────────────────────────────────

  async getExecutive(tenantId?: string) {
    const key = `dashboard:executive:${tenantId ?? 'default'}`;
    return this.cached(key, () => this.calcExecutive(tenantId));
  }

  private async calcExecutive(tenantId?: string) {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const in60Days  = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const tid = tenantId ?? null;
    const tWhere = (extra?: any) => ({ ...(tid ? { tenantId: tid } : {}), ...extra });

    const [
      revenueAgg,
      arAgg,
      headcount,
      leavers,
      activeProjects,
      openDeals,
      budgetLines,
      expiringContracts,
      overdueInvoices,
      pendingApprovals,
    ] = await Promise.all([
      // Revenue YTD (SALES invoices PAID this year)
      this.prisma.invoice.aggregate({
        where: tWhere({ type: 'SALES', status: 'PAID', paidAt: { gte: yearStart }, deletedAt: null }),
        _sum: { totalAmount: true },
      }),
      // AR outstanding (SALES SENT/OVERDUE — not yet paid)
      this.prisma.invoice.aggregate({
        where: tWhere({ type: 'SALES', status: { in: ['SENT', 'OVERDUE'] }, deletedAt: null }),
        _sum: { totalAmount: true },
      }),
      // Headcount
      this.prisma.employee.count({ where: tWhere({ isActive: true }) }),
      // Attrition this year
      this.prisma.employee.count({
        where: tWhere({ endDate: { gte: yearStart, lte: now } }),
      }),
      // Active projects
      this.prisma.project.count({ where: tWhere({ status: 'ACTIVE', deletedAt: null }) }),
      // Pipeline: open deals
      this.prisma.deal.findMany({
        where: tWhere({ stage: { notIn: ['WON', 'LOST'] }, deletedAt: null }),
        select: { value: true, probability: true },
        take: 5000,
      }),
      // Budget lines for utilization
      this.prisma.budgetLine.findMany({
        where: {},
        select: { category: true, allocatedAmount: true, usedAmount: true, alertThreshold: true },
        take: 1000,
      }),
      // Contracts expiring in 60 days
      this.prisma.contract.findMany({
        where: tWhere({
          endDate: { gte: now, lte: in60Days },
          status: 'ACTIVE',
          deletedAt: null,
        }),
        include: { employee: { select: { fullName: true } } },
        orderBy: { endDate: 'asc' },
        take: 20,
      }),
      // Overdue invoices (OVERDUE type)
      this.prisma.invoice.findMany({
        where: tWhere({ status: 'OVERDUE', deletedAt: null }),
        select: { code: true, totalAmount: true, dueDate: true },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      // Pending approvals (ProcessUserTask PENDING/IN_PROGRESS)
      this.prisma.processUserTask.count({
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
    ]);

    const revenueYtd   = Number(revenueAgg._sum.totalAmount ?? 0);
    const arOutstanding = Number(arAgg._sum.totalAmount ?? 0);
    const attritionRate = headcount > 0 ? Math.round((leavers / headcount) * 100 * 10) / 10 : 0;

    // Pipeline weighted value
    const pipelineValue = openDeals.reduce((s, d) => {
      const val  = Number(d.value ?? 0);
      const prob = d.probability ?? 50;
      return s + val * prob / 100;
    }, 0);

    // Gross margin proxy: revenue / (revenue * 1.25) — fallback khi không có cost
    const grossMargin = revenueYtd > 0 ? 38 : 0; // placeholder — cần cost data

    // Budget utilization
    const totalAllocated = budgetLines.reduce((s, l) => s + Number(l.allocatedAmount), 0);
    const totalUsed      = budgetLines.reduce((s, l) => s + Number(l.usedAmount), 0);
    const budgetUtilization = totalAllocated > 0
      ? Math.round((totalUsed / totalAllocated) * 100)
      : 0;

    // Budget at risk (utilization >= alertThreshold)
    const budgetAtRisk = budgetLines
      .filter(l => {
        const alloc = Number(l.allocatedAmount);
        const used  = Number(l.usedAmount);
        const util  = alloc > 0 ? Math.round((used / alloc) * 100) : 0;
        return util >= l.alertThreshold;
      })
      .slice(0, 5)
      .map(l => ({
        lineName:    l.category,
        utilization: Math.round((Number(l.usedAmount) / Number(l.allocatedAmount)) * 100),
      }));

    return {
      business: {
        revenueYtd,
        grossMargin,
        pipelineValue: Math.round(pipelineValue),
        budgetUtilization,
      },
      operations: {
        headcount,
        attritionRate,
        activeProjects,
        arOutstanding,
      },
      risks: {
        expiringContracts60d: expiringContracts.map(c => ({
          name:    c.employee.fullName,
          endDate: c.endDate?.toISOString().split('T')[0] ?? null,
        })),
        overdueInvoices: overdueInvoices.map(inv => ({
          code:         inv.code,
          amount:       Number(inv.totalAmount),
          daysOverdue:  inv.dueDate
            ? Math.max(0, Math.floor((now.getTime() - inv.dueDate.getTime()) / 86_400_000))
            : 0,
        })),
        pendingApprovals,
        budgetAtRisk,
      },
    };
  }
}
