import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** CRM domain: leads, deals, pipeline, activities. */
@Injectable()
export class DashboardCrmProvider {
  constructor(private readonly prisma: PrismaService) {}

  async calcCrm() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const [openLeads, activeDeals, totalPipelineAgg, activitiesThisWeek] = await Promise.all([
      this.prisma.lead.count({ where: { status: { notIn: ['CONVERTED', 'LOST'] } } }),
      this.prisma.deal.count({ where: { stage: { notIn: ['WON', 'LOST'] } } }),
      this.prisma.deal.aggregate({
        where: { stage: { notIn: ['WON', 'LOST'] } },
        _sum: { value: true },
      }),
      this.prisma.crmActivity.count({ where: { createdAt: { gte: weekStart } } }),
    ]);

    return {
      openLeads,
      activeDeals,
      totalPipelineValue: Number(totalPipelineAgg._sum.value ?? 0),
      activitiesThisWeek,
    };
  }
}
