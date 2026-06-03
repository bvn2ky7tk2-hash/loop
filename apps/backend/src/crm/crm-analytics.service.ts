import { Injectable, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { DealStage, Prisma } from '../generated/prisma';

const STAGE_LABEL: Record<string, string> = {
  QUALIFICATION: 'Qualification',
  PROPOSAL:      'Proposal',
  NEGOTIATION:   'Negotiation',
  WON:           'Won',
  LOST:          'Lost',
};

const STAGE_COLOR: Record<string, string> = {
  QUALIFICATION: '#6366F1',
  PROPOSAL:      '#F59E0B',
  NEGOTIATION:   '#F97316',
  WON:           '#10B981',
  LOST:          '#EF4444',
};

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

  // ─── E22.3: Pipeline by stage ────────────────────────────────────────────

  async getPipelineByStage() {
    const tenantId = this.getTenantId();
    const rows = await this.prisma.$queryRaw<{ stage: string; cnt: bigint; total_value: string }[]>`
      SELECT
        stage,
        COUNT(*)                                              AS cnt,
        COALESCE(SUM(value::numeric), 0)::text               AS total_value
      FROM deals
      WHERE deleted_at IS NULL
        AND stage NOT IN ('WON','LOST')
        ${tenantId ? Prisma.sql`AND tenant_id = ${tenantId}` : Prisma.sql``}
      GROUP BY stage
      ORDER BY stage
    `;

    return rows.map((r) => ({
      stage:      r.stage,
      label:      STAGE_LABEL[r.stage] ?? r.stage,
      count:      Number(r.cnt),
      value:      parseFloat(r.total_value),
      color:      STAGE_COLOR[r.stage] ?? '#94A3B8',
    }));
  }

  // ─── E22.3: Win/Loss monthly ─────────────────────────────────────────────

  async getWinLossMonthly(months = 6): Promise<{ month: string; won: number; lost: number }[]> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    const tenantId = this.getTenantId();
    const rows = await this.prisma.$queryRaw<{ month: string; stage: string; cnt: bigint }[]>`
      SELECT
        TO_CHAR(COALESCE(won_at, lost_at, created_at), 'YYYY-MM') AS month,
        stage,
        COUNT(*)                                                    AS cnt
      FROM deals
      WHERE deleted_at IS NULL
        AND stage IN ('WON','LOST')
        AND COALESCE(won_at, lost_at, created_at) >= ${cutoff}
        ${tenantId ? Prisma.sql`AND tenant_id = ${tenantId}` : Prisma.sql``}
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `;

    // Gom theo tháng
    const map = new Map<string, { won: number; lost: number }>();
    for (const r of rows) {
      const entry = map.get(r.month) ?? { won: 0, lost: 0 };
      if (r.stage === 'WON')  entry.won  += Number(r.cnt);
      if (r.stage === 'LOST') entry.lost += Number(r.cnt);
      map.set(r.month, entry);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v }));
  }

  // ─── E22.3: Top customers by revenue ────────────────────────────────────

  async getTopCustomers(limit = 5): Promise<{ customerId: string; name: string; revenue: number; wonDeals: number }[]> {
    const tenantId = this.getTenantId();
    const rows = await this.prisma.$queryRaw<{
      customer_id: string;
      name: string;
      revenue: string;
      won_deals: bigint;
    }[]>`
      SELECT
        d.customer_id,
        c.name,
        COALESCE(SUM(d.value::numeric), 0)::text AS revenue,
        COUNT(d.id)                               AS won_deals
      FROM deals d
      JOIN customers c ON c.id = d.customer_id
      WHERE d.deleted_at IS NULL
        AND d.stage = 'WON'
        AND c.deleted_at IS NULL
        ${tenantId ? Prisma.sql`AND d.tenant_id = ${tenantId}` : Prisma.sql``}
      GROUP BY d.customer_id, c.name
      ORDER BY SUM(d.value::numeric) DESC NULLS LAST
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      customerId: r.customer_id,
      name:       r.name,
      revenue:    parseFloat(r.revenue),
      wonDeals:   Number(r.won_deals),
    }));
  }

  // ─── Deals aging (không có activity trong > N ngày) ─────────────────────

  async getDealAging(minDays = 14): Promise<{ id: string; title: string; stage: string; ageDays: number; value: number }[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - minDays);

    const deals = await this.prisma.deal.findMany({
      where: {
        deletedAt: null,
        stage: { notIn: ['WON', 'LOST'] as any[] },
        updatedAt: { lte: cutoff },
      },
      select: { id: true, title: true, stage: true, value: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
      take: 20,
    });

    const now = new Date();
    return deals.map(d => ({
      id:       d.id,
      title:    d.title,
      stage:    d.stage,
      ageDays:  Math.floor((now.getTime() - d.updatedAt.getTime()) / 86400000),
      value:    Number(d.value ?? 0),
    }));
  }
}
