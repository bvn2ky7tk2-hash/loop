import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';

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

@Injectable({ scope: Scope.REQUEST })
export class CostService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async getProjectCost(projectId: string): Promise<CostSummary> {
    const project = await this.prisma.project.findUnique({
      where: this.tenantWhere({ id: projectId }),
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

    const loggedHoursByEmployee = await this.getLoggedHoursForMembers(
      project.members.map((m) => m.employeeId),
      projectId,
    );

    const members: MemberCost[] = project.members.map((alloc) => {
      const rate = Number(alloc.ratePerDay ?? 0);
      const loggedHours = loggedHoursByEmployee.get(alloc.employeeId) ?? 0;
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
    });

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
      where: this.tenantWhere({ projectId }),
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
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
  }

  private async getLoggedHoursForMembers(
    employeeIds: string[],
    projectId: string,
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (employeeIds.length === 0) return result;

    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, userId: true },
    });

    const userIdByEmployee = new Map<string, string>();
    const employeeByUserId = new Map<string, string[]>();
    for (const emp of employees) {
      if (!emp.userId) continue;
      userIdByEmployee.set(emp.id, emp.userId);
      const list = employeeByUserId.get(emp.userId) ?? [];
      list.push(emp.id);
      employeeByUserId.set(emp.userId, list);
    }

    const userIds = [...employeeByUserId.keys()];
    if (userIds.length === 0) return result;

    const tasks = await this.prisma.task.findMany({
      where: this.tenantWhere({ projectId }),
      select: { id: true },
    });
    const taskIds = tasks.map((t) => t.id);

    const grouped = await this.prisma.timeLog.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, taskId: { in: taskIds } },
      _sum: { hours: true },
    });

    for (const g of grouped) {
      const hours = Number(g._sum.hours ?? 0);
      for (const empId of employeeByUserId.get(g.userId) ?? []) {
        result.set(empId, hours);
      }
    }

    return result;
  }

}
