import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MemberCost {
  employeeId: string;
  fullName: string;
  allocationRole: string;
  ratePerDay: number;
  actualHours: number;
  cost: number;
}

export interface CostSummary {
  projectId: string;
  projectName: string;
  startDate: string;
  endDate: string;
  budgetEffortMm: number | null;
  totalEstimateHours: number;
  totalActualHours: number;
  totalCost: number;
  completionPct?: number;
  plannedValue?: number;
  members: MemberCost[];
}

@Injectable()
export class CostService {
  constructor(private readonly prisma: PrismaService) {}

  async getProjectCost(projectId: string): Promise<CostSummary> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            employee: { select: { id: true, fullName: true } },
          },
        },
        tasks: { select: { estimateHours: true, actualHours: true } },
      },
    });

    if (!project) throw new NotFoundException('Không tìm thấy dự án');

    const totalEstimateHours = project.tasks.reduce(
      (s: number, t) => s + Number(t.estimateHours),
      0,
    );
    const totalActualHours = project.tasks.reduce(
      (s: number, t) => s + Number(t.actualHours),
      0,
    );

    const members: MemberCost[] = await Promise.all(
      project.members.map(async (alloc) => {
        const rate = Number(alloc.ratePerDay ?? 0);
        const loggedHours = await this.getEmployeeLoggedHours(
          alloc.employeeId,
          projectId,
        );
        const hoursPerDay = 8;
        const cost = (loggedHours / hoursPerDay) * rate;

        return {
          employeeId: alloc.employeeId,
          fullName: alloc.employee.fullName,
          allocationRole: alloc.role,
          ratePerDay: rate,
          actualHours: loggedHours,
          cost: Math.round(cost * 100) / 100,
        };
      }),
    );

    const totalCost = members.reduce((s, m) => s + m.cost, 0);

    return {
      projectId: project.id,
      projectName: project.name,
      startDate: project.startDate.toISOString().split('T')[0],
      endDate: project.endDate.toISOString().split('T')[0],
      budgetEffortMm: project.budgetEffortMm ? Number(project.budgetEffortMm) : null,
      totalEstimateHours,
      totalActualHours,
      totalCost: Math.round(totalCost * 100) / 100,
      completionPct: totalEstimateHours > 0
        ? Math.round((totalActualHours / totalEstimateHours) * 100)
        : 0,
      plannedValue: totalEstimateHours * 0.8,
      members,
    };
  }

  async getTimeLogs(
    projectId: string,
    from?: string,
    to?: string,
  ) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      select: { id: true },
    });
    const taskIds = tasks.map((t) => t.id);

    return this.prisma.timeLog.findMany({
      where: {
        taskId: { in: taskIds },
        ...(from && { logDate: { gte: new Date(from) } }),
        ...(to && { logDate: { lte: new Date(to) } }),
      },
      include: {
        task: { select: { id: true, title: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { logDate: 'desc' },
      take: 5000,
    });
  }

  private async getEmployeeLoggedHours(
    employeeId: string,
    projectId: string,
  ): Promise<number> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { userId: true },
    });
    if (!employee?.userId) return 0;

    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      select: { id: true },
    });
    const taskIds = tasks.map((t) => t.id);

    const logs = await this.prisma.timeLog.findMany({
      where: { userId: employee.userId, taskId: { in: taskIds } },
      select: { hours: true },
      take: 10000,
    });

    return logs.reduce((s, l) => s + Number(l.hours), 0);
  }
}
