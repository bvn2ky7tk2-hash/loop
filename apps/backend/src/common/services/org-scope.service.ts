import { Injectable } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { Prisma, Role } from '../../generated/prisma';
import type { JwtUser } from '../types/jwt-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from './redis.service';
import { CLS_TENANT_ID } from '../cls/cls-keys';

const TTL = 600; // 10 minutes

@Injectable()
export class OrgScopeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Returns visible org unit IDs for this user.
   * null  → ADMIN / group with no org restriction (sees all data)
   * []    → user has no orgUnit, sees nothing
   * [...] → union of: group-based org access + role-based fallback
   */
  async getVisibleOrgUnitIds(user: JwtUser): Promise<string[] | null> {
    if (user.role === Role.ADMIN) return null;

    const cacheKey = `orgscope:${user.id}`;
    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached) as string[];

    // Check group-based org access first
    const groupAccess = await this.prisma.groupOrgAccess.findMany({
      where: { group: { members: { some: { userId: user.id } } } },
      select: { orgUnitId: true, includeChildren: true },
    });

    let ids: string[];

    if (groupAccess.length > 0) {
      // Union all org units from groups (with subtree if includeChildren)
      const allIds = new Set<string>();
      for (const access of groupAccess) {
        if (access.includeChildren) {
          const sub = await this.subtreeIds(access.orgUnitId);
          sub.forEach(id => allIds.add(id));
        } else {
          allIds.add(access.orgUnitId);
        }
      }
      ids = Array.from(allIds);
    } else {
      // Fallback: role-based logic
      if (!user.orgUnitId) return [];
      if (user.role === Role.MEMBER) {
        ids = [user.orgUnitId];
      } else {
        ids = await this.subtreeIds(user.orgUnitId);
      }
    }

    await this.redis.setex(cacheKey, TTL, JSON.stringify(ids)).catch(() => {});
    return ids;
  }

  private async subtreeIds(rootId: string): Promise<string[]> {
    // Lọc tenant ở CẢ anchor và recursive để cây tổ chức không đan chéo tenant
    // (raw CTE bỏ qua tenant-extension). tenantId lấy từ CLS hiện hành.
    const cls = ClsServiceManager.getClsService();
    const tid = cls?.isActive() ? cls.get<string>(CLS_TENANT_ID) : undefined;
    const tFilter = tid ? Prisma.sql`AND tenant_id = ${tid}` : Prisma.sql``;
    const tFilterJoin = tid ? Prisma.sql`AND o.tenant_id = ${tid}` : Prisma.sql``;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE subtree AS (
        SELECT id FROM org_units WHERE id = ${rootId} ${tFilter}
        UNION ALL
        SELECT o.id FROM org_units o
        JOIN subtree s ON o.parent_id = s.id ${tFilterJoin}
      )
      SELECT id FROM subtree
    `;
    return rows.map((r) => r.id);
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.redis.del(`orgscope:${userId}`).catch(() => {});
  }

  async invalidateAll(): Promise<void> {
    await this.redis.delPattern('orgscope:*').catch(() => {});
  }
}
