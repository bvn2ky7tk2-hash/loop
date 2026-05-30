import { Injectable, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { ContractStatus } from '../generated/prisma';

@Injectable({ scope: Scope.REQUEST })
export class HrAnalyticsService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async getSummary() {
    const tid = this.getTenantId();
    const now  = new Date();
    const sixtyDaysLater = new Date(now);
    sixtyDaysLater.setDate(now.getDate() + 60);

    // Tháng này — dùng để tính attrition rate (nghỉ việc trong tháng / headcount)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      headcount,
      headcountPrevMonth,
      resignedThisMonth,
      expiringContracts,
      openPositions,
    ] = await Promise.all([
      // Headcount hiện tại
      this.prisma.employee.count({
        where: this.tenantWhere({ isActive: true, deletedAt: null }),
      }),
      // Headcount tháng trước (tại ngày đầu tháng hiện tại)
      this.prisma.employee.count({
        where: this.tenantWhere({
          startDate: { lte: monthStart },
          isActive: true,
          deletedAt: null,
        }),
      }),
      // Số người nghỉ việc trong tháng hiện tại
      this.prisma.employee.count({
        where: this.tenantWhere({
          endDate: { gte: monthStart, lte: now },
        }),
      }),
      // Hợp đồng sắp hết hạn trong 60 ngày
      this.prisma.contract.count({
        where: this.tenantWhere({
          status: ContractStatus.ACTIVE,
          endDate: { gte: now, lte: sixtyDaysLater },
          deletedAt: null,
        }),
      }),
      // Vị trí đang tuyển (positions chưa có employee active)
      this.prisma.position.count({
        where: this.tenantWhere({ isActive: true }),
      }),
    ]);

    // Tính lương bình quân từ SalaryRecord gần nhất của mỗi employee
    // Dùng Prisma ORM thay vì raw SQL để tránh inject risk
    const latestSalaryRecords = await this.prisma.salaryRecord.findMany({
      where: tid
        ? { employee: { tenantId: tid, isActive: true, deletedAt: null } }
        : { employee: { isActive: true, deletedAt: null } },
      orderBy: { effectiveDate: 'desc' },
      select: { employeeId: true, basicSalary: true, effectiveDate: true },
      take: 5000,
    });
    // Lấy bản ghi mới nhất cho mỗi employee
    const latestByEmployee = new Map<string, number>();
    for (const r of latestSalaryRecords) {
      if (!latestByEmployee.has(r.employeeId)) {
        latestByEmployee.set(r.employeeId, Number(r.basicSalary));
      }
    }
    const salaryValues = Array.from(latestByEmployee.values());
    const avgSalaryPerPerson =
      salaryValues.length > 0
        ? Math.round(salaryValues.reduce((s, v) => s + v, 0) / salaryValues.length)
        : 0;

    const attritionRate =
      headcountPrevMonth > 0
        ? Math.round((resignedThisMonth / headcountPrevMonth) * 100 * 10) / 10
        : 0;

    const headcountDelta = headcount - headcountPrevMonth;

    return {
      headcount,
      headcountDelta,
      attritionRate,
      expiringContracts60days: expiringContracts,
      openPositions,
      avgSalaryPerPerson,
    };
  }

  async getHeadcountTrend() {
    const results: {
      month: string;
      hire: number;
      resign: number;
      headcount: number;
    }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const year  = d.getFullYear();
      const month = d.getMonth();
      const monthStr    = `${year}-${String(month + 1).padStart(2, '0')}`;
      const periodStart = new Date(year, month, 1);
      const periodEnd   = new Date(year, month + 1, 0, 23, 59, 59);

      const [hire, resign, headcount] = await Promise.all([
        this.prisma.employee.count({
          where: this.tenantWhere({
            startDate: { gte: periodStart, lte: periodEnd },
          }),
        }),
        this.prisma.employee.count({
          where: this.tenantWhere({
            endDate: { gte: periodStart, lte: periodEnd },
          }),
        }),
        this.prisma.employee.count({
          where: this.tenantWhere({
            startDate: { lte: periodEnd },
            isActive: true,
          }),
        }),
      ]);

      results.push({ month: monthStr, hire, resign, headcount });
    }

    return results;
  }

  async getAttritionByDept() {
    const orgUnits = await this.prisma.orgUnit.findMany({
      where: this.tenantWhere({ deletedAt: null }),
      select: { id: true, name: true },
      take: 200,
    });

    const yearStart = new Date(new Date().getFullYear(), 0, 1);

    const results = await Promise.all(
      orgUnits.map(async (ou) => {
        const [active, resigned] = await Promise.all([
          this.prisma.employee.count({
            where: this.tenantWhere({ orgUnitId: ou.id, isActive: true }),
          }),
          this.prisma.employee.count({
            where: this.tenantWhere({
              orgUnitId: ou.id,
              endDate: { gte: yearStart },
            }),
          }),
        ]);
        const total = active + resigned;
        return {
          orgUnitName: ou.name,
          attritionRate: total > 0 ? Math.round((resigned / total) * 100 * 10) / 10 : 0,
        };
      }),
    );

    return results
      .filter((r) => r.attritionRate > 0)
      .sort((a, b) => b.attritionRate - a.attritionRate);
  }
}
