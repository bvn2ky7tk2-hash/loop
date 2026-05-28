import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
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
}
