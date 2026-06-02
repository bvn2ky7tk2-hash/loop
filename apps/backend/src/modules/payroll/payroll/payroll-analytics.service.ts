import { Injectable, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { PayrollPeriodType, PayrollStatus } from '../generated/prisma';

@Injectable({ scope: Scope.REQUEST })
export class PayrollAnalyticsService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async getSummary() {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Lấy period tháng này (APPROVED hoặc PAID)
    const currentPeriod = await this.prisma.payrollPeriod.findFirst({
      where: this.tenantWhere({
        startDate: { lte: monthEnd },
        endDate:   { gte: monthStart },
        status:    { in: [PayrollStatus.APPROVED, PayrollStatus.PAID] },
      }),
      orderBy: { startDate: 'desc' },
    });

    if (!currentPeriod) {
      return {
        totalGross:          0,
        totalNet:            0,
        totalEmployerCost:   0,
        avgNetSalary:        0,
      };
    }

    const [agg, headcount] = await Promise.all([
      this.prisma.payrollRecord.aggregate({
        where: this.tenantWhere({ periodId: currentPeriod.id }),
        _sum: {
          grossSalary:    true,
          netSalary:      true,
          totalLaborCost: true,
        },
        _avg: {
          netSalary: true,
        },
      }),
      this.prisma.payrollRecord.count({
        where: this.tenantWhere({ periodId: currentPeriod.id }),
      }),
    ]);

    return {
      totalGross:        Number(agg._sum.grossSalary    ?? 0),
      totalNet:          Number(agg._sum.netSalary      ?? 0),
      totalEmployerCost: Number(agg._sum.totalLaborCost ?? 0),
      avgNetSalary:      headcount > 0 ? Math.round(Number(agg._sum.netSalary ?? 0) / headcount) : 0,
    };
  }

  async getSalaryTrend(months = 12) {
    const results: {
      month: string;
      baseSalary: number;
      allowances: number;
      bonus: number;
      overtimePay: number;
    }[] = [];

    for (let i = months - 1; i >= 0; i--) {
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

    const period = await this.prisma.payrollPeriod.findFirst({
      where: this.tenantWhere({
        startDate: { lte: monthEnd },
        endDate:   { gte: monthStart },
        type: PayrollPeriodType.REGULAR,
      }),
      orderBy: { startDate: 'desc' },
    });

    if (!period) return [];

    const records = await this.prisma.payrollRecord.findMany({
      where: this.tenantWhere({ periodId: period.id }),
      select: {
        overtimeHours: true,
        overtimePay:   true,
        employee: {
          select: { orgUnit: { select: { id: true, name: true } } },
        },
      },
      take: 5000,
    });

    const deptMap: Record<string, { deptName: string; otHours: number; otPay: number }> = {};
    for (const r of records) {
      const ouId = r.employee.orgUnit.id;
      if (!deptMap[ouId]) {
        deptMap[ouId] = { deptName: r.employee.orgUnit.name, otHours: 0, otPay: 0 };
      }
      deptMap[ouId].otHours += Number(r.overtimeHours ?? 0);
      deptMap[ouId].otPay   += Number(r.overtimePay   ?? 0);
    }

    return Object.values(deptMap)
      .filter((d) => d.otHours > 0)
      .sort((a, b) => b.otHours - a.otHours);
  }

  async getTopEarners(limit = 10) {
    // Lấy period gần nhất có data
    const latestPeriod = await this.prisma.payrollPeriod.findFirst({
      where: this.tenantWhere({
        status: { in: [PayrollStatus.APPROVED, PayrollStatus.PAID] },
      }),
      orderBy: { startDate: 'desc' },
    });

    if (!latestPeriod) return [];

    const records = await this.prisma.payrollRecord.findMany({
      where: { periodId: latestPeriod.id },  // records không có tenantId seeded
      orderBy: { grossSalary: 'desc' },
      take: Math.min(limit, 50),
      select: {
        grossSalary: true,
        netSalary:   true,
        employee: {
          select: {
            fullName: true,
            code:     true,
            orgUnit:  { select: { name: true } },
            position: { select: { jobTitle: { select: { name: true } } } },
          },
        },
      },
    });

    return records.map((r, idx) => ({
      rank:     idx + 1,
      employee: {
        fullName: r.employee.fullName,
        code:     r.employee.code     ?? undefined,
        orgUnit:  r.employee.orgUnit  ?? undefined,
        position: r.employee.position ?? undefined,
      },
      gross: Number(r.grossSalary),
      net:   Number(r.netSalary),
    }));
  }
}
