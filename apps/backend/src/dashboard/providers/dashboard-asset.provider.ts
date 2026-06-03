import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Asset domain: counts theo status, maintenance sắp tới, theo category. */
@Injectable()
export class DashboardAssetProvider {
  constructor(private readonly prisma: PrismaService) {}

  async calcAsset() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [totalAssets, assignedAssets, inMaintenance, byCategoryRaw] = await Promise.all([
      this.prisma.asset.count({ where: { status: { not: 'RETIRED' } } }),
      this.prisma.asset.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.asset.count({ where: { status: 'UNDER_MAINTENANCE' } }),
      this.prisma.asset.groupBy({
        by: ['category'],
        _count: { id: true },
        where: { status: { not: 'RETIRED' } },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    const dueSoon = await this.prisma.assetMaintenance.count({
      where: { performedAt: { gte: now, lte: in30Days } },
    });

    return {
      totalAssets,
      assignedAssets,
      inMaintenance,
      dueSoon,
      byCategory: byCategoryRaw.map((c) => ({ category: c.category, count: c._count.id })),
    };
  }
}
