import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * HR domain: People, People-by-dept, Attendance, Attendance-trend.
 * Chỉ TÍNH — không cache (cache do DashboardService giữ).
 */
@Injectable()
export class DashboardHrProvider {
  constructor(private readonly prisma: PrismaService) {}

  async calcPeople() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      headcount,
      openPositions,
      pendingLeaves,
      expiringContracts,
      pendingTimesheetApprovals,
      pendingOvertimeRequests,
      activeContracts,
      pendingHrDecisions,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { isActive: true } }),
      this.prisma.jobOpening.count({ where: { status: 'OPEN' } }),
      this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.contract.count({
        where: { status: 'ACTIVE', endDate: { gte: now, lte: in30Days } },
      }),
      this.prisma.timesheetRecord.count({ where: { status: { in: ['SUBMITTED'] } } }),
      this.prisma.overtimeRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.contract.count({ where: { status: 'ACTIVE' } }),
      this.prisma.hrDecision.count({ where: { status: { in: ['DRAFT', 'PENDING'] } } }),
    ]);

    return {
      headcount,
      openPositions,
      pendingLeaves,
      pendingOvertimeRequests,
      expiringContracts,
      activeContracts,
      pendingHrDecisions,
      pendingTimesheetApprovals,
    };
  }

  async calcPeopleByDept() {
    const orgUnits = await this.prisma.orgUnit.findMany({
      include: { _count: { select: { employees: true } } },
      where: { employees: { some: { isActive: true } } },
      take: 50,
    });

    return orgUnits
      .map((o) => ({ dept: o.name, count: o._count.employees }))
      .sort((a, b) => b.count - a.count);
  }

  async calcAttendance() {
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

  async calcAttendanceTrend() {
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
}
