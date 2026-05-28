import { Controller, Get, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('dashboard-v3')
@ApiBearerAuth()
@Controller('api/v1/dashboard')
export class DashboardV3Controller {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Work Dashboard ────────────────────────────────────────────────────────
  @Get('work')
  @ApiOperation({ summary: 'Dashboard Công việc (Work module)' })
  async getWork(@Request() req: any) {
    const userId: string = req.user?.sub ?? req.user?.id ?? '';

    const now = new Date();

    const [
      myOpenTasks,
      myOverdueTasks,
      openBugs,
      pendingBpmTasks,
    ] = await Promise.all([
      this.prisma.task.count({
        where: {
          assigneeId: userId,
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
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
        where: {
          assigneeId: userId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      }),
    ]);

    // Timesheet status cho tuần hiện tại
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const timesheetThisWeek = await this.prisma.timeLog.aggregate({
      where: {
        userId,
        logDate: { gte: weekStart, lte: now },
      },
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

  // ─── People Dashboard ──────────────────────────────────────────────────────
  @Get('people')
  @ApiOperation({ summary: 'Dashboard Nhân sự (People module)' })
  async getPeople() {
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
        where: {
          status: 'ACTIVE',
          endDate: { gte: now, lte: in30Days },
        },
      }),
      this.prisma.timesheetRecord.count({
        where: { status: { in: ['SUBMITTED'] } },
      }),
    ]);

    return {
      headcount,
      openPositions,
      pendingLeaves,
      expiringContracts,
      pendingTimesheetApprovals,
    };
  }

  // ─── Finance Dashboard ─────────────────────────────────────────────────────
  @Get('finance')
  @ApiOperation({ summary: 'Dashboard Tài chính (Finance module)' })
  async getFinance() {
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
      this.prisma.invoice.count({
        where: { status: { in: ['SENT', 'OVERDUE'] } },
      }),
      this.prisma.payrollRecord.aggregate({
        where: {
          period: {
            startDate: { gte: monthStart },
            endDate: { lte: monthEnd },
          },
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
      budgetUtilization: 0, // TODO: khi có Budget model
    };
  }

  // ─── CRM Dashboard ─────────────────────────────────────────────────────────
  @Get('crm')
  @ApiOperation({ summary: 'Dashboard CRM' })
  async getCrm() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const [
      openLeads,
      activeDeals,
      totalPipelineAgg,
      activitiesThisWeek,
    ] = await Promise.all([
      this.prisma.lead.count({
        where: { status: { notIn: ['CONVERTED', 'LOST'] } },
      }),
      this.prisma.deal.count({
        where: { stage: { notIn: ['WON', 'LOST'] } },
      }),
      this.prisma.deal.aggregate({
        where: { stage: { notIn: ['WON', 'LOST'] } },
        _sum: { value: true },
      }),
      this.prisma.crmActivity.count({
        where: { createdAt: { gte: weekStart } },
      }),
    ]);

    return {
      openLeads,
      activeDeals,
      totalPipelineValue: Number(totalPipelineAgg._sum.value ?? 0),
      activitiesThisWeek,
    };
  }

  // ─── Asset Dashboard ───────────────────────────────────────────────────────
  @Get('asset')
  @ApiOperation({ summary: 'Dashboard Tài sản (Asset module)' })
  async getAsset() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalAssets,
      assignedAssets,
      inMaintenance,
    ] = await Promise.all([
      this.prisma.asset.count({ where: { status: { not: 'RETIRED' } } }),
      this.prisma.asset.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.asset.count({ where: { status: 'UNDER_MAINTENANCE' } }),
    ]);

    // Tài sản được bảo trì trong 30 ngày tới (dự kiến)
    // AssetMaintenance lưu performedAt lịch sử; đếm AVAILABLE sắp hết hạn khấu hao thay thế
    const dueSoon = await this.prisma.assetMaintenance.count({
      where: {
        performedAt: { gte: now, lte: in30Days },
      },
    });

    return {
      totalAssets,
      assignedAssets,
      inMaintenance,
      dueSoon,
    };
  }

  // ─── Ops Dashboard ─────────────────────────────────────────────────────────
  @Get('ops')
  @ApiOperation({ summary: 'Dashboard Vận hành (Ops module)' })
  async getOps() {
    const [
      activeProcesses,
      pendingUserTasks,
      automationRulesActive,
      failedJobs,
    ] = await Promise.all([
      this.prisma.processInstance.count({
        where: { status: { in: ['RUNNING', 'SUSPENDED'] } },
      }),
      this.prisma.processUserTask.count({
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      }),
      this.prisma.automationRule.count({ where: { isActive: true } }),
      this.prisma.processInstance.count({ where: { status: 'ERROR' } }),
    ]);

    return {
      activeProcesses,
      pendingUserTasks,
      automationRulesActive,
      failedJobs,
    };
  }

  // ─── Me Dashboard ──────────────────────────────────────────────────────────
  @Get('me')
  @ApiOperation({ summary: 'Dashboard Cá nhân (Me module)' })
  async getMe(@Request() req: any) {
    const userId: string = req.user?.sub ?? req.user?.id ?? '';

    const now = new Date();
    const currentYear = now.getFullYear();

    const [
      myPendingTasks,
      myOpenBugs,
      leaveBalanceAgg,
    ] = await Promise.all([
      this.prisma.task.count({
        where: {
          assigneeId: userId,
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
      this.prisma.bug.count({
        where: {
          reporterId: userId,
          status: { notIn: ['CLOSED', 'RESOLVED'] },
        },
      }),
      this.prisma.leaveBalance.aggregate({
        where: {
          employee: { userId },
          year: currentYear,
        },
        _sum: { totalDays: true, usedDays: true },
      }),
    ]);

    // Payslip gần nhất
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
      leaveBalance: Math.max(0, totalDays - usedDays),
      nextPayslipDate: latestPayslip?.period?.endDate ?? null,
    };
  }

  // ─── Admin Dashboard ───────────────────────────────────────────────────────
  @Get('admin')
  @ApiOperation({ summary: 'Dashboard Quản trị (Admin module)' })
  async getAdmin() {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { isActive: true },
      }),
    ]);

    // Users đăng nhập trong 30 ngày (dựa vào audit log nếu có, hoặc updatedAt)
    const recentlyActiveUsers = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: last30Days },
        userId: { not: null },
      },
      _count: { userId: true },
    });

    return {
      totalUsers,
      activeUsers,
      recentlyActiveUsers: recentlyActiveUsers.length,
      totalModules: 8, // 8 persona modules
      systemStatus: 'OK',
    };
  }
}
