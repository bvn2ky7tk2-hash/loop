import { Injectable, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { ProjectStatus, InvoiceType, InvoiceStatus, TaskStatus } from '../generated/prisma';

@Injectable({ scope: Scope.REQUEST })
export class ProjectAnalyticsService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async getSummary() {
    const now = new Date();

    const [
      activeProjects,
      completedProjects,
      overdueTasks,
      revenueAgg,
    ] = await Promise.all([
      this.prisma.project.count({
        where: this.tenantWhere({ status: ProjectStatus.ACTIVE, deletedAt: null }),
      }),
      this.prisma.project.count({
        where: this.tenantWhere({ status: ProjectStatus.CLOSED, deletedAt: null }),
      }),
      this.prisma.task.count({
        where: this.tenantWhere({
          dueDate: { lt: now },
          status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
        }),
      }),
      // Doanh thu từ invoices SALES đã PAID
      this.prisma.invoice.aggregate({
        where: this.tenantWhere({
          type:     InvoiceType.SALES,
          status:   InvoiceStatus.PAID,
          deletedAt: null,
        }),
        _sum: { totalAmount: true },
      }),
    ]);

    // Tính gross margin và utilization
    // Gross margin = (revenue - total_labor_cost) / revenue * 100
    const totalRevenue = Number((revenueAgg as any)._sum?.totalAmount ?? 0);

    // Tổng labor cost từ payroll records (aggregate theo tenant)
    const tid2 = this.getTenantId();
    const laborCostAgg = await this.prisma.payrollRecord.aggregate({
      where: tid2 ? ({ tenantId: tid2 } as any) : undefined,
      _sum: { totalLaborCost: true },
    });
    const totalLaborCost = Number((laborCostAgg as any)._sum?.totalLaborCost ?? 0);

    const grossMarginPct =
      totalRevenue > 0
        ? Math.round(((totalRevenue - totalLaborCost) / totalRevenue) * 100 * 10) / 10
        : 0;

    // Utilization: giờ log / giờ khả dụng (employees active * working days * 8h)
    const activeEmployeeCount = await this.prisma.employee.count({
      where: this.tenantWhere({ isActive: true, deletedAt: null }),
    });

    // Giờ timeLog tháng này
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const hoursAgg = await this.prisma.timeLog.aggregate({
      where: { logDate: { gte: monthStart } },
      _sum: { hours: true },
    });
    const actualHours = Number(hoursAgg._sum.hours ?? 0);

    // Số ngày làm việc trong tháng
    let workingDays = 0;
    const d = new Date(monthStart);
    while (d <= now) {
      if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
      d.setDate(d.getDate() + 1);
    }
    const availableHours = activeEmployeeCount * workingDays * 8;
    const avgUtilization =
      availableHours > 0 ? Math.round((actualHours / availableHours) * 100) : 0;

    return {
      activeProjects,
      completedProjects: completedProjects,
      totalRevenue,
      grossMarginPct,
      avgUtilization,
      overdueTasks,
    };
  }

  async getPortfolio() {
    const projects = await this.prisma.project.findMany({
      where: this.tenantWhere({
        status: { in: [ProjectStatus.ACTIVE, ProjectStatus.CLOSED] },
        deletedAt: null,
      }),
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        startDate: true,
        endDate: true,
        budgetCost: true,
        progress: true,
        tasks: {
          select: { actualHours: true },
        },
        _count: { select: { members: true } },
      },
      take: 500,
    });

    // Lấy revenue theo từng project
    const projectIds = projects.map((p) => p.id);
    const invoicesByProject = await this.prisma.invoice.groupBy({
      by: ['projectId'],
      where: this.tenantWhere({
        projectId: { in: projectIds },
        type:   InvoiceType.SALES,
        status: InvoiceStatus.PAID,
        deletedAt: null,
      }),
      _sum: { totalAmount: true },
    });
    const revenueMap = Object.fromEntries(
      invoicesByProject.map((r) => [r.projectId, Number(r._sum.totalAmount ?? 0)]),
    );

    return projects.map((p) => {
      const revenue    = revenueMap[p.id] ?? 0;
      const cost       = Number(p.budgetCost ?? 0);
      const margin     = revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100 * 10) / 10 : 0;
      const actualHours = p.tasks.reduce((s, t) => s + Number(t.actualHours), 0);

      // Duration in days
      const duration =
        Math.round(
          (p.endDate.getTime() - p.startDate.getTime()) / (1000 * 60 * 60 * 24),
        );

      return {
        id: p.id,
        name: p.name,
        code: p.code,
        status: p.status,
        revenue,
        cost,
        margin,
        duration,
        actualHours,
        memberCount: p._count.members,
        progress: Number(p.progress),
      };
    });
  }
}
