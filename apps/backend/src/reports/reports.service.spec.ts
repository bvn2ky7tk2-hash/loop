import { Test, TestingModule } from '@nestjs/testing';
import { REQUEST } from '@nestjs/core';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsAnalyticsProvider } from './providers/reports-analytics.provider';
import { ReportGeneratorProvider } from './providers/report-generator.provider';
import { ReportBuilderProvider } from './providers/report-builder.provider';

/**
 * Characterization tests — chốt hành vi HIỆN TẠI của ReportsService trước/sau refactor.
 *
 * Test 5 method đại diện 3 nhóm trách nhiệm:
 *   - getHrStats        (analytics reads)
 *   - getUtilization    (analytics reads)
 *   - getBugStats       (analytics reads — có nhánh raw SQL filter tenant)
 *   - generateReport    (report generator — PROJECT_COST → Excel buffer + filename)
 *   - builderPreview    (dynamic builder — Employee)
 *
 * Prisma được mock toàn bộ; assert shape output / Buffer trả về / prisma được gọi.
 * REQUEST mock có user.tenantId để nhánh tenant chạy giống production.
 */

const TENANT = 'tenant-1';

const fn = () => jest.fn();

function buildPrismaMock(): any {
  return {
    timeLog: { groupBy: fn(), findMany: fn() },
    user: { findMany: fn() },
    employee: { findMany: fn(), count: fn() },
    orgUnit: { findMany: fn() },
    bug: { groupBy: fn() },
    project: { findMany: fn(), count: fn() },
    leaveRequest: { groupBy: fn(), findMany: fn() },
    expense: { groupBy: fn(), aggregate: fn(), findMany: fn() },
    leaveType: { findMany: fn() },
    invoice: { aggregate: fn(), findMany: fn() },
    allocation: { findMany: fn() },
    task: { findMany: fn() },
    notification: { findMany: fn() },
    timesheetRecord: { findMany: fn() },
    payrollRecord: { findMany: fn() },
    $queryRaw: fn(),
  };
}

async function buildService(prisma: any): Promise<ReportsService> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      ReportsService,
      ReportsAnalyticsProvider,
      ReportGeneratorProvider,
      ReportBuilderProvider,
      { provide: PrismaService, useValue: prisma },
      { provide: REQUEST, useValue: { user: { tenantId: TENANT } } },
    ],
  }).compile();
  // ReportsService là REQUEST scope → dùng resolve
  return moduleRef.resolve(ReportsService);
}

describe('ReportsService (characterization)', () => {
  let prisma: any;
  let service: ReportsService;

  beforeEach(async () => {
    prisma = buildPrismaMock();
    service = await buildService(prisma);
  });

  describe('getHrStats', () => {
    it('trả về shape leave/expense và gọi đúng prisma', async () => {
      prisma.leaveRequest.groupBy
        .mockResolvedValueOnce([{ status: 'PENDING', _count: { id: 3 } }]) // byStatus
        .mockResolvedValueOnce([{ leaveTypeId: 'lt-1', _count: { id: 5 } }]); // byType
      prisma.expense.groupBy
        .mockResolvedValueOnce([{ status: 'APPROVED', _count: { id: 2 } }]) // byStatus
        .mockResolvedValueOnce([
          { category: 'TRAVEL', _sum: { totalAmount: 100 }, _count: { id: 4 } },
        ]); // byCategory
      prisma.leaveType.findMany.mockResolvedValue([
        { id: 'lt-1', name: 'Phép năm', color: '#111' },
      ]);

      const res = await service.getHrStats();

      expect(res).toEqual({
        leave: {
          byStatus: [{ status: 'PENDING', count: 3 }],
          byType: [
            { typeId: 'lt-1', typeName: 'Phép năm', color: '#111', count: 5 },
          ],
        },
        expense: {
          byStatus: [{ status: 'APPROVED', count: 2 }],
          byCategory: [{ category: 'TRAVEL', count: 4, totalAmount: 100 }],
        },
      });
      // leaveRequest.groupBy filter theo tenant
      expect(prisma.leaveRequest.groupBy).toHaveBeenCalledTimes(2);
      const firstLeaveCall = prisma.leaveRequest.groupBy.mock.calls[0][0];
      expect(firstLeaveCall.where).toEqual({ tenantId: TENANT });
      // expense KHÔNG có tenantId
      expect(prisma.expense.groupBy.mock.calls[0][0].where).toBeUndefined();
    });
  });

  describe('getUtilization', () => {
    it('tính utilizationPct và sort giảm dần', async () => {
      prisma.employee.findMany.mockResolvedValue([
        { id: 'e1', fullName: 'A', code: 'NV1', userId: 'u1', orgUnit: { name: 'Dev' } },
        { id: 'e2', fullName: 'B', code: 'NV2', userId: 'u2', orgUnit: { name: 'QA' } },
      ]);
      // u1 nhiều giờ hơn u2 → đứng trước sau sort
      prisma.timeLog.findMany.mockResolvedValue([
        { userId: 'u1', hours: 100 },
        { userId: 'u2', hours: 10 },
      ]);

      const res = await service.getUtilization('2026-01');

      expect(Array.isArray(res)).toBe(true);
      expect(res).toHaveLength(2);
      expect(res[0].employeeId).toBe('e1');
      expect(res[0].name).toBe('NV1 — A');
      expect(res[0].department).toBe('Dev');
      expect(res[0].actualHours).toBe(100);
      // sort giảm dần theo utilizationPct
      expect(res[0].utilizationPct).toBeGreaterThanOrEqual(res[1].utilizationPct);
      // availableHours giống nhau cho cùng kỳ
      expect(res[0].availableHours).toBe(res[1].availableHours);
      // employee.findMany filter tenant + isActive
      const empWhere = prisma.employee.findMany.mock.calls[0][0].where;
      expect(empWhere.tenantId).toBe(TENANT);
      expect(empWhere.isActive).toBe(true);
    });
  });

  describe('getBugStats', () => {
    it('gộp byStatus/bySeverity/byProject/monthlyTrend; raw SQL filter tenant', async () => {
      prisma.bug.groupBy
        .mockResolvedValueOnce([{ status: 'OPEN', _count: { id: 7 } }]) // byStatus
        .mockResolvedValueOnce([{ severity: 'HIGH', _count: { id: 2 } }]) // bySeverity
        .mockResolvedValueOnce([{ projectId: 'p1', _count: { id: 4 } }]); // byProject
      prisma.$queryRaw.mockResolvedValue([{ month: '2026-01', count: BigInt(9) }]);
      prisma.project.findMany.mockResolvedValue([
        { id: 'p1', name: 'Dự án 1', code: 'PRJ1' },
      ]);

      const res = await service.getBugStats();

      expect(res.byStatus).toEqual([{ status: 'OPEN', count: 7 }]);
      expect(res.bySeverity).toEqual([{ severity: 'HIGH', count: 2 }]);
      expect(res.byProject).toEqual([
        { projectId: 'p1', projectName: 'Dự án 1', projectCode: 'PRJ1', count: 4 },
      ]);
      expect(res.monthlyTrend).toEqual([{ month: '2026-01', count: 9 }]);
      // bug.groupBy filter theo tenant
      expect(prisma.bug.groupBy.mock.calls[0][0].where).toEqual({ tenantId: TENANT });
      // raw SQL được gọi (nhánh tenant)
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateReport — PROJECT_COST', () => {
    it('trả về Buffer + filename đúng tên', async () => {
      prisma.project.findMany.mockResolvedValue([
        {
          name: 'DA1',
          code: 'P1',
          customerId: 'C1',
          type: 'TM',
          status: 'ACTIVE',
          budgetCost: 1000,
          budgetEffortMm: 10,
          tasks: [{ actualHours: 80 }],
        },
      ]);

      const res = await service.generateReport({
        reportType: 'PROJECT_COST',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(Buffer.isBuffer(res.buffer)).toBe(true);
      expect(res.buffer.length).toBeGreaterThan(0);
      expect(res.filename).toBe('loop-report-project-cost-2026-01-01_2026-01-31.xlsx');
      expect(prisma.project.findMany).toHaveBeenCalledTimes(1);
      // project.findMany filter tenant
      expect(prisma.project.findMany.mock.calls[0][0].where.tenantId).toBe(TENANT);
    });
  });

  describe('builderPreview — Employee', () => {
    it('trả về rows đã pick columns + total', async () => {
      prisma.employee.findMany.mockResolvedValue([
        {
          code: 'NV1',
          fullName: 'Nguyễn A',
          email: 'a@x.vn',
          level: 'L1',
          startDate: new Date('2026-01-15'),
          isActive: true,
          orgUnit: { name: 'Dev' },
        },
      ]);

      const res = await service.builderPreview({
        entity: 'Employee',
        columns: ['code', 'fullName', 'isActive'],
      });

      expect(res.total).toBe(1);
      expect(res.rows).toEqual([
        { code: 'NV1', fullName: 'Nguyễn A', isActive: 'ACTIVE' },
      ]);
      // builder employee where filter tenant + deletedAt null
      const where = prisma.employee.findMany.mock.calls[0][0].where;
      expect(where.tenantId).toBe(TENANT);
      expect(where.deletedAt).toBeNull();
    });
  });
});
