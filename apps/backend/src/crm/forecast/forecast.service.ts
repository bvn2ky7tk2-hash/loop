import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRevenueTargetDto, UpdateRevenueTargetDto } from './dto/forecast.dto';

const STAGE_PROBABILITY: Record<string, number> = {
  QUALIFICATION: 0.2,
  PROPOSAL:      0.4,
  NEGOTIATION:   0.7,
  WON:           1.0,
  LOST:          0.0,
};

@Injectable()
export class ForecastService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [allActive, wonYtd, wonThisMonth] = await Promise.all([
      this.prisma.$queryRaw<{ stage: string; total: string }[]>`
        SELECT stage, COALESCE(SUM(value), 0)::text AS total
        FROM deals
        WHERE stage NOT IN ('WON','LOST')
        GROUP BY stage
      `,
      this.prisma.$queryRaw<{ total: string }[]>`
        SELECT COALESCE(SUM(value), 0)::text AS total
        FROM deals
        WHERE stage = 'WON' AND won_at >= ${yearStart}
      `,
      this.prisma.$queryRaw<{ total: string }[]>`
        SELECT COALESCE(SUM(value), 0)::text AS total
        FROM deals
        WHERE stage = 'WON' AND won_at BETWEEN ${monthStart} AND ${monthEnd}
      `,
    ]);

    const pipelineTotal = allActive.reduce((s, r) => s + Number(r.total), 0);
    const weightedForecast = allActive.reduce(
      (s, r) => s + Number(r.total) * (STAGE_PROBABILITY[r.stage] ?? 0),
      0,
    );

    // Target cho tháng hiện tại
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const target = await this.prisma.revenueTarget.findFirst({
      where: { period: currentPeriod, periodType: 'MONTHLY' },
    });

    const wonThisMonthValue = Number(wonThisMonth[0]?.total ?? 0);
    const targetValue = target ? Number(target.target) : 0;

    return {
      pipelineTotal,
      weightedForecast,
      wonYtd: Number(wonYtd[0]?.total ?? 0),
      wonThisMonth: wonThisMonthValue,
      targetThisMonth: targetValue,
      targetAchievementPct: targetValue > 0 ? Math.round((wonThisMonthValue / targetValue) * 100) : null,
    };
  }

  async pipelineFunnel() {
    const rows = await this.prisma.$queryRaw<{ stage: string; cnt: string; total: string; weighted: string }[]>`
      SELECT
        stage,
        COUNT(*)::text AS cnt,
        COALESCE(SUM(value), 0)::text AS total,
        COALESCE(SUM(value * probability / 100.0), 0)::text AS weighted
      FROM deals
      GROUP BY stage
      ORDER BY
        CASE stage
          WHEN 'QUALIFICATION' THEN 1
          WHEN 'PROPOSAL'      THEN 2
          WHEN 'NEGOTIATION'   THEN 3
          WHEN 'WON'           THEN 4
          WHEN 'LOST'          THEN 5
          ELSE 6
        END
    `;

    return rows.map(r => ({
      stage:    r.stage,
      count:    Number(r.cnt),
      total:    Number(r.total),
      weighted: Number(r.weighted),
    }));
  }

  async monthlyBreakdown(year: number) {
    const targets = await this.prisma.revenueTarget.findMany({
      where: {
        periodType: 'MONTHLY',
        period: { startsWith: `${year}-` },
      },
    });
    const targetMap = Object.fromEntries(targets.map((t: { period: string; target: any }) => [t.period, Number(t.target)]));

    const rows = await this.prisma.$queryRaw<{ month: string; forecast: string; actual: string; cnt: string }[]>`
      SELECT
        TO_CHAR(expected_close_date, 'YYYY-MM') AS month,
        COALESCE(SUM(value * probability / 100.0), 0)::text AS forecast,
        COALESCE(SUM(CASE WHEN stage = 'WON' THEN value ELSE 0 END), 0)::text AS actual,
        COUNT(*)::text AS cnt
      FROM deals
      WHERE EXTRACT(YEAR FROM expected_close_date) = ${year}
      GROUP BY 1
      ORDER BY 1
    `;

    const months = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      const period = `${year}-${m}`;
      const row = rows.find(r => r.month === period);
      return {
        period,
        month: m,
        target:   targetMap[period] ?? 0,
        forecast: row ? Number(row.forecast) : 0,
        actual:   row ? Number(row.actual)   : 0,
        dealCount: row ? Number(row.cnt)     : 0,
      };
    });

    return months;
  }

  async quarterlyBreakdown(year: number) {
    const targets = await this.prisma.revenueTarget.findMany({
      where: { periodType: 'QUARTERLY', period: { startsWith: `${year}-Q` } },
    });
    const targetMap = Object.fromEntries(targets.map((t: { period: string; target: any }) => [t.period, Number(t.target)]));

    const rows = await this.prisma.$queryRaw<{ quarter: string; forecast: string; actual: string; cnt: string }[]>`
      SELECT
        CONCAT(EXTRACT(YEAR FROM expected_close_date)::text, '-Q', EXTRACT(QUARTER FROM expected_close_date)::text) AS quarter,
        COALESCE(SUM(value * probability / 100.0), 0)::text AS forecast,
        COALESCE(SUM(CASE WHEN stage = 'WON' THEN value ELSE 0 END), 0)::text AS actual,
        COUNT(*)::text AS cnt
      FROM deals
      WHERE EXTRACT(YEAR FROM expected_close_date) = ${year}
      GROUP BY 1
      ORDER BY 1
    `;

    return ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
      const period = `${year}-${q}`;
      const row = rows.find(r => r.quarter === period);
      return {
        period,
        quarter: q,
        target:    targetMap[period] ?? 0,
        forecast:  row ? Number(row.forecast) : 0,
        actual:    row ? Number(row.actual)   : 0,
        dealCount: row ? Number(row.cnt)      : 0,
      };
    });
  }

  async listDeals(params: { stage?: string; month?: string; page?: number; limit?: number }) {
    const { stage, month, page = 1, limit = 50 } = params;
    const where: any = {};
    if (stage) where.stage = stage;
    if (month) {
      const [y, m] = month.split('-').map(Number);
      where.expectedCloseDate = {
        gte: new Date(y, m - 1, 1),
        lte: new Date(y, m, 0, 23, 59, 59),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deal.count({ where }),
    ]);

    return {
      data: data.map(d => ({
        ...d,
        value:       Number(d.value),
        weightedValue: Number(d.value) * (STAGE_PROBABILITY[d.stage] ?? 0),
      })),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  listTargets(periodType?: string) {
    return this.prisma.revenueTarget.findMany({
      where: periodType ? { periodType } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertTarget(dto: CreateRevenueTargetDto) {
    const periodType = dto.periodType ?? 'MONTHLY';
    const _e = await this.prisma.revenueTarget.findFirst({
      where: { period: dto.period, periodType },
    });
    const _r = _e
      ? await this.prisma.revenueTarget.update({
          where: { id: _e.id },
          data: {
            target:   dto.target,
            currency: dto.currency ?? 'VND',
            notes:    dto.notes,
          },
        })
      : await this.prisma.revenueTarget.create({
          data: {
            period:     dto.period,
            periodType,
            target:     dto.target,
            currency:   dto.currency ?? 'VND',
            notes:      dto.notes,
          },
        });
    return _r;
  }

  updateTarget(id: string, dto: UpdateRevenueTargetDto) {
    return this.prisma.revenueTarget.update({ where: { id }, data: dto });
  }

  deleteTarget(id: string) {
    return this.prisma.revenueTarget.delete({ where: { id } });
  }
}
