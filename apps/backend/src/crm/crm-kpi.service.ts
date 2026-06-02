import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DealStage } from '../generated/prisma';
import { TenantRunner } from '../common/cls/tenant-runner.service';

export interface MonthlyPipeline {
  month: string;   // "YYYY-MM"
  weighted: number;
}

export interface KpiSummary {
  weighted_pipeline: number;          // tổng weighted pipeline hiện tại
  weighted_pipeline_by_month: MonthlyPipeline[];
  win_rate: number;                   // %
  avg_deal_size: number;              // VNĐ
  total_won_value: number;
  total_won_deals: number;
  total_closed_deals: number;         // WON + LOST
  computed_at: string;
}

@Injectable()
export class CrmKpiService {
  private readonly logger = new Logger(CrmKpiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantRunner: TenantRunner,
  ) {}

  /** Tính weighted pipeline theo tháng expectedCloseDate */
  private async calcWeightedPipeline(tenantId?: string): Promise<MonthlyPipeline[]> {
    // Dùng raw query để group by month an toàn (parameterized binding cho tenantId)
    let rows: { month: string; weighted: string }[];
    if (tenantId) {
      rows = await this.prisma.$queryRaw<{ month: string; weighted: string }[]>`
        SELECT
          TO_CHAR(COALESCE(expected_close_date, created_at), 'YYYY-MM') AS month,
          COALESCE(SUM(value::numeric * COALESCE(probability, 50) / 100.0), 0)::text AS weighted
        FROM deals
        WHERE deleted_at IS NULL
          AND stage NOT IN ('WON','LOST')
          AND tenant_id = ${tenantId}
        GROUP BY 1
        ORDER BY 1 ASC
      `;
    } else {
      rows = await this.prisma.$queryRaw<{ month: string; weighted: string }[]>`
        SELECT
          TO_CHAR(COALESCE(expected_close_date, created_at), 'YYYY-MM') AS month,
          COALESCE(SUM(value::numeric * COALESCE(probability, 50) / 100.0), 0)::text AS weighted
        FROM deals
        WHERE deleted_at IS NULL
          AND stage NOT IN ('WON','LOST')
        GROUP BY 1
        ORDER BY 1 ASC
      `;
    }

    return rows.map((r) => ({
      month:    r.month,
      weighted: parseFloat(r.weighted),
    }));
  }

  /**
   * Aggregate CRM KPIs — có thể gọi thủ công (endpoint) hoặc tự động (cron).
   * Kết quả được upsert vào KpiRecord với metricId cố định theo tên metric.
   */
  async aggregateDealKpis(tenantId?: string): Promise<KpiSummary> {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // ── 1. Weighted pipeline tổng hiện tại ────────────────────────────────────
    const activePipelineWhere: any = { deletedAt: null, stage: { notIn: [DealStage.WON, DealStage.LOST] } };
    if (tenantId) activePipelineWhere.tenantId = tenantId;

    const activeDeals = await this.prisma.deal.findMany({
      where: activePipelineWhere,
      select: { value: true, probability: true },
      take: 5000,
    });
    const weightedPipeline = activeDeals.reduce((sum, d) => {
      const val  = d.value     ? Number(d.value)     : 0;
      const prob = d.probability !== null && d.probability !== undefined ? d.probability : 50;
      return sum + val * prob / 100;
    }, 0);

    // ── 2. Win rate ────────────────────────────────────────────────────────────
    const closedWhere: any = { deletedAt: null, stage: { in: [DealStage.WON, DealStage.LOST] } };
    if (tenantId) closedWhere.tenantId = tenantId;

    const [wonCount, closedCount] = await this.prisma.$transaction([
      this.prisma.deal.count({ where: { ...closedWhere, stage: DealStage.WON } }),
      this.prisma.deal.count({ where: closedWhere }),
    ]);
    const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

    // ── 3. Avg deal size (won deals) ──────────────────────────────────────────
    const wonDealsWhere: any = { deletedAt: null, stage: DealStage.WON };
    if (tenantId) wonDealsWhere.tenantId = tenantId;

    const wonDealsAgg = await this.prisma.deal.aggregate({
      where: wonDealsWhere,
      _sum: { value: true },
      _count: { id: true },
    });
    const totalWonValue = Number(wonDealsAgg._sum.value ?? 0);
    const totalWonDeals = wonDealsAgg._count.id;
    const avgDealSize   = totalWonDeals > 0 ? Math.round(totalWonValue / totalWonDeals) : 0;

    // ── 4. Weighted pipeline by month ─────────────────────────────────────────
    const pipelineByMonth = await this.calcWeightedPipeline(tenantId);

    // ── 5. Upsert vào KpiRecord ────────────────────────────────────────────────
    // Đảm bảo KpiMetric tồn tại cho mỗi chỉ số CRM
    await this.upsertKpiMetrics(tenantId);

    const metricNames = ['crm.weighted_pipeline', 'crm.win_rate', 'crm.avg_deal_size'];
    const metrics = await this.prisma.kpiMetric.findMany({
      where: { name: { in: metricNames } },
      select: { id: true, name: true },
    });

    const metricMap = new Map(metrics.map((m) => [m.name, m.id]));
    const kpiValues: Record<string, number> = {
      'crm.weighted_pipeline': Math.round(weightedPipeline),
      'crm.win_rate':          winRate,
      'crm.avg_deal_size':     avgDealSize,
    };

    await Promise.all(
      Object.entries(kpiValues).map(([name, value]) => {
        const metricId = metricMap.get(name);
        if (!metricId) return Promise.resolve();
        return this.prisma.kpiRecord.upsert({
          where:  { metricId_period: { metricId, period } },
          update: { value, notes: `Auto-computed ${new Date().toISOString()}` },
          create: { metricId, period, value, notes: `Auto-computed ${new Date().toISOString()}` },
        });
      }),
    );

    this.logger.log(
      `CRM KPI aggregated — period=${period} weighted_pipeline=${weightedPipeline} win_rate=${winRate}% avg_deal=${avgDealSize}`,
    );

    return {
      weighted_pipeline:          Math.round(weightedPipeline),
      weighted_pipeline_by_month: pipelineByMonth,
      win_rate:                   winRate,
      avg_deal_size:              avgDealSize,
      total_won_value:            Math.round(totalWonValue),
      total_won_deals:            totalWonDeals,
      total_closed_deals:         closedCount,
      computed_at:                now.toISOString(),
    };
  }

  /** Tạo KpiMetric nếu chưa tồn tại */
  private async upsertKpiMetrics(_tenantId?: string) {
    const metrics = [
      { name: 'crm.weighted_pipeline', description: 'Weighted pipeline CRM (VNĐ)', unit: 'VNĐ',  frequency: 'MONTHLY' as const },
      { name: 'crm.win_rate',          description: 'Tỉ lệ win rate CRM (%)',      unit: '%',    frequency: 'MONTHLY' as const },
      { name: 'crm.avg_deal_size',     description: 'Giá trị deal trung bình (VNĐ)', unit: 'VNĐ', frequency: 'MONTHLY' as const },
    ];

    const existing = await this.prisma.kpiMetric.findMany({
      where: { name: { in: metrics.map((m) => m.name) } },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((m) => m.name));

    const toCreate = metrics.filter((m) => !existingNames.has(m.name));
    if (toCreate.length > 0) {
      await this.prisma.kpiMetric.createMany({
        data: toCreate.map((m) => ({
          name:        m.name,
          description: m.description,
          unit:        m.unit,
          frequency:   m.frequency as any,
        })),
        skipDuplicates: true,
      });
    }
  }

  /** Cron chạy lúc 1:00 AM mỗi ngày — aggregate KPI cho mọi tenant */
  @Cron('0 1 * * *')
  async dailyKpiCron() {
    await this.tenantRunner.forEachTenant(async (tenantId) => {
      this.logger.log('CRM KPI daily cron started');
      try {
        // Aggregate global (không filter tenant) — đủ cho setup single-tenant
        await this.aggregateDealKpis();
      } catch (err) {
        this.logger.error('CRM KPI cron failed', err);
      }
    });
  }

  /** Summary endpoint-friendly: trả KpiRecord mới nhất từ DB hoặc tính live */
  async getKpiSummary(tenantId?: string): Promise<KpiSummary> {
    // Tính live để đảm bảo fresh data
    return this.aggregateDealKpis(tenantId);
  }

  // ─── E22.2: Các phương thức KPI bổ sung ──────────────────────────────────

  /** E22.2 — Win rate: số deal WON / tổng deal đã đóng */
  async getWinRate(tenantId?: string): Promise<{ winRate: number; wonCount: number; lostCount: number }> {
    const baseWhere: any = { deletedAt: null, stage: { in: [DealStage.WON, DealStage.LOST] } };
    if (tenantId) baseWhere.tenantId = tenantId;

    const [wonCount, lostCount] = await this.prisma.$transaction([
      this.prisma.deal.count({ where: { ...baseWhere, stage: DealStage.WON } }),
      this.prisma.deal.count({ where: { ...baseWhere, stage: DealStage.LOST } }),
    ]);
    const total    = wonCount + lostCount;
    const winRate  = total > 0 ? Math.round((wonCount / total) * 100) : 0;
    return { winRate, wonCount, lostCount };
  }

  /**
   * E22.2 — Avg cycle time: trung bình số ngày từ createdAt → wonAt cho WON deals.
   * Phụ thuộc trường wonAt được set khi stage chuyển WON.
   */
  async getAvgCycleTime(tenantId?: string): Promise<{ avgCycleDays: number; dealCount: number }> {
    const where: any = { deletedAt: null, stage: DealStage.WON, wonAt: { not: null } };
    if (tenantId) where.tenantId = tenantId;

    const wonDeals = await this.prisma.deal.findMany({
      where,
      select: { createdAt: true, wonAt: true },
      take: 2000,
    });

    if (wonDeals.length === 0) return { avgCycleDays: 0, dealCount: 0 };

    const totalDays = wonDeals.reduce((sum, d) => {
      const ms = (d.wonAt!.getTime() - d.createdAt.getTime());
      return sum + ms / (1000 * 60 * 60 * 24);
    }, 0);

    return {
      avgCycleDays: Math.round(totalDays / wonDeals.length),
      dealCount:    wonDeals.length,
    };
  }

  /** E22.2 — Doanh thu thực (WON deals value tổng) */
  async getActualRevenue(tenantId?: string): Promise<{ actualRevenue: number; wonDeals: number }> {
    const where: any = { deletedAt: null, stage: DealStage.WON };
    if (tenantId) where.tenantId = tenantId;

    const agg = await this.prisma.deal.aggregate({
      where,
      _sum:   { value: true },
      _count: { id: true },
    });

    return {
      actualRevenue: Math.round(Number(agg._sum.value ?? 0)),
      wonDeals:      agg._count.id,
    };
  }

  /** E22.2 — Tổng hợp KPI summary mới (winRate + cycleTime + actualRevenue + pipeline) */
  async getExtendedKpiSummary(tenantId?: string) {
    const [winRateData, cycleTimeData, revenueData, baseSummary] = await Promise.all([
      this.getWinRate(tenantId),
      this.getAvgCycleTime(tenantId),
      this.getActualRevenue(tenantId),
      this.aggregateDealKpis(tenantId),
    ]);

    return {
      ...baseSummary,
      avg_cycle_days:    cycleTimeData.avgCycleDays,
      actual_revenue:    revenueData.actualRevenue,
    };
  }
}
