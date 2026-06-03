import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { DashboardHrProvider } from './providers/dashboard-hr.provider';
import { DashboardFinanceProvider } from './providers/dashboard-finance.provider';
import { DashboardCrmProvider } from './providers/dashboard-crm.provider';
import { DashboardAssetProvider } from './providers/dashboard-asset.provider';
import { DashboardRecruitProvider } from './providers/dashboard-recruit.provider';
import { DashboardWorkProvider } from './providers/dashboard-work.provider';
import { DashboardOpsProvider } from './providers/dashboard-ops.provider';

/**
 * Characterization tests — chốt hành vi HIỆN TẠI của DashboardService trước/sau refactor.
 * Redis luôn miss cache (get → null) để mọi calc đều chạy. setex no-op.
 */
describe('DashboardService (characterization)', () => {
  let service: DashboardService;
  let prisma: any;
  let redis: { get: jest.Mock; setex: jest.Mock };

  // Helper tạo mock model với các op cần thiết
  const fn = () => jest.fn();

  beforeEach(async () => {
    redis = {
      get: jest.fn().mockResolvedValue(null), // luôn miss → chạy calc
      setex: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
      project: { groupBy: fn(), count: fn() },
      task: { groupBy: fn(), findMany: fn(), count: fn() },
      employee: { count: fn(), findFirst: fn(), findMany: fn() },
      timeLog: { findMany: fn(), aggregate: fn() },
      bug: { count: fn() },
      processUserTask: { count: fn() },
      processInstance: { count: fn() },
      jobOpening: { count: fn() },
      leaveRequest: { count: fn() },
      contract: { count: fn(), findMany: fn() },
      timesheetRecord: { count: fn() },
      overtimeRequest: { count: fn(), aggregate: fn() },
      hrDecision: { count: fn() },
      expense: { count: fn(), aggregate: fn() },
      invoice: { count: fn(), aggregate: fn(), findMany: fn() },
      payrollRecord: { aggregate: fn(), findFirst: fn() },
      payrollPeriod: { findFirst: fn() },
      lead: { count: fn() },
      deal: { count: fn(), aggregate: fn(), findMany: fn() },
      crmActivity: { count: fn() },
      asset: { count: fn(), groupBy: fn() },
      assetMaintenance: { count: fn() },
      automationRule: { count: fn() },
      user: { count: fn() },
      auditLog: { groupBy: fn() },
      leaveBalance: { aggregate: fn() },
      orgUnit: { findMany: fn() },
      candidate: { count: fn(), groupBy: fn() },
      interview: { count: fn() },
      budgetLine: { findMany: fn() },
      attendanceRecord: { count: fn(), findMany: fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        DashboardHrProvider,
        DashboardFinanceProvider,
        DashboardCrmProvider,
        DashboardAssetProvider,
        DashboardRecruitProvider,
        DashboardWorkProvider,
        DashboardOpsProvider,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('getSummary: shape + prisma calls', async () => {
    prisma.project.groupBy.mockResolvedValue([{ status: 'ACTIVE', _count: { id: 3 } }]);
    prisma.task.groupBy.mockResolvedValue([{ status: 'TODO', _count: { id: 5 } }]);
    prisma.employee.count.mockResolvedValue(10);
    prisma.task.findMany.mockResolvedValue([]);
    prisma.timeLog.findMany.mockResolvedValue([]);

    const res = await service.getSummary('t1');

    expect(redis.get).toHaveBeenCalledWith('dashboard:summary:t1');
    expect(prisma.project.groupBy).toHaveBeenCalled();
    expect(prisma.task.groupBy).toHaveBeenCalled();
    expect(prisma.employee.count).toHaveBeenCalledWith({ where: { isActive: true } });
    expect(res).toMatchObject({
      projects: { total: 3, byStatus: { ACTIVE: 3 } },
      tasks: { total: 5, byStatus: { TODO: 5 } },
      employees: { total: 10 },
    });
    expect(res).toHaveProperty('overdueTasks');
    expect(res).toHaveProperty('upcomingTasks');
    expect(res).toHaveProperty('recentTimeLogs');
  });

  it('getPeople: shape + prisma calls', async () => {
    prisma.employee.count.mockResolvedValue(42);
    prisma.jobOpening.count.mockResolvedValue(2);
    prisma.leaveRequest.count.mockResolvedValue(1);
    prisma.contract.count.mockResolvedValue(3);
    prisma.timesheetRecord.count.mockResolvedValue(4);
    prisma.overtimeRequest.count.mockResolvedValue(5);
    prisma.hrDecision.count.mockResolvedValue(6);

    const res = await service.getPeople('t1');

    expect(redis.get).toHaveBeenCalledWith('dashboard:people:t1');
    expect(prisma.jobOpening.count).toHaveBeenCalledWith({ where: { status: 'OPEN' } });
    expect(res).toEqual({
      headcount: 42,
      openPositions: 2,
      pendingLeaves: 1,
      pendingOvertimeRequests: 5,
      expiringContracts: 3,
      activeContracts: 3,
      pendingHrDecisions: 6,
      pendingTimesheetApprovals: 4,
    });
  });

  it('getFinance: shape + numeric coercion', async () => {
    prisma.expense.count.mockResolvedValue(7);
    prisma.invoice.count.mockResolvedValue(8);
    prisma.payrollRecord.aggregate.mockResolvedValue({ _sum: { netSalary: 1000 } });
    prisma.invoice.aggregate.mockResolvedValue({ _sum: { totalAmount: 2000 } });

    const res = await service.getFinance('t1');

    expect(redis.get).toHaveBeenCalledWith('dashboard:finance:t1');
    expect(prisma.payrollRecord.aggregate).toHaveBeenCalled();
    expect(res).toEqual({
      pendingExpenses: 7,
      outstandingInvoices: 8,
      outstandingInvoicesValue: 2000,
      monthlyPayroll: 1000,
      budgetUtilization: 0,
    });
  });

  it('getCrm: shape + prisma calls', async () => {
    prisma.lead.count.mockResolvedValue(11);
    prisma.deal.count.mockResolvedValue(12);
    prisma.deal.aggregate.mockResolvedValue({ _sum: { value: 5000 } });
    prisma.crmActivity.count.mockResolvedValue(13);

    const res = await service.getCrm('t1');

    expect(redis.get).toHaveBeenCalledWith('dashboard:crm:t1');
    expect(prisma.deal.aggregate).toHaveBeenCalled();
    expect(res).toEqual({
      openLeads: 11,
      activeDeals: 12,
      totalPipelineValue: 5000,
      activitiesThisWeek: 13,
    });
  });

  it('getRecruit: shape + byStage mapping', async () => {
    prisma.jobOpening.count.mockResolvedValue(2);
    prisma.candidate.count.mockResolvedValue(20);
    prisma.interview.count.mockResolvedValue(3);
    prisma.candidate.groupBy.mockResolvedValue([{ stage: 'APPLIED', _count: { id: 9 } }]);

    const res = await service.getRecruit('t1');

    expect(redis.get).toHaveBeenCalledWith('dashboard:recruit:t1');
    expect(prisma.candidate.groupBy).toHaveBeenCalled();
    expect(res).toMatchObject({
      openJobs: 2,
      totalCandidates: 20,
      interviewsThisWeek: 3,
      byStage: [{ stage: 'APPLIED', count: 9 }],
    });
    expect(res).toHaveProperty('newCandidatesThisMonth');
    expect(res).toHaveProperty('hiredThisMonth');
  });

  it('getMe: inline redis (TTL 60s) + shape', async () => {
    prisma.employee.findFirst.mockResolvedValue({ id: 'emp1' });
    prisma.task.count.mockResolvedValue(4);
    prisma.bug.count.mockResolvedValue(1);
    prisma.leaveBalance.aggregate.mockResolvedValue({ _sum: { totalDays: 12, usedDays: 5 } });
    prisma.leaveRequest.count.mockResolvedValue(2);
    prisma.payrollRecord.findFirst.mockResolvedValue({
      period: { name: 'T6', endDate: new Date('2026-06-30') },
    });

    const res = await service.getMe('u1', 't1');

    expect(redis.get).toHaveBeenCalledWith('dashboard:me:t1:u1');
    // getMe dùng inline setex với TTL 60s (không qua cached())
    expect(redis.setex).toHaveBeenCalledWith('dashboard:me:t1:u1', 60, expect.any(String));
    expect(res).toMatchObject({
      myPendingTasks: 4,
      myOpenBugs: 1,
      employeeId: 'emp1',
      myPendingLeaves: 2,
      leaveBalance: 7,
    });
  });

  it('getOps: shape', async () => {
    prisma.processInstance.count.mockResolvedValue(2);
    prisma.processUserTask.count.mockResolvedValue(3);
    prisma.automationRule.count.mockResolvedValue(4);

    const res = await service.getOps('t1');

    expect(redis.get).toHaveBeenCalledWith('dashboard:ops:t1');
    expect(res).toEqual({
      activeProcesses: 2,
      pendingUserTasks: 3,
      automationRulesActive: 4,
      failedJobs: 2,
    });
  });
});
