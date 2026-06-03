import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Work domain: Summary, Work, Work-trend, My-tasks-summary, Me. */
@Injectable()
export class DashboardWorkProvider {
  constructor(private readonly prisma: PrismaService) {}

  async calcSummary() {
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

  async calcWork(userId: string) {
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

  async calcWorkTrend() {
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

  async calcMyTasksSummary(userId: string) {
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

  async calcMe(userId: string) {
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
}
