import { Injectable, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { PayrollPeriodType, OtStatus } from '../generated/prisma';

@Injectable({ scope: Scope.REQUEST })
export class PayrollAnalyticsService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async getSummary() {
    const now       = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const tid        = this.getTenantId();

    // Lấy period tháng này (gần nhất đã PAID hoặc APPROVED)
    const currentPeriod = await this.prisma.payrollPeriod.findFirst({
      where: this.tenantWhere({
        startDate: { lte: monthEnd },
        endDate:   { gte: monthStart },
      }),
      orderBy: { startDate: 'desc' },
    });

    if (!currentPeriod) {
      return {
        totalPayrollCost: 0,
        totalLaborCost: 0,
        otCostThisMonth: 0,
        payslipsSent: 0,
      };
    }

    const [payrollAgg, otCostAgg, payslipsSent] = await Promise.all([
      this.prisma.payrollRecord.aggregate({
        where: this.tenantWhere({ periodId: currentPeriod.id }),
        _sum: {
          grossSalary:    true,
          totalLaborCost: true,
          overtimePay:    true,
        },
      }),
      // OT cost từ OvertimeRequest đã approved trong tháng
      this.prisma.payrollRecord.aggregate({
        where: this.tenantWhere({
          periodId: currentPeriod.id,
        }),
        _sum: { overtimePay: true },
      }),
      // Số payslip đã gửi (có payslipPath)
      this.prisma.payrollRecord.count({
        where: this.tenantWhere({
          periodId: currentPeriod.id,
          payslipPath: { not: null },
        }),
      }),
    ]);

    return {
      totalPayrollCost: Number(payrollAgg._sum.grossSalary   ?? 0),
      totalLaborCost:   Number(payrollAgg._sum.totalLaborCost ?? 0),
      otCostThisMonth:  Number(otCostAgg._sum.overtimePay    ?? 0),
      payslipsSent,
    };
  }

  async getSalaryTrend() {
    const results: {
      month: string;
      baseSalary: number;
      allowances: number;
      bonus: number;
      overtimePay: number;
    }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const year      = d.getFullYear();
      const month     = d.getMonth();
      const monthStr  = `${year}-${String(month + 1).padStart(2, '0')}`;
      const periodStart = new Date(year, month, 1);
      const periodEnd   = new Date(year, month + 1, 0, 23, 59, 59);

      const period = await this.prisma.payrollPeriod.findFirst({
        where: this.tenantWhere({
          startDate: { lte: periodEnd },
          endDate:   { gte: periodStart },
          type: PayrollPeriodType.REGULAR,
        }),
        orderBy: { startDate: 'desc' },
      });

      if (!period) {
        results.push({ month: monthStr, baseSalary: 0, allowances: 0, bonus: 0, overtimePay: 0 });
        continue;
      }

      const agg = await this.prisma.payrollRecord.aggregate({
        where: this.tenantWhere({ periodId: period.id }),
        _sum: {
          baseSalary:  true,
          allowances:  true,
          bonus:       true,
          overtimePay: true,
        },
      });

      results.push({
        month: monthStr,
        baseSalary:  Number(agg._sum.baseSalary  ?? 0),
        allowances:  Number(agg._sum.allowances  ?? 0),
        bonus:       Number(agg._sum.bonus       ?? 0),
        overtimePay: Number(agg._sum.overtimePay ?? 0),
      });
    }

    return results;
  }

  async getOtByDept() {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const otRequests = await this.prisma.overtimeRequest.findMany({
      where: {
        status: OtStatus.APPROVED,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: {
        employee: {
          select: { orgUnit: { select: { id: true, name: true } } },
        },
      },
      take: 5000,
    });

    // Group theo dept
    const deptMap: Record<string, { orgUnitName: string; totalHours: number; totalCost: number }> = {};

    for (const req of otRequests) {
      const ouId   = req.employee.orgUnit.id;
      const ouName = req.employee.orgUnit.name;
      if (!deptMap[ouId]) {
        deptMap[ouId] = { orgUnitName: ouName, totalHours: 0, totalCost: 0 };
      }
      deptMap[ouId].totalHours += Number(req.hours);
    }

    // Lấy overtime cost từ PayrollRecord tháng này
    const monthStart2 = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd2   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const period = await this.prisma.payrollPeriod.findFirst({
      where: this.tenantWhere({
        startDate: { lte: monthEnd2 },
        endDate:   { gte: monthStart2 },
        type: PayrollPeriodType.REGULAR,
      }),
      orderBy: { startDate: 'desc' },
    });

    if (period) {
      const records = await this.prisma.payrollRecord.findMany({
        where: this.tenantWhere({ periodId: period.id }),
        select: {
          overtimePay: true,
          employee: { select: { orgUnit: { select: { id: true, name: true } } } },
        },
        take: 2000,
      });

      for (const r of records) {
        const ouId = r.employee.orgUnit.id;
        if (deptMap[ouId]) {
          deptMap[ouId].totalCost += Number(r.overtimePay ?? 0);
        }
      }
    }

    return Object.values(deptMap)
      .filter((d) => d.totalHours > 0)
      .sort((a, b) => b.totalHours - a.totalHours);
  }
}
