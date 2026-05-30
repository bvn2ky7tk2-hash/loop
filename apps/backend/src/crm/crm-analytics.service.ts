import { Injectable, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { DealStage } from '../generated/prisma';

@Injectable({ scope: Scope.REQUEST })
export class CrmAnalyticsService extends TenantAwareService {
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

    const [
      totalDeals,
      openDeals,
      wonThisMonth,
      lostThisMonth,
      pipelineAgg,
      allDealsAgg,
    ] = await Promise.all([
      // Tổng số deals
      this.prisma.deal.count({
        where: this.tenantWhere({ deletedAt: null }),
      }),
      // Deals đang mở (không phải WON/LOST)
      this.prisma.deal.count({
        where: this.tenantWhere({
          stage: { notIn: [DealStage.WON, DealStage.LOST] },
          deletedAt: null,
        }),
      }),
      // Won trong tháng này
      this.prisma.deal.count({
        where: this.tenantWhere({
          stage: DealStage.WON,
          wonAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        }),
      }),
      // Lost trong tháng này
      this.prisma.deal.count({
        where: this.tenantWhere({
          stage:  DealStage.LOST,
          lostAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        }),
      }),
      // Pipeline value (open deals)
      this.prisma.deal.aggregate({
        where: this.tenantWhere({
          stage: { notIn: [DealStage.WON, DealStage.LOST] },
          deletedAt: null,
        }),
        _sum: { value: true },
      }),
      // Avg deal size (WON deals)
      this.prisma.deal.aggregate({
        where: this.tenantWhere({
          stage:     DealStage.WON,
          deletedAt: null,
        }),
        _avg: { value: true },
        _count: { id: true },
      }),
    ]);

    // Win rate: won / (won + lost) trong tháng
    const closedTotal = wonThisMonth + lostThisMonth;
    const winRate =
      closedTotal > 0 ? Math.round((wonThisMonth / closedTotal) * 100) : 0;

    const pipelineValue = Number((pipelineAgg as any)._sum?.value ?? 0);
    const avgDealSize   = Math.round(Number((allDealsAgg as any)._avg?.value ?? 0));

    return {
      totalDeals,
      openDeals,
      wonThisMonth,
      lostThisMonth,
      winRate,
      pipelineValue,
      avgDealSize,
    };
  }
}
