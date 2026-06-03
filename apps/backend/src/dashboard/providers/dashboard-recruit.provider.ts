import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Recruit domain: jobs, candidates, interviews, stages. */
@Injectable()
export class DashboardRecruitProvider {
  constructor(private readonly prisma: PrismaService) {}

  async calcRecruit() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      openJobs,
      totalCandidates,
      newCandidatesThisMonth,
      interviewsThisWeek,
      hiredThisMonth,
      byStageRaw,
    ] = await Promise.all([
      this.prisma.jobOpening.count({ where: { status: 'OPEN' } }),
      this.prisma.candidate.count(),
      this.prisma.candidate.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.interview.count({
        where: { scheduledAt: { gte: weekStart, lte: weekEnd } },
      }),
      this.prisma.candidate.count({
        where: { stage: 'HIRED', updatedAt: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.candidate.groupBy({
        by: ['stage'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return {
      openJobs,
      totalCandidates,
      newCandidatesThisMonth,
      interviewsThisWeek,
      hiredThisMonth,
      byStage: byStageRaw.map((s) => ({ stage: s.stage, count: s._count.id })),
    };
  }
}
