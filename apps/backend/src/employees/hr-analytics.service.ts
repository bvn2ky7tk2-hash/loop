import { Injectable, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { ContractStatus, JobStatus } from '../generated/prisma';

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

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart  = new Date(now.getFullYear(), 0, 1);

    const [
      headcount,
      newHiresThisMonth,
      attritionYtd,
      contractsExpiring60d,
      openPositions,
    ] = await Promise.all([
      // Headcount hiện tại
      this.prisma.employee.count({
        where: this.tenantWhere({ isActive: true, deletedAt: null }),
      }),
      // Nhân viên mới tháng này
      this.prisma.employee.count({
        where: this.tenantWhere({
          startDate: { gte: monthStart, lte: now },
          deletedAt: null,
        }),
      }),
      // Nghỉ việc từ đầu năm
      this.prisma.employee.count({
        where: this.tenantWhere({
          endDate: { gte: yearStart, lte: now },
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
      // Vị trí đang tuyển
      this.prisma.jobOpening.count({
        where: this.tenantWhere({ status: JobStatus.OPEN }),
      }),
    ]);

    // Tính lương bình quân từ SalaryRecord gần nhất của mỗi employee
    const latestSalaryRecords = await this.prisma.salaryRecord.findMany({
      where: tid
        ? { employee: { tenantId: tid, isActive: true, deletedAt: null } }
        : { employee: { isActive: true, deletedAt: null } },
      orderBy: { effectiveDate: 'desc' },
      select: { employeeId: true, basicSalary: true },
      take: 5000,
    });
    const latestByEmployee = new Map<string, number>();
    for (const r of latestSalaryRecords) {
      if (!latestByEmployee.has(r.employeeId)) {
        latestByEmployee.set(r.employeeId, Number(r.basicSalary));
      }
    }
    const salaryValues = Array.from(latestByEmployee.values());
    const avgSalaryPerHead =
      salaryValues.length > 0
        ? Math.round(salaryValues.reduce((s, v) => s + v, 0) / salaryValues.length)
        : 0;

    return {
      headcount,
      newHiresThisMonth,
      attritionYtd,
      contractsExpiring60d,
      openPositions,
      avgSalaryPerHead,
    };
  }

  async getHeadcountTrend(months = 12) {
    const results: {
      month: string;
      total: number;
      newHires: number;
      resigns: number;
    }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const year  = d.getFullYear();
      const month = d.getMonth();
      const monthStr    = `${year}-${String(month + 1).padStart(2, '0')}`;
      const periodStart = new Date(year, month, 1);
      const periodEnd   = new Date(year, month + 1, 0, 23, 59, 59);

      const [newHires, resigns, total] = await Promise.all([
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

      results.push({ month: monthStr, total, newHires, resigns });
    }

    return results;
  }

  async getContractExpiry(days = 60) {
    const now = new Date();
    const deadline = new Date(now);
    deadline.setDate(now.getDate() + days);

    const contracts = await this.prisma.contract.findMany({
      where: {
        status: ContractStatus.ACTIVE,
        endDate: { gte: now, lte: deadline },
        deletedAt: null,
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            code: true,
            orgUnit: { select: { name: true } },
            position: { select: { jobTitle: { select: { name: true } } } },
          },
        },
      },
      orderBy: { endDate: 'asc' },
      take: 50,
    });

    return contracts.map(c => ({
      id:          c.id,
      employee:    c.employee
        ? {
            fullName: c.employee.fullName,
            code:     c.employee.code ?? undefined,
            orgUnit:  c.employee.orgUnit ?? undefined,
            position: c.employee.position ?? undefined,
          }
        : { fullName: '—' },
      contractType: c.type,
      expiryDate:   c.endDate?.toISOString().split('T')[0] ?? '',
      daysLeft:     c.endDate ? Math.ceil((c.endDate.getTime() - now.getTime()) / 86400000) : 0,
    }));
  }

  async getAttritionByDept() {
    const tenantId = this.getTenantId();
    const orgUnits = await this.prisma.orgUnit.findMany({
      where: tenantId ? { tenantId } : {},
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
          deptName: ou.name,
          count: resigned,
          attritionRate: total > 0 ? Math.round((resigned / total) * 100 * 10) / 10 : 0,
        };
      }),
    );

    return results
      .filter((r) => r.count > 0)
      .sort((a, b) => b.attritionRate - a.attritionRate);
  }

  async getSalaryDistribution() {
    // Lấy salary từ Contract ACTIVE — 1 contract mới nhất mỗi employee
    const contracts = await this.prisma.contract.findMany({
      where: this.tenantWhere({
        status: ContractStatus.ACTIVE,
        deletedAt: null,
      }),
      orderBy: { startDate: 'desc' },
      select: { employeeId: true, salaryMonthly: true },
      take: 5000,
    });

    // Lấy giá trị mới nhất mỗi employee
    const latestByEmployee = new Map<string, number>();
    for (const c of contracts) {
      if (!latestByEmployee.has(c.employeeId)) {
        latestByEmployee.set(c.employeeId, Number(c.salaryMonthly));
      }
    }
    const salaries = Array.from(latestByEmployee.values());

    const ranges = [
      { range: '<10M',   min: 0,          max: 10_000_000,  count: 0 },
      { range: '10-15M', min: 10_000_000, max: 15_000_000,  count: 0 },
      { range: '15-20M', min: 15_000_000, max: 20_000_000,  count: 0 },
      { range: '20-25M', min: 20_000_000, max: 25_000_000,  count: 0 },
      { range: '25-30M', min: 25_000_000, max: 30_000_000,  count: 0 },
      { range: '>30M',   min: 30_000_000, max: Infinity,    count: 0 },
    ];

    for (const s of salaries) {
      const bucket = ranges.find(r => s >= r.min && s < r.max);
      if (bucket) bucket.count++;
    }

    return ranges.map(({ range, count }) => ({ range, count }));
  }
}
