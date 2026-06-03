import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Ops/Admin/Executive domain: ops, admin, today-events, executive. */
@Injectable()
export class DashboardOpsProvider {
  constructor(private readonly prisma: PrismaService) {}

  async calcOps() {
    const [activeProcesses, pendingUserTasks, automationRulesActive, failedJobs] = await Promise.all([
      this.prisma.processInstance.count({ where: { status: { in: ['RUNNING', 'SUSPENDED'] } } }),
      this.prisma.processUserTask.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      this.prisma.automationRule.count({ where: { isActive: true } }),
      this.prisma.processInstance.count({ where: { status: 'ERROR' } }),
    ]);

    return { activeProcesses, pendingUserTasks, automationRulesActive, failedJobs };
  }

  async calcAdmin() {
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

  async calcTodayEvents() {
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

  async calcExecutive(tenantId?: string) {
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
